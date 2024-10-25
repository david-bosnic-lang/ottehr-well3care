import { APIGatewayProxyResult } from 'aws-lambda';
import { validateRequestParameters } from './validateRequestParameters';
import {
  Secrets,
  ZambdaInput,
  getPatchBinary,
  getPatientContactEmail,
  getPatientFirstName,
  SecretsKeys,
  getSecret,
  topLevelCatch,
  TIMEZONE_EXTENSION_URL,
} from 'ottehr-utils';
import { cancelAppointmentResource } from 'ottehr-utils';
import { createFhirClient, getParticipantFromAppointment } from 'ottehr-utils';
import { BatchInputGetRequest, FhirClient } from '@zapehr/sdk';
import { Patient, Location, Appointment, Coding } from 'fhir/r4';
import { getPatientResource } from '../../shared';
import { DATETIME_FULL_NO_YEAR } from 'ottehr-utils';
import { DateTime } from 'luxon';
import { sendCancellationEmail } from '../../shared';
import { getAuth0Token } from 'ottehr-utils';
// import { sendMessage } from '../../shared';
// import { getConversationSIDForRelatedPersons } from '../create-appointment';
import { getRelatedPersonForPatient } from '../../shared';
import { Operation } from 'fast-json-patch';
import { validateBundleAndExtractAppointment } from '../../shared';
import { getEncounterDetails } from '../../shared';
import { AuditableZambdaEndpoints } from '../../shared';
import { createAuditEvent } from '../../shared';
import { getPatchOperationsToUpdateVisitStatus } from 'ottehr-utils';

export enum CancellationReasonOptions {
  'Patient improved' = 'Patient improved',
  'Wait time too long' = 'Wait time too long',
  'Prefer another urgent care provider' = 'Prefer another urgent care provider',
  'Changing location' = 'Changing location',
  'Changing to telemedicine' = 'Changing to telemedicine',
  'Financial responsibility concern' = 'Financial responsibility concern',
  'Insurance issue' = 'Insurance issue',
  'Service not offered at' = 'Service not offered at',
  'Duplicate visit or account error' = 'Duplicate visit or account error',
}

export const CancellationReasonCodes = {
  'Patient improved': 'patient-improved',
  'Wait time too long': 'wait-time',
  'Prefer another urgent care provider': 'prefer-another-provider',
  'Changing location': 'changing-location',
  'Changing to telemedicine': 'changing-telemedicine',
  'Financial responsibility concern': 'financial-concern',
  'Insurance issue': 'insurance-issue',
  'Service not offered at': 'service-not-offered-at',
  'Duplicate visit or account error': 'duplicate-visit-or-account-error',
};

export interface CancelAppointmentInput {
  appointmentID: string;
  cancellationReason: CancellationReasonOptions;
  secrets: Secrets | null;
}

interface CancellationDetails {
  startTime: string;
  email: string;
  patient: Patient;
  location: Location;
  visitType: string;
}

// Lifting up value to outside of the handler allows it to stay in memory across warm lambda invocations
let zapehrToken: string;
let zapehrMessagingToken: string;

export const index = async (input: ZambdaInput): Promise<APIGatewayProxyResult> => {
  console.log(`Cancelation Input: ${JSON.stringify(input)}`);

  try {
    console.group('validateRequestParameters');
    const validatedParameters = validateRequestParameters(input);
    const { appointmentID, cancellationReason, secrets } = validatedParameters;
    console.groupEnd();
    console.debug('validateRequestParameters success');

    // Get email props
    console.group('gettingEmailProps');

    if (!zapehrToken) {
      console.log('getting token');
      zapehrToken = await getAccessToken(secrets, 'regular');
    } else {
      console.log('already have token');
    }

    const fhirClient = createFhirClient(zapehrToken);
    const appointment: Appointment = await fhirClient.readResource({
      resourceType: 'Appointment',
      resourceId: appointmentID,
    });

    console.log(`checking appointment with id ${appointmentID} is not checked in`);
    if (appointment.status !== 'booked' && appointment.status !== 'proposed' && appointment.status !== 'arrived') {
      throw new Error('You cannot cancelled a checked in appointment');
    }

    const appointmentPatchOperations: Operation[] = [
      {
        op: 'replace',
        path: '/status',
        value: 'cancelled',
      },
    ];

    console.log(`getting encounter details for appointment with id ${appointmentID}`);
    const { encounter, plannedHistoryIdx, canceledHistoryIdx } = await getEncounterDetails(appointmentID, fhirClient);
    console.log(`successfully retrieved encounter details for id ${encounter.id}`);
    const now = DateTime.now().setZone('UTC').toISO();
    const encounterPatchOperations: Operation[] = [
      {
        op: 'replace',
        path: '/status',
        value: 'cancelled',
      },
    ];
    if (plannedHistoryIdx >= 0) {
      encounterPatchOperations.push({
        op: 'add',
        path: `/statusHistory/${plannedHistoryIdx}/period/end`,
        value: now,
      });
    }
    if (canceledHistoryIdx === -1) {
      encounterPatchOperations.push({
        op: 'add',
        path: `/statusHistory/-`,
        value: {
          status: 'cancelled',
          period: {
            start: now,
          },
        },
      });
    }
    // why do we have two separate sets of batch requests here, with updates related to the cancelation spread between both?
    const status = 'CANCELLED';
    appointmentPatchOperations.push(...getPatchOperationsToUpdateVisitStatus(appointment, status, now || undefined));
    const appointmentPatchRequest = getPatchBinary({
      resourceType: 'Appointment',
      resourceId: appointmentID,
      patchOperations: appointmentPatchOperations,
    });
    const encounterPatchRequest = getPatchBinary({
      resourceType: 'Encounter',
      resourceId: encounter.id || 'Unknown',
      patchOperations: encounterPatchOperations,
    });
    const getAppointmentRequest: BatchInputGetRequest = {
      url: `/Appointment?_id=${appointmentID}&_include=Appointment:patient&_include=Appointment:location`,
      method: 'GET',
    };
    console.log('making transaction request for getAppointmentRequest, appointmentPatchRequest, encounterPatchRequest');
    const transactionBundle = await fhirClient.transactionRequest({
      requests: [getAppointmentRequest, appointmentPatchRequest, encounterPatchRequest],
    });
    console.log('getting appointment from transaction bundle');
    const { appointment: appointmentUpdated } = validateBundleAndExtractAppointment(transactionBundle);
    // todo: this could be done in the same request to get the appointment

    const { startTime, email, patient, location, visitType } = await getCancellationEmailDetails(
      appointmentUpdated,
      fhirClient,
    );
    console.groupEnd();
    console.debug('gettingEmailProps success');
    console.log(`canceling appointment with id ${appointmentID}`);
    const cancellationReasonCoding: Coding[] = [
      {
        system: 'http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason',
        code: CancellationReasonCodes[cancellationReason],
        display: cancellationReason,
      },
    ];

    const cancelledAppointment = await cancelAppointmentResource(
      appointmentUpdated,
      cancellationReasonCoding,
      fhirClient,
    );

    const response = {
      message: 'Successfully canceled an appointment',
      appointment: cancelledAppointment.id ?? null,
      location: {
        name: location?.name || 'Unknown',
        slug:
          location.identifier?.find(
            (identifierTemp) => identifierTemp.system === 'https://fhir.zapehr.com/r4/StructureDefinitions/location',
          )?.value || 'Unknown',
      },
      visitType: visitType,
    };

    // todo: add this back
    // console.group('sendCancellationEmail');
    // await sendCancellationEmail({
    //   email,
    //   startTime,
    //   secrets,
    //   location,
    //   visitType,
    // });
    console.groupEnd();

    console.log('Send cancel message request');
    if (!zapehrMessagingToken) {
      zapehrMessagingToken = await getAccessToken(secrets, 'messaging');
    }
    const WEBSITE_URL = getSecret(SecretsKeys.WEBSITE_URL, secrets);
    const message = `Your visit for ${getPatientFirstName(patient)} with Ottehr Urgent Care ${
      location.name
    } has been canceled. Tap ${WEBSITE_URL}/location/${response.location.slug}/${
      response.visitType
    } to book a new visit.`;

    const relatedPerson = await getRelatedPersonForPatient(patient.id || '', fhirClient);
    if (relatedPerson) {
      // const conversationSID = await getConversationSIDForRelatedPersons([relatedPerson], fhirClient);
      // await sendMessage(message, conversationSID || '', zapehrMessagingToken, secrets);
    } else {
      console.log(`No RelatedPerson found for patient ${patient.id} not sending text message`);
    }

    await createAuditEvent(AuditableZambdaEndpoints.appointmentCancel, fhirClient, input, patient.id || '', secrets);

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    await topLevelCatch('cancel-in-person-appointment', error, input.secrets);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};

const getCancellationEmailDetails = async (
  appointment: Appointment,
  fhirClient: FhirClient,
): Promise<CancellationDetails> => {
  try {
    const patientID = getParticipantFromAppointment(appointment, 'Patient');
    console.log(`getting patient details for ${patientID}`);
    const patient: Patient = await getPatientResource(patientID, fhirClient);
    const email = getPatientContactEmail(patient);

    const locationId = appointment.participant
      .find((appt) => appt.actor?.reference?.startsWith('Location/'))
      ?.actor?.reference?.replace('Location/', '');
    console.log('got location id', locationId);
    // todo: wouldn't it be better to cancel the appointment and not send an email if the only thing missing here is email??
    if (!locationId || !email || !appointment.start) {
      throw new Error(`These fields are required for the cancelation email: locationId, email, appointment.start`);
    }

    console.log(`getting location resource for ${locationId}`);
    const location: Location = await fhirClient.readResource({
      resourceType: 'Location',
      resourceId: locationId,
    });
    const timezone = location.extension?.find(
      (extensionTemp) => extensionTemp.url === TIMEZONE_EXTENSION_URL,
    )?.valueString;

    const visitType =
      appointment.appointmentType?.coding
        ?.find((codingTemp) => codingTemp.system === 'http://terminology.hl7.org/CodeSystem/v2-0276')
        ?.code?.toLowerCase() || 'Unknown';

    return {
      startTime: DateTime.fromISO(appointment.start).setZone(timezone).toFormat(DATETIME_FULL_NO_YEAR),
      email,
      patient,
      location,
      visitType,
    };
  } catch (error: any) {
    throw new Error(`error getting cancellation email details: ${error}, ${JSON.stringify(error)}`);
  }
};

export type AuthType = 'regular' | 'messaging';

export async function getAccessToken(secrets: Secrets | null, type: AuthType = 'regular'): Promise<string> {
  let clientIdKey: SecretsKeys.TELEMED_CLIENT_ID | SecretsKeys.MESSAGING_M2M_CLIENT;
  let secretIdKey: SecretsKeys.TELEMED_CLIENT_SECRET | SecretsKeys.MESSAGING_M2M_SECRET;
  if (type === 'regular') {
    clientIdKey = SecretsKeys.TELEMED_CLIENT_ID;
    secretIdKey = SecretsKeys.TELEMED_CLIENT_SECRET;
  } else if (type === 'messaging') {
    clientIdKey = SecretsKeys.MESSAGING_M2M_CLIENT;
    secretIdKey = SecretsKeys.MESSAGING_M2M_SECRET;
  } else {
    console.log('unknown m2m token type');
    throw Error('unknown m2m token type');
  }
  return getAuth0Token({ secretIdKey, clientIdKey, secrets });
}

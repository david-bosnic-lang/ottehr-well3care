/* eslint-disable sort-keys */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { inviteUser } from './invite-user';
import { FhirClient } from '@zapehr/sdk';
import { Organization } from 'fhir/r4';

async function createApplication(
  projectApiUrl: string,
  applicationName: string,
  accessToken: string,
  projectId: string,
): Promise<[string, string]> {
  return new Promise((resolve, reject) => {
    fetch(`${projectApiUrl}/application`, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'x-zapehr-project-id': `${projectId}`,
      },
      method: 'POST',
      body: JSON.stringify({
        name: applicationName,
        description: 'Example',
        loginRedirectUri: 'https://127.0.0.1:4002/dashboard',
        allowedCallbackUrls: ['http://localhost:4002', 'http://localhost:4002/dashboard'],
        allowedLogoutUrls: ['http://localhost:4002'],
        allowedWebOriginsUrls: ['http://localhost:4002'],
        allowedCORSOriginsUrls: ['http://localhost:4002'],
      }),
    })
      .then(async (response) => {
        if (response.status === 200) {
          return response.json();
        } else {
          console.log(`Failed to create application`, await response.json());
          throw new Error('Failed to create application');
        }
      })
      .then((data) => resolve([data.id, data.clientId]))
      .catch((error) => reject(error));
  });
}

const createOrganization = async (fhirClient: FhirClient): Promise<Organization> => {
  const organization: Organization = {
    resourceType: 'Organization',
    active: true,
    name: 'Example Organization',
  };

  return await fhirClient.createResource(organization);
};

function createZambdaEnvFile(
  projectId: string,
  environment: string,
  m2mDeviceId: string,
  m2mClientId: string,
  m2mSecret: string,
  organizationId: string,
): string {
  const overrideData = {
    AUTH0_ENDPOINT: 'https://auth.zapehr.com/oauth/token',
    AUTH0_AUDIENCE: 'https://api.zapehr.com',
    URGENT_CARE_AUTH0_CLIENT: m2mClientId,
    URGENT_CARE_AUTH0_SECRET: m2mSecret,
    MESSAGING_DEVICE_ID: m2mDeviceId,
    MESSAGING_M2M_CLIENT: m2mClientId,
    MESSAGING_M2M_SECRET: m2mSecret,
    FHIR_API: 'https://fhir-api.zapehr.com/r4',
    PROJECT_API: 'https://project-api.zapehr.com/v1',
    PROJECT_ID: projectId,
    ORGANIZATION_ID: organizationId,
  };

  const envFolderPath = 'packages/telemed-ehr/zambdas/.env';
  const envPath = path.join(envFolderPath, `${environment}.json`);
  const envTemplatePath = path.join(envFolderPath, 'local.template.json');

  // Read the template file
  const templateDataString = fs.readFileSync(envTemplatePath, 'utf8');
  const templateData = JSON.parse(fs.readFileSync(envTemplatePath, 'utf8'));

  const envData = { ...templateData, ...overrideData };

  if (!fs.existsSync(envFolderPath)) {
    fs.mkdirSync(envFolderPath, { recursive: true });
  }
  fs.writeFileSync(envPath, JSON.stringify(envData, null, 2));
  return envPath;
}

function createFrontEndEnvFile(clientId: string, environment: string, projectId: string): string {
  const envTemplatePath = 'packages/telemed-ehr/app/env/.env.local-template';
  const envPath = `packages/telemed-ehr/app/env/.env.${environment}`;

  // Read the template file
  const templateData = fs.readFileSync(envTemplatePath, 'utf8');

  // Replace the placeholders with the actual values
  const updatedData = templateData.replace(
    'VITE_APP_ZAPEHR_APPLICATION_CLIENT_ID=',
    `VITE_APP_ZAPEHR_APPLICATION_CLIENT_ID=${clientId}`,
  );

  // Write the updated data to the new file
  fs.writeFileSync(envPath, updatedData);
  return envPath;
}

async function createZ3(projectApiUrl: string, projectId: string, accessToken: string, bucketNames: string[]) {
  const getResponse = await fetch(`${projectApiUrl}/z3`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-zapehr-project-id': `${projectId}`,
    },
    method: 'GET',
  });

  if (getResponse.status !== 200) {
    console.log(`Failed to fetch existing buckets.`, await getResponse.json());
    throw new Error('Failed to fetch existing buckets.');
  }

  const existingBuckets = await getResponse.json();

  const promises = bucketNames
    .map((bucketName) => {
      const fqBucketName = `${projectId}-${bucketName}`;

      const foundBucket = existingBuckets.find((eb: { name: string }) => eb.name === fqBucketName);
      if (foundBucket !== undefined) {
        console.log(`Bucket ${fqBucketName} already exists.`);
        return null;
      }

      console.log(`Creating bucket ${fqBucketName}.`);

      return fetch(`${projectApiUrl}/z3/${fqBucketName}`, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
          'x-zapehr-project-id': `${projectId}`,
        },
        method: 'PUT',
      }).then(async (response) => {
        if (response.status === 200) {
          return response.json();
        } else {
          console.log(`Failed to create bucket`, await response.json());
          throw new Error('Failed to create bucket');
        }
      });
    })
    .filter((promiseOrNull) => promiseOrNull !== null);

  await Promise.all(promises);
}

export async function setupEHR(
  projectApiUrl: string,
  environment: string,
  accessToken: string,
  projectId: string,
  providerEmail: string,
  m2mDeviceId: string,
  m2mClientId: string,
  m2mSecret: string,
): Promise<void> {
  console.log('Starting setup of EHR...');
  const slug = uuidv4().replace(/-/g, '');

  const fhirClient = new FhirClient({
    apiUrl: 'https://fhir-api.zapehr.com',
    projectId: projectId,
    accessToken: accessToken,
  });

  const applicationName = 'Starter EHR Application';
  const [applicationId, clientId] = await createApplication(projectApiUrl, applicationName, accessToken, projectId);
  console.log(`Created application "${applicationName}".`);

  const organizationId = (await createOrganization(fhirClient)).id;
  if (!organizationId) {
    throw new Error('Organization ID is not defined');
  }

  const envPath1 = createZambdaEnvFile(projectId, environment, m2mDeviceId, m2mClientId, m2mSecret, organizationId);
  console.log('Created environment file:', envPath1);

  const envPath2 = createFrontEndEnvFile(clientId, environment, projectId);
  console.log('Created environment file:', envPath2);

  console.log('Starting to create sample provider.');
  const firstName = undefined;
  const lastName = undefined;
  const invitationUrl = await inviteUser(
    projectApiUrl,
    providerEmail,
    firstName,
    lastName,
    applicationId,
    accessToken,
    projectId,
  );

  const bucketNames = ['id-cards', 'insurance-cards', 'school-work-note-templates'];

  await createZ3(projectApiUrl, projectId, accessToken, bucketNames);

  if (invitationUrl) {
    console.log(
      `User with email \x1b[35m${providerEmail}\x1b[0m can gain access to their account by navigating to URL \x1b[35m${invitationUrl}\x1b[0m`,
    );
  }
  console.log(`Login to the provider dashboard by navigating to URL \x1b[35mhttp://localhost:4002\x1b[0m`);
}

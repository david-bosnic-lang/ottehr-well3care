import { APIGatewayProxyResult } from 'aws-lambda';
import { makeCommunicationDTO } from '../../shared/chart-data';
import { createOystehrClient } from '../../shared/helpers';
import { ZambdaInput } from '../../shared';
import { getCommunicationResources } from './helpers';
import { validateRequestParameters } from './validateRequestParameters';
import { checkOrCreateM2MClientToken } from '../../shared';
import { getSecret, SecretsKeys } from 'utils';

let m2mtoken: string;

export const index = async (input: ZambdaInput): Promise<APIGatewayProxyResult> => {
  try {
    console.log(`Input: ${JSON.stringify(input)}`);
    const { type, secrets, userToken } = validateRequestParameters(input);
    m2mtoken = await checkOrCreateM2MClientToken(m2mtoken, secrets);
    const oystehr = createOystehrClient(m2mtoken, secrets);
    const oystehrCurrentUser = createOystehrClient(userToken, secrets);
    const myPractId = (await oystehrCurrentUser.user.me()).profile;
    const ORGANIZATION_ID = getSecret(SecretsKeys.ORGANIZATION_ID, secrets);
    const communicationsOwnerId = type === 'organization' ? ORGANIZATION_ID : myPractId;

    const communications = await getCommunicationResources(oystehr, type, communicationsOwnerId);
    const communicationsDTOs = communications.map((element) => makeCommunicationDTO(element));
    return {
      body: JSON.stringify(communicationsDTOs),
      statusCode: 200,
    };
  } catch (error) {
    console.log(error);
    return {
      body: JSON.stringify({ message: 'Error getting patient instructions...' }),
      statusCode: 500,
    };
  }
};

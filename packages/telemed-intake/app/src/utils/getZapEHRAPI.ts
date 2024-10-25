import { useState } from 'react';
import { getZapEHRAPI, useZambdaClient } from 'ottehr-components';

let _apiClient: ReturnType<typeof getZapEHRAPI> | null;

export const useZapEHRAPIClient = (
  {
    tokenless,
  }: {
    tokenless: boolean;
  } = { tokenless: false },
): ReturnType<typeof getZapEHRAPI> | null => {
  const zambdaClient = useZambdaClient({ tokenless });
  const [apiClient, setApiClient] = useState<typeof _apiClient>(_apiClient);

  if (zambdaClient && !apiClient) {
    const client = getZapEHRAPI(
      {
        getPatientsZambdaID: import.meta.env.VITE_APP_GET_PATIENTS_ZAMBDA_ID,
        getProvidersZambdaID: import.meta.env.VITE_APP_GET_PROVIDERS_ZAMBDA_ID,
        getLocationsZambdaID: import.meta.env.VITE_APP_GET_LOCATIONS_ZAMBDA_ID,
        getGroupsZambdaID: import.meta.env.VITE_APP_GET_GROUPS_ZAMBDA_ID,
        createAppointmentZambdaID: import.meta.env.VITE_APP_CREATE_APPOINTMENT_ZAMBDA_ID,
        updateAppointmentZambdaID: import.meta.env.VITE_APP_UPDATE_APPOINTMENT_ZAMBDA_ID,
        cancelTelemedAppointmentZambdaID: import.meta.env.VITE_APP_CANCEL_TELEMED_APPOINTMENT_ZAMBDA_ID,
        cancelInPersonAppointmentZambdaID: import.meta.env.VITE_APP_CANCEL_IN_PERSON_APPOINTMENT_ZAMBDA_ID,
        getAppointmentsZambdaID: import.meta.env.VITE_APP_GET_APPOINTMENTS_ZAMBDA_ID,
        getScheduleZambdaID: import.meta.env.VITE_APP_GET_SCHEDULE_ZAMBDA_ID,
        getPaperworkZambdaID: import.meta.env.VITE_APP_GET_PAPERWORK_ZAMBDA_ID,
        createPaperworkZambdaID: import.meta.env.VITE_APP_CREATE_PAPERWORK_ZAMBDA_ID,
        updatePaperworkZambdaID: import.meta.env.VITE_APP_UPDATE_PAPERWORK_ZAMBDA_ID,
        getWaitStatusZambdaID: import.meta.env.VITE_APP_GET_WAITING_ROOM_ZAMBDA_ID,
        joinCallZambdaID: import.meta.env.VITE_APP_JOIN_CALL_ZAMBDA_ID,
        videoChatCreateInviteZambdaID: import.meta.env.VITE_APP_VIDEO_CHAT_CREATE_INVITE_ZAMBDA_ID,
        videoChatCancelInviteZambdaID: import.meta.env.VITE_APP_VIDEO_CHAT_CANCEL_INVITE_ZAMBDA_ID,
        videoChatListInvitesZambdaID: import.meta.env.VITE_APP_VIDEO_CHAT_LIST_INVITES_ZAMBDA_ID,
        getPresignedFileURLZambdaID: import.meta.env.VITE_APP_GET_PRESIGNED_FILE_URL_ZAMBDA_ID,
        isAppLocal: import.meta.env.VITE_APP_IS_LOCAL,
      },
      zambdaClient,
    );
    _apiClient = client;
    setApiClient(client);
  }

  return apiClient;
};

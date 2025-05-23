import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, CircularProgress, Divider, Typography, useTheme } from '@mui/material';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link,
  Navigate,
  Outlet,
  generatePath,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import { ErrorDialog, ErrorDialogConfig, PageForm } from 'ui-components';
import { ZambdaClient, useUCZambdaClient } from 'ui-components/lib/hooks/useUCZambdaClient';
import {
  GetScheduleResponse,
  PatientInfo,
  ScheduleType,
  ServiceMode,
  VisitType,
  getSelectors,
  PROJECT_NAME,
  PROJECT_WEBSITE,
} from 'utils';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import zapehrApi, { AvailableLocationInformation } from '../api/zapehrApi';
import {
  BOOKING_SERVICE_MODE_PARAM,
  BOOKING_SLUG_PARAMS,
  BOOKING_VISIT_TYPE_PARAM,
  bookingBasePath,
  intakeFlowPageRoute,
} from '../App';
import { PageContainer, Schedule } from '../components';
import { WaitingEstimateCard } from '../components/WaitingEstimateCard';
import { PatientInfoInProgress } from '../features/patients/types';
import { NO_LOCATION_ERROR } from '../helpers';
import { useCheckOfficeOpen } from '../hooks/useCheckOfficeOpen';
import { usePreserveQueryParams } from '../hooks/usePreserveQueryParams';
import { ottehrLightBlue } from '@theme/icons';
import { SlotListItem } from 'utils/lib/utils';
import { Slot } from 'fhir/r4b';

type BookingState = {
  visitType: VisitType | undefined;
  serviceType: ServiceMode | undefined;
  scheduleType: ScheduleType | undefined;
  selectedLocationResponse: GetScheduleResponse | undefined;
  selectedSlot: string | undefined;
  patients: PatientInfo[];
  patientInfo: PatientInfoInProgress | undefined;
  unconfirmedDateOfBirth: string | undefined;
  slotData: SlotListItem[];
};

interface BookingStoreActions {
  setPatientInfo: (info: PatientInfoInProgress | undefined) => void;
  setPatients: (patients: PatientInfo[]) => void;
  setUnconfirmedDateOfBirth: (dob: string | undefined) => void;
  setSelectedLocationResponse: (location: GetScheduleResponse | undefined) => void;
  setSelectedSlot: (slotId: string | undefined) => void;
  setSlotData: (slotData: SlotListItem[]) => void;
  setScheduleType: (scheduleType: ScheduleType | undefined) => void;
  completeBooking: () => void;
  handleLogout: () => void;
}

const BOOKING_INITIAL: BookingState = {
  patients: [],
  patientInfo: undefined,
  unconfirmedDateOfBirth: undefined,
  selectedLocationResponse: undefined,
  selectedSlot: undefined,
  visitType: undefined,
  serviceType: undefined,
  scheduleType: undefined,
  slotData: [],
};

const useBookingStore = create<BookingState & BookingStoreActions>()(
  persist(
    (set) => ({
      ...BOOKING_INITIAL,
      clear: () => {
        set({
          ...BOOKING_INITIAL,
        });
      },
      setPatientInfo: (info: PatientInfoInProgress | undefined) => {
        set((state) => {
          let isNewPatientInfo = false;
          if (state.patientInfo && state.patientInfo.id !== info?.id) {
            isNewPatientInfo = true;
          }
          return {
            ...state,
            patientInfo: info,
            unconfirmedDateOfBirth: isNewPatientInfo ? undefined : state.unconfirmedDateOfBirth,
          };
        });
      },
      setPatients: (patients: PatientInfo[]) => {
        set((state) => ({
          ...state,
          patients,
        }));
      },
      setUnconfirmedDateOfBirth: (unconfirmedDateOfBirth: string | undefined) => {
        set((state) => ({
          ...state,
          unconfirmedDateOfBirth,
        }));
      },
      setVisitType: (visitType: VisitType | undefined) => {
        set((state) => ({
          ...state,
          visitType,
        }));
      },
      setScheduleType: (scheduleType: ScheduleType | undefined) => {
        set((state) => ({
          ...state,
          scheduleType,
        }));
      },
      setSelectedLocationResponse: (selectedLocationResponse: GetScheduleResponse | undefined) => {
        set((state) => ({
          ...state,
          selectedLocationResponse,
          slotData: selectedLocationResponse?.available ?? [],
        }));
      },
      setSlotData: (slotData: SlotListItem[]) => {
        set((state) => {
          return {
            ...state,
            slotData,
          };
        });
      },
      setSelectedSlot: (selectedSlot: string | undefined) => {
        set((state) => ({
          ...state,
          selectedSlot,
        }));
      },
      completeBooking: () => {
        set((state) => ({
          ...state,
          selectedSlot: undefined,
          patientInfo: undefined,
          unconfirmedDateOfBirth: undefined,
        }));
      },
      handleLogout: () => {
        set(() => ({
          ...BOOKING_INITIAL,
        }));
      },
    }),
    { name: 'ip-intake-booking-store' }
  )
);

enum LoadingState {
  initial,
  loading,
  complete,
}

interface BookAppointmentContext
  extends Omit<BookingState, 'selectedLocationResponse' | 'redirectToStart'>,
    Omit<
      BookingStoreActions,
      'setLocationPath' | 'setSelectedLocationResponse' | 'handleLogout' | 'setPatients' | 'setScheduleType'
    > {
  visitType: VisitType | undefined;
  selectedLocation: AvailableLocationInformation | undefined;
  slotData: SlotListItem[];
  waitingMinutes: number | undefined;
  locationLoading: boolean;
  patientsLoading: boolean;
  getSlotListItemWithId: (slotId: string) => SlotListItem | undefined;
}

export const useBookingContext = (): BookAppointmentContext => {
  const outletContext = useOutletContext<BookAppointmentContext>();
  return {
    ...outletContext,
  };
};

interface CustomContainerText {
  title: string;
  subtext?: string;
}

const isPostPatientSelectionPath = (basePath: string, pathToCheck: string): boolean => {
  // review is last step but we detect on submit instead so redirect doesnt jump
  // the transition to the appointment page
  const prepatientSelectionPaths = [basePath, `${basePath}/get-ready`, `${basePath}/patients`, `${basePath}/review`];
  const normalized = pathToCheck.split('?')[0];
  return !prepatientSelectionPaths.includes(normalized);
};

const BookingHome: FC = () => {
  const {
    selectedLocationResponse,
    patients,
    patientInfo,
    selectedSlot,
    unconfirmedDateOfBirth,
    scheduleType,
    slotData,
    setSelectedLocationResponse,
    setPatientInfo,
    setPatients,
    setUnconfirmedDateOfBirth,
    setSelectedSlot,
    completeBooking,
    setSlotData,
    handleLogout,
    setScheduleType,
  } = getSelectors(useBookingStore, [
    'patientInfo',
    'unconfirmedDateOfBirth',
    'selectedLocationResponse',
    'setSelectedLocationResponse',
    'patients',
    'visitType',
    'selectedSlot',
    'setPatientInfo',
    'setPatients',
    'setUnconfirmedDateOfBirth',
    'setSelectedSlot',
    'completeBooking',
    'setSlotData',
    'handleLogout',
    'scheduleType',
    'setScheduleType',
    'slotData',
  ]);
  const {
    [BOOKING_SLUG_PARAMS]: slugParam,
    [BOOKING_VISIT_TYPE_PARAM]: visitTypeParam,
    [BOOKING_SERVICE_MODE_PARAM]: serviceTypeParam,
  } = useParams();

  const [locationLoading, setLocationLoading] = useState(LoadingState.initial);
  const [patientsLoading, setPatientsLoading] = useState(LoadingState.initial);
  const { pathname, state: navState } = useLocation();
  const navigate = useNavigate();
  const tokenlessZambdaClient = useUCZambdaClient({ tokenless: true });
  const tokenfulZambdaClient = useUCZambdaClient({ tokenless: false });
  const [pageNotFound, setPageNotFound] = useState(false);
  const [errorConfig, setErrorConfig] = useState<ErrorDialogConfig | undefined>(undefined);
  const { isAuthenticated, isLoading: authIsLoading } = useAuth0();
  const { t } = useTranslation();

  useEffect(() => {
    const slot = navState?.slot as Slot | undefined;
    const scheduleType = navState?.scheduleType;
    if (slot?.id) {
      setSelectedSlot(slot?.id);
    }
    if (scheduleType && scheduleType in ScheduleType) {
      setScheduleType(scheduleType as ScheduleType);
    }
  }, [navState, setScheduleType, setSelectedSlot]);

  const scheduleTypeForFetch = useMemo(() => {
    return navState?.scheduleType ?? scheduleType;
  }, [navState?.scheduleType, scheduleType]);
  const outletContext: BookAppointmentContext = useMemo(() => {
    let selectedLocationTemp: AvailableLocationInformation | undefined = undefined;
    let waitingMinutesTemp: number | undefined = undefined;
    if (selectedLocationResponse) {
      selectedLocationTemp = selectedLocationResponse.location;
      waitingMinutesTemp = selectedLocationResponse.waitingMinutes;
    }
    let visitType = VisitType.PreBook;
    if (visitTypeParam === VisitType.WalkIn) {
      visitType = VisitType.WalkIn;
    }
    let serviceType = ServiceMode['in-person'];
    if (serviceTypeParam === ServiceMode.virtual) {
      serviceType = ServiceMode.virtual;
    }
    const getSlotListItemWithId = (slotId: string): SlotListItem | undefined => {
      return slotData.find((si) => `${si.slot.id}` === `${slotId}`);
    };
    return {
      patients,
      patientInfo,
      slotData,
      selectedLocation: selectedLocationTemp,
      waitingMinutes: waitingMinutesTemp,
      visitType,
      scheduleType,
      serviceType,
      locationLoading: locationLoading !== LoadingState.complete,
      patientsLoading: patientsLoading !== LoadingState.complete,
      selectedSlot,
      unconfirmedDateOfBirth,
      setPatientInfo,
      setUnconfirmedDateOfBirth,
      setSelectedSlot,
      completeBooking,
      setSlotData,
      getSlotListItemWithId,
    };
  }, [
    selectedLocationResponse,
    visitTypeParam,
    serviceTypeParam,
    patients,
    patientInfo,
    scheduleType,
    locationLoading,
    patientsLoading,
    selectedSlot,
    unconfirmedDateOfBirth,
    setPatientInfo,
    setUnconfirmedDateOfBirth,
    setSelectedSlot,
    completeBooking,
    setSlotData,
    slotData,
  ]);
  const { walkinOpen } = useCheckOfficeOpen(outletContext.selectedLocation);

  useEffect(() => {
    if (!isAuthenticated && !authIsLoading) {
      handleLogout();
    }
  }, [authIsLoading, handleLogout, isAuthenticated, setScheduleType]);

  // console.log('outlet context in root', outletContext);

  useEffect(() => {
    const fetchLocation = async (locationSlug: string, scheduleType: ScheduleType, isWalkin: boolean): Promise<any> => {
      try {
        if (!tokenlessZambdaClient) {
          return;
        }
        setLocationLoading(LoadingState.loading);
        console.log('schedule type sluggo: ', scheduleType, locationSlug);
        // temporarily hardcoding the params for the walkin case here due to a bug with the dynamic values
        // and plans to overhaul this page in the near future
        let scheduleTypeForFetch = scheduleType ?? ScheduleType.location;
        let locationSlugForFetch = locationSlug;
        if (isWalkin) {
          scheduleTypeForFetch = ScheduleType.location;
          locationSlugForFetch = 'testing';
        }
        const res = await zapehrApi.getSchedule(tokenlessZambdaClient, {
          scheduleType: scheduleTypeForFetch,
          slug: locationSlugForFetch,
          isWalkin,
        });
        setSelectedLocationResponse(res);
      } catch (error) {
        setPageNotFound(true);
        console.error('Error validating location: ', error);
      } finally {
        setLocationLoading(LoadingState.complete);
      }
    };

    // So long as / is a valid path or auth0 redirects to /, this must be here. Otherwise the
    // function is called with no slug parameter and overwrites the contents of local storage.
    if (slugParam && locationLoading === LoadingState.initial && scheduleTypeForFetch && visitTypeParam !== undefined) {
      void fetchLocation(slugParam, scheduleTypeForFetch, visitTypeParam === VisitType.WalkIn);
    }
  }, [
    locationLoading,
    scheduleTypeForFetch,
    setSelectedLocationResponse,
    slugParam,
    tokenlessZambdaClient,
    visitTypeParam,
  ]);

  useEffect(() => {
    async function getPatients(): Promise<void> {
      if (!tokenfulZambdaClient) {
        return;
      }
      setPatientsLoading(LoadingState.loading);

      const response = await zapehrApi.getPatients(tokenfulZambdaClient);
      const patients = response.patients;

      if (patients.length > 0) {
        setPatients(patients);
      } else {
        // Navigate to NewUser if patients not found
        if (slugParam && visitTypeParam && serviceTypeParam) {
          const basePath = generatePath(bookingBasePath, {
            slug: slugParam,
            visit_type: visitTypeParam ?? 'prebook',
            service_mode: serviceTypeParam,
          });
          // if walkin is open or the base path contains prebook, redirect to new-user page
          if (visitTypeParam == 'walkin') {
            if (walkinOpen) {
              navigate(`${basePath}/new-user`);
            } else {
              // if walkin is closed, redirect to the walkin closed page
              navigate(basePath);
            }
          } else if (visitTypeParam == 'prebook') {
            navigate(`${basePath}/new-user`, {
              state: { slot: navState?.slot, scheduleType: navState?.scheduleType },
            });
          }
        }
        // navigate to the root domain (localhost:3002 or welcome.ottehr.com) if either of stateParam or slugParam or visitTypeParam are undefined.
        else {
          navigate('');
        }
      }
    }

    if (isAuthenticated && slugParam && patientsLoading === LoadingState.initial) {
      getPatients()
        .catch((error) => {
          console.log(error);
        })
        .finally(() => setPatientsLoading(LoadingState.complete));
    }
  }, [
    isAuthenticated,
    setPatients,
    slugParam,
    tokenfulZambdaClient,
    patientsLoading,
    visitTypeParam,
    walkinOpen,
    navigate,
    serviceTypeParam,
    selectedSlot,
    scheduleType,
    navState,
  ]);

  useEffect(() => {
    const recoverFromLostData = async (slug: string, zambdaClient: ZambdaClient): Promise<void> => {
      try {
        const res = await zapehrApi.getSchedule(zambdaClient, {
          slug,
          scheduleType: scheduleType ?? ScheduleType.location,
        });
        setSelectedLocationResponse(res);
      } catch (e) {
        console.error('selected location unexpectedly missing from store -- could not recover');
        // show an error asking user to go to front desk
        setErrorConfig(NO_LOCATION_ERROR(t));
        return;
      }
    };
    if (
      !outletContext.selectedLocation &&
      locationLoading === LoadingState.complete &&
      slugParam &&
      tokenlessZambdaClient
    ) {
      console.error('selected location unexpectedly missing from store -- attempting recovery');
      void recoverFromLostData(slugParam, tokenlessZambdaClient);
    }
  }, [
    locationLoading,
    outletContext.selectedLocation,
    setSelectedLocationResponse,
    slugParam,
    tokenlessZambdaClient,
    t,
    scheduleType,
  ]);

  const renderWelcome = useMemo(() => {
    if (pathname === '/') {
      return true;
    }
    console.log('pathname', pathname);
    if (slugParam && visitTypeParam && serviceTypeParam && scheduleType) {
      const solvedPath = generatePath(bookingBasePath, {
        slug: slugParam,
        visit_type: visitTypeParam,
        service_mode: serviceTypeParam,
      });
      if (solvedPath === pathname) {
        return true;
      } else {
        return false;
      }
    }
    console.log('returning false from renderWelcome');
    return false; // figure out what to do here
  }, [pathname, scheduleType, serviceTypeParam, slugParam, visitTypeParam]);

  // all this is to say, "if the user wound up somewhere in
  // the booking flow by finishing the booking and then pounding
  // the back button, escort them gently to the start of the flow"
  if (!patientInfo) {
    if (slugParam && visitTypeParam && serviceTypeParam) {
      const solvedPath = generatePath(pathname, {
        slug: slugParam,
        visit_type: visitTypeParam ?? 'prebook',
        service_type: serviceTypeParam,
        schedule_type: scheduleType || ScheduleType.location,
      });
      const basePath = generatePath(bookingBasePath, {
        slug: slugParam,
        visit_type: visitTypeParam ?? 'prebook',
        service_mode: serviceTypeParam,
      });
      const shouldStartAtBeginning = isPostPatientSelectionPath(basePath, solvedPath) && !patientsLoading;
      // console.log('basePath, solvedPath, shouldSAB', basePath, solvedPath, shouldStartAtBeginning);
      if (shouldStartAtBeginning) {
        return <Navigate to={basePath} replace={true} />;
      }
    } else {
      console.log('there is NOT patient info');
    }
  } else {
    console.log('there is patient info');
  }

  if (pageNotFound) {
    return (
      <PageContainer title={t('welcome.errors.notFound.title')}>
        <Typography variant="body1">
          {t('welcome.errors.notFound.description', { PROJECT_NAME })}{' '}
          <a href={`${PROJECT_WEBSITE}/find-care/`}>{t('welcome.errors.notFound.link')}</a>.
        </Typography>
      </PageContainer>
    );
  }

  if (!selectedLocationResponse) {
    /*
     * TODO: Component requires refactoring
     *
     * Current implementation has the following issues:
     * - Race conditions between parent component's useEffect and internal logic of child components
     * - Contains complex navigation logic
     * - Potential for collisions
     * - Not decomposed and contains too much code
     *
     * Issue with incorrect welcome page redirect https://github.com/masslight/ottehr/issues/908:
     * 1. selectedLocationResponse is set asynchronously in useEffect
     * 2. renderWelcome chooses component to render immediately, without waiting for selectedLocationResponse
     * 3. Rendered component depends on selectedLocationResponse value
     *
     * Possible scenarios:
     * A. With empty LocalStorage (bug-case):
     *    - Outlet renders without selectedLocationResponse
     *    - Incorrect redirect to welcome page occurs
     *
     * B. With non-empty LocalStorage:
     *    - selectedLocationResponse is retrieved from LocalStorage
     *    - Incorrect redirect does not occur
     *
     * Current solution:
     * To fix bug-case - display loading screen while selectedLocationResponse is not set,
     * and preventing Outlet render in pending state causing incorrect redirect to welcome page
     */
    return (
      <PageContainer title={t('welcome.loading')}>
        <CircularProgress />
      </PageContainer>
    );
  }

  return (
    <>
      {renderWelcome ? <Welcome context={outletContext} /> : <Outlet context={{ ...outletContext }} />}
      <ErrorDialog
        open={errorConfig != undefined}
        title={errorConfig?.title ?? ''}
        description={errorConfig?.description ?? ''}
        closeButtonText={errorConfig?.closeButtonText ?? t('reviewAndSubmit.ok')}
        handleClose={() => {
          setErrorConfig(undefined);
        }}
      />
    </>
  );
};

const Welcome: FC<{ context: BookAppointmentContext }> = ({ context }) => {
  const navigate = useNavigate();
  const { slug: slugParam, visit_type: visitTypeParam, [BOOKING_SERVICE_MODE_PARAM]: serviceTypeParam } = useParams();
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const [errorConfig, setErrorConfig] = useState<ErrorDialogConfig | undefined>(undefined);
  const theme = useTheme();
  const preserveQueryParams = usePreserveQueryParams();
  const { t } = useTranslation();

  console.log('isAuthenticated in welcome page', isAuthenticated);

  const { selectedLocation, selectedSlot, waitingMinutes, slotData, locationLoading, scheduleType, setSelectedSlot } =
    context;

  // console.log('selectedLocation, locationLoading', selectedLocation, locationLoading, context);

  const { officeOpen, walkinOpen, officeHasClosureOverrideToday, officeHasClosureOverrideTomorrow } =
    useCheckOfficeOpen(selectedLocation);

  const allAvailableSlots = useMemo(() => {
    if (!selectedSlot) {
      return slotData;
    } else {
      const selected = slotData?.find((si) => si.slot.id === selectedSlot);
      const allButSelected =
        slotData?.filter((si) => {
          return si.slot.id !== selectedSlot;
        }) ?? [];
      // todo: this shouldn't be necessary...
      const toSort = [...allButSelected];
      if (selected) {
        toSort.push(selected);
      }
      return [...toSort].sort((a: SlotListItem, b: SlotListItem) => a.slot.start.localeCompare(b.slot.start));
    }
  }, [slotData, selectedSlot]);

  const getCustomContainerText = (): CustomContainerText => {
    if (visitTypeParam === VisitType.PreBook) {
      return { title: t('welcome.title') };
    } else if (visitTypeParam === VisitType.WalkIn && !walkinOpen && !locationLoading) {
      return { title: t('welcome.titleClosed', { PROJECT_NAME }) };
    } else {
      return { title: t('welcome.titleBranded', { PROJECT_NAME }), subtext: t('welcome.subtitleBranded') };
    }
  };

  const { title, subtext } = getCustomContainerText();

  // console.log('selected slot', selectedSlot);

  return (
    <PageContainer
      title={title}
      subtitle={locationLoading ? t('welcome.loading') : `${selectedLocation?.name}`}
      subtext={locationLoading ? '' : subtext}
      isFirstPage
      img={ottehrLightBlue}
      imgAlt="ottehr icon"
      imgWidth={150}
      topOutsideCardComponent={
        visitTypeParam === VisitType.PreBook && officeOpen ? (
          <WaitingEstimateCard waitingMinutes={waitingMinutes} />
        ) : undefined
      }
    >
      {visitTypeParam === VisitType.PreBook && (
        <>
          <Schedule
            slotsLoading={locationLoading}
            slotData={allAvailableSlots.map((si) => si.slot)}
            timezone={selectedLocation?.timezone || 'America/New_York'}
            existingSelectedSlot={slotData?.find((si) => si.slot.id && si.slot.id === selectedSlot)?.slot}
            handleSlotSelected={(slot) => {
              setSelectedSlot(slot.id);
              navigate(
                preserveQueryParams(`/${scheduleType}/${slugParam}/${visitTypeParam}/${serviceTypeParam}/get-ready`),
                {
                  state: { waitingTime: waitingMinutes?.toString() },
                }
              );
            }}
            forceClosedToday={officeHasClosureOverrideToday}
            forceClosedTomorrow={officeHasClosureOverrideTomorrow}
          />
          <Divider sx={{ marginTop: 3, marginBottom: 3 }} />
          <Typography variant="h4" color={theme.palette.primary.main}>
            {t('welcome.dontSeeTime')}
          </Typography>
        </>
      )}
      {visitTypeParam === VisitType.WalkIn &&
        (!locationLoading ? (
          walkinOpen ? (
            <>
              <Typography variant="body1" marginTop={2}>
                {t('welcome.walkinOpen.title')}
              </Typography>
              <PageForm
                onSubmit={(_) => {
                  if (!isAuthenticated) {
                    // if the user is not signed in, redirect them to auth0
                    loginWithRedirect({
                      appState: {
                        target: preserveQueryParams(
                          `/${scheduleType}/${slugParam}/${visitTypeParam}/${serviceTypeParam}/patients`
                        ),
                      },
                    }).catch((error) => {
                      throw new Error(`Error calling loginWithRedirect Auth0: ${error}`);
                    });
                  } else {
                    // if the location has loaded and the user is signed in, redirect them to the landing page
                    navigate(intakeFlowPageRoute.Homepage.path);
                  }
                }}
                controlButtons={{ backButton: false }}
              />
              <ErrorDialog
                open={errorConfig != undefined}
                title={errorConfig?.title ?? ''}
                description={errorConfig?.description ?? ''}
                closeButtonText={errorConfig?.closeButtonText ?? 'OK'}
                handleClose={() => {
                  setErrorConfig(undefined);
                }}
              />
            </>
          ) : (
            <>
              <Typography variant="body1" marginTop={1}>
                {t('welcome.errors.closed.description')}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2.5 }}>
                <Link to={PROJECT_WEBSITE} aria-label={`${PROJECT_NAME} website`} target="_blank">
                  <Button variant="contained" color="primary">
                    {t('welcome.goToWebsite', { PROJECT_NAME })}
                  </Button>
                </Link>
              </Box>
            </>
          )
        ) : (
          <CircularProgress />
        ))}
    </PageContainer>
  );
};

export default BookingHome;

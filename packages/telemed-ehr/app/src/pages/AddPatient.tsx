import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { ZambdaClient } from '@zapehr/sdk';
import { Location, Patient, Resource } from 'fhir/r4';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { PatternFormat } from 'react-number-format';
import { useNavigate } from 'react-router-dom';
import { GetLocationParameters, GetLocationResponse, createAppointment, getLocations } from '../api/api';
import CustomBreadcrumbs from '../components/CustomBreadcrumbs';
import { CustomDialog } from '../components/dialogs/CustomDialog';
import DateSearch from '../components/DateSearch';
import LocationSelect from '../components/LocationSelect';
import { MAXIMUM_CHARACTER_LIMIT, ReasonForVisitOptions } from '../constants';
import { useApiClients } from '../hooks/useAppClients';
import PageContainer from '../layout/PageContainer';
import { CreateAppointmentParameters, PersonSex, VisitType } from '../types/types';
import { PRIVATE_EXTENSION_BASE_URL } from 'ehr-utils';
import SlotPicker from '../components/SlotPicker';

type SlotLoadingState =
  | { status: 'initial'; input: undefined }
  | { status: 'loading'; input: undefined }
  | { status: 'loaded'; input: string };

export default function AddPatient(): JSX.Element {
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(undefined);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<DateTime | null>(null);
  const [sex, setSex] = useState<PersonSex | ''>('');
  const [mobilePhone, setMobilePhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [reasonForVisit, setReasonForVisit] = useState<string[]>([]);
  const [visitType, setVisitType] = useState<VisitType>();
  const [slot, setSlot] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ age?: boolean; submit?: boolean; phone?: boolean; search?: boolean }>({
    age: false,
    submit: false,
    phone: false,
    search: false,
  });
  const [loadingSlotState, setLoadingSlotState] = useState<SlotLoadingState>({ status: 'initial', input: undefined });
  const [locationWithSlotData, setLocationWithSlotData] = useState<GetLocationResponse | undefined>(undefined);
  const [inputValue, setInputValue] = useState<string>('');
  const [validDate, setValidDate] = useState<boolean>(true);
  const [selectSlotDialogOpen, setSelectSlotDialogOpen] = useState<boolean>(false);
  const [validReasonForVisit, setValidReasonForVisit] = useState<boolean>(true);
  const [openSearchResults, setOpenSearchResults] = useState<boolean>(false);
  const [patients, setPatients] = useState<Patient[] | undefined>(undefined);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);
  const [showFields, setShowFields] = useState<{ prefillForSelected?: boolean; forcePatientSearch?: boolean }>({
    prefillForSelected: false,
    forcePatientSearch: true,
  });

  // general variables
  const theme = useTheme();
  const navigate = useNavigate();
  const { zambdaIntakeClient, fhirClient } = useApiClients();
  const reasonForVisitErrorMessage = `Input cannot be more than ${MAXIMUM_CHARACTER_LIMIT} characters`;
  const phoneNumberErrorMessage = 'Phone number must be 10 digits';

  const handleReasonsForVisitChange = (newValues: string[]): void => {
    setValidReasonForVisit(newValues.join(', ').length <= MAXIMUM_CHARACTER_LIMIT);
    setReasonForVisit(newValues);
  };

  useEffect(() => {
    const fetchLocationWithSlotData = async (params: GetLocationParameters, client: ZambdaClient): Promise<void> => {
      setLoadingSlotState({ status: 'loading', input: undefined });
      try {
        if (!zambdaIntakeClient) throw new Error('Zambda client not found');
        const locationResponse = await getLocations(zambdaIntakeClient, params);
        setLocationWithSlotData(locationResponse);
      } catch (e) {
        console.error('error loading location with slot data', e);
      } finally {
        setLoadingSlotState({ status: 'loaded', input: `${params.locationState}-${params.slug}` });
      }
    };
    const locationSlug = selectedLocation?.identifier?.find(
      (identifierTemp) => identifierTemp.system === 'https://fhir.ottehr.com/r4/slug',
    )?.value;
    const locationState = selectedLocation?.address?.state;
    if (!locationSlug || !locationState) {
      console.log(
        'show some toast: location is missing slug or address.state',
        selectedLocation,
        locationSlug,
        locationState,
      );
      return;
    }
    if (
      !zambdaIntakeClient ||
      loadingSlotState.status === 'loading' ||
      (loadingSlotState.status === 'loaded' && loadingSlotState.input === `${locationState}-${locationSlug}`)
    ) {
      return;
    }
    void fetchLocationWithSlotData({ slug: locationSlug, locationState, scheduleType: 'location' }, zambdaIntakeClient);
  }, [selectedLocation, loadingSlotState, zambdaIntakeClient]);

  // handle functions
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (mobilePhone.length !== 10) {
      setErrors({ phone: true });
      return;
    } else {
      setErrors({});
    }

    if (visitType === VisitType.Prebook && slot === undefined) {
      setSelectSlotDialogOpen(true);
      return;
    }
    if (showFields.forcePatientSearch) {
      setErrors({ search: true });
      return;
    } else {
      setErrors({ ...errors, search: false });
    }

    if (validDate && validReasonForVisit) {
      setLoading(true);

      let selectedPatientEmail, selectedPatientEmailUser;
      if (selectedPatient) {
        selectedPatientEmailUser = selectedPatient.extension?.find(
          (ext) => ext.url === `${PRIVATE_EXTENSION_BASE_URL}/form-user`,
        )?.valueString as any;
        if (selectedPatientEmailUser) {
          if (selectedPatientEmailUser !== 'Parent/Guardian') {
            selectedPatientEmail = selectedPatient.telecom?.find((telecom) => telecom.system === 'email')?.value;
          } else if (selectedPatientEmailUser === 'Parent/Guardian') {
            const guardianContact = selectedPatient.contact?.find((contact) =>
              contact.relationship?.find((relationship) => relationship?.coding?.[0].code === 'Parent/Guardian'),
            );
            selectedPatientEmail = guardianContact?.telecom?.find((telecom) => telecom.system === 'email')?.value;
          }
        }
      }

      const emailToUse = selectedPatientEmail || email;
      let emailUser = selectedPatientEmailUser;
      if (emailUser == undefined && emailToUse) {
        emailUser = 'Parent/Guardian';
      }

      if (!zambdaIntakeClient) throw new Error('Zambda client not found');
      const zambdaParams: CreateAppointmentParameters = {
        patient: {
          id: selectedPatient?.id,
          newPatient: !selectedPatient,
          firstName: selectedPatient?.name?.[0].given?.join(' ') || firstName,
          lastName: selectedPatient?.name?.[0].family || lastName,
          dateOfBirth: selectedPatient?.birthDate || birthDate?.toISODate() || undefined,
          sex: (selectedPatient?.gender as PersonSex) || sex || undefined,
          phoneNumber: mobilePhone,
          email: emailToUse,
          emailUser,
          reasonForVisit: reasonForVisit,
        },
        slot: slot,
        visitType: visitType,
        locationID: selectedLocation?.id,
        scheduleType: 'location',
        visitService: 'in-person',
      };

      let response;
      let apiErr = false;
      try {
        response = await createAppointment(zambdaIntakeClient, zambdaParams);
      } catch (error) {
        console.error(`Failed to add patient: ${error}`);
        apiErr = true;
      } finally {
        setLoading(false);
        if (!response.error && !apiErr) {
          navigate('/visits');
        } else {
          if (response.error.includes('Patient age must be between')) {
            setErrors({ age: true });
          } else {
            setErrors({ submit: true });
          }
        }
      }
    }
  };
  // console.log(slot);

  const handlePatientSearch = async (e: any): Promise<void> => {
    e.preventDefault();
    if (mobilePhone.length !== 10) {
      setErrors({ ...errors, phone: true });
      return;
    }
    setSearching(true);
    setErrors({ ...errors, search: false });
    setShowFields({ ...showFields, forcePatientSearch: false });

    if (!fhirClient) {
      return;
    }
    const resources: Resource[] = await fhirClient.searchResources({
      resourceType: 'Person',
      searchParams: [
        {
          name: 'telecom',
          value: `+1${mobilePhone}`,
        },
        {
          name: '_include',
          value: 'Person:relatedperson',
        },
        {
          name: '_include:iterate',
          value: 'RelatedPerson:patient',
        },
      ],
    });
    const patients = resources.filter((resourceTemp) => resourceTemp.resourceType === 'Patient') as Patient[];
    patients.sort(sortPatientsByName);
    setPatients(patients);
    setOpenSearchResults(true);
    setSearching(false);
  };

  const sortPatientsByName = (a: Patient, b: Patient): number => {
    const lastNameA = a?.name?.[0].family;
    const lastNameB = b?.name?.[0].family;
    const firstNameA = a?.name?.[0].given?.join(' ');
    const firstNameB = b?.name?.[0].given?.join(' ');
    if (lastNameA && lastNameB && firstNameA && firstNameB) {
      // sort by last name
      if (lastNameA < lastNameB) {
        return -1;
      } else if (lastNameA > lastNameB) {
        return 1;
      } else {
        // if same last name, sort by first name
        return firstNameA.localeCompare(firstNameB);
      }
    } else {
      return 0;
    }
  };

  const getEmailForPatient = (patient: Patient): string => {
    let email;
    const emailUser = patient.extension?.find((ext) => ext.url === `${PRIVATE_EXTENSION_BASE_URL}/form-user`)
      ?.valueString as any;
    if (emailUser) {
      if (emailUser === 'Parent/Guardian') {
        const guardianContact = patient.contact?.find((contact) =>
          contact.relationship?.find((relationship) => relationship?.coding?.[0].code === 'Parent/Guardian'),
        );
        email = guardianContact?.telecom?.find((telecom) => telecom.system === 'email')?.value;
      } else {
        email = patient.telecom?.find((telecom) => telecom.system === 'email')?.value;
      }
    }
    return email || 'not found';
  };

  const handleSelectPatient = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selected = patients?.find((patient) => patient.id === event.target.value);
    setSelectedPatient(selected);
  };

  return (
    <PageContainer>
      <Grid container direction="row">
        <Grid item xs={3.5} />
        <Grid item xs={5}>
          <CustomBreadcrumbs
            chain={[
              { link: '/visits', children: 'In Person' },
              { link: '#', children: 'Add Patient' },
            ]}
          />

          {/* page title */}

          <Typography variant="h3" marginTop={1} color={'primary.dark'}>
            Add Patient
          </Typography>

          {/* form content */}
          <Paper>
            <form onSubmit={(e) => handleFormSubmit(e)}>
              <Box padding={3} marginTop={2}>
                {/* Location Select */}
                <Typography variant="h4" color="primary.dark">
                  Office
                </Typography>

                {/* location search */}
                <Box sx={{ marginTop: 2 }}>
                  <LocationSelect
                    location={selectedLocation}
                    setLocation={setSelectedLocation}
                    updateURL={false}
                    required
                    renderInputProps={{ disabled: false }}
                  />
                </Box>

                {/* Patient information */}
                <Box>
                  <Typography variant="h4" color="primary.dark" sx={{ marginTop: 4 }}>
                    Patient information
                  </Typography>
                  <Box marginTop={2}>
                    <Grid container>
                      <Grid item xs={8}>
                        <PatternFormat
                          customInput={TextField}
                          value={mobilePhone}
                          format="(###) ###-####"
                          mask=" "
                          label="Mobile Phone"
                          variant="outlined"
                          placeholder="(XXX) XXX-XXXX"
                          fullWidth
                          required
                          error={errors.phone}
                          helperText={errors?.phone ? phoneNumberErrorMessage : ''}
                          onValueChange={(values, sourceInfo) => {
                            if (sourceInfo.source === 'event') {
                              setMobilePhone(values.value);
                              if (errors.phone && values.value.length === 10) {
                                setErrors({ ...errors, phone: false });
                              }
                            }
                          }}
                        />
                      </Grid>
                      <Grid
                        item
                        xs={4}
                        sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', padding: '0 8px' }}
                      >
                        <LoadingButton
                          variant="contained"
                          onClick={(event) => handlePatientSearch(event)}
                          loading={searching}
                          sx={{
                            borderRadius: 100,
                            textTransform: 'none',
                            fontWeight: 600,
                          }}
                        >
                          Search for Patients
                        </LoadingButton>
                      </Grid>
                    </Grid>
                  </Box>
                  <Dialog
                    open={openSearchResults}
                    onClose={() => {
                      setSelectedPatient(undefined);
                      setOpenSearchResults(false);
                    }}
                  >
                    <Box
                      sx={{ minWidth: '600px', borderRadius: '4px', p: '35px', maxHeight: '450px', overflow: 'scroll' }}
                    >
                      <Box>
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: '600 !important', color: theme.palette.primary.main, marginBottom: '4px' }}
                        >
                          Select an Existing QRS Patient
                        </Typography>
                      </Box>
                      <Box>
                        <RadioGroup onChange={(e) => handleSelectPatient(e)}>
                          {patients?.map((patient) => {
                            const label = `${patient.name?.[0].family}, ${
                              patient.name?.[0].given
                            } (DOB: ${DateTime.fromISO(patient?.birthDate || '').toFormat('MMMM dd, yyyy')})`;
                            return (
                              <FormControlLabel key={patient.id} value={patient.id} control={<Radio />} label={label} />
                            );
                          })}
                        </RadioGroup>
                      </Box>
                      {selectedPatient && (
                        <Box sx={{ marginTop: 2 }}>
                          <Button
                            variant="outlined"
                            sx={{
                              borderRadius: 100,
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                            onClick={() => {
                              setShowFields({ ...showFields, prefillForSelected: true });
                              setOpenSearchResults(false);
                            }}
                          >
                            Prefill for {selectedPatient?.name?.[0].given}
                          </Button>
                        </Box>
                      )}
                      <Box sx={{ marginTop: 2 }}>
                        <Button
                          variant="contained"
                          sx={{
                            borderRadius: 100,
                            textTransform: 'none',
                            fontWeight: 600,
                          }}
                          onClick={() => {
                            setSelectedPatient(undefined);
                            setShowFields({ ...showFields, prefillForSelected: false });
                            setOpenSearchResults(false);
                          }}
                        >
                          Patient Not Found in QRS - Add Manually
                        </Button>
                      </Box>
                    </Box>
                  </Dialog>
                  {searching && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }} marginTop={2}>
                      <CircularProgress />
                    </Box>
                  )}
                  {showFields.prefillForSelected && selectedPatient && (
                    <Box marginTop={3}>
                      <Typography variant="h4" color="primary.dark">
                        {selectedPatient.name?.[0].given} {selectedPatient.name?.[0].family}
                      </Typography>
                      <Typography>
                        Birthday: {DateTime.fromISO(selectedPatient?.birthDate || '').toFormat('MMMM dd, yyyy')}
                      </Typography>
                      <Typography>Birth Sex: {selectedPatient.gender}</Typography>
                      <Typography>Email: {getEmailForPatient(selectedPatient)}</Typography>
                    </Box>
                  )}
                  {!showFields.forcePatientSearch && !showFields.prefillForSelected && !searching && (
                    <Box marginTop={2}>
                      <Box>
                        <Grid container direction="row" justifyContent="space-between">
                          <Grid item xs={5.85}>
                            <TextField
                              label="First Name"
                              variant="outlined"
                              required
                              fullWidth
                              onChange={(event) => {
                                setFirstName(event.target.value);
                              }}
                            ></TextField>
                          </Grid>
                          <Grid item xs={5.85}>
                            <TextField
                              label="Last Name"
                              variant="outlined"
                              required
                              fullWidth
                              onChange={(event) => {
                                setLastName(event.target.value);
                              }}
                            ></TextField>
                          </Grid>
                        </Grid>
                      </Box>

                      <Box marginTop={2}>
                        <Grid container direction="row" justifyContent="space-between">
                          <Grid item xs={5.85}>
                            <DateSearch
                              date={birthDate}
                              setDate={setBirthDate}
                              defaultValue={null}
                              label="Date of birth"
                              required
                              setIsValidDate={setValidDate}
                            ></DateSearch>
                          </Grid>
                          <Grid item xs={5.85}>
                            <FormControl fullWidth>
                              <InputLabel id="sex-at-birth-label">Sex at birth *</InputLabel>
                              <Select
                                labelId="sex-at-birth-label"
                                id="sex-at-birth-select"
                                value={sex}
                                label="Sex at birth *"
                                required
                                onChange={(event) => {
                                  setSex(event.target.value as PersonSex);
                                }}
                              >
                                <MenuItem value={PersonSex.Male}>Male</MenuItem>
                                <MenuItem value={PersonSex.Female}>Female</MenuItem>
                                <MenuItem value={PersonSex.Intersex}>Intersex</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Box>

                      <Box marginTop={2}>
                        <Grid container direction="row" justifyContent="space-between">
                          <Grid item xs={12}>
                            <TextField
                              required
                              label="Email"
                              variant="outlined"
                              fullWidth
                              onChange={(event) => {
                                setEmail(event.target.value);
                              }}
                              type="email"
                            ></TextField>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Visit Information */}
                {!showFields.forcePatientSearch && !searching && (
                  <Box marginTop={4}>
                    <Typography variant="h4" color="primary.dark">
                      Visit information
                    </Typography>
                    <Box marginTop={2}>
                      <Autocomplete
                        multiple
                        autoComplete
                        disableClearable
                        forcePopupIcon
                        id="reason-for-visit-label"
                        options={ReasonForVisitOptions}
                        freeSolo
                        value={reasonForVisit}
                        inputValue={inputValue}
                        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
                        onChange={(_, newValue) => handleReasonsForVisitChange(newValue)}
                        onBlur={() => {
                          if (inputValue.trim() !== '') {
                            handleReasonsForVisitChange([...reasonForVisit, inputValue.trim()]);
                          }
                          setInputValue('');
                        }}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip variant="outlined" label={option} {...getTagProps({ index })} sx={{ fontSize: 16 }} />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Reason for visit"
                            variant="outlined"
                            fullWidth
                            required={reasonForVisit.length === 0}
                            error={!validReasonForVisit}
                            helperText={validReasonForVisit ? '' : reasonForVisitErrorMessage}
                          />
                        )}
                        sx={{
                          width: '100%',
                          mt: 2,
                          '& .MuiFilledInput-root': {
                            fontSize: 16,
                            p: 0.5,
                            border: '1px solid',
                            borderRadius: 2,
                            '&::before, ::after, :hover:not(.Mui-disabled, .Mui-error)::before': {
                              borderBottom: 0,
                            },
                          },
                        }}
                      />
                    </Box>
                    <Box marginTop={2}>
                      <FormControl fullWidth>
                        <InputLabel id="visit-type-label">Visit type *</InputLabel>
                        <Select
                          labelId="visit-type-label"
                          id="visit-type-select"
                          value={visitType || ''}
                          label="Visit type *"
                          required
                          onChange={(event) => {
                            setSlot(undefined);
                            setVisitType(event.target.value as VisitType);
                          }}
                        >
                          <MenuItem value={VisitType.Now}>Now</MenuItem>
                          <MenuItem value={VisitType.Prebook}>Pre-booked visit</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    {visitType === VisitType.Prebook && (
                      <SlotPicker
                        slotData={locationWithSlotData?.availableSlots}
                        slotsLoading={loadingSlotState.status === 'loading'}
                        timezone={locationWithSlotData?.timezone || 'Undefined'}
                        selectedSlot={slot}
                        setSelectedSlot={setSlot}
                      />
                    )}
                  </Box>
                )}

                {showFields.forcePatientSearch && (
                  <Box marginTop={4}>
                    <Typography variant="body1" color="primary.dark">
                      Please enter the mobile number and search for existing patients before proceeding.
                    </Typography>
                  </Box>
                )}

                {/* form buttons */}
                <Box marginTop={4}>
                  {errors.submit && (
                    <Typography color="error" variant="body2" mb={2}>
                      Failed to add patient. Please try again.
                    </Typography>
                  )}
                  {errors.search && (
                    <Typography color="error" variant="body2" mb={2}>
                      Please search for patients before adding
                    </Typography>
                  )}
                  {errors.age && (
                    <Typography color="error" variant="body2" mb={2}>
                      Patient age must be between 0 and 120 years
                    </Typography>
                  )}
                  <LoadingButton
                    variant="contained"
                    type="submit"
                    loading={loading || searching}
                    sx={{
                      borderRadius: 100,
                      textTransform: 'none',
                      fontWeight: 600,
                      marginRight: 1,
                    }}
                  >
                    Add {visitType}
                  </LoadingButton>
                  <Button
                    sx={{
                      borderRadius: 100,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                    onClick={() => {
                      navigate('/visits');
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </form>
            <CustomDialog
              open={selectSlotDialogOpen}
              title="Please select a date and time"
              description="To continue, please select an available appointment."
              closeButtonText="Close"
              handleClose={() => setSelectSlotDialogOpen(false)}
            />
          </Paper>
        </Grid>

        <Grid item xs={3.5} />
      </Grid>
    </PageContainer>
  );
}

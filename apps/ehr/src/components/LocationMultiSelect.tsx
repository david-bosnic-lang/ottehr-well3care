import { Autocomplete, Checkbox, TextField, useTheme } from '@mui/material';
import { Location } from 'fhir/r4b';
import { Dispatch, ReactElement, SetStateAction, useEffect } from 'react';
import { useApiClients } from '../hooks/useAppClients';

interface LocationMultiSelectProps {
  setLocations: Dispatch<SetStateAction<Location[]>>;
  setSelectedLocations: Dispatch<
    SetStateAction<{ label: string | undefined; id: string | undefined; location: Location }[]>
  >;
  locations: Location[];
  selectedLocations: { label: string | undefined; id: string | undefined; location: Location }[];
}

export default function LocationMultiSelect({
  setLocations,
  setSelectedLocations,
  locations,
  selectedLocations,
}: LocationMultiSelectProps): ReactElement {
  const { oystehr } = useApiClients();
  const theme = useTheme();

  useEffect(() => {
    async function locationsResults(): Promise<void> {
      if (!oystehr) {
        return;
      }

      const locationsResults = (
        await oystehr.fhir.search<Location>({
          resourceType: 'Location',
          params: [{ name: '_count', value: '1000' }],
        })
      ).unbundle();
      setLocations(locationsResults);
    }

    locationsResults().catch((error) => console.log(error));
  }, [oystehr, setLocations]);

  const suggestions =
    locations.length > 0
      ? locations.map((location) => {
          return { label: location.name, id: location.id, location: location };
        })
      : [];

  return (
    <div>
      <Autocomplete
        options={suggestions}
        value={selectedLocations}
        onChange={(_, newValue) => {
          setSelectedLocations(newValue);
        }}
        getOptionLabel={(option) => option.label ?? ''}
        multiple
        disableCloseOnSelect
        renderInput={(params) => <TextField {...params} label="Search to add location" />}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderOption={(props, option) => (
          <li {...props}>
            <Checkbox
              checked={selectedLocations.some((loc) => loc.id === option.id)}
              sx={{
                '&.Mui-checked': {
                  color: theme.palette.primary.main,
                },
              }}
            />

            {option.label}
          </li>
        )}
      />
    </div>
  );
}

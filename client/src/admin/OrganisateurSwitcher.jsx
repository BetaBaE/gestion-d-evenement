import { useEffect, useState } from 'react';
import { useGetIdentity, useGetList } from 'react-admin';
import { MenuItem, Select, FormControl } from '@mui/material';
import { getSelectedOrganisateurId, setSelectedOrganisateurId } from './organisateurContext.js';

export function OrganisateurSwitcher() {
  const { identity, isPending: identityPending } = useGetIdentity();
  const [selected, setSelected] = useState(getSelectedOrganisateurId() || '');

  // useGetList (not a one-shot dataProvider call) so react-admin's query
  // cache automatically refetches this list whenever an organisateur is
  // created/updated/deleted elsewhere in the app — otherwise this AppBar
  // singleton never re-fetches after its first mount.
  const { data: organisateurs = [] } = useGetList(
    'organisateurs',
    { pagination: { page: 1, perPage: 100 }, sort: { field: 'nom', order: 'ASC' } },
    { enabled: !identityPending && identity?.role === 'SUPER_ADMIN' },
  );

  useEffect(() => {
    if (!selected && organisateurs.length > 0) {
      setSelected(organisateurs[0].id);
      setSelectedOrganisateurId(organisateurs[0].id);
    }
  }, [organisateurs, selected]);

  if (identityPending || identity?.role !== 'SUPER_ADMIN') {
    return null;
  }

  function handleChange(event) {
    const value = event.target.value;
    setSelected(value);
    setSelectedOrganisateurId(value);
    window.location.reload();
  }

  return (
    <FormControl
      size="small"
      sx={{
        minWidth: 160,
        maxWidth: 240,
        marginLeft: 1,
        '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem' },
      }}
    >
      <Select value={selected} onChange={handleChange} displayEmpty>
        {organisateurs.map((org) => (
          <MenuItem key={org.id} value={org.id} sx={{ fontSize: '0.8125rem' }}>
            {org.nom}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

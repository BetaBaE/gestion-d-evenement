import { useEffect, useState } from 'react';
import { useGetIdentity, useDataProvider, useNotify } from 'react-admin';
import { MenuItem, Select, FormControl } from '@mui/material';
import { getSelectedOrganisateurId, setSelectedOrganisateurId } from './organisateurContext.js';

export function OrganisateurSwitcher() {
  const { identity, isPending } = useGetIdentity();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [organisateurs, setOrganisateurs] = useState([]);
  const [selected, setSelected] = useState(getSelectedOrganisateurId() || '');

  useEffect(() => {
    if (isPending || identity?.role !== 'SUPER_ADMIN') return;

    dataProvider
      .getList('organisateurs', { pagination: { page: 1, perPage: 100 }, sort: { field: 'nom', order: 'ASC' } })
      .then(({ data }) => {
        setOrganisateurs(data);
        if (!selected && data.length > 0) {
          setSelected(data[0].id);
          setSelectedOrganisateurId(data[0].id);
        }
      })
      .catch(() => notify('Impossible de charger les organisateurs.', { type: 'error' }));
  }, [isPending, identity]);

  if (isPending || identity?.role !== 'SUPER_ADMIN') {
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

import { ListBase, Datagrid, TextField, Pagination } from 'react-admin';
import { Paper, Typography } from '@mui/material';
import { ParticipantFilterBar, PresenceChip, EntriesField, LastEntryField, StatutChip, NameFrom } from './ParticipantFilters.jsx';

/**
 * Detailed presence list of an event (Statistiques tab): who came, when
 * (first / last entry) and how many times, filtered by organisme,
 * catégorie, validation and presence. Test scans never count.
 */
export function PresenceList({ eventId, organismes = [], categories = [] }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Liste de présence
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Par défaut les participants validés. Présence = au moins une entrée scannée (les scans de test ne comptent pas).
      </Typography>
      <ListBase
        resource="participants"
        queryOptions={{ meta: { eventId } }}
        filterDefaultValues={{ statut: 'VALIDE' }}
        perPage={25}
        disableSyncWithLocation
        storeKey={`presence-${eventId}`}
      >
        <ParticipantFilterBar eventId={eventId} organismes={organismes} categories={categories} />
        <Datagrid bulkActionButtons={false} rowClick={false}>
          <TextField source="nom" label="Nom" />
          <TextField source="prenom" label="Prénom" />
          <TextField source="fonction" label="Fonction" />
          <NameFrom source="invitedOrganismId" items={organismes} label="Organisme" />
          <NameFrom source="categorieId" items={categories} label="Catégorie" />
          <StatutChip label="Validation" />
          <PresenceChip label="Présence (1ʳᵉ entrée)" />
          <LastEntryField label="Dernière entrée" />
          <EntriesField label="Entrées" />
        </Datagrid>
        <Pagination rowsPerPageOptions={[25, 50, 100]} />
      </ListBase>
    </Paper>
  );
}

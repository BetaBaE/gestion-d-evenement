import { useEffect, useState } from 'react';
import { useListContext, useRecordContext } from 'react-admin';
import { Box, Button, Chip, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

export const STATUT_CHOICES = [
  { id: 'EN_ATTENTE', name: 'En attente', color: 'warning' },
  { id: 'VALIDE', name: 'Validé', color: 'success' },
  { id: 'REFUSE', name: 'Refusé', color: 'error' },
];

const PRESENCE_CHOICES = [
  { id: 'present', name: 'Présents' },
  { id: 'absent', name: 'Absents' },
];

const FILTER_KEYS = ['search', 'invitedOrganismId', 'categorieId', 'statut', 'presence'];

/** Query string of the active filters (same params as the list), for the Excel export. */
function exportUrl(eventId, filterValues) {
  const params = new URLSearchParams(Object.entries(filterValues).filter(([k, v]) => FILTER_KEYS.includes(k) && v));
  const qs = params.toString();
  return `${axiosClient.defaults.baseURL}/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}/participants/export${qs ? `?${qs}` : ''}`;
}

function Select({ label, value, onChange, choices, allLabel }) {
  return (
    <TextField select size="small" label={label} value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} fullWidth>
      <MenuItem value="">{allLabel}</MenuItem>
      {choices.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

/**
 * Filters of an event's participant list (inside a ListBase): search,
 * organisme, catégorie, validation status, presence. The Excel export
 * applies the same filters.
 */
export function ParticipantFilterBar({ eventId, organismes = [], categories = [] }) {
  const { filterValues, setFilters, total } = useListContext();
  const [search, setSearch] = useState(filterValues.search || '');

  // Search typed → applied after 300 ms (one query per pause, not per key).
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((filterValues.search || '') !== search) set({ search: search || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(patch) {
    const next = { ...filterValues, ...patch };
    Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
    setFilters(next, {});
  }

  const active = FILTER_KEYS.filter((k) => filterValues[k]).length;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {/* Search (2 tracks) + 4 filters on a responsive grid: one row on wide screens. */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '2fr repeat(4, 1fr)' } }}>
        <TextField
          size="small"
          placeholder="Nom, prénom, email, fonction…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ gridColumn: { sm: '1 / -1', lg: 'auto' } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Select label="Organisme" value={filterValues.invitedOrganismId} onChange={(v) => set({ invitedOrganismId: v })} allLabel="Tous les organismes" choices={organismes.map((o) => ({ id: o.id, name: o.nom }))} />
        <Select label="Catégorie" value={filterValues.categorieId} onChange={(v) => set({ categorieId: v })} allLabel="Toutes les catégories" choices={categories.map((c) => ({ id: c.id, name: c.nom }))} />
        <Select label="Validation" value={filterValues.statut} onChange={(v) => set({ statut: v })} allLabel="Tous les statuts" choices={STATUT_CHOICES} />
        <Select label="Présence" value={filterValues.presence} onChange={(v) => set({ presence: v })} allLabel="Présents et absents" choices={PRESENCE_CHOICES} />
      </Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          {total ?? 0} participant{total > 1 ? 's' : ''}
          {active > 0 ? ` · ${active} filtre${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''}` : ''}
        </Typography>
        {active > 0 && (
          <Button
            size="small"
            startIcon={<FilterAltOffIcon />}
            onClick={() => {
              setSearch('');
              setFilters({}, {});
            }}
          >
            Réinitialiser les filtres
          </Button>
        )}
        <Tooltip title="Fichier Excel avec les filtres appliqués (présence, première et dernière entrée)">
          <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} component="a" href={exportUrl(eventId, filterValues)}>
            Exporter
          </Button>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

const time = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** "Présent · 24/11 09:12" (green) or "Absent". */
export function PresenceChip() {
  const record = useRecordContext();
  const p = record?.presence;
  if (!p) return null;
  return p.present ? (
    <Chip size="small" color="success" variant="outlined" label={`Présent · ${time(p.premiereEntree)}`} />
  ) : (
    <Chip size="small" variant="outlined" label="Absent" />
  );
}

export function EntriesField() {
  const p = useRecordContext()?.presence;
  if (!p) return null;
  return (
    <Box component="span" sx={{ color: p.nbEntrees ? 'text.primary' : 'text.disabled' }}>
      {p.nbEntrees}
    </Box>
  );
}

export function LastEntryField() {
  const p = useRecordContext()?.presence;
  return p?.derniereEntree ? <span>{time(p.derniereEntree)}</span> : <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
}

export function StatutChip() {
  const record = useRecordContext();
  if (!record) return null;
  const s = STATUT_CHOICES.find((c) => c.id === record.statut);
  return <Chip size="small" label={s?.name || record.statut} color={s?.color || 'default'} />;
}

/** Name of a reference from a preloaded list (organismes / catégories of the event). */
export function NameFrom({ source, items }) {
  const record = useRecordContext();
  const item = items.find((i) => String(i.id) === String(record?.[source]));
  return <span>{item?.nom || '—'}</span>;
}

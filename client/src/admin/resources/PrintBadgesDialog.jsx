import { useEffect, useMemo, useState } from 'react';
import { Divider, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { BulkConfirmDialog } from './BulkConfirmDialog.jsx';

const ORDRES = [
  { id: 'ORGANISME_NOM', name: 'Organisme, puis nom' },
  { id: 'NOM', name: 'Nom' },
  { id: 'CATEGORIE_NOM', name: 'Catégorie, puis nom' },
  { id: 'INSCRIPTION', name: "Ordre d'inscription" },
];

const DEFAULTS = { ordre: 'ORGANISME_NOM', seulementJamaisImprimes: false, inclureNonValides: false, separateurs: false, planche: false };

/**
 * Bulk badge printing: options, then the server's summary (how many badges,
 * reprint warning), then a background job producing the PDF — downloaded
 * from the "Tâches" panel and kept 24 h.
 *
 * selection: { mode: 'ids' | 'filtre', … } — null when closed.
 */
export function PrintBadgesDialog({ eventId, selection, badgeFormat, onClose, onStarted }) {
  const [options, setOptions] = useState(DEFAULTS);
  const set = (key) => (e) => setOptions((o) => ({ ...o, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const carte = badgeFormat === 'CARTE';

  useEffect(() => {
    if (selection) setOptions(DEFAULTS);
  }, [selection]);

  // A new request object (and requestId) per options change: the summary is recomputed.
  const request = useMemo(
    () => (selection ? { action: 'IMPRIMER', selection, options: { ...options, planche: carte && options.planche } } : null),
    [selection, options, carte],
  );

  return (
    <BulkConfirmDialog eventId={eventId} request={request} onClose={onClose} onStarted={onStarted} title="Imprimer les badges">
      <Stack spacing={1} sx={{ mb: 2 }}>
        <TextField select size="small" label="Ordre d'impression" value={options.ordre} onChange={set('ordre')} sx={{ maxWidth: 280, mt: 0.5 }}>
          {ORDRES.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel control={<Switch checked={options.seulementJamaisImprimes} onChange={set('seulementJamaisImprimes')} />} label="Seulement les badges jamais imprimés" />
        <FormControlLabel control={<Switch checked={options.inclureNonValides} onChange={set('inclureNonValides')} />} label="Inclure les participants non validés" />
        <FormControlLabel control={<Switch checked={options.separateurs} onChange={set('separateurs')} />} label="Page de séparation entre les organismes" />
        {carte ? (
          <FormControlLabel control={<Switch checked={options.planche} onChange={set('planche')} />} label="Planche A4 de cartes avec traits de coupe" />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Un badge par page, au format du modèle. La planche avec traits de coupe est proposée pour le format carte.
          </Typography>
        )}
      </Stack>
      <Divider sx={{ mb: 2 }} />
    </BulkConfirmDialog>
  );
}

import { useEffect, useState } from 'react';
import { useNotify } from 'react-admin';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { STARTER_TEMPLATES } from '../../../../shared/badge-renderer/index.js';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { BadgeFormatFields, formatErrors, formatPayload, formatStateFrom } from './BadgeFormatFields.jsx';

const STARTERS = Object.entries(STARTER_TEMPLATES).map(([key, t]) => ({ key, label: t.label }));

/**
 * "Nouveau modèle": a blank page (brand-kit theme, no elements, any
 * format), a starter template, or a copy of an existing template.
 * `initial` pre-fills it (e.g. "Dupliquer" from the gallery).
 */
export function NewTemplateDialog({ open, modeles, initial, onClose, onCreated }) {
  const notify = useNotify();
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [depart, setDepart] = useState('VIERGE');
  const [starterKey, setStarterKey] = useState(STARTERS[0]?.key || '');
  const [sourceModeleId, setSourceModeleId] = useState('');
  const [format, setFormat] = useState(formatStateFrom());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNom(initial?.nom || '');
    setDescription(initial?.description || '');
    setDepart(initial?.depart || 'VIERGE');
    setSourceModeleId(initial?.sourceModeleId || modeles[0]?._id || '');
    setFormat(formatStateFrom());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalid =
    !nom.trim() ||
    (depart === 'VIERGE' && Object.keys(formatErrors(format)).length > 0) ||
    (depart === 'STARTER' && !starterKey) ||
    (depart === 'DUPLIQUER' && !sourceModeleId);

  async function submit() {
    setSaving(true);
    try {
      const { data } = await axiosClient.post(`/admin/organisateurs/${getSelectedOrganisateurId()}/modeles-badge`, {
        nom: nom.trim(),
        description,
        depart,
        ...(depart === 'VIERGE' ? formatPayload(format) : {}),
        ...(depart === 'STARTER' ? { starterKey } : {}),
        ...(depart === 'DUPLIQUER' ? { sourceModeleId } : {}),
      });
      notify('Modèle créé.', { type: 'success' });
      onCreated(data);
    } catch (error) {
      notify(error.response?.data?.details?.[0]?.message || error.response?.data?.message || 'Erreur lors de la création.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nouveau modèle</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField size="small" label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus fullWidth />
          <TextField size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} fullWidth />

          <div>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Point de départ
            </Typography>
            <RadioGroup value={depart} onChange={(e) => setDepart(e.target.value)}>
              <FormControlLabel value="VIERGE" control={<Radio size="small" />} label="Page vierge (couleurs et polices de la charte de l'organisateur)" />
              <FormControlLabel value="STARTER" control={<Radio size="small" />} label="Modèle de départ" />
              <FormControlLabel value="DUPLIQUER" control={<Radio size="small" />} label="Dupliquer un modèle existant" disabled={modeles.length === 0} />
            </RadioGroup>
          </div>

          {depart === 'VIERGE' && <BadgeFormatFields value={format} onChange={setFormat} />}
          {depart === 'STARTER' && (
            <TextField select size="small" label="Modèle de départ" value={starterKey} onChange={(e) => setStarterKey(e.target.value)} fullWidth>
              {STARTERS.map((s) => (
                <MenuItem key={s.key} value={s.key}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {depart === 'DUPLIQUER' && (
            <TextField select size="small" label="Modèle à dupliquer" value={sourceModeleId} onChange={(e) => setSourceModeleId(e.target.value)} fullWidth>
              {modeles.map((m) => (
                <MenuItem key={m._id} value={m._id}>
                  {m.nom}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={submit} disabled={invalid || saving}>
          Créer et ouvrir l'éditeur
        </Button>
      </DialogActions>
    </Dialog>
  );
}

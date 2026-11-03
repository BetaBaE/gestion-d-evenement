import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { BadgeFormatFields, formatErrors, formatPayload, formatStateFrom } from './BadgeFormatFields.jsx';

/**
 * Template settings in the editor: name, description, format and printed
 * panels. Changing the format never deletes elements: those on panels that
 * no longer print move to the "Hors page" list of the layers panel.
 */
export function TemplateSettingsDialog({ open, modele, onClose, onSave }) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState(formatStateFrom());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !modele) return;
    setNom(modele.nom || '');
    setDescription(modele.description || '');
    setFormat(formatStateFrom(modele));
  }, [open, modele]);

  const invalid = !nom.trim() || Object.keys(formatErrors(format)).length > 0;

  async function submit() {
    setSaving(true);
    try {
      await onSave({ nom: nom.trim(), description, ...formatPayload(format) });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Paramètres du modèle</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField size="small" label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required error={!nom.trim()} fullWidth />
          <TextField size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} fullWidth />
          <BadgeFormatFields value={format} onChange={setFormat} />
          <Alert severity="info" sx={{ py: 0 }}>
            En changeant de format, les éléments des panneaux qui ne sont plus imprimés passent dans « Hors page » (calques) au lieu d'être supprimés.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={submit} disabled={invalid || saving}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

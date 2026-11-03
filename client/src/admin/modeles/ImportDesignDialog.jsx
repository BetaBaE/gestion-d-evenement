import { useState } from 'react';
import { useNotify } from 'react-admin';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { BadgeFormatFields, formatErrors, formatPayload, formatStateFrom } from './BadgeFormatFields.jsx';

const RATIO_TOLERANCE = 0.02; // same as the server (designImport.js)
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function sheetSizeMm(payload) {
  if (payload.format === 'A4_PLIE_4') return { width: 210, height: 297 };
  if (payload.format === 'A6') return { width: 105, height: 148.5 };
  return { width: payload.carteLargeurMm, height: payload.carteHauteurMm };
}

/**
 * "Importer un design (PDF, PNG, JPG)": the file becomes the locked
 * background of a new template (cut into the 4 panels for A4 folded in 4);
 * the dynamic fields are then placed on top in the editor.
 */
export function ImportDesignDialog({ open, onClose, onCreated }) {
  const notify = useNotify();
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [page, setPage] = useState(1);
  const [nom, setNom] = useState('');
  const [autoNom, setAutoNom] = useState('');
  const [format, setFormat] = useState(formatStateFrom());
  const [mode, setMode] = useState('fit');
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setInfo(null);
    setPage(1);
    setNom('');
    setAutoNom('');
    setMode('fit');
    setFormat(formatStateFrom());
  }

  async function pickFile(f) {
    if (!f) return;
    setFile(f);
    // The name follows the file until the user types their own.
    const fromFile = f.name.replace(/\.[^.]+$/, '');
    setNom((n) => (!n || n === autoNom ? fromFile : n));
    setAutoNom(fromFile);
    setInfo(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const { data } = await axiosClient.post(`/admin/organisateurs/${getSelectedOrganisateurId()}/modeles-badge/design/inspecter`, form, MULTIPART);
      setInfo(data);
      setPage(1);
    } catch (error) {
      setFile(null);
      notify(error.response?.data?.message || 'Fichier illisible.', { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const payload = formatPayload(format);
  const designSize = info
    ? info.type === 'pdf'
      ? { width: info.pages[page - 1].largeurMm, height: info.pages[page - 1].hauteurMm }
      : { width: info.largeurPx, height: info.hauteurPx }
    : null;
  const sheet = sheetSizeMm(payload);
  const gap = designSize ? Math.abs(designSize.width / designSize.height - sheet.width / sheet.height) / (sheet.width / sheet.height) : 0;
  const mismatch = gap > RATIO_TOLERANCE;

  async function submit() {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('nom', nom.trim());
      form.append('format', payload.format);
      if (payload.carteLargeurMm) form.append('carteLargeurMm', payload.carteLargeurMm);
      if (payload.carteHauteurMm) form.append('carteHauteurMm', payload.carteHauteurMm);
      if (payload.panneauxActifs) form.append('panneauxActifs', payload.panneauxActifs.join(','));
      form.append('page', page);
      form.append('mode', mismatch ? mode : 'fit');
      const { data } = await axiosClient.post(`/admin/organisateurs/${getSelectedOrganisateurId()}/modeles-badge/importer-design`, form, MULTIPART);
      notify('Design importé.', { type: 'success' });
      reset();
      onCreated(data);
    } catch (error) {
      notify(error.response?.data?.details?.[0]?.message || error.response?.data?.message || "Erreur lors de l'import.", { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const invalid = !file || !info || !nom.trim() || Object.keys(formatErrors(format)).length > 0;

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Importer un design</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Le design (Canva, Illustrator, Word…) devient le fond du modèle. Vous placerez ensuite le nom, la fonction, l'organisme et le QR code
            sur les zones vides. PDF, PNG ou JPEG, 20 Mo maximum.
          </Typography>
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={busy}>
            {file ? file.name : 'Choisir un fichier'}
            <input type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => pickFile(e.target.files?.[0])} />
          </Button>
          {busy && <LinearProgress />}

          {info?.type === 'pdf' && info.pages.length > 1 && (
            <TextField select size="small" label="Page à importer" value={page} onChange={(e) => setPage(Number(e.target.value))} fullWidth>
              {info.pages.map((p) => (
                <MenuItem key={p.numero} value={p.numero}>
                  Page {p.numero} ({Math.round(p.largeurMm)} × {Math.round(p.hauteurMm)} mm)
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField size="small" label="Nom du modèle" value={nom} onChange={(e) => setNom(e.target.value)} required fullWidth />
          <BadgeFormatFields value={format} onChange={setFormat} />

          {designSize && mismatch && (
            <Alert severity="warning">
              Les proportions du fichier ({info.type === 'pdf' ? `${Math.round(designSize.width)} × ${Math.round(designSize.height)} mm` : `${designSize.width} × ${designSize.height} px`}) ne
              correspondent pas au format choisi ({sheet.width} × {sheet.height} mm).
              <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
                <FormControlLabel value="fit" control={<Radio size="small" />} label="Ajuster : tout le design visible, marges blanches" />
                <FormControlLabel value="crop" control={<Radio size="small" />} label="Recadrer : remplit la page, les bords sont coupés" />
              </RadioGroup>
            </Alert>
          )}
          {designSize && !mismatch && <Alert severity="success">Les proportions du fichier correspondent au format.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Annuler
        </Button>
        <Button variant="contained" onClick={submit} disabled={invalid || busy}>
          Importer et ouvrir l'éditeur
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useNotify } from 'react-admin';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField as MuiTextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScienceIcon from '@mui/icons-material/Science';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { QRCodeSVG } from 'qrcode.react';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { FormSection, Field } from '../../components/form/index.js';

function eventBasePath(eventId) {
  return `/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}`;
}

function CopyableLink({ value, onCopy, onRegenerate }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <MuiTextField value={value} size="small" fullWidth slotProps={{ input: { readOnly: true } }} />
      <Button startIcon={<ContentCopyIcon />} onClick={() => onCopy(value)} sx={{ flexShrink: 0 }}>
        Copier
      </Button>
      <Button startIcon={<RefreshIcon />} onClick={onRegenerate} color="warning" sx={{ flexShrink: 0 }}>
        Régénérer
      </Button>
    </Stack>
  );
}

/** Value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScanStatusLine({ status }) {
  if (!status) return null;
  const line = {
    ACTIF: { dot: '🟢', text: `Actif jusqu'au ${status.untilLabel}`, color: 'success.main' },
    PAS_ENCORE: { dot: '🟠', text: `Ouvre le ${status.fromLabel}`, color: 'warning.main' },
    EXPIRE: { dot: '🔴', text: `Expiré depuis le ${status.untilLabel}`, color: 'error.main' },
  }[status.status];
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
      <Typography sx={{ fontWeight: 600, color: line.color }}>
        {line.dot} {line.text}
      </Typography>
      <Chip size="small" variant="outlined" label={status.mode === 'AUTO' ? 'Fenêtre auto (dates de l’événement)' : 'Fenêtre manuelle'} />
      <Typography variant="caption" color="text.secondary">
        Fuseau : {status.timezone}
      </Typography>
      {status.modeTest && <Chip size="small" color="warning" label={`MODE TEST jusqu'à ${status.scanTestJusquALabel}`} />}
    </Stack>
  );
}

/** Auto (follows the event dates) or a manual window. */
function ScanWindowSettings({ event, status, onSaved }) {
  const notify = useNotify();
  const [mode, setMode] = useState(status?.mode || 'AUTO');
  const [from, setFrom] = useState(toLocalInput(event.scanTokenValidFrom || status?.from));
  const [until, setUntil] = useState(toLocalInput(event.scanTokenValidUntil || status?.until));

  useEffect(() => {
    if (status) setMode(status.mode);
  }, [status?.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(nextMode = mode) {
    try {
      await axiosClient.put(`${eventBasePath(event.id)}/scan-config`, {
        scanWindowMode: nextMode,
        ...(nextMode === 'MANUEL' ? { scanTokenValidFrom: new Date(from), scanTokenValidUntil: new Date(until) } : {}),
      });
      notify('Fenêtre de scan enregistrée.', { type: 'success' });
      onSaved();
    } catch (error) {
      notify(error.response?.data?.details?.[0]?.message || error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  return (
    <>
      <Field w="full">
        <RadioGroup
          row
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            if (e.target.value === 'AUTO') save('AUTO');
          }}
        >
          <FormControlLabel value="AUTO" control={<Radio size="small" />} label="Automatique : du début du premier jour à la fin du dernier jour" />
          <FormControlLabel value="MANUEL" control={<Radio size="small" />} label="Manuelle" />
        </RadioGroup>
      </Field>
      {mode === 'MANUEL' && (
        <>
          <Field w="third">
            <MuiTextField type="datetime-local" size="small" label="Ouverture" value={from} onChange={(e) => setFrom(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Field>
          <Field w="third">
            <MuiTextField type="datetime-local" size="small" label="Fermeture" value={until} onChange={(e) => setUntil(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Field>
          <Field w="third">
            <Button variant="outlined" onClick={() => save('MANUEL')} disabled={!from || !until}>
              Enregistrer la fenêtre
            </Button>
          </Field>
        </>
      )}
    </>
  );
}

/** Test mode: scans work outside the window, flagged and kept out of stats. */
function ScanTestSettings({ event, status, onChanged }) {
  const notify = useNotify();
  const [heures, setHeures] = useState(2);

  async function call(method, path, body, message) {
    try {
      const { data } = await axiosClient({ method, url: `${eventBasePath(event.id)}/${path}`, data: body });
      notify(typeof message === 'function' ? message(data) : message, { type: 'success' });
      onChanged();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  return (
    <>
      <Field w="full">
        {status?.modeTest ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Alert severity="warning" sx={{ flex: 1, py: 0 }}>
              Mode test actif jusqu'à {status.scanTestJusquALabel} : le lien fonctionne même hors de la fenêtre.
            </Alert>
            <Button onClick={() => call('delete', 'scan-test', undefined, 'Mode test arrêté.')}>Arrêter</Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <MuiTextField select size="small" label="Durée" value={heures} onChange={(e) => setHeures(Number(e.target.value))} sx={{ width: 120 }}>
              {[1, 2, 8].map((h) => (
                <MenuItem key={h} value={h}>
                  {h} h
                </MenuItem>
              ))}
            </MuiTextField>
            <Button variant="outlined" startIcon={<ScienceIcon />} onClick={() => call('post', 'scan-test', { heures }, 'Mode test activé.')}>
              Activer le mode test
            </Button>
          </Stack>
        )}
      </Field>
      <Field w="full">
        <Button
          color="error"
          startIcon={<DeleteSweepIcon />}
          disabled={!status?.nbScansTest}
          onClick={() => {
            if (!window.confirm(`Supprimer les ${status.nbScansTest} scan(s) de test ?`)) return;
            call('delete', 'scans-test', undefined, (d) => `${d.deleted} scan(s) de test supprimé(s).`);
          }}
        >
          Supprimer les scans de test ({status?.nbScansTest || 0})
        </Button>
      </Field>
    </>
  );
}

/** "Scan" tab: public registration link and day-of-event scan link. */
export function ScanPanel({ event, onRefresh }) {
  const notify = useNotify();
  const origin = window.location.origin;
  const formUrl = `${origin}/inscription/${event.formToken}`;
  const scanUrl = event.scanToken ? `${origin}/scan/${event.scanToken}` : null;
  const [status, setStatus] = useState(null);

  const loadStatus = useCallback(() => {
    if (!event.scanToken) return;
    axiosClient
      .get(`${eventBasePath(event.id)}/scan-statut`)
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus(null));
  }, [event.id, event.scanToken]);

  // Live status: refreshed on open, after each change and every 30 s.
  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 30000);
    return () => clearInterval(timer);
  }, [loadStatus, event.dateDebut, event.dateFin]);

  async function copy(text) {
    await navigator.clipboard.writeText(text);
    notify('Lien copié.', { type: 'success' });
  }

  async function regenerate(kind) {
    if (kind === 'scan' && event.scanToken && !window.confirm("L'ancien lien de scan cessera de fonctionner. Continuer ?")) return;
    try {
      await axiosClient.post(`${eventBasePath(event.id)}/regenerer-${kind}-token`, {});
      notify(kind === 'form' ? 'Lien du formulaire régénéré.' : 'Lien de scan régénéré.', { type: 'success' });
      onRefresh();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  return (
    <Stack spacing={2}>
      <FormSection
        title="Lien du formulaire d'inscription"
        description="À partager avec les organismes invités. Régénérer invalide l'ancien lien."
      >
        <Field w="full">
          <CopyableLink value={formUrl} onCopy={copy} onRegenerate={() => regenerate('form')} />
        </Field>
      </FormSection>

      <FormSection
        title="Lien de scan (jour de l'événement)"
        description="Ouvert sur les téléphones des agents d'accueil pour scanner les badges."
      >
        {scanUrl ? (
          <Field w="full">
            <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Grid size={{ xs: 12, md: 'grow' }}>
                <CopyableLink value={scanUrl} onCopy={copy} onRegenerate={() => regenerate('scan')} />
                <Box sx={{ mt: 1.5 }}>
                  <ScanStatusLine status={status} />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 'auto' }}>
                <Box sx={{ background: '#fff', p: 1, display: 'inline-block', borderRadius: 1 }}>
                  <QRCodeSVG value={scanUrl} size={128} />
                </Box>
              </Grid>
            </Grid>
          </Field>
        ) : (
          <Field w="full">
            <Button variant="outlined" onClick={() => regenerate('scan')}>
              Générer le lien de scan
            </Button>
          </Field>
        )}
      </FormSection>

      {scanUrl && status && (
        <>
          <FormSection title="Fenêtre de scan" description="Période pendant laquelle le lien accepte les scans.">
            <ScanWindowSettings key={status.mode} event={event} status={status} onSaved={loadStatus} />
          </FormSection>
          <FormSection
            title="Mode test"
            description="Pour essayer le scan en dehors des dates. Les scans de test n'apparaissent pas dans les statistiques."
          >
            <ScanTestSettings event={event} status={status} onChanged={loadStatus} />
          </FormSection>
        </>
      )}
    </Stack>
  );
}

/** Old "Gérer" page URL (/events/:id/show) → the tabbed event page. */
export function EventShowRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/events/${id}`} replace />;
}

import { Navigate, useParams } from 'react-router';
import { useNotify } from 'react-admin';
import { Box, Button, Grid, Stack, TextField as MuiTextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
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

/** "Scan" tab: public registration link and day-of-event scan link. */
export function ScanPanel({ event, onRefresh }) {
  const notify = useNotify();
  const origin = window.location.origin;
  const formUrl = `${origin}/inscription/${event.formToken}`;
  const scanUrl = event.scanToken ? `${origin}/scan/${event.scanToken}` : null;

  async function copy(text) {
    await navigator.clipboard.writeText(text);
    notify('Lien copié.', { type: 'success' });
  }

  async function regenerate(kind) {
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
          <>
            <Field w="full">
              <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
                <Grid size={{ xs: 12, md: 'grow' }}>
                  <CopyableLink value={scanUrl} onCopy={copy} onRegenerate={() => regenerate('scan')} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Valide du {new Date(event.scanTokenValidFrom).toLocaleString('fr-FR')} au{' '}
                    {new Date(event.scanTokenValidUntil).toLocaleString('fr-FR')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 'auto' }}>
                  <Box sx={{ background: '#fff', p: 1, display: 'inline-block', borderRadius: 1 }}>
                    <QRCodeSVG value={scanUrl} size={128} />
                  </Box>
                </Grid>
              </Grid>
            </Field>
          </>
        ) : (
          <Field w="full">
            <Button variant="outlined" onClick={() => regenerate('scan')}>
              Générer le lien de scan
            </Button>
          </Field>
        )}
      </FormSection>
    </Stack>
  );
}

/** Old "Gérer" page URL (/events/:id/show) → the tabbed event page. */
export function EventShowRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/events/${id}`} replace />;
}

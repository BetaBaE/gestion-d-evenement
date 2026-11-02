import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useDataProvider, useNotify, useGetList, Title } from 'react-admin';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  TextField as MuiTextField,
  Stack,
  Chip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { QRCodeSVG } from 'qrcode.react';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { CategoriesPanel } from './categories.jsx';
import { OrganismesPanel } from './organismes.jsx';
import { ParticipantsPanel } from './participants.jsx';
import { DashboardPanel } from './DashboardPanel.jsx';

function eventBasePath(eventId) {
  const organisateurId = getSelectedOrganisateurId();
  return `/admin/organisateurs/${organisateurId}/events/${eventId}`;
}

function LinksPanel({ event, onRefresh }) {
  const notify = useNotify();
  const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;

  const formUrl = `${publicAppUrl}/inscription/${event.formToken}`;
  const scanUrl = event.scanToken ? `${publicAppUrl}/scan/${event.scanToken}` : null;

  async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
    notify('Lien copié.', { type: 'success' });
  }

  async function regenerateFormToken() {
    try {
      await axiosClient.post(`${eventBasePath(event.id)}/regenerer-form-token`);
      notify('Lien du formulaire régénéré.', { type: 'success' });
      onRefresh();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  async function regenerateScanToken() {
    try {
      await axiosClient.post(`${eventBasePath(event.id)}/regenerer-scan-token`, {});
      notify('Lien de scan régénéré.', { type: 'success' });
      onRefresh();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  return (
    <Stack spacing={3} sx={{ mt: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Lien du formulaire d'inscription
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <MuiTextField value={formUrl} size="small" fullWidth slotProps={{ input: { readOnly: true } }} />
          <Button startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(formUrl)}>
            Copier
          </Button>
          <Button startIcon={<RefreshIcon />} onClick={regenerateFormToken} color="warning">
            Régénérer
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Lien de scan (jour de l'événement)
        </Typography>
        {scanUrl ? (
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <MuiTextField value={scanUrl} size="small" fullWidth slotProps={{ input: { readOnly: true } }} />
                <Button startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(scanUrl)} sx={{ flexShrink: 0 }}>
                  Copier
                </Button>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={regenerateScanToken}
                  color="warning"
                  sx={{ flexShrink: 0 }}
                >
                  Régénérer
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Valide du {new Date(event.scanTokenValidFrom).toLocaleString('fr-FR')} au{' '}
                {new Date(event.scanTokenValidUntil).toLocaleString('fr-FR')}
              </Typography>
            </Stack>
            <Box sx={{ background: '#fff', p: 1, flexShrink: 0 }}>
              <QRCodeSVG value={scanUrl} size={120} />
            </Box>
          </Stack>
        ) : (
          <Button onClick={regenerateScanToken}>Générer le lien de scan</Button>
        )}
      </Paper>
    </Stack>
  );
}

export function EventShow() {
  const { id: eventId } = useParams();
  const dataProvider = useDataProvider();
  const [tab, setTab] = useState(0);
  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // useGetList (not a one-shot dataProvider call) so these share react-admin's
  // query cache and automatically refetch whenever a category/organisme is
  // created/updated/deleted anywhere else (e.g. the Catégories tab's own
  // dialog) — previously this held its own disconnected snapshot in state
  // that only loaded once per eventId, so the participant form's dropdowns
  // went stale until a full page reload.
  const { data: categories = [] } = useGetList(
    'categories',
    { pagination: { page: 1, perPage: 100 }, sort: { field: 'nom', order: 'ASC' }, meta: { eventId } },
  );
  const { data: organismes = [] } = useGetList(
    'organismes',
    { pagination: { page: 1, perPage: 100 }, sort: { field: 'nom', order: 'ASC' }, meta: { eventId } },
  );

  async function loadEvent() {
    try {
      const { data } = await dataProvider.getOne('events', { id: eventId });
      setEvent(data);
      setLoadError(null);
    } catch (error) {
      setLoadError("Impossible de charger l'événement.");
    }
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  if (loadError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{loadError}</Typography>
      </Box>
    );
  }

  if (!event) {
    return <Box sx={{ p: 3 }}>Chargement...</Box>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Title title={event.titre} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{event.titre}</Typography>
        <Chip label={event.statut} size="small" />
      </Stack>

      <Paper>
        <Tabs value={tab} onChange={(e, value) => setTab(value)}>
          <Tab label="Tableau de bord" />
          <Tab label="Catégories" />
          <Tab label="Organismes invités" />
          <Tab label="Participants" />
          <Tab label="Liens" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <DashboardPanel eventId={eventId} />}
          {tab === 1 && <CategoriesPanel eventId={eventId} />}
          {tab === 2 && <OrganismesPanel eventId={eventId} />}
          {tab === 3 && (
            <ParticipantsPanel eventId={eventId} categories={categories} organismes={organismes} />
          )}
          {tab === 4 && <LinksPanel event={event} onRefresh={loadEvent} />}
        </Box>
      </Paper>
    </Box>
  );
}

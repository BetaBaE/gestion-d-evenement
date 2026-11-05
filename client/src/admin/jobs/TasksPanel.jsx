import { useNotify } from 'react-admin';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import { useJobs } from './JobsContext.jsx';
import { cancelJob, jobFileUrl, retryJobFailures } from '../../api/jobsApi.js';

const STATUTS = {
  EN_ATTENTE: { label: 'En attente', color: 'default' },
  EN_COURS: { label: 'En cours', color: 'info' },
  TERMINE: { label: 'Terminée', color: 'success' },
  TERMINE_AVEC_ERREURS: { label: 'Terminée avec erreurs', color: 'warning' },
  ECHEC: { label: 'Échec', color: 'error' },
  ANNULE: { label: 'Annulée', color: 'default' },
};

const when = (d) => (d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

function JobRow({ job, onChanged }) {
  const notify = useNotify();
  const { track } = useJobs();
  const statut = STATUTS[job.statut] || STATUTS.EN_ATTENTE;
  const percent = job.total ? Math.round((job.traites / job.total) * 100) : 0;
  const expired = job.resultat?.expireLe && new Date(job.resultat.expireLe) < new Date();

  return (
    <Box sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {job.libelle || job.type}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {job.eventTitre ? `${job.eventTitre} · ` : ''}
            {when(job.createdAt)}
          </Typography>
        </Box>
        <Chip size="small" label={statut.label} color={statut.color} variant={job.termine ? 'outlined' : 'filled'} />
      </Stack>

      {!job.termine && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant={job.total ? 'determinate' : 'indeterminate'} value={percent} />
          <Typography variant="caption" color="text.secondary">
            {job.traites} / {job.total} traités
          </Typography>
        </Box>
      )}

      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
        {job.reussis} réussi(s)
        {job.ignores ? ` · ${job.ignores} ignoré(s)` : ''}
        {job.nbEchecs ? ` · ${job.nbEchecs} échec(s)` : ''}
      </Typography>
      {job.resultat?.message && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {job.resultat.message}
        </Typography>
      )}
      {job.erreur && job.statut === 'ECHEC' && (
        <Typography variant="caption" color="error" sx={{ display: 'block' }}>
          {job.erreur}
        </Typography>
      )}
      {job.nbEchecs > 0 && (
        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2, maxHeight: 90, overflow: 'auto' }}>
          {job.echecs.slice(0, 5).map((e, i) => (
            <Typography key={i} component="li" variant="caption" color="error.main">
              {e.erreur}
            </Typography>
          ))}
        </Box>
      )}

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {job.resultat?.fichiers?.map((f) => (
          <Button
            key={f.fileId}
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            component="a"
            href={jobFileUrl(job.id, f.fileId)}
            disabled={expired}
            title={expired ? 'Fichier expiré (conservé 24 h)' : f.nom}
          >
            {job.resultat.fichiers.length > 1 ? f.nom.replace(/^.*?(partie-\d+).*$/i, '$1') : 'Télécharger'}
          </Button>
        ))}
        {job.nbEchecs > 0 && job.termine && (
          <Button
            size="small"
            startIcon={<ReplayIcon />}
            onClick={async () => {
              try {
                const { id } = await retryJobFailures(job.id);
                track(id);
              } catch (error) {
                notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
              }
            }}
          >
            Réessayer les échecs
          </Button>
        )}
        {!job.termine && (
          <Button
            size="small"
            color="inherit"
            onClick={async () => {
              await cancelJob(job.id).catch(() => {});
              onChanged();
            }}
          >
            Annuler
          </Button>
        )}
      </Stack>
    </Box>
  );
}

/** Top-bar "Tâches" button (counter of running jobs) and its drawer. */
export function TasksButton() {
  const { jobs, running, open, setOpen, refresh } = useJobs();
  return (
    <>
      <Tooltip title="Tâches en arrière-plan">
        <IconButton color="inherit" onClick={() => setOpen(true)} aria-label="Tâches">
          <Badge badgeContent={running.length} color="secondary">
            <TaskAltIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Tâches
            </Typography>
            <IconButton onClick={() => setOpen(false)} aria-label="Fermer">
              <CloseIcon />
            </IconButton>
          </Stack>
          {jobs.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucune tâche récente. Les actions groupées (validation, impression, emails…) apparaissent ici avec leur progression.
            </Typography>
          )}
          {jobs.map((job, i) => (
            <Box key={job.id}>
              {i > 0 && <Divider />}
              <JobRow job={job} onChanged={refresh} />
            </Box>
          ))}
        </Box>
      </Drawer>
    </>
  );
}

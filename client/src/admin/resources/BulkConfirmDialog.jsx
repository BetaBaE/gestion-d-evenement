import { useEffect, useMemo, useState } from 'react';
import { useNotify } from 'react-admin';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { previewBulkAction, runBulkAction } from '../../api/bulkApi.js';
import { newRequestId } from '../../api/jobsApi.js';
import { useJobs } from '../jobs/JobsContext.jsx';

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * Confirmation of a bulk action with the server's eligibility summary
 * ("37 sélectionnés → 34 seront validés · 3 déjà validés (ignorés)").
 * Confirming starts a background job and closes at once: progress is
 * followed in the "Tâches" panel. The requestId is created when the dialog
 * opens, so a double click on "Confirmer" starts a single job.
 *
 * request: { action, selection, options } — null when closed.
 */
export function BulkConfirmDialog({ eventId, request, onClose, onStarted }) {
  const notify = useNotify();
  const { track } = useJobs();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [typed, setTyped] = useState('');
  const [sending, setSending] = useState(false);
  const requestId = useMemo(() => (request ? newRequestId() : null), [request]);

  useEffect(() => {
    if (!request) return undefined;
    let cancelled = false;
    setSummary(null);
    setError(null);
    setTyped('');
    previewBulkAction(eventId, request)
      .then((s) => !cancelled && setSummary(s))
      .catch((e) => !cancelled && setError(e.response?.data?.message || "Impossible de préparer l'action."));
    return () => {
      cancelled = true;
    };
  }, [eventId, request]);

  const isDelete = request?.action === 'SUPPRIMER';
  const canConfirm = summary && summary.eligibles > 0 && !sending && (!isDelete || Number(typed) === summary.eligibles);

  async function confirm() {
    setSending(true);
    try {
      const job = await runBulkAction(eventId, { ...request, requestId, confirmation: isDelete ? Number(typed) : undefined });
      track(job.id);
      notify('Action lancée — suivez la progression dans « Tâches ».', { type: 'info' });
      onStarted?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Erreur lors du lancement de l'action.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!request} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{summary?.libelle || 'Action groupée'}</DialogTitle>
      <DialogContent>
        {!summary && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {summary && (
          <Stack spacing={1.5}>
            <Typography>
              <strong>{plural(summary.total, 'sélectionné')}</strong> → <strong>{summary.eligibles}</strong> {summary.verbe}
              {summary.ignores.map((i) => (
                <span key={i.raison}>
                  {' · '}
                  {i.n} {i.raison} (ignorés)
                </span>
              ))}
            </Typography>
            {summary.eligibles === 0 && <Alert severity="warning">Aucun participant de la sélection n’est concerné par cette action.</Alert>}
            {summary.emails > 0 && (
              <Typography variant="body2" color="text.secondary">
                {plural(summary.emails, 'email')} {summary.emails > 1 ? 'seront envoyés' : 'sera envoyé'} depuis <strong>{summary.expediteur}</strong>
                {summary.minutesEnvoi > 0 && ` (≈ ${summary.minutesEnvoi} min à ${summary.limiteParMinute}/min)`}.
              </Typography>
            )}
            {summary.dejaImprimes > 0 && (
              <Alert severity="warning">
                {plural(summary.dejaImprimes, 'badge')} {summary.dejaImprimes > 1 ? 'ont' : 'a'} déjà été imprimé{summary.dejaImprimes > 1 ? 's' : ''}.
              </Alert>
            )}
            {isDelete && summary.eligibles > 0 && (
              <Alert severity="error" icon={false}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Suppression définitive. Pour confirmer, saisissez <strong>{summary.eligibles}</strong>.
                </Typography>
                <TextField size="small" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} inputProps={{ inputMode: 'numeric' }} />
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Annuler
        </Button>
        <Button variant="contained" color={isDelete ? 'error' : 'primary'} onClick={confirm} disabled={!canConfirm}>
          {sending ? 'Lancement…' : summary ? `Confirmer (${summary.eligibles})` : 'Confirmer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

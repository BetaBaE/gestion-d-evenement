import { useCallback, useEffect, useState } from 'react';
import { useNotify } from 'react-admin';
import { Link as RouterLink } from 'react-router';
import { Alert, Button, Stack, Typography } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';

/**
 * Event page: state of the email queue ("Emails : 120 envoyés · 45 en file
 * (≈ 3 min) · 2 échecs [Renvoyer]") and an alert when the SMTP server
 * refuses the credentials.
 */
export function EmailStatusBar({ eventId }) {
  const notify = useNotify();
  const [s, setS] = useState(null);
  const base = `/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}/emails`;

  const load = useCallback(() => {
    axiosClient
      .get(`${base}/resume`)
      .then(({ data }) => setS(data))
      .catch(() => {});
  }, [base]);

  useEffect(() => {
    load();
    const timer = setInterval(load, s?.enFile ? 5000 : 20000);
    return () => clearInterval(timer);
  }, [load, s?.enFile]);

  if (!s || s.envoyes + s.enFile + s.echecs === 0) return null;

  async function resend() {
    try {
      const { data } = await axiosClient.post(`${base}/renvoyer-echecs`);
      notify(`${data.requeued} email(s) remis en file d'envoi.`, { type: 'success' });
      load();
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur.', { type: 'error' });
    }
  }

  return (
    <Stack spacing={1}>
      {s.alerteAuth && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" component={RouterLink} to="/admin/email-settings">
              Paramètres email
            </Button>
          }
        >
          Les emails ne partent plus : identifiants SMTP refusés ({s.expediteur}). Corrigez le mot de passe dans les paramètres email, puis
          cliquez sur « Renvoyer ».
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <MailOutlineIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          Emails : {s.envoyes} envoyé(s)
          {s.enFile > 0 && ` · ${s.enFile} en file (≈ ${s.minutesRestantes} min à ${s.limiteParMinute}/min)`}
          {s.echecs > 0 && ` · ${s.echecs} échec(s)`}
        </Typography>
        {s.echecs > 0 && (
          <Button size="small" onClick={resend}>
            Renvoyer
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

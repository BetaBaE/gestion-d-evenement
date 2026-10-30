import { useEffect, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import {
  Box,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Stack,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import { getEmailSettings, saveEmailSettings, testEmailSettings } from '../../api/emailSettingsApi.js';

const EMPTY_FORM = {
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  fromName: '',
  fromEmail: '',
  replyTo: '',
  actif: true,
};

export function EmailSettingsPage() {
  const notify = useNotify();
  const [form, setForm] = useState(EMPTY_FORM);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    getEmailSettings()
      .then((data) => {
        if (data) {
          setForm({ ...EMPTY_FORM, ...data, smtpPass: '' });
          setHasPassword(!!data.smtpPassConfigure);
        }
      })
      .catch(() => notify('Impossible de charger les paramètres email.', { type: 'error' }))
      .finally(() => setIsLoading(false));
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...form, smtpPort: Number(form.smtpPort) };
      const saved = await saveEmailSettings(payload);
      setForm({ ...EMPTY_FORM, ...saved, smtpPass: '' });
      setHasPassword(true);
      notify('Paramètres email enregistrés.', { type: 'success' });
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'enregistrement.", { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testEmailSettings();
      setTestResult(result);
      if (result.statut === 'OK') {
        notify('Email de test envoyé avec succès.', { type: 'success' });
      }
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors du test.', { type: 'error' });
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Title title="Paramètres email" />
      <Typography variant="h5" mb={2}>
        Paramètres email de l'organisateur
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Configurez la boîte email depuis laquelle les emails de confirmation et de badge sont
        envoyés pour cet organisateur. Si aucune configuration active n'est définie, ou si le
        dernier test a échoué, les emails sont envoyés depuis l'adresse par défaut de la
        plateforme.
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSave}>
          <Stack spacing={2}>
            <TextField
              label="Hôte SMTP"
              value={form.smtpHost}
              onChange={(e) => updateField('smtpHost', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Port SMTP"
              type="number"
              value={form.smtpPort}
              onChange={(e) => updateField('smtpPort', e.target.value)}
              required
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.smtpSecure}
                  onChange={(e) => updateField('smtpSecure', e.target.checked)}
                />
              }
              label="Connexion sécurisée (SSL, port 465)"
            />
            <TextField
              label="Utilisateur SMTP"
              value={form.smtpUser}
              onChange={(e) => updateField('smtpUser', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Mot de passe SMTP"
              type="password"
              value={form.smtpPass}
              onChange={(e) => updateField('smtpPass', e.target.value)}
              placeholder={hasPassword ? '••••••••' : ''}
              helperText={hasPassword ? 'Laisser vide pour conserver le mot de passe actuel.' : undefined}
              fullWidth
            />
            <TextField
              label="Nom de l'expéditeur"
              value={form.fromName || ''}
              onChange={(e) => updateField('fromName', e.target.value)}
              fullWidth
            />
            <TextField
              label="Email de l'expéditeur"
              type="email"
              value={form.fromEmail}
              onChange={(e) => updateField('fromEmail', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Répondre à (optionnel)"
              type="email"
              value={form.replyTo || ''}
              onChange={(e) => updateField('replyTo', e.target.value)}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.actif}
                  onChange={(e) => updateField('actif', e.target.checked)}
                />
              }
              label="Actif"
            />

            {testResult && (
              <Alert severity={testResult.statut === 'OK' ? 'success' : 'error'}>
                {testResult.statut === 'OK'
                  ? 'Connexion réussie. Un email de test a été envoyé.'
                  : `Échec du test : ${testResult.erreur}`}
              </Alert>
            )}

            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={isSaving}>
                Enregistrer
              </Button>
              <Button variant="outlined" onClick={handleTest} disabled={isTesting || !hasPassword}>
                Tester la connexion
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

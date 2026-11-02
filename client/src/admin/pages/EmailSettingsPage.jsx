import { useEffect, useState } from 'react';
import { Title, useNotify, Form, TextInput, NumberInput, SelectInput, BooleanInput, required, email, minValue, maxValue } from 'react-admin';
import { useFormContext, useFormState } from 'react-hook-form';
import { Alert, Box, Button, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getEmailSettings, saveEmailSettings, testEmailSettings } from '../../api/emailSettingsApi.js';
import { FormPage, FormSection, Field, FormActions, PasswordInput } from '../../components/form/index.js';

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

const PROVIDER_PRESETS = [
  { value: 'outlook', label: 'Outlook / Office 365', smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  { value: 'gmail', label: 'Gmail / Google Workspace', smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpSecure: true },
  { value: 'yahoo', label: 'Yahoo Mail', smtpHost: 'smtp.mail.yahoo.com', smtpPort: 465, smtpSecure: true },
  { value: 'zoho', label: 'Zoho Mail', smtpHost: 'smtp.zoho.com', smtpPort: 465, smtpSecure: true },
  { value: 'custom', label: 'Autre / personnalisé' },
];

const SECURITY_CHOICES = [
  { id: 'starttls', name: 'STARTTLS ou aucune' },
  { id: 'ssl', name: 'SSL / TLS' },
];

/** Prefills host / port / security; they stay editable afterwards. */
function ProviderSelect() {
  const { setValue } = useFormContext();
  const [provider, setProvider] = useState('custom');
  return (
    <TextField
      select
      label="Fournisseur"
      value={provider}
      size="small"
      fullWidth
      helperText="Préremplit l'hôte, le port et la sécurité."
      onChange={(e) => {
        setProvider(e.target.value);
        const preset = PROVIDER_PRESETS.find((p) => p.value === e.target.value);
        if (!preset?.smtpHost) return;
        setValue('smtpHost', preset.smtpHost, { shouldDirty: true, shouldValidate: true });
        setValue('smtpPort', preset.smtpPort, { shouldDirty: true, shouldValidate: true });
        setValue('smtpSecure', preset.smtpSecure, { shouldDirty: true });
      }}
    >
      {PROVIDER_PRESETS.map((p) => (
        <MenuItem key={p.value} value={p.value}>
          {p.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '';
}

/** Test button + last test status. Tests the saved settings, so it waits for unsaved edits. */
function TestSection({ settings, onTested }) {
  const notify = useNotify();
  const { isDirty } = useFormState();
  const [isTesting, setIsTesting] = useState(false);
  const canTest = !!settings?.smtpPassConfigure && !isDirty;

  async function handleTest() {
    setIsTesting(true);
    try {
      const result = await testEmailSettings();
      if (result.statut === 'OK') notify('Email de test envoyé avec succès.', { type: 'success' });
      onTested(result);
    } catch (error) {
      notify(error.response?.data?.message || 'Erreur lors du test.', { type: 'error' });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <FormSection
      title="Test de connexion"
      description="Envoie un email de test à l'adresse de l'expéditeur avec la configuration enregistrée."
    >
      <Field w="full">
        {settings?.dernierTestStatut ? (
          <Alert severity={settings.dernierTestStatut === 'OK' ? 'success' : 'error'} sx={{ mb: 1.5 }}>
            {settings.dernierTestStatut === 'OK'
              ? `Dernier test réussi le ${formatDate(settings.dernierTestLe)}.`
              : `Dernier test échoué le ${formatDate(settings.dernierTestLe)} : ${settings.dernierTestErreur || 'erreur inconnue'}`}
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Aucun test effectué pour le moment.
          </Typography>
        )}
        <Button
          variant="outlined"
          startIcon={isTesting ? <CircularProgress size={16} /> : <SendIcon />}
          onClick={handleTest}
          disabled={isTesting || !canTest}
        >
          Tester la connexion
        </Button>
        {!canTest && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
            {settings?.smtpPassConfigure ? 'Enregistrez vos modifications avant de tester.' : 'Enregistrez la configuration avant de tester.'}
          </Typography>
        )}
      </Field>
    </FormSection>
  );
}

export function EmailSettingsPage() {
  const notify = useNotify();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEmailSettings()
      .then((data) => setSettings(data))
      .catch(() => notify('Impossible de charger les paramètres email.', { type: 'error' }))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave(values) {
    const payload = {
      smtpHost: values.smtpHost,
      smtpPort: Number(values.smtpPort),
      smtpSecure: !!values.smtpSecure,
      smtpUser: values.smtpUser,
      fromName: values.fromName || '',
      fromEmail: values.fromEmail,
      replyTo: values.replyTo || '',
      actif: !!values.actif,
      ...(values.smtpPass ? { smtpPass: values.smtpPass } : {}),
    };
    try {
      setSettings(await saveEmailSettings(payload));
      notify('Paramètres email enregistrés.', { type: 'success' });
    } catch (error) {
      notify(error.response?.data?.message || "Erreur lors de l'enregistrement.", { type: 'error' });
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasPassword = !!settings?.smtpPassConfigure;
  const record = { ...EMPTY_FORM, ...(settings || {}), smtpPass: '' };

  return (
    <>
      <Title title="Paramètres email" />
      {/* key: re-initialise the form with what the server saved. */}
      <Form key={settings?.updatedAt || 'new'} record={record} onSubmit={handleSave} mode="onBlur" reValidateMode="onChange">
        <FormPage
          title="Paramètres email"
          subtitle="Boîte d'envoi des emails de confirmation et de badge. Sans configuration active (ou si le dernier test a échoué), l'adresse par défaut de la plateforme est utilisée."
          breadcrumbs={[{ label: 'Paramètres email' }]}
          actions={<FormActions />}
        >
          <FormSection title="Serveur SMTP">
            <Field w="half">
              <ProviderSelect />
            </Field>
            <Field w="half">
              <BooleanInput source="actif" label="Utiliser cette configuration" sx={{ mt: 1 }} />
            </Field>
            <Field w="half">
              <TextInput source="smtpHost" label="Hôte SMTP" validate={required()} fullWidth />
            </Field>
            <Field w="quarter">
              <NumberInput
                source="smtpPort"
                label="Port"
                validate={[required(), minValue(1, 'Port invalide.'), maxValue(65535, 'Port invalide.')]}
                min={1}
                max={65535}
                fullWidth
              />
            </Field>
            <Field w="quarter">
              <SelectInput
                source="smtpSecure"
                label="Sécurité"
                choices={SECURITY_CHOICES}
                format={(v) => (v ? 'ssl' : 'starttls')}
                parse={(v) => v === 'ssl'}
                emptyText={null}
                fullWidth
              />
            </Field>
          </FormSection>

          <FormSection title="Authentification">
            <Field w="half">
              <TextInput source="smtpUser" label="Utilisateur" validate={required()} autoComplete="off" fullWidth />
            </Field>
            <Field w="half">
              <PasswordInput
                source="smtpPass"
                label="Mot de passe"
                generate={false}
                placeholder={hasPassword ? '••••••••' : undefined}
                validate={hasPassword ? undefined : required('Le mot de passe SMTP est requis.')}
                helperText={hasPassword ? 'Laisser vide pour conserver le mot de passe actuel.' : undefined}
              />
            </Field>
          </FormSection>

          <FormSection title="Expéditeur" description="Ce que les participants voient dans leur boîte de réception.">
            <Field w="half">
              <TextInput source="fromName" label="Nom de l'expéditeur" fullWidth />
            </Field>
            <Field w="half">
              <TextInput source="fromEmail" label="Email de l'expéditeur" type="email" validate={[required(), email('Email invalide.')]} fullWidth />
            </Field>
            <Field w="half">
              <TextInput source="replyTo" label="Répondre à" type="email" validate={email('Email invalide.')} fullWidth />
            </Field>
          </FormSection>

          <TestSection settings={settings} onTested={() => getEmailSettings().then(setSettings)} />
        </FormPage>
      </Form>
    </>
  );
}

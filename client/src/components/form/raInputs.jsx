import { useEffect, useRef, useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { SaveButton, TextInput, useInput } from 'react-admin';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ColorField } from './ColorField.jsx';
import { useBrandKitColors } from './useBrandKitColors.js';

/** react-admin adapter for ColorField (brand-kit presets included). */
export function ColorInput({ source, label, validate, helperText, required, presets, tokens, allowNone }) {
  const brandKit = useBrandKitColors();
  const {
    field,
    fieldState: { error, isTouched },
    formState: { isSubmitted },
  } = useInput({ source, validate });
  const showError = (isTouched || isSubmitted) && error;
  return (
    <ColorField
      label={label}
      name={field.name}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
      onBlur={field.onBlur}
      error={!!showError}
      helperText={showError ? error.message : helperText}
      required={required}
      presets={presets || brandKit}
      tokens={tokens}
      allowNone={allowNone}
    />
  );
}

/** URL field that adds https:// on blur when the scheme is missing. */
export function UrlInput({ source, ...props }) {
  const { setValue } = useFormContext();
  return (
    <TextInput
      source={source}
      type="url"
      placeholder="https://"
      fullWidth
      {...props}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && !/^https?:\/\//i.test(v)) {
          setValue(source, `https://${v}`, { shouldDirty: true, shouldValidate: true });
        }
      }}
    />
  );
}

function generatePassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%*-_';
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Password with show/hide, "Générer" and copy. */
export function PasswordInput({ source, label = 'Mot de passe', validate, helperText, placeholder, generate = true }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const {
    field,
    fieldState: { error, isTouched },
    formState: { isSubmitted },
    isRequired,
  } = useInput({ source, validate });
  const showError = (isTouched || isSubmitted) && error;

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <TextField
        {...field}
        value={field.value || ''}
        label={label}
        required={isRequired}
        type={visible ? 'text' : 'password'}
        size="small"
        fullWidth
        autoComplete="new-password"
        placeholder={placeholder}
        error={!!showError}
        helperText={showError ? error.message : copied ? 'Copié dans le presse-papiers.' : helperText || ' '}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                {field.value && (
                  <Tooltip title="Copier">
                    <IconButton
                      size="small"
                      onClick={async () => {
                        await navigator.clipboard?.writeText(field.value);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title={visible ? 'Masquer' : 'Afficher'}>
                  <IconButton size="small" onClick={() => setVisible((v) => !v)}>
                    {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
      {generate && (
      <Button
        variant="outlined"
        startIcon={<AutorenewIcon />}
        sx={{ mt: 0.25, flexShrink: 0 }}
        onClick={() => {
          field.onChange(generatePassword());
          setVisible(true);
        }}
      >
        Générer
      </Button>
      )}
    </Stack>
  );
}

/** Warns before closing/reloading the tab while the form has unsaved edits. */
export function useWarnBeforeUnload(active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}

/**
 * Sticky action bar for react-admin forms: Annuler + Enregistrer, the reason
 * when Enregistrer is disabled, a summary of the fields to fix after a
 * failed submit (with scroll to the first one), and an unsaved-changes
 * warning on tab close and on Annuler.
 */
export function FormActions({ onCancel, saveLabel = 'Enregistrer', cancelLabel = 'Annuler', alwaysEnable = false, extra }) {
  const { isDirty, isSubmitting, submitCount, errors, isSubmitSuccessful } = useFormState();
  const rootRef = useRef(null);
  const [errorLabels, setErrorLabels] = useState([]);
  const hasErrors = Object.keys(errors || {}).length > 0;

  useWarnBeforeUnload(isDirty && !isSubmitSuccessful);

  // After each submit attempt, list what's wrong and bring it into view.
  useEffect(() => {
    if (!submitCount) return;
    const form = rootRef.current?.closest('form');
    if (!form || !hasErrors) {
      setErrorLabels([]);
      return;
    }
    const timer = setTimeout(() => {
      const labels = [...form.querySelectorAll('label.Mui-error')]
        .map((l) => l.textContent.replace(/\s*\*$/, '').trim())
        .filter(Boolean);
      setErrorLabels([...new Set(labels)]);
      form.querySelector('[aria-invalid="true"], .Mui-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [submitCount, hasErrors]);

  const disabledReason = isSubmitting
    ? 'Enregistrement en cours…'
    : !isDirty && !alwaysEnable
      ? 'Aucune modification à enregistrer'
      : null;

  function handleCancel() {
    if (isDirty && !window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) return;
    if (onCancel) onCancel();
    else window.history.back();
  }

  return (
    <Box ref={rootRef}>
      {submitCount > 0 && hasErrors && errorLabels.length > 0 && (
        <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>
          {errorLabels.length === 1 ? 'Champ à corriger : ' : `${errorLabels.length} champs à corriger : `}
          {errorLabels.join(', ')}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
        {extra && <Box sx={{ mr: 'auto' }}>{extra}</Box>}
        <Button onClick={handleCancel} color="inherit">
          {cancelLabel}
        </Button>
        <Tooltip title={disabledReason || ''} disableHoverListener={!disabledReason}>
          <span>
            <SaveButton label={saveLabel} alwaysEnable={alwaysEnable} />
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}

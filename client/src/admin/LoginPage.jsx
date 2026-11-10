import { useRef, useState } from 'react';
import { useLogin } from 'react-admin';
import { useTheme } from '@mui/material/styles';
import { TurnstileField } from '../components/security/TurnstileField.jsx';
import { captchaErrorMessage, useTurnstileConfig } from '../components/security/turnstileConfig.js';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BadgeIcon from '@mui/icons-material/Badge';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import InsightsIcon from '@mui/icons-material/Insights';

const APP_NAME = 'Gestion des inscriptions';

const FEATURES = [
  { icon: HowToRegIcon, title: 'Inscriptions en ligne', text: 'Un lien par événement pour les organismes invités.' },
  { icon: BadgeIcon, title: 'Badges personnalisés', text: 'Éditeur visuel, modèles et impression PDF.' },
  { icon: QrCodeScannerIcon, title: "Scan à l'entrée", text: 'Contrôle des badges depuis un simple téléphone.' },
  { icon: InsightsIcon, title: 'Statistiques', text: 'Présence en temps réel par catégorie et organisme.' },
];

function errorMessage(error) {
  if (!error?.response) return 'Serveur injoignable. Vérifiez votre connexion puis réessayez.';
  return error.response.data?.message || 'Connexion impossible. Réessayez.';
}

/** Back-office sign-in: brand panel (hidden on phones) + form. */
export function LoginPage() {
  const login = useLogin();
  const theme = useTheme();
  const turnstile = useTurnstileConfig();
  const turnstileRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  // Bot-check problem (server code or widget failure): shown next to the button with "Réessayer".
  const [captchaError, setCaptchaError] = useState(null);

  const needsToken = turnstile.loading || turnstile.enabled;
  const verifying = needsToken && !turnstileToken && !captchaError && !turnstile.misconfigured;

  /** Tokens are single-use: after any failed attempt, ask Cloudflare for a new one. */
  function resetTurnstile() {
    setTurnstileToken('');
    setCaptchaError(null);
    turnstileRef.current?.reset();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (needsToken && !turnstileToken) return;
    setError(null);
    setCaptchaError(null);
    setLoading(true);
    try {
      // authProvider.login expects { username, password }; the username is the email.
      await login({ username: email.trim(), password, turnstileToken: turnstileToken || undefined });
    } catch (err) {
      const captcha = captchaErrorMessage(err);
      if (captcha) setCaptchaError(captcha);
      else setError(errorMessage(err));
      setLoading(false);
      if (turnstile.enabled) {
        setTurnstileToken('');
        turnstileRef.current?.reset();
      }
    }
  }

  const detectCapsLock = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {/* Brand panel */}
      <Box
        sx={{
          flex: '1 1 55%',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0b2a4a 0%, #1864ab 55%, #1c7ed6 100%)',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.12,
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', position: 'relative' }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center' }}>
            <BadgeIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {APP_NAME}
          </Typography>
        </Stack>

        <Box sx={{ position: 'relative', maxWidth: 520 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 2 }}>
            Vos événements, de l'inscription à l'entrée.
          </Typography>
          <Typography sx={{ opacity: 0.85, mb: 4, fontSize: 17 }}>
            Gérez les invités, générez les badges et contrôlez l'accès le jour J, au même endroit.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Stack key={title} direction="row" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center' }}>
                  <Icon fontSize="small" />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{title}</Typography>
                  <Typography sx={{ opacity: 0.75, fontSize: 13 }}>{text}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Box>

        <Typography sx={{ position: 'relative', opacity: 0.6, fontSize: 13 }}>© {new Date().getFullYear()} {APP_NAME}</Typography>
      </Box>

      {/* Form */}
      <Box sx={{ flex: '1 1 45%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6 } }}>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', maxWidth: 400 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 4, display: { xs: 'flex', md: 'none' } }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center' }}>
              <BadgeIcon />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {APP_NAME}
            </Typography>
          </Stack>

          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Connexion
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Accédez à l'espace de gestion de vos événements.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              label="Email"
              type="email"
              name="username"
              autoComplete="username"
              autoFocus
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={detectCapsLock}
              onKeyDown={detectCapsLock}
              disabled={loading}
              helperText={capsLock ? 'Verr. Maj activé' : ' '}
              slotProps={{
                formHelperText: { sx: { color: 'warning.main' } },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TurnstileField
              ref={turnstileRef}
              action="login"
              theme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
              onToken={(token) => {
                setTurnstileToken(token);
                setCaptchaError(null);
              }}
              onExpire={() => setTurnstileToken('')}
              onError={() => {
                setTurnstileToken('');
                setCaptchaError("La vérification anti-robot n'a pas pu aboutir.");
              }}
            />
            {captchaError && (
              <Alert
                severity="warning"
                action={
                  <Button color="inherit" size="small" onClick={resetTurnstile}>
                    Réessayer
                  </Button>
                }
              >
                {captchaError}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || !email.trim() || !password || (needsToken && !turnstileToken)}
              startIcon={loading || verifying ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ py: 1.4, fontWeight: 600 }}
            >
              {loading ? 'Connexion…' : verifying ? 'Vérification en cours…' : 'Se connecter'}
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            Mot de passe oublié ? Contactez l'administrateur de votre organisation.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

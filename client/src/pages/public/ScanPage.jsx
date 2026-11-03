import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import { Html5Qrcode } from 'html5-qrcode';
import { Box, Center, Loader, Alert, Text, Title, TextInput, Button, Stack, Avatar } from '@mantine/core';
import { IconUserQuestion } from '@tabler/icons-react';
import { checkScanAccess, submitScan, scanPhotoUrl } from '../../api/scanApi.js';

const FEEDBACK_COLORS = {
  ok: '#2f9e44',
  dejaScanne: '#f08c00',
  invalide: '#e03131',
};

const RESUME_DELAY_MS = 1500;

// One title per refusal reason (the server sends the detailed message).
const DENIED_TITLES = {
  LIEN_INVALIDE: 'Lien invalide ou remplacé',
  PAS_ENCORE: 'Scan pas encore ouvert',
  EXPIRE: 'Scan fermé',
};
const SCANNER_ELEMENT_ID = 'scan-reader';

function playFeedbackSound(type) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = type === 'ok' ? 880 : type === 'dejaScanne' ? 440 : 220;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio not available; ignore silently.
  }
  if (navigator.vibrate) {
    navigator.vibrate(type === 'ok' ? 100 : [80, 50, 80]);
  }
}

export function ScanPage() {
  const { scanToken } = useParams();
  const [accessState, setAccessState] = useState('loading');
  // 'starting' | 'on' | 'insecure' (http, no camera API) | 'unavailable' (refused / no camera)
  const [camera, setCamera] = useState('starting');
  const [eventInfo, setEventInfo] = useState(null);
  const [denied, setDenied] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const isProcessingRef = useRef(false);

  useEffect(() => {
    checkScanAccess(scanToken)
      .then((data) => {
        setEventInfo(data);
        setAccessState('ok');
      })
      .catch((error) => {
        const data = error.response?.data;
        setDenied(
          data
            ? { title: DENIED_TITLES[data.details?.code] || 'Accès refusé', message: data.message }
            : { title: 'Serveur injoignable', message: 'Vérifiez la connexion du téléphone puis rechargez la page.' },
        );
        setAccessState('denied');
      });
  }, [scanToken]);

  const handleResult = useCallback(
    async (badgeCode) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const result = await submitScan(scanToken, badgeCode);
        setFeedback({ type: 'ok', data: result });
        playFeedbackSound('ok');
      } catch (error) {
        if (error.response?.data?.dejaScanne) {
          setFeedback({ type: 'dejaScanne', message: error.response.data.message });
          playFeedbackSound('dejaScanne');
        } else {
          setFeedback({
            type: 'invalide',
            message: error.response?.data?.message || 'Badge invalide.',
          });
          playFeedbackSound('invalide');
        }
      }

      setTimeout(() => {
        setFeedback(null);
        isProcessingRef.current = false;
      }, RESUME_DELAY_MS);
    },
    [scanToken],
  );

  useEffect(() => {
    if (accessState !== 'ok') return undefined;

    // Browsers only expose the camera on https:// (or localhost): on a plain
    // http LAN address navigator.mediaDevices doesn't even exist.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamera('insecure');
      return undefined;
    }

    let scanner;
    let cancelled = false;
    try {
      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    } catch {
      setCamera('unavailable');
      return undefined;
    }

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!isProcessingRef.current) {
            handleResult(decodedText);
          }
        },
        () => {},
      )
      .then(() => !cancelled && setCamera('on'))
      .catch(() => !cancelled && setCamera('unavailable'));

    return () => {
      cancelled = true;
      // html5-qrcode throws synchronously (a plain string) when stopping a
      // scanner that never started — that used to blank the whole page.
      try {
        if (scanner.isScanning) scanner.stop().catch(() => {});
      } catch {
        // already stopped
      }
    };
  }, [accessState, handleResult]);

  function handleManualSubmit(event) {
    event.preventDefault();
    if (manualCode.trim()) {
      handleResult(manualCode.trim());
      setManualCode('');
    }
  }

  if (accessState === 'loading') {
    return (
      <Center style={{ height: '100vh', background: '#000' }}>
        <Loader color="white" />
      </Center>
    );
  }

  if (accessState === 'denied') {
    return (
      <Center style={{ height: '100vh', background: '#000' }}>
        <Alert color="red" title={denied?.title} style={{ maxWidth: 400, margin: 16 }}>
          {denied?.message}
        </Alert>
      </Center>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', background: '#000', color: '#fff', position: 'relative' }}>
      {eventInfo?.modeTest && (
        <Box p="xs" style={{ background: '#f08c00', color: '#000', textAlign: 'center', fontWeight: 700 }}>
          MODE TEST — les scans ne comptent pas dans les statistiques
          {eventInfo.scanTestJusquALabel && ` (jusqu'au ${eventInfo.scanTestJusquALabel})`}
        </Box>
      )}
      <Box p="md">
        <Title order={3} ta="center">
          {eventInfo?.titre}
        </Title>
      </Box>

      {camera === 'insecure' || camera === 'unavailable' ? (
        <Center p="md">
          {camera === 'insecure' ? (
            <Alert color="yellow" title="Caméra bloquée : connexion non sécurisée" style={{ maxWidth: 400 }}>
              Le navigateur n'autorise la caméra que sur une adresse en https://. Ouvrez le lien de scan en https, ou utilisez la saisie
              manuelle ci-dessous.
            </Alert>
          ) : (
            <Alert color="yellow" title="Caméra indisponible" style={{ maxWidth: 400 }}>
              Autorisez l'accès à la caméra pour ce site dans le navigateur, puis rechargez la page. En attendant, utilisez la saisie
              manuelle ci-dessous.
            </Alert>
          )}
        </Center>
      ) : (
        <Box id={SCANNER_ELEMENT_ID} style={{ width: '100%' }} />
      )}

      <Box p="md">
        <form onSubmit={handleManualSubmit}>
          <Stack gap="xs">
            <TextInput
              placeholder="Saisie manuelle du code badge"
              value={manualCode}
              onChange={(e) => setManualCode(e.currentTarget.value)}
            />
            <Button type="submit" variant="outline" color="gray">
              Valider le code
            </Button>
          </Stack>
        </form>
      </Box>

      {feedback && (
        <Center
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: FEEDBACK_COLORS[feedback.type],
            zIndex: 1000,
          }}
        >
          <Stack align="center" gap="xs">
            {feedback.type === 'ok' && (
              <>
                {feedback.data.hasPhoto ? (
                  <Avatar
                    src={scanPhotoUrl(scanToken, feedback.data.participantId)}
                    size={160}
                    radius="md"
                  />
                ) : (
                  <Stack align="center" gap={4}>
                    <Avatar size={160} radius="md" color="gray">
                      <IconUserQuestion size={80} />
                    </Avatar>
                    <Text size="sm" c="white">
                      Pas de photo, vérifier l'identité
                    </Text>
                  </Stack>
                )}
                <Title order={1} c="white">
                  {feedback.data.prenom} {feedback.data.nom}
                </Title>
                <Text size="xl" c="white">
                  {feedback.data.categorie?.nom} — {feedback.data.organisme?.nom}
                </Text>
                <Text size="lg" c="white">
                  Entrée n°{feedback.data.entryNumber}
                </Text>
              </>
            )}
            {feedback.type === 'dejaScanne' && (
              <Title order={1} c="white">
                Déjà scanné
              </Title>
            )}
            {feedback.type === 'invalide' && (
              <>
                <Title order={1} c="white">
                  Badge invalide
                </Title>
                {feedback.message && feedback.message !== 'Badge invalide.' && (
                  <Text size="lg" c="white" ta="center" px="md">
                    {feedback.message}
                  </Text>
                )}
              </>
            )}
          </Stack>
        </Center>
      )}
    </Box>
  );
}

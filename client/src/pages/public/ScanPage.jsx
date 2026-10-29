import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import { Html5Qrcode } from 'html5-qrcode';
import { Box, Center, Loader, Alert, Text, Title, TextInput, Button, Stack } from '@mantine/core';
import { checkScanAccess, submitScan } from '../../api/scanApi.js';

const FEEDBACK_COLORS = {
  ok: '#2f9e44',
  dejaScanne: '#f08c00',
  invalide: '#e03131',
};

const RESUME_DELAY_MS = 1500;
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
  const [eventInfo, setEventInfo] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const isProcessingRef = useRef(false);

  useEffect(() => {
    checkScanAccess(scanToken)
      .then((data) => {
        setEventInfo(data);
        setAccessState('ok');
      })
      .catch(() => setAccessState('denied'));
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
    if (accessState !== 'ok') return;

    const html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID);

    html5Qrcode
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
      .catch(() => setAccessState('no-camera'));

    return () => {
      html5Qrcode.stop().catch(() => {});
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
        <Alert color="red" title="Accès refusé">
          Ce lien de scan n'est pas valide ou n'est plus actif.
        </Alert>
      </Center>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', background: '#000', color: '#fff', position: 'relative' }}>
      <Box p="md">
        <Title order={3} ta="center">
          {eventInfo?.titre}
        </Title>
      </Box>

      {accessState === 'no-camera' ? (
        <Center p="md">
          <Alert color="yellow" title="Caméra indisponible" style={{ maxWidth: 400 }}>
            Impossible d'accéder à la caméra. Utilisez la saisie manuelle ci-dessous.
          </Alert>
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
              <Title order={1} c="white">
                Badge invalide
              </Title>
            )}
          </Stack>
        </Center>
      )}
    </Box>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import { Html5Qrcode } from 'html5-qrcode';
import { Box, Center, Loader, Alert, Title, TextInput, Button, Stack } from '@mantine/core';
import { checkScanAccess, submitScan } from '../../api/scanApi.js';
import { ScanResultCard, RESULT_STYLES, playResultTone } from './ScanResultCard.jsx';

// One title per refusal reason (the server sends the detailed message).
const DENIED_TITLES = {
  LIEN_INVALIDE: 'Lien invalide ou remplacé',
  PAS_ENCORE: 'Scan pas encore ouvert',
  EXPIRE: 'Scan fermé',
};
const SCANNER_ELEMENT_ID = 'scan-reader';

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
  const dismissTimerRef = useRef(null);

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

      let next;
      try {
        // OK / DEJA_SCANNE / NON_VALIDE / INCONNU, with the participant when known.
        next = await submitScan(scanToken, badgeCode);
      } catch (error) {
        // Link closed or replaced meanwhile, server unreachable…
        const data = error.response?.data;
        next = {
          result: 'ERREUR',
          message: data ? `${DENIED_TITLES[data.details?.code] ? `${DENIED_TITLES[data.details.code]} — ` : ''}${data.message}` : 'Serveur injoignable. Vérifiez la connexion.',
        };
      }
      const style = RESULT_STYLES[next.result] || RESULT_STYLES.ERREUR;
      setFeedback(next);
      playResultTone(style.tone);

      // Long enough to read the name; a tap on the card closes it sooner.
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(dismissFeedback, style.durationMs);
    },
    [scanToken],
  );

  function dismissFeedback() {
    clearTimeout(dismissTimerRef.current);
    setFeedback(null);
    isProcessingRef.current = false;
  }

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

      {feedback && <ScanResultCard feedback={feedback} onDismiss={dismissFeedback} />}
    </Box>
  );
}

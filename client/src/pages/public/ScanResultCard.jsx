import { Avatar, Box, Stack, Text, Title } from '@mantine/core';
import { IconUserQuestion } from '@tabler/icons-react';
import { axiosClient } from '../../api/axiosClient.js';

/** How each scan result looks and sounds. */
export const RESULT_STYLES = {
  OK: { background: '#2f9e44', title: '✓ ENTRÉE VALIDÉE', tone: 'ok', durationMs: 2200 },
  DEJA_SCANNE: { background: '#e8590c', title: '⚠ DÉJÀ SCANNÉ', tone: 'warning', durationMs: 3500 },
  NON_VALIDE: { background: '#c92a2a', title: '✕ BADGE NON VALIDÉ', tone: 'error', durationMs: 3500 },
  INCONNU: { background: '#c92a2a', title: '✕ BADGE INCONNU', tone: 'error', durationMs: 3000 },
  ERREUR: { background: '#c92a2a', title: '✕ SCAN IMPOSSIBLE', tone: 'error', durationMs: 3500 },
};

const STATUT_LABELS = { EN_ATTENTE: 'Inscription en attente', REFUSE: 'Inscription refusée' };

/** "1re entrée", "2e entrée"… */
export function ordinalEntree(n) {
  return n === 1 ? '1re entrée' : `${n}e entrée`;
}

/** "40 s", "2 min 05 s". */
export function formatAgo(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

/** Line under the title: entry number, time since the last scan, or the registration status. */
export function resultDetail(feedback) {
  switch (feedback.result) {
    case 'OK':
      return ordinalEntree(feedback.numeroEntree);
    case 'DEJA_SCANNE':
      return `Dernier scan il y a ${formatAgo(feedback.dernierScanIlYa)} (${feedback.dernierScanALabel})`;
    case 'NON_VALIDE':
      return STATUT_LABELS[feedback.statut] || 'Inscription non validée';
    case 'INCONNU':
      return "Ce badge n'appartient à aucun participant de cet événement.";
    default:
      return feedback.message || '';
  }
}

/** Short distinct sounds + vibrations: one high beep (OK), two beeps (already scanned), a low buzz (refused). */
export function playResultTone(tone) {
  const patterns = {
    ok: { beeps: [[0, 0.15, 880]], vibrate: 120 },
    warning: { beeps: [[0, 0.12, 620], [0.2, 0.12, 620]], vibrate: [90, 70, 90] },
    error: { beeps: [[0, 0.45, 200]], vibrate: [300, 100, 300] },
  }[tone];
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    patterns.beeps.forEach(([start, length, freq]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone === 'error' ? 'square' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + start);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + length);
    });
  } catch {
    // No audio available.
  }
  navigator.vibrate?.(patterns.vibrate);
}

/**
 * Full-screen result. Same layout whenever the participant is known (photo,
 * NOM PRÉNOM, fonction, organisme, category band in its color), so the
 * agent always sees who it is — including for "déjà scanné" and refused badges.
 */
export function ScanResultCard({ feedback, onDismiss }) {
  const style = RESULT_STYLES[feedback.result] || RESULT_STYLES.ERREUR;
  const p = feedback.participant;

  return (
    <Box
      onClick={onDismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: style.background, color: '#fff', display: 'flex', flexDirection: 'column' }}
    >
      <Stack align="center" justify="center" gap="sm" style={{ flex: 1, padding: 24, textAlign: 'center' }}>
        <Title order={2} c="white" style={{ letterSpacing: 1 }}>
          {style.title}
        </Title>
        <Text size="lg" fw={600} c="white">
          {resultDetail(feedback)}
        </Text>

        {p && (
          <Stack align="center" gap={6} mt="md">
            {p.photoUrl ? (
              <Avatar src={`${axiosClient.defaults.baseURL}${p.photoUrl.replace(/^\/api/, '')}`} size={150} radius="md" style={{ border: '4px solid rgba(255,255,255,0.85)' }} />
            ) : (
              <Stack align="center" gap={4}>
                <Avatar size={150} radius="md" color="gray" variant="filled">
                  <IconUserQuestion size={72} />
                </Avatar>
                <Text size="sm" c="white">
                  Pas de photo : vérifier l'identité
                </Text>
              </Stack>
            )}
            <Title order={1} c="white" style={{ lineHeight: 1.1, marginTop: 8 }}>
              {p.nomPrenom}
            </Title>
            {p.fonction && (
              <Text size="xl" c="white">
                {p.fonction}
              </Text>
            )}
            {p.organisme && (
              <Text size="lg" fw={700} c="white" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {p.organisme}
              </Text>
            )}
          </Stack>
        )}
      </Stack>

      {p?.categorie && (
        <Box style={{ background: p.categorie.couleur || '#1971c2', padding: '18px 16px', textAlign: 'center', borderTop: '3px solid rgba(255,255,255,0.85)' }}>
          <Text size="xl" fw={800} c="white" style={{ textTransform: 'uppercase', letterSpacing: 3 }}>
            {p.categorie.nom}
          </Text>
        </Box>
      )}
      <Text size="xs" c="white" ta="center" py={6} style={{ opacity: 0.8 }}>
        Touchez l'écran pour scanner le suivant
      </Text>
    </Box>
  );
}

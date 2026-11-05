import { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecordContext } from 'react-admin';
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getGroupCounts } from '../../api/bulkApi.js';
import { BulkConfirmDialog } from './BulkConfirmDialog.jsx';

/**
 * Group shortcuts ("Valider tout (8)", "Imprimer le groupe"…): each one is a
 * bulk action on a filter selection, confirmed in the same dialog as the
 * participant list's action bar and run as a background job.
 */
const GroupActionContext = createContext(null);

export function GroupActionsProvider({ eventId, onPrint, children }) {
  const [request, setRequest] = useState(null);
  const value = {
    run: (action, filtre, options = {}) => setRequest({ action, selection: { mode: 'filtre', filtre }, options }),
    print: onPrint ? (filtre) => onPrint({ mode: 'filtre', filtre }) : null,
  };
  return (
    <GroupActionContext.Provider value={value}>
      {children}
      <BulkConfirmDialog eventId={eventId} request={request} onClose={() => setRequest(null)} />
    </GroupActionContext.Provider>
  );
}

const useGroupAction = () => useContext(GroupActionContext) || { run: () => {}, print: null };

/** Refetched by react-admin's refresh (e.g. when a job finishes). */
export function useGroupCounts(eventId) {
  return useQuery({ queryKey: ['actions-groupees', 'compteurs', eventId], queryFn: () => getGroupCounts(eventId), enabled: !!eventId });
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const stop = (fn) => (e) => {
  e.stopPropagation();
  fn();
};

/** Organismes row: "12 inscrits · 8 en attente". */
export function OrganismeCountsField({ eventId }) {
  const record = useRecordContext();
  const { data } = useGroupCounts(eventId);
  const c = data?.organismes[record?.id];
  if (!record || !data) return null;
  if (!c) return <Typography variant="body2" color="text.secondary">Aucun inscrit</Typography>;
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
      {plural(c.inscrits, 'inscrit')}
      {c.enAttente > 0 && <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}> · {c.enAttente} en attente</Box>}
    </Typography>
  );
}

/** Organismes row: "Valider tout (8)" / "Imprimer les badges (12)". */
export function OrganismeShortcuts({ eventId }) {
  const record = useRecordContext();
  const { data } = useGroupCounts(eventId);
  const { run, print } = useGroupAction();
  const c = data?.organismes[record?.id];
  if (!record || !c) return null;
  return (
    <Stack direction="row" spacing={0.5}>
      {c.enAttente > 0 && (
        <Button size="small" color="success" startIcon={<CheckCircleIcon />} onClick={stop(() => run('VALIDER_ENVOYER', { invitedOrganismId: record.id, statut: 'EN_ATTENTE' }))} sx={{ whiteSpace: 'nowrap' }}>
          Valider tout ({c.enAttente})
        </Button>
      )}
      {print && c.valides > 0 && (
        <Button size="small" startIcon={<PrintIcon />} onClick={stop(() => print({ invitedOrganismId: record.id }))} sx={{ whiteSpace: 'nowrap' }}>
          Imprimer les badges ({c.valides})
        </Button>
      )}
    </Stack>
  );
}

/** Catégories row: count and "Imprimer tous les badges". */
export function CategorieShortcuts({ eventId }) {
  const record = useRecordContext();
  const { data } = useGroupCounts(eventId);
  const { print } = useGroupAction();
  const c = data?.categories[record?.id];
  if (!record || !data) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
        {c ? `${plural(c.inscrits, 'inscrit')} · ${plural(c.valides, 'validé')}` : 'Aucun inscrit'}
      </Typography>
      {print && c?.valides > 0 && (
        <Button size="small" startIcon={<PrintIcon />} onClick={stop(() => print({ categorieId: record.id }))} sx={{ whiteSpace: 'nowrap' }}>
          Imprimer tous les badges ({c.valides})
        </Button>
      )}
    </Stack>
  );
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Participants grouped by form submission (inscriptionGroupeId):
 * "Groupe de 5 · ONEE · soumis le …" with "Valider le groupe" / "Imprimer le groupe".
 */
export function InscriptionsView({ eventId, organismes, onShowGroup }) {
  const { data, isLoading } = useGroupCounts(eventId);
  const { run, print } = useGroupAction();
  const [shown, setShown] = useState(30);
  const orgName = (id) => organismes.find((o) => o.id === String(id))?.nom || 'Organisme inconnu';

  if (isLoading) return <CircularProgress size={24} sx={{ m: 2 }} />;
  const groups = data?.inscriptions || [];
  if (groups.length === 0) return <Typography color="text.secondary" sx={{ p: 2 }}>Aucune inscription groupée (formulaire) pour cet événement.</Typography>;

  return (
    <Stack spacing={1}>
      {groups.slice(0, shown).map((g) => (
        <Paper key={g.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>
                {g.n > 1 ? `Groupe de ${g.n}` : 'Inscription individuelle'} · {orgName(g.organismeId)} · soumis le {dateFmt.format(new Date(g.soumisLe))}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {g.noms.join(', ')}
                {g.n > g.noms.length ? '…' : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              {g.enAttente > 0 ? <Chip size="small" color="warning" label={`${g.enAttente} en attente`} /> : <Chip size="small" color="success" variant="outlined" label="Traité" />}
              {g.enAttente > 0 && (
                <Button size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => run('VALIDER_ENVOYER', { inscriptionGroupeId: g.id, statut: 'EN_ATTENTE' })}>
                  Valider le groupe
                </Button>
              )}
              {print && g.valides > 0 && (
                <Button size="small" startIcon={<PrintIcon />} onClick={() => print({ inscriptionGroupeId: g.id })}>
                  Imprimer le groupe
                </Button>
              )}
              <Button size="small" color="inherit" startIcon={<VisibilityIcon />} onClick={() => onShowGroup(g.id)}>
                Voir
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      {groups.length > shown && (
        <Button onClick={() => setShown((n) => n + 30)} sx={{ alignSelf: 'center' }}>
          Afficher plus ({groups.length - shown})
        </Button>
      )}
    </Stack>
  );
}

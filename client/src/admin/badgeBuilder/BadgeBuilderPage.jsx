import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useNotify, Title } from 'react-admin';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import QRCode from 'qrcode';
import { axiosClient } from '../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { getDefaultProps, nanoid } from '../../../../shared/badge-renderer/index.js';
import { BlockPalette } from './BlockPalette.jsx';
import { BadgeCanvas } from './BadgeCanvas.jsx';
import { BlockSettingsPanel } from './BlockSettingsPanel.jsx';
import { blockCatalogEntry } from './blockCatalog.js';
import { buildClientAssets } from './buildClientAssets.js';
import { badgePreviewUrl, badgePreviewHtmlUrl } from '../../api/imageApi.js';

const PANEL_KEYS = ['P1', 'P2', 'P3', 'P4'];
const MAX_HISTORY = 50;
const AUTOSAVE_DELAY_MS = 1500;

function eventBasePath(eventId) {
  const organisateurId = getSelectedOrganisateurId();
  return `/admin/organisateurs/${organisateurId}/events/${eventId}`;
}

function findBlockLocation(panneaux, blockId) {
  for (const key of PANEL_KEYS) {
    const index = (panneaux[key]?.blocs || []).findIndex((b) => b.id === blockId);
    if (index !== -1) return { panelKey: key, index };
  }
  return null;
}

export function BadgeBuilderPage() {
  const { id: eventId } = useParams();
  const notify = useNotify();

  const [event, setEvent] = useState(null);
  const [theme, setTheme] = useState(null);
  const [format, setFormat] = useState('A4_PLIE_4');
  const [carteLargeurMm, setCarteLargeurMm] = useState(85.6);
  const [carteHauteurMm, setCarteHauteurMm] = useState(54);
  const [panneaux, setPanneaux] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'pending' | 'saving' | 'error'
  const [activeDragType, setActiveDragType] = useState(null);

  const [organisateur, setOrganisateur] = useState(null);
  const [partenaireList, setPartenaireList] = useState([]);
  const [qrCodeSvg, setQrCodeSvg] = useState('');

  const historyRef = useRef({ stack: [], index: -1, suppress: false });
  const autosaveTimerRef = useRef(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const organisateurId = getSelectedOrganisateurId();

  const samplePayload = useMemo(
    () => ({
      event: event || {},
      participant: { nom: 'Dupont', prenom: 'Jean', fonction: 'Directeur', badgeCode: 'APERCU-EXEMPLE' },
      organisme: { nom: 'Organisme Exemple' },
      organisateur: organisateur || {},
      categorie: { nom: 'Invité', couleur: theme?.couleurPrincipale || '#1971c2' },
    }),
    [event, organisateur, theme],
  );

  useEffect(() => {
    QRCode.toString('APERCU-EXEMPLE', { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setQrCodeSvg);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [eventRes, partenairesRes] = await Promise.all([
          axiosClient.get(`${eventBasePath(eventId)}`),
          axiosClient.get(`/admin/organisateurs/${organisateurId}/partenaires`, { params: { limit: 100 } }),
        ]);
        if (cancelled) return;

        const ev = eventRes.data;
        setEvent(ev);
        setTheme(ev.badgeConfig.theme);
        setFormat(ev.badgeConfig.format);
        setCarteLargeurMm(ev.badgeConfig.carteLargeurMm || 85.6);
        setCarteHauteurMm(ev.badgeConfig.carteHauteurMm || 54);
        setPanneaux(ev.badgeConfig.panneaux);
        setPartenaireList(partenairesRes.data.items);

        historyRef.current = { stack: [ev.badgeConfig.panneaux], index: 0, suppress: false };

        const orgRes = await axiosClient.get(`/admin/organisateurs/${organisateurId}`).catch(() => null);
        if (!cancelled && orgRes) setOrganisateur(orgRes.data);
      } catch {
        notify("Impossible de charger le badge de cet événement.", { type: 'error' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, organisateurId]);

  const assets = useMemo(() => {
    if (!panneaux) return {};
    return buildClientAssets({
      panneaux,
      organisateur,
      participant: samplePayload.participant,
      organisme: samplePayload.organisme,
      partenaireList,
      qrCodeSvg,
    });
  }, [panneaux, organisateur, samplePayload, partenaireList, qrCodeSvg]);

  function pushHistory(next) {
    const h = historyRef.current;
    if (h.suppress) return;
    const truncated = h.stack.slice(0, h.index + 1);
    truncated.push(next);
    if (truncated.length > MAX_HISTORY) truncated.shift();
    h.stack = truncated;
    h.index = truncated.length - 1;
  }

  const updatePanneaux = useCallback((updater) => {
    setPanneaux((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pushHistory(next);
      setSaveStatus('pending');
      return next;
    });
  }, []);

  function undo() {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    h.suppress = true;
    setPanneaux(h.stack[h.index]);
    setSaveStatus('pending');
    h.suppress = false;
  }

  function redo() {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index += 1;
    h.suppress = true;
    setPanneaux(h.stack[h.index]);
    setSaveStatus('pending');
    h.suppress = false;
  }

  const save = useCallback(
    async (panneauxToSave) => {
      setIsSaving(true);
      setSaveStatus('saving');
      try {
        await axiosClient.put(`${eventBasePath(eventId)}/badge-contenu`, { panneaux: panneauxToSave });
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('error');
        notify(error.response?.data?.message || 'Erreur lors de la sauvegarde.', { type: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [eventId],
  );

  // Autosave, debounced ~1.5s after the last change.
  useEffect(() => {
    if (!panneaux || saveStatus !== 'pending') return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => save(panneaux), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(autosaveTimerRef.current);
  }, [panneaux, saveStatus, save]);

  // Warn before leaving the page if a save is still pending.
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (saveStatus === 'pending' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  function handleDragStart(event) {
    setActiveDragType(event.active.data.current?.blockType || null);
  }

  function handleDragEnd(dragEvent) {
    setActiveDragType(null);
    const { active, over } = dragEvent;
    if (!over) return;

    const fromPalette = active.data.current?.source === 'palette';
    const targetPanelKey = over.data.current?.panelKey || findBlockLocation(panneaux, over.id)?.panelKey;
    if (!targetPanelKey) return;

    if (fromPalette) {
      const blockType = active.data.current.blockType;
      const newBlock = { id: nanoid(), type: blockType, props: getDefaultProps(blockType), style: {} };
      updatePanneaux((prev) => ({
        ...prev,
        [targetPanelKey]: { ...prev[targetPanelKey], blocs: [...(prev[targetPanelKey]?.blocs || []), newBlock] },
      }));
      setSelectedBlockId(newBlock.id);
      return;
    }

    const fromLocation = findBlockLocation(panneaux, active.id);
    if (!fromLocation) return;

    updatePanneaux((prev) => {
      // Remove the dragged block from its source panel first, then find
      // where to insert it in the (possibly same) target panel — this
      // single removal-then-insertion handles same-panel reordering and
      // cross-panel moves identically, no special-casing needed.
      const sourceBlocs = [...(prev[fromLocation.panelKey]?.blocs || [])];
      const [moved] = sourceBlocs.splice(fromLocation.index, 1);

      const targetBlocs =
        fromLocation.panelKey === targetPanelKey ? sourceBlocs : [...(prev[targetPanelKey]?.blocs || [])];
      const overIndex = targetBlocs.findIndex((b) => b.id === over.id);
      const insertAt = overIndex === -1 ? targetBlocs.length : overIndex;
      targetBlocs.splice(insertAt, 0, moved);

      if (fromLocation.panelKey === targetPanelKey) {
        return { ...prev, [targetPanelKey]: { ...prev[targetPanelKey], blocs: targetBlocs } };
      }

      return {
        ...prev,
        [fromLocation.panelKey]: { ...prev[fromLocation.panelKey], blocs: sourceBlocs },
        [targetPanelKey]: { ...prev[targetPanelKey], blocs: targetBlocs },
      };
    });
  }

  function moveBlock(blockId, direction) {
    const location = findBlockLocation(panneaux, blockId);
    if (!location) return;
    const blocs = panneaux[location.panelKey].blocs;
    const newIndex = location.index + direction;
    if (newIndex < 0 || newIndex >= blocs.length) return;
    updatePanneaux((prev) => ({
      ...prev,
      [location.panelKey]: { ...prev[location.panelKey], blocs: arrayMove(blocs, location.index, newIndex) },
    }));
  }

  function duplicateBlock(blockId) {
    const location = findBlockLocation(panneaux, blockId);
    if (!location) return;
    const original = panneaux[location.panelKey].blocs[location.index];
    const copy = { ...original, id: nanoid(), props: { ...original.props }, style: { ...original.style } };
    updatePanneaux((prev) => {
      const blocs = [...prev[location.panelKey].blocs];
      blocs.splice(location.index + 1, 0, copy);
      return { ...prev, [location.panelKey]: { ...prev[location.panelKey], blocs } };
    });
    setSelectedBlockId(copy.id);
  }

  function deleteBlock(blockId) {
    const location = findBlockLocation(panneaux, blockId);
    if (!location) return;
    updatePanneaux((prev) => ({
      ...prev,
      [location.panelKey]: {
        ...prev[location.panelKey],
        blocs: prev[location.panelKey].blocs.filter((b) => b.id !== blockId),
      },
    }));
    setSelectedBlockId(null);
  }

  function updateBlockProps(blockId, newProps) {
    const location = findBlockLocation(panneaux, blockId);
    if (!location) return;
    updatePanneaux((prev) => ({
      ...prev,
      [location.panelKey]: {
        ...prev[location.panelKey],
        blocs: prev[location.panelKey].blocs.map((b) => (b.id === blockId ? { ...b, props: newProps } : b)),
      },
    }));
  }

  function updateBlockStyle(blockId, newStyle) {
    const location = findBlockLocation(panneaux, blockId);
    if (!location) return;
    updatePanneaux((prev) => ({
      ...prev,
      [location.panelKey]: {
        ...prev[location.panelKey],
        blocs: prev[location.panelKey].blocs.map((b) => (b.id === blockId ? { ...b, style: newStyle } : b)),
      },
    }));
  }

  if (isLoading || !panneaux) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  const selectedLocation = selectedBlockId ? findBlockLocation(panneaux, selectedBlockId) : null;
  const selectedBlock = selectedLocation
    ? { bloc: panneaux[selectedLocation.panelKey].blocs[selectedLocation.index] }
    : null;

  const saveStatusLabel = { saved: 'Brouillon enregistré ✓', pending: 'Modifications non enregistrées', saving: 'Enregistrement…', error: 'Erreur de sauvegarde' }[saveStatus];
  const saveStatusColor = { saved: 'success', pending: 'default', saving: 'info', error: 'error' }[saveStatus];

  return (
    <Box>
      <Title title="Constructeur de badge" />
      <Paper sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ mr: 2 }}>
          {event.titre}
        </Typography>
        <Button size="small" startIcon={<UndoIcon />} onClick={undo} disabled={historyRef.current.index <= 0}>
          Annuler
        </Button>
        <Button
          size="small"
          startIcon={<RedoIcon />}
          onClick={redo}
          disabled={historyRef.current.index >= historyRef.current.stack.length - 1}
        >
          Rétablir
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={() => save(panneaux)}
          disabled={isSaving || saveStatus === 'saved'}
        >
          Enregistrer
        </Button>
        <Chip size="small" label={saveStatusLabel} color={saveStatusColor} variant="outlined" />
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          startIcon={<PreviewIcon />}
          onClick={async () => {
            await save(panneaux);
            window.open(badgePreviewUrl(organisateurId, eventId), '_blank');
          }}
        >
          Aperçu PDF
        </Button>
        <Button
          size="small"
          onClick={async () => {
            await save(panneaux);
            window.open(badgePreviewHtmlUrl(organisateurId, eventId), '_blank');
          }}
        >
          Aperçu HTML
        </Button>
      </Paper>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Grid container spacing={1} sx={{ minHeight: '70vh' }}>
          <Grid size={{ xs: 2 }}>
            <BlockPalette />
          </Grid>
          <Grid size={{ xs: 7 }}>
            <Paper sx={{ height: '100%', overflow: 'auto' }}>
              <BadgeCanvas
                panneaux={panneaux}
                theme={theme}
                format={format}
                carteLargeurMm={carteLargeurMm}
                carteHauteurMm={carteHauteurMm}
                sample={samplePayload}
                assets={assets}
                selectedBlockId={selectedBlockId}
                onSelect={setSelectedBlockId}
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <BlockSettingsPanel
              selectedBlock={selectedBlock}
              eventId={eventId}
              onChangeProps={(newProps) => updateBlockProps(selectedBlockId, newProps)}
              onChangeStyle={(newStyle) => updateBlockStyle(selectedBlockId, newStyle)}
              onMoveUp={() => moveBlock(selectedBlockId, -1)}
              onMoveDown={() => moveBlock(selectedBlockId, 1)}
              onDuplicate={() => duplicateBlock(selectedBlockId)}
              onDelete={() => deleteBlock(selectedBlockId)}
            />
          </Grid>
        </Grid>
        <DragOverlay>
          {activeDragType ? (
            <Paper sx={{ p: 1, px: 2 }}>
              <Typography variant="body2">{blockCatalogEntry(activeDragType).label}</Typography>
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}

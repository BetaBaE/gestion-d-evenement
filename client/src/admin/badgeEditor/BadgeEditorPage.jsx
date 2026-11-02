import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router';
import { Title, useNotify } from 'react-admin';
import QRCode from 'qrcode';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import GridOnIcon from '@mui/icons-material/GridOn';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import HorizontalDistributeIcon from '@mui/icons-material/ViewWeek';
import VerticalDistributeIcon from '@mui/icons-material/TableRows';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { nanoid } from '../../../../shared/badge-renderer/index.js';
import { axiosClient } from '../../api/axiosClient.js';
import { badgePreviewUrl } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { useBadgeHistory } from './useBadgeHistory.js';
import { EditorCanvas } from './EditorCanvas.jsx';
import { PropertiesPanel } from './PropertiesPanel.jsx';
import { LayersPanel } from './LayersPanel.jsx';
import { CHAMP_OPTIONS, ELEMENT_CATALOG, createElement } from './elementCatalog.js';
import { buildEditorAssets, buildPreviewSubjects } from './previewData.js';
import {
  activePanels,
  alignElements,
  clampToPanel,
  distributeElements,
  mmToPx,
  round1,
  settleAfterMove,
  sheetSizeMm,
} from './geometry.js';

const AUTOSAVE_MS = 1500;
const MIN_EDITOR_WIDTH = 1280;
const CLIPBOARD_KEY = 'badgeEditorClipboard';
const GEOMETRY_KEYS = ['x', 'y', 'largeur', 'hauteur', 'panneau'];

function eventBasePath(eventId) {
  return `/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}`;
}

function isTypingTarget(target) {
  return !!target?.closest?.('input, textarea, select, [contenteditable="true"]');
}

/** Re-numbers z within each panel after `reorder` produced a new top-to-bottom list. */
function applyPanelOrder(elements, panelKey, orderedTopFirst) {
  const z = new Map(orderedTopFirst.map((el, i) => [el.id, orderedTopFirst.length - i]));
  return elements.map((el) => (el.panneau === panelKey && z.has(el.id) ? { ...el, z: z.get(el.id) } : el));
}

function shiftLayers(elements, ids, direction) {
  let next = elements;
  const panels = new Set(elements.filter((e) => ids.includes(e.id)).map((e) => e.panneau));
  panels.forEach((panelKey) => {
    const bottomFirst = next.filter((e) => e.panneau === panelKey).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const order = direction > 0 ? [...bottomFirst].reverse() : [...bottomFirst];
    // Walk from the destination side so adjacent selected items don't leapfrog.
    for (let i = 1; i < order.length; i++) {
      if (ids.includes(order[i].id) && !ids.includes(order[i - 1].id)) {
        [order[i - 1], order[i]] = [order[i], order[i - 1]];
      }
    }
    const topFirst = direction > 0 ? order : [...order].reverse();
    next = applyPanelOrder(next, panelKey, topFirst);
  });
  return next;
}

function AddMenuButton({ label, icon: Icon, items, onPick }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <Button fullWidth size="small" startIcon={<Icon />} onClick={(e) => setAnchor(e.currentTarget)} sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', whiteSpace: 'nowrap' }}>
        {label} ▾
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {items.map((it) => (
          <MenuItem
            key={it.key}
            dense
            onClick={() => {
              onPick(it);
              setAnchor(null);
            }}
          >
            {it.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function AddPalette({ onAdd }) {
  const simple = ['texte', 'qrCode', 'photo', 'image', 'logoOrganisateur', 'logoOrganisme', 'dates', 'bandeCategorie', 'grillePartenaires', 'icone'];
  return (
    <Stack spacing={0.5}>
      <Typography variant="overline" color="text.secondary">
        Ajouter
      </Typography>
      <AddMenuButton
        label="Champ participant"
        icon={ELEMENT_CATALOG.champ.icon}
        items={CHAMP_OPTIONS.map((o) => ({ key: o.value, label: o.label }))}
        onPick={(it) => onAdd('champ', { champ: it.value ?? it.key })}
      />
      <AddMenuButton
        label="Forme"
        icon={ELEMENT_CATALOG.forme.icon}
        items={[
          { key: 'rectangle', label: 'Rectangle' },
          { key: 'pilule', label: 'Pilule' },
          { key: 'cercle', label: 'Cercle' },
          { key: 'ligne', label: 'Ligne' },
        ]}
        onPick={(it) => onAdd('forme', { forme: it.key })}
      />
      {simple.map((type) => {
        const { label, icon: Icon } = ELEMENT_CATALOG[type];
        return (
          <Button key={type} fullWidth size="small" startIcon={<Icon />} onClick={() => onAdd(type)} sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', whiteSpace: 'nowrap' }}>
            {label}
          </Button>
        );
      })}
    </Stack>
  );
}

export function BadgeEditorPage() {
  const { id: eventId } = useParams();
  const notify = useNotify();

  const [event, setEvent] = useState(null);
  const [context, setContext] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [badgeMeta, setBadgeMeta] = useState(null);
  const [theme, setTheme] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const { elements, setElements, resetElements, undo, redo, canUndo, canRedo } = useBadgeHistory([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [subjectKey, setSubjectKey] = useState('exemple');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  const loadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const canvasBoxRef = useRef(null);
  const saveTimerRef = useRef(null);
  const latestRef = useRef({ elements, theme });
  latestRef.current = { elements, theme };

  const readOnly = viewportWidth < MIN_EDITOR_WIDTH;

  // ---- Loading ----
  useEffect(() => {
    let cancelled = false;
    const base = eventBasePath(eventId);
    Promise.all([
      axiosClient.get(base),
      axiosClient.get(`${base}/badge-contexte`),
      axiosClient.get(`${base}/participants`, { params: { limit: 100 } }).catch(() => ({ data: { items: [] } })),
    ])
      .then(([eventRes, contextRes, participantsRes]) => {
        if (cancelled) return;
        const ev = eventRes.data;
        const { elements: initial = [], theme: initialTheme = {}, ...meta } = ev.badge || {};
        setEvent(ev);
        setContext(contextRes.data);
        setParticipants(participantsRes.data.items || []);
        setBadgeMeta(meta);
        setTheme(initialTheme);
        resetElements(initial);
        loadedRef.current = true;
        skipNextSaveRef.current = true;
      })
      .catch(() => setLoadError("Impossible de charger le badge de cet événement."));
    return () => {
      cancelled = true;
    };
  }, [eventId, resetElements]);

  // ---- Autosave (debounced) ----
  const save = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    const { elements: els, theme: th } = latestRef.current;
    setSaveStatus('saving');
    try {
      await axiosClient.put(`${eventBasePath(eventId)}/badge`, { elements: els, theme: th });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      const details = error.response?.data?.details;
      notify(
        `${error.response?.data?.message || 'Erreur lors de la sauvegarde.'}${Array.isArray(details) ? ` ${details[0]?.message || details[0] || ''}` : ''}`,
        { type: 'error' },
      );
    }
  }, [eventId, notify]);

  useEffect(() => {
    if (!loadedRef.current) return;
    // The load itself sets elements/theme; that is not an edit to save.
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    setSaveStatus('pending');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, AUTOSAVE_MS);
    return () => clearTimeout(saveTimerRef.current);
  }, [elements, theme, save]);

  useEffect(() => {
    function warn(e) {
      if (saveStatus === 'pending' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- Preview subject ----
  const subjects = useMemo(() => buildPreviewSubjects({ context, participants }), [context, participants]);
  const subject = subjects.find((s) => s.key === subjectKey) || subjects[0];

  useEffect(() => {
    const code = subject?.participant?.badgeCode || 'APERCU';
    QRCode.toString(code, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setQrCodeSvg);
  }, [subject?.participant?.badgeCode]);

  const assets = useMemo(
    () => buildEditorAssets({ elements, context, subject, qrCodeSvg }),
    [elements, context, subject, qrCodeSvg],
  );

  const badge = useMemo(() => (badgeMeta ? { ...badgeMeta, theme } : null), [badgeMeta, theme]);

  // ---- Selection ----
  const lockedIds = useMemo(() => new Set(elements.filter((e) => e.verrouille).map((e) => e.id)), [elements]);

  const select = useCallback(
    (ids) => {
      // Grouped elements are always selected together.
      const groups = new Set(elements.filter((e) => ids.includes(e.id) && e.groupeId).map((e) => e.groupeId));
      const expanded = elements.filter((e) => ids.includes(e.id) || (e.groupeId && groups.has(e.groupeId))).map((e) => e.id);
      setSelectedIds(expanded.filter((id) => !elements.find((e) => e.id === id)?.masque));
    },
    [elements],
  );

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => elements.some((e) => e.id === id && !e.masque)));
  }, [elements]);

  const selected = elements.filter((e) => selectedIds.includes(e.id));
  const movable = selected.filter((e) => !e.verrouille);

  // ---- Mutations ----
  const commitGeometry = useCallback(
    (geoms) => {
      if (!badge) return;
      const byId = new Map(geoms.map((g) => [g.id, g]));
      setElements((els) =>
        els.map((el) => {
          const g = byId.get(el.id);
          if (!g) return el;
          const { id, ...rest } = g;
          return settleAfterMove({ ...el, ...rest }, badge);
        }),
      );
    },
    [badge, setElements],
  );

  const changeElement = useCallback(
    (id, patch, mergeKey) => {
      setElements((els) =>
        els.map((el) => {
          if (el.id !== id) return el;
          const next = { ...el, ...patch };
          return GEOMETRY_KEYS.some((k) => k in patch) ? clampToPanel(next, badge) : next;
        }),
      mergeKey);
    },
    [badge, setElements],
  );

  function updateSelected(transform) {
    const ids = new Set(movable.map((e) => e.id));
    if (ids.size === 0) return;
    setElements((els) => {
      const updated = transform(els.filter((e) => ids.has(e.id)));
      const byId = new Map(updated.map((e) => [e.id, clampToPanel(e, badge)]));
      return els.map((e) => byId.get(e.id) || e);
    });
  }

  function addElement(type, props) {
    const panneau = selected[0]?.panneau && activePanels(badge).includes(selected[0].panneau) ? selected[0].panneau : 'P1';
    const el = createElement(type, { badge, panneau, elements, props });
    setElements((els) => [...els, el]);
    setSelectedIds([el.id]);
  }

  function deleteSelected() {
    const ids = new Set(movable.map((e) => e.id));
    if (ids.size === 0) return;
    setElements((els) => els.filter((e) => !ids.has(e.id)));
    setSelectedIds([]);
  }

  function pasteElements(source, offsetMm = 3) {
    if (!source?.length) return;
    const panels = activePanels(badge);
    const maxZ = elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0);
    const groupMap = new Map();
    const created = source.map((el, i) => {
      if (el.groupeId && !groupMap.has(el.groupeId)) groupMap.set(el.groupeId, nanoid());
      return clampToPanel(
        {
          ...structuredClone(el),
          id: nanoid(),
          panneau: panels.includes(el.panneau) ? el.panneau : 'P1',
          x: el.x + offsetMm,
          y: el.y + offsetMm,
          z: maxZ + 1 + i,
          groupeId: el.groupeId ? groupMap.get(el.groupeId) : null,
          verrouille: false,
        },
        badge,
      );
    });
    setElements((els) => [...els, ...created]);
    setSelectedIds(created.map((e) => e.id));
  }

  function setGroup(group) {
    if (movable.length < (group ? 2 : 1)) return;
    const groupeId = group ? nanoid() : null;
    const ids = new Set(movable.map((e) => e.id));
    setElements((els) => els.map((e) => (ids.has(e.id) ? { ...e, groupeId } : e)));
  }

  // ---- Keyboard ----
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Shift') setShiftHeld(true);
      if (readOnly || isTypingTarget(e.target)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      let handled = true;

      if (e.key === 'Escape') setSelectedIds([]);
      else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      else if (e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? 5 : 0.5;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        updateSelected((sel) => sel.map((el) => ({ ...el, x: round1(el.x + dx), y: round1(el.y + dy) })));
      } else if (ctrl && key === 'z' && !e.shiftKey) undo();
      else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) redo();
      else if (ctrl && key === 'c' && selected.length) {
        localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(selected));
      } else if (ctrl && key === 'v') {
        try {
          pasteElements(JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]'));
        } catch {
          handled = false;
        }
      } else if (ctrl && key === 'd') pasteElements(selected);
      else if (ctrl && key === 'g') setGroup(!e.shiftKey);
      else if (ctrl && e.key === ']') setElements((els) => shiftLayers(els, movable.map((m) => m.id), 1));
      else if (ctrl && e.key === '[') setElements((els) => shiftLayers(els, movable.map((m) => m.id), -1));
      else handled = false;

      if (handled) e.preventDefault();
    }
    function onKeyUp(e) {
      if (e.key === 'Shift') setShiftHeld(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

  // ---- Zoom ----
  const fitToScreen = useCallback(() => {
    const box = canvasBoxRef.current;
    if (!box || !badge) return;
    const sheet = sheetSizeMm(badge);
    const z = Math.min((box.clientWidth - 80) / mmToPx(sheet.width), (box.clientHeight - 80) / mmToPx(sheet.height));
    setZoom(Math.max(0.25, Math.min(4, Math.round(z * 100) / 100)));
  }, [badge]);

  useEffect(() => {
    if (badgeMeta) fitToScreen();
    // Fit once when the badge first loads; afterwards zoom is the user's.
  }, [badgeMeta?.format]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <Box p={3}>
        <Alert severity="error">{loadError}</Alert>
      </Box>
    );
  }
  if (!event || !badge || !subject) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statusChip = {
    saved: { label: 'Brouillon enregistré ✓', color: 'success' },
    pending: { label: 'Modifications en attente…', color: 'default' },
    saving: { label: 'Enregistrement…', color: 'info' },
    error: { label: 'Erreur de sauvegarde', color: 'error' },
  }[saveStatus];

  const multi = movable.length >= 2;
  const tool = (title, Icon, onClick, disabled) => (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled}>
          <Icon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', p: 1, gap: 1 }}>
      <Title title={`Badge — ${event.titre}`} />

      <Paper sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        <Button size="small" component={RouterLink} to={`/admin/events/${eventId}`} startIcon={<ArrowBackIcon />}>
          Retour
        </Button>
        <Divider orientation="vertical" flexItem />
        {tool('Annuler (Ctrl+Z)', UndoIcon, undo, !canUndo || readOnly)}
        {tool('Rétablir (Ctrl+Y)', RedoIcon, redo, !canRedo || readOnly)}
        <Divider orientation="vertical" flexItem />
        {tool('Aligner à gauche', AlignHorizontalLeftIcon, () => updateSelected((s) => alignElements(s, 'gauche')), !multi)}
        {tool('Centrer horizontalement', AlignHorizontalCenterIcon, () => updateSelected((s) => alignElements(s, 'centreH')), !multi)}
        {tool('Aligner à droite', AlignHorizontalRightIcon, () => updateSelected((s) => alignElements(s, 'droite')), !multi)}
        {tool('Aligner en haut', AlignVerticalTopIcon, () => updateSelected((s) => alignElements(s, 'haut')), !multi)}
        {tool('Centrer verticalement', AlignVerticalCenterIcon, () => updateSelected((s) => alignElements(s, 'milieu')), !multi)}
        {tool('Aligner en bas', AlignVerticalBottomIcon, () => updateSelected((s) => alignElements(s, 'bas')), !multi)}
        {tool('Répartir horizontalement', HorizontalDistributeIcon, () => updateSelected((s) => distributeElements(s, 'h')), movable.length < 3)}
        {tool('Répartir verticalement', VerticalDistributeIcon, () => updateSelected((s) => distributeElements(s, 'v')), movable.length < 3)}
        <Divider orientation="vertical" flexItem />
        {tool('Premier plan (Ctrl+])', FlipToFrontIcon, () => setElements((els) => shiftLayers(els, movable.map((m) => m.id), 1)), !movable.length)}
        {tool('Arrière-plan (Ctrl+[)', FlipToBackIcon, () => setElements((els) => shiftLayers(els, movable.map((m) => m.id), -1)), !movable.length)}
        {tool('Grouper (Ctrl+G)', LinkIcon, () => setGroup(true), !multi)}
        {tool('Dégrouper (Ctrl+Maj+G)', LinkOffIcon, () => setGroup(false), !movable.some((e) => e.groupeId))}
        {tool('Dupliquer (Ctrl+D)', ContentCopyIcon, () => pasteElements(selected), !selected.length || readOnly)}
        {tool('Supprimer (Suppr)', DeleteIcon, deleteSelected, !movable.length)}
        <Divider orientation="vertical" flexItem />
        {tool('Zoom arrière', ZoomOutIcon, () => setZoom((z) => Math.max(0.25, round1(z - 0.25))))}
        <Typography variant="body2" sx={{ minWidth: 44, textAlign: 'center' }}>
          {Math.round(zoom * 100)} %
        </Typography>
        {tool('Zoom avant', ZoomInIcon, () => setZoom((z) => Math.min(4, round1(z + 0.25))))}
        {tool("Ajuster à l'écran", FitScreenIcon, fitToScreen)}
        <Tooltip title="Grille 1 mm">
          <IconButton size="small" color={showGrid ? 'primary' : 'default'} onClick={() => setShowGrid((g) => !g)}>
            <GridOnIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
        <TextField select size="small" label="Aperçu avec" value={subject.key} onChange={(e) => setSubjectKey(e.target.value)} sx={{ width: 230 }}>
          {subjects.map((s) => (
            <MenuItem key={s.key} value={s.key}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
        <Chip size="small" variant="outlined" color={statusChip.color} label={statusChip.label} />
        <Button
          size="small"
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={async () => {
            await save();
            window.open(badgePreviewUrl(getSelectedOrganisateurId(), eventId), '_blank');
          }}
        >
          Aperçu PDF
        </Button>
        </Box>
      </Paper>

      {readOnly && (
        <Alert severity="info">
          L'éditeur de badge nécessite un écran d'au moins {MIN_EDITOR_WIDTH} px de large. Aperçu en lecture seule.
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1 }}>
        {!readOnly && (
          <Paper sx={{ width: 200, p: 1, overflowY: 'auto', flexShrink: 0 }}>
            <AddPalette onAdd={addElement} />
          </Paper>
        )}

        <Paper ref={canvasBoxRef} sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <EditorCanvas
            badge={badge}
            elements={elements}
            theme={theme}
            subject={subject}
            event={event}
            organisateur={context?.organisateur}
            assets={assets}
            selectedIds={selectedIds}
            lockedIds={lockedIds}
            onSelect={select}
            onCommit={commitGeometry}
            zoom={zoom}
            showGrid={showGrid}
            shiftHeld={shiftHeld}
            readOnly={readOnly}
          />
        </Paper>

        {!readOnly && (
          <Stack sx={{ width: 320, flexShrink: 0, gap: 1, minHeight: 0 }}>
            <Paper sx={{ p: 1.5, flex: 3, overflowY: 'auto', minHeight: 0 }}>
              <PropertiesPanel
                badge={badge}
                selected={selected}
                theme={theme}
                context={context}
                eventId={eventId}
                onChangeElement={changeElement}
                onTheme={(patch) => setTheme((t) => ({ ...t, ...patch }))}
              />
            </Paper>
            <Paper sx={{ p: 1, flex: 2, overflowY: 'auto', minHeight: 0 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Calques
              </Typography>
              <LayersPanel
                badge={badge}
                elements={elements}
                selectedIds={selectedIds}
                onSelect={(id, additive) => select(additive ? [...selectedIds, id] : [id])}
                onToggle={(id, field) => changeElement(id, { [field]: !elements.find((e) => e.id === id)?.[field] })}
                onRename={(id, nom) => changeElement(id, { nom })}
                onReorder={(draggedId, overId) =>
                  setElements((els) => {
                    const dragged = els.find((e) => e.id === draggedId);
                    const over = els.find((e) => e.id === overId);
                    if (!dragged || !over || dragged.panneau !== over.panneau) return els;
                    const topFirst = els
                      .filter((e) => e.panneau === over.panneau && e.id !== draggedId)
                      .sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
                    topFirst.splice(topFirst.findIndex((e) => e.id === overId), 0, dragged);
                    return applyPanelOrder(els, over.panneau, topFirst);
                  })
                }
              />
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

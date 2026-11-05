import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, Link as RouterLink } from 'react-router';
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
import SettingsIcon from '@mui/icons-material/Settings';
import { checkBadgeRules, nanoid } from '../../../../shared/badge-renderer/index.js';
import { axiosClient } from '../../api/axiosClient.js';
import { badgePreviewUrl, modelePreviewUrl, uploadBadgeImage, uploadModeleImage } from '../../api/imageApi.js';
import { getSelectedOrganisateurId } from '../organisateurContext.js';
import { useBadgeHistory } from './useBadgeHistory.js';
import { EditorCanvas, PALETTE_DRAG_TYPE } from './EditorCanvas.jsx';
import { pickActivePanel, placePastedElements } from './placement.js';
import { RulesPanel } from './RulesPanel.jsx';
import { TemplateSettingsDialog } from '../modeles/TemplateSettingsDialog.jsx';
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
  panelSizeMm,
  round1,
  settleAfterMove,
  sheetSizeMm,
} from './geometry.js';

const AUTOSAVE_MS = 1500;
const MIN_EDITOR_WIDTH = 1280;
const CLIPBOARD_KEY = 'badgeEditorClipboard';
const GEOMETRY_KEYS = ['x', 'y', 'largeur', 'hauteur', 'panneau'];

/**
 * Where the edited badge lives: an event's own badge, or one of the
 * organisateur's templates (edited with sample event data).
 */
function badgeSource(kind, id) {
  const org = getSelectedOrganisateurId();
  if (kind === 'modele') {
    const base = `/admin/organisateurs/${org}/modeles-badge/${id}`;
    return {
      kind,
      async load() {
        const [modeleRes, contextRes] = await Promise.all([axiosClient.get(base), axiosClient.get(`${base}/contexte`)]);
        const { elements = [], theme = {}, ...meta } = modeleRes.data;
        const now = new Date().toISOString();
        return {
          event: { titre: 'Événement exemple', lieu: 'Palais des congrès', ville: 'Casablanca', dateDebut: now, dateFin: now },
          title: `Modèle — ${meta.nom}`,
          context: contextRes.data,
          participants: [],
          meta,
          elements,
          theme,
        };
      },
      save: ({ elements, theme }) => axiosClient.put(base, { elements, theme }),
      saveSettings: (settings) => axiosClient.put(base, settings).then(({ data }) => data),
      previewUrl: () => modelePreviewUrl(org, id),
      upload: (file, options) => uploadModeleImage(org, id, file, options),
      backTo: '/admin/modeles-badge',
      loadError: 'Impossible de charger ce modèle de badge.',
    };
  }
  const base = `/admin/organisateurs/${org}/events/${id}`;
  return {
    kind,
    async load() {
      const [eventRes, contextRes, participantsRes] = await Promise.all([
        axiosClient.get(base),
        axiosClient.get(`${base}/badge-contexte`),
        axiosClient.get(`${base}/participants`, { params: { limit: 100 } }).catch(() => ({ data: { items: [] } })),
      ]);
      const ev = eventRes.data;
      const { elements = [], theme = {}, ...meta } = ev.badge || {};
      return {
        event: ev,
        title: `Badge — ${ev.titre}`,
        context: contextRes.data,
        participants: participantsRes.data.items || [],
        meta,
        elements,
        theme,
      };
    },
    save: ({ elements, theme }) => axiosClient.put(`${base}/badge`, { elements, theme }),
    previewUrl: () => badgePreviewUrl(org, id),
    upload: (file, options) => uploadBadgeImage(org, id, file, options),
    backTo: `/admin/events/${id}?onglet=badge`,
    loadError: 'Impossible de charger le badge de cet événement.',
  };
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

/** Palette items can be clicked (added in the active panel) or dragged onto a panel. */
function paletteDragProps(type, props) {
  return {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData(PALETTE_DRAG_TYPE, JSON.stringify({ type, props }));
      e.dataTransfer.effectAllowed = 'copy';
    },
  };
}

function AddMenuButton({ label, icon: Icon, items, onPick, dragPayload }) {
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
            {...paletteDragProps(...dragPayload(it))}
            onDragEnd={() => setAnchor(null)}
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
        onPick={(it) => onAdd('champ', { champ: it.key })}
        dragPayload={(it) => ['champ', { champ: it.key }]}
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
        dragPayload={(it) => ['forme', { forme: it.key }]}
      />
      {simple.map((type) => {
        const { label, icon: Icon } = ELEMENT_CATALOG[type];
        return (
          <Button
            key={type}
            fullWidth
            size="small"
            startIcon={<Icon />}
            onClick={() => onAdd(type)}
            {...paletteDragProps(type)}
            sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', whiteSpace: 'nowrap', cursor: 'grab' }}
          >
            {label}
          </Button>
        );
      })}
    </Stack>
  );
}

/** `kind`: 'event' (an event's badge) or 'modele' (an organisateur template). */
export function BadgeEditorPage({ kind = 'event' }) {
  const { id } = useParams();
  const source = useMemo(() => badgeSource(kind, id), [kind, id]);
  const [title, setTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Shown once after "Importer un design".
  const [searchParams] = useSearchParams();
  const [designTip, setDesignTip] = useState(searchParams.get('astuce') === 'design');
  const notify = useNotify();

  const [event, setEvent] = useState(null);
  const [context, setContext] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [badgeMeta, setBadgeMeta] = useState(null);
  const [theme, setTheme] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const { elements, setElements, resetElements, undo, redo, canUndo, canRedo } = useBadgeHistory([]);

  const [selectedIds, setSelectedIds] = useState([]);
  // Where new elements go: see pickActivePanel (selection > last click > visible centre > P1).
  const [lastClickedPanel, setLastClickedPanel] = useState(null);
  const [centerPanel, setCenterPanel] = useState(null);
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
    source
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setEvent(loaded.event);
        setTitle(loaded.title);
        setContext(loaded.context);
        setParticipants(loaded.participants);
        setBadgeMeta(loaded.meta);
        setTheme(loaded.theme);
        resetElements(loaded.elements);
        loadedRef.current = true;
        skipNextSaveRef.current = true;
      })
      .catch(() => setLoadError(source.loadError));
    return () => {
      cancelled = true;
    };
  }, [source, resetElements]);

  // ---- Autosave (debounced) ----
  const save = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    const { elements: els, theme: th } = latestRef.current;
    setSaveStatus('saving');
    try {
      await source.save({ elements: els, theme: th });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      const details = error.response?.data?.details;
      notify(
        `${error.response?.data?.message || 'Erreur lors de la sauvegarde.'}${Array.isArray(details) ? ` ${details[0]?.message || details[0] || ''}` : ''}`,
        { type: 'error' },
      );
    }
  }, [source, notify]);

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

  // Values shown next to each variable in "Insérer une variable".
  const previewCtx = useMemo(
    () =>
      subject && {
        participant: subject.participant,
        organisme: subject.organisme,
        categorie: subject.categorie,
        numero: subject.numero,
        event,
        organisateur: context?.organisateur,
      },
    [subject, event, context],
  );

  // Elements with a blocking rule (e.g. unknown variable): outlined in red on the canvas.
  const errorIds = useMemo(
    () => (badge ? checkBadgeRules({ ...badge, elements }).filter((r) => r.niveau === 'bloquant' && r.elementId).map((r) => r.elementId) : []),
    [badge, elements],
  );

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

  const activePanel = badge
    ? pickActivePanel({ badge, selectedPanel: selected[0]?.panneau, lastClickedPanel, centerPanel })
    : 'P1';

  /** Adds an element in the active panel, or at `at` in `panneau` (palette drop). */
  function addElement(type, props, { panneau = activePanel, at } = {}) {
    const el = createElement(type, { badge, panneau, elements, props, at });
    setElements((els) => [...els, el]);
    setSelectedIds([el.id]);
    setLastClickedPanel(panneau);
  }

  function deleteSelected() {
    const ids = new Set(movable.map((e) => e.id));
    if (ids.size === 0) return;
    setElements((els) => els.filter((e) => !ids.has(e.id)));
    setSelectedIds([]);
  }

  /**
   * Duplicate (Ctrl+D): copies stay in their panel, shifted by 3 mm.
   * Paste (Ctrl+V): copies go to the active panel, at the same relative
   * position if they fit (else centred), shifted by 3 mm while they would
   * sit exactly on an existing element.
   */
  function pasteElements(source, { mode = 'duplicate' } = {}) {
    if (!source?.length) return;
    const panels = activePanels(badge);
    let positions;
    let targetPanel = (el) => (panels.includes(el.panneau) ? el.panneau : 'P1');
    if (mode === 'paste') {
      targetPanel = () => activePanel;
      positions = placePastedElements({ badge, source });
      const onTarget = elements.filter((e) => e.panneau === activePanel);
      const stacked = () => positions.some((p) => onTarget.some((e) => Math.abs(e.x - p.x) < 0.05 && Math.abs(e.y - p.y) < 0.05));
      for (let i = 0; i < 20 && stacked(); i += 1) positions = positions.map((p) => ({ x: p.x + 3, y: p.y + 3 }));
    } else {
      positions = source.map((el) => ({ x: el.x + 3, y: el.y + 3 }));
    }
    const maxZ = elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0);
    const groupMap = new Map();
    const created = source.map((el, i) => {
      if (el.groupeId && !groupMap.has(el.groupeId)) groupMap.set(el.groupeId, nanoid());
      return clampToPanel(
        {
          ...structuredClone(el),
          id: nanoid(),
          panneau: targetPanel(el),
          x: positions[i].x,
          y: positions[i].y,
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

  /** Moves "hors page" elements back onto P1, kept inside it. */
  function bringBackToP1(ids) {
    const set = new Set(ids);
    setElements((els) => els.map((e) => (set.has(e.id) ? clampToPanel({ ...e, panneau: 'P1' }, badge) : e)));
    setSelectedIds(ids);
  }

  /**
   * Template settings (name, format, printed panels). Elements on panels
   * that still print are kept inside the new panel size; the others become
   * "hors page" (never deleted).
   */
  async function saveTemplateSettings(settings) {
    const nextMeta = { ...badgeMeta, ...settings };
    const nextBadge = { ...nextMeta, theme };
    const panels = activePanels(nextBadge);
    const nextElements = elements.map((el) => (panels.includes(el.panneau) ? clampToPanel(el, nextBadge) : el));
    const horsAvant = elements.filter((e) => !activePanels(badge).includes(e.panneau)).length;
    const horsApres = nextElements.filter((e) => !panels.includes(e.panneau)).length;
    try {
      await source.saveSettings({ ...settings, elements: nextElements });
    } catch (error) {
      notify(error.response?.data?.details?.[0]?.message || error.response?.data?.message || 'Erreur lors de l’enregistrement.', { type: 'error' });
      throw error;
    }
    setBadgeMeta(nextMeta);
    setTitle(`Modèle — ${settings.nom}`);
    setElements(nextElements);
    if (horsApres > horsAvant) {
      notify(`${horsApres - horsAvant} élément(s) passé(s) hors page : retrouvez-les en haut des calques.`, { type: 'warning' });
    } else {
      notify('Paramètres du modèle enregistrés.', { type: 'success' });
    }
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
          pasteElements(JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]'), { mode: 'paste' });
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
  const panel = panelSizeMm(badge);
  const align = (mode) => updateSelected((s) => alignElements(s, mode, panel));
  const alignReason = movable.length === 0 ? (selected.length ? 'élément verrouillé' : 'sélectionnez un élément') : null;
  // One element aligns to its panel; several align to each other.
  const alignTip = (label) => (movable.length === 1 ? `${label} (sur le panneau)` : label);
  // `reason` explains a disabled button in its tooltip.
  const tool = (title, Icon, onClick, disabled, reason) => (
    <Tooltip title={disabled && reason ? `${title} — ${reason}` : title}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled}>
          <Icon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', p: 1, gap: 1 }}>
      <Title title={title} />

      <Paper sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        <Button size="small" component={RouterLink} to={source.backTo} startIcon={<ArrowBackIcon />}>
          Retour
        </Button>
        {source.kind === 'modele' && (
          <Button size="small" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
            Paramètres
          </Button>
        )}
        <Divider orientation="vertical" flexItem />
        {tool('Annuler (Ctrl+Z)', UndoIcon, undo, !canUndo || readOnly)}
        {tool('Rétablir (Ctrl+Y)', RedoIcon, redo, !canRedo || readOnly)}
        <Divider orientation="vertical" flexItem />
        {tool(alignTip('Aligner à gauche'), AlignHorizontalLeftIcon, () => align('gauche'), !!alignReason, alignReason)}
        {tool(alignTip('Centrer horizontalement'), AlignHorizontalCenterIcon, () => align('centreH'), !!alignReason, alignReason)}
        {tool(alignTip('Aligner à droite'), AlignHorizontalRightIcon, () => align('droite'), !!alignReason, alignReason)}
        {tool(alignTip('Aligner en haut'), AlignVerticalTopIcon, () => align('haut'), !!alignReason, alignReason)}
        {tool(alignTip('Centrer verticalement'), AlignVerticalCenterIcon, () => align('milieu'), !!alignReason, alignReason)}
        {tool(alignTip('Aligner en bas'), AlignVerticalBottomIcon, () => align('bas'), !!alignReason, alignReason)}
        {tool('Répartir horizontalement', HorizontalDistributeIcon, () => updateSelected((s) => distributeElements(s, 'h')), movable.length < 3, 'sélectionnez au moins 3 éléments (Maj+clic)')}
        {tool('Répartir verticalement', VerticalDistributeIcon, () => updateSelected((s) => distributeElements(s, 'v')), movable.length < 3, 'sélectionnez au moins 3 éléments (Maj+clic)')}
        <Divider orientation="vertical" flexItem />
        {tool('Premier plan (Ctrl+])', FlipToFrontIcon, () => setElements((els) => shiftLayers(els, movable.map((m) => m.id), 1)), !movable.length, 'sélectionnez un élément')}
        {tool('Arrière-plan (Ctrl+[)', FlipToBackIcon, () => setElements((els) => shiftLayers(els, movable.map((m) => m.id), -1)), !movable.length, 'sélectionnez un élément')}
        {tool('Grouper (Ctrl+G)', LinkIcon, () => setGroup(true), !multi, 'sélectionnez au moins 2 éléments (Maj+clic)')}
        {tool('Dégrouper (Ctrl+Maj+G)', LinkOffIcon, () => setGroup(false), !movable.some((e) => e.groupeId), 'aucun groupe sélectionné')}
        {tool('Dupliquer (Ctrl+D)', ContentCopyIcon, () => pasteElements(selected), !selected.length || readOnly, 'sélectionnez un élément')}
        {tool('Supprimer (Suppr)', DeleteIcon, deleteSelected, !movable.length, 'sélectionnez un élément non verrouillé')}
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
        {activePanels(badge).length > 1 && (
          <Tooltip title="Les éléments ajoutés vont dans ce panneau. Cliquez dans un panneau pour l'activer.">
            <Chip size="small" color="primary" variant="outlined" label={`${activePanel} actif`} sx={{ ml: 0.5 }} />
          </Tooltip>
        )}
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
          // A real link (new tab): opening tabs from script (window.open) is
          // blocked or turned into same-tab navigation by popup blockers and
          // extensions. With unsaved changes the click saves first; the link
          // works as soon as the badge is saved (autosave runs after 1.5 s).
          component="a"
          href={source.previewUrl()}
          target="_blank"
          rel="noopener"
          startIcon={saveStatus === 'saved' ? <PictureAsPdfIcon /> : <CircularProgress size={14} color="inherit" />}
          onClick={(e) => {
            if (saveStatus !== 'saved') {
              e.preventDefault();
              save();
            }
          }}
        >
          {saveStatus === 'saved' ? 'Aperçu PDF' : saveStatus === 'error' ? 'Réessayer l’enregistrement' : 'Enregistrement…'}
        </Button>
        </Box>
      </Paper>

      {designTip && (
        <Alert severity="info" onClose={() => setDesignTip(false)}>
          Placez le nom, la fonction, l'organisme et le QR code sur les zones vides de votre design. Le fond est verrouillé (calques) pour ne
          pas le déplacer par erreur.
        </Alert>
      )}

      {readOnly && (
        <Alert severity="info">
          L'éditeur de badge nécessite un écran d'au moins {MIN_EDITOR_WIDTH} px de large. Aperçu en lecture seule.
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1 }}>
        {!readOnly && (
          <Paper sx={{ width: 200, p: 1, overflowY: 'auto', flexShrink: 0 }}>
            <AddPalette onAdd={addElement} />
            <Divider sx={{ my: 1 }} />
            <RulesPanel
              badge={badge}
              elements={elements}
              onFix={(fix) => addElement(fix.type, fix.props, { panneau: 'P1' })}
              onShowElement={(id) => select([id])}
            />
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
            errorIds={errorIds}
            lockedIds={lockedIds}
            onSelect={select}
            onCommit={commitGeometry}
            zoom={zoom}
            showGrid={showGrid}
            shiftHeld={shiftHeld}
            readOnly={readOnly}
            activePanel={activePanel}
            onPanelClick={setLastClickedPanel}
            onCenterPanelChange={setCenterPanel}
            onDropElement={({ type, props, panneau, at }) => addElement(type, props, { panneau, at })}
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
                previewCtx={previewCtx}
                uploadImage={source.upload}
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
                onBringBack={bringBackToP1}
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

      {source.kind === 'modele' && (
        <TemplateSettingsDialog open={settingsOpen} modele={badgeMeta} onClose={() => setSettingsOpen(false)} onSave={saveTemplateSettings} />
      )}
    </Box>
  );
}

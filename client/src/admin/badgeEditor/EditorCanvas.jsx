import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import Selecto from 'react-selecto';
import { Box } from '@mui/material';
import { renderEditorSheet, fitDynamicTextInDom } from '../../../../shared/badge-renderer/index.js';
import { ELEMENT_CATALOG } from './elementCatalog.js';
import { PX_PER_MM, activePanels, mmToPx, panelOrigin, panelSizeMm, pxToMm, round1, sheetSizeMm } from './geometry.js';

const SCOPE = 'badge-editor-scope';
const RULER = 18;
const PAD = 24;

/** Reads a CSS length the renderer ("12mm") or Moveable ("45.3px") wrote. */
function cssLengthToMm(value) {
  if (!value) return 0;
  const n = parseFloat(value);
  return value.endsWith('px') ? pxToMm(n) : n;
}

function readGeometry(target) {
  const match = /rotate\((-?[\d.]+)deg\)/.exec(target.style.transform || '');
  return {
    id: target.dataset.elementId,
    x: round1(cssLengthToMm(target.style.left)),
    y: round1(cssLengthToMm(target.style.top)),
    largeur: round1(cssLengthToMm(target.style.width)),
    hauteur: round1(cssLengthToMm(target.style.height)),
    rotation: match ? Math.round(parseFloat(match[1]) * 10) / 10 : 0,
  };
}

function Ruler({ orientation, lengthMm, zoom }) {
  const horizontal = orientation === 'h';
  const stepPx = PX_PER_MM * zoom;
  const ticks = [];
  for (let mm = 0; mm <= lengthMm; mm += 10) ticks.push(mm);
  return (
    <Box
      sx={{
        position: 'absolute',
        ...(horizontal
          ? { left: RULER + PAD, top: 0, height: RULER, width: lengthMm * stepPx }
          : { top: RULER + PAD, left: 0, width: RULER, height: lengthMm * stepPx }),
        background: `repeating-linear-gradient(${horizontal ? '90deg' : '180deg'}, #999 0 1px, transparent 1px ${stepPx * 5}px)`,
        backgroundSize: horizontal ? `100% 30%` : `30% 100%`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: horizontal ? 'bottom' : 'right',
        bgcolor: 'background.paper',
        fontSize: 9,
        color: 'text.secondary',
        userSelect: 'none',
        zIndex: 2,
      }}
    >
      {ticks.map((mm) => (
        <Box
          key={mm}
          sx={{
            position: 'absolute',
            ...(horizontal
              ? { left: mm * stepPx, top: 0, height: '100%', borderLeft: '1px solid #888', pl: '2px' }
              : { top: mm * stepPx, left: 0, width: '100%', borderTop: '1px solid #888', pt: '1px' }),
            lineHeight: 1,
          }}
        >
          {zoom >= 0.5 || mm % 50 === 0 ? mm : ''}
        </Box>
      ))}
    </Box>
  );
}

/**
 * The editable sheet. Its markup is the shared renderer's real output (so
 * the canvas is exactly what prints); Moveable and Selecto operate directly
 * on the rendered element nodes. During a gesture Moveable mutates the
 * node's inline style; the result is read back in mm and committed once,
 * on gesture end, through onCommit.
 */
export function EditorCanvas({
  badge,
  elements,
  theme,
  subject,
  event,
  organisateur,
  assets,
  selectedIds,
  lockedIds,
  onSelect,
  onCommit,
  zoom,
  showGrid,
  shiftHeld,
  readOnly,
}) {
  const viewportRef = useRef(null);
  const hostRef = useRef(null);
  const moveableRef = useRef(null);
  const [targets, setTargets] = useState([]);
  const [guideElements, setGuideElements] = useState([]);
  const [sheetEl, setSheetEl] = useState(null);

  const sheet = sheetSizeMm(badge);
  const panels = activePanels(badge);

  const { css, html } = useMemo(
    () =>
      renderEditorSheet({
        badge: { ...badge, elements },
        theme,
        participant: subject.participant,
        event,
        organisme: subject.organisme,
        organisateur,
        categorie: subject.categorie,
        assets,
        scope: `.${SCOPE}`,
      }),
    [badge, elements, theme, subject, event, organisateur, assets],
  );

  // Re-resolve Moveable's targets whenever the markup is replaced (every
  // committed change re-renders the sheet) or the selection changes.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const find = (id) => host.querySelector(`[data-element-id="${CSS.escape(id)}"]`);
    const found = selectedIds.map(find).filter(Boolean);
    // Moveable misreads CSS mm (it treats 1mm as 0.1mm), so a resize starting
    // from "95mm" jumped to ~9.5mm. Hand it the same geometry in px.
    found.forEach((node) => {
      ['left', 'top', 'width', 'height'].forEach((prop) => {
        const value = node.style[prop];
        if (value?.endsWith('mm')) node.style[prop] = `${mmToPx(parseFloat(value))}px`;
      });
    });
    setTargets(found);
    setGuideElements(
      [...host.querySelectorAll('.el-wrapper')].filter((node) => !selectedIds.includes(node.dataset.elementId)),
    );
    setSheetEl(host.querySelector('.sheet'));
  }, [html, selectedIds]);

  // Same fitting pass Puppeteer runs before printing, once fonts are ready.
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || !hostRef.current) return;
      fitDynamicTextInDom(hostRef.current);
      moveableRef.current?.updateRect();
    });
    return () => {
      cancelled = true;
    };
  }, [html]);

  const guidelines = useMemo(() => {
    const vertical = new Set();
    const horizontal = new Set();
    const { width, height } = panelSizeMm(badge);
    const safe = badge.safeZoneMm ?? 5;
    panels.forEach((key) => {
      const o = panelOrigin(badge, key);
      [0, safe, width / 2, width - safe, width].forEach((v) => vertical.add(mmToPx(o.x + v)));
      [0, safe, height / 2, height - safe, height].forEach((v) => horizontal.add(mmToPx(o.y + v)));
    });
    return { vertical: [...vertical], horizontal: [...horizontal] };
  }, [badge, panels]);

  const single = targets.length === 1 ? elements.find((e) => e.id === targets[0].dataset.elementId) : null;
  const anyLocked = selectedIds.some((id) => lockedIds.has(id));
  const rotationMode = single ? ELEMENT_CATALOG[single.type]?.rotation || 'free' : 'none';
  const interactive = !readOnly && !anyLocked;

  function commitTargets(nodes) {
    onCommit(nodes.map(readGeometry));
  }

  return (
    <Box ref={viewportRef} sx={{ position: 'relative', overflow: 'auto', height: '100%', bgcolor: '#e9ecef' }}>
      <Ruler orientation="h" lengthMm={sheet.width} zoom={zoom} />
      <Ruler orientation="v" lengthMm={sheet.height} zoom={zoom} />
      <Box sx={{ position: 'relative', width: mmToPx(sheet.width) * zoom + 2 * PAD + RULER, height: mmToPx(sheet.height) * zoom + 2 * PAD + RULER }}>
        <Box
          sx={{
            position: 'absolute',
            left: RULER + PAD,
            top: RULER + PAD,
            width: mmToPx(sheet.width),
            height: mmToPx(sheet.height),
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            backgroundImage: showGrid
              ? `linear-gradient(rgba(25,113,194,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(25,113,194,0.12) 1px, transparent 1px)`
              : 'none',
            backgroundSize: `${PX_PER_MM}px ${PX_PER_MM}px`,
          }}
        >
          <style>{css}</style>
          <div className={SCOPE} ref={hostRef} dangerouslySetInnerHTML={{ __html: html }} />
          {showGrid && (
            <style>{`.${SCOPE} .panel { background: rgba(255,255,255,0.88); }`}</style>
          )}
          {panels.map((key) => {
            const o = panelOrigin(badge, key);
            return (
              <Box
                key={key}
                sx={{
                  position: 'absolute',
                  left: mmToPx(o.x) + 4,
                  top: mmToPx(o.y) + 2,
                  fontSize: 10 / zoom,
                  color: 'rgba(0,0,0,0.35)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {key}
              </Box>
            );
          })}
          {!readOnly && (
            <Moveable
              ref={moveableRef}
              target={targets}
              zoom={1 / zoom}
              origin={false}
              draggable={interactive}
              resizable={interactive}
              rotatable={interactive && targets.length === 1 && rotationMode !== 'none'}
              keepRatio={!!(single && ELEMENT_CATALOG[single.type]?.keepRatio)}
              throttleRotate={rotationMode === 'quarter' ? 90 : shiftHeld ? 0 : 15}
              snappable
              snapContainer={sheetEl}
              snapThreshold={5}
              isDisplaySnapDigit
              snapDistFormat={(v) => `${round1(pxToMm(v))} mm`}
              snapGridWidth={showGrid ? PX_PER_MM : 0}
              snapGridHeight={showGrid ? PX_PER_MM : 0}
              verticalGuidelines={guidelines.vertical}
              horizontalGuidelines={guidelines.horizontal}
              elementGuidelines={guideElements}
              snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
              elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
              onDrag={({ target, left, top }) => {
                target.style.left = `${left}px`;
                target.style.top = `${top}px`;
              }}
              onDragEnd={({ target, isDrag }) => isDrag && commitTargets([target])}
              onDragGroup={({ events }) => {
                events.forEach((ev) => {
                  ev.target.style.left = `${ev.left}px`;
                  ev.target.style.top = `${ev.top}px`;
                });
              }}
              onDragGroupEnd={({ targets: groupTargets, isDrag }) => isDrag && commitTargets(groupTargets)}
              onResize={({ target, width, height, drag }) => {
                target.style.width = `${width}px`;
                target.style.height = `${height}px`;
                target.style.left = `${drag.left}px`;
                target.style.top = `${drag.top}px`;
              }}
              onResizeEnd={({ target, isDrag }) => isDrag && commitTargets([target])}
              onResizeGroup={({ events }) => {
                events.forEach((ev) => {
                  ev.target.style.width = `${ev.width}px`;
                  ev.target.style.height = `${ev.height}px`;
                  ev.target.style.left = `${ev.drag.left}px`;
                  ev.target.style.top = `${ev.drag.top}px`;
                });
              }}
              onResizeGroupEnd={({ targets: groupTargets, isDrag }) => isDrag && commitTargets(groupTargets)}
              onRotate={({ target, rotation }) => {
                target.style.transform = `rotate(${rotation}deg)`;
              }}
              onRotateEnd={({ target, isDrag }) => isDrag && commitTargets([target])}
            />
          )}
        </Box>
      </Box>
      {!readOnly && viewportRef.current && (
        <Selecto
          container={viewportRef.current}
          dragContainer={viewportRef.current}
          selectableTargets={[`.${SCOPE} .el-wrapper`]}
          hitRate={0}
          selectByClick
          selectFromInside={false}
          toggleContinueSelect={['shift']}
          ratio={0}
          onDragStart={(e) => {
            const target = e.inputEvent.target;
            if (moveableRef.current?.isMoveableElement(target) || targets.some((t) => t === target || t.contains(target))) {
              e.stop();
            }
          }}
          onSelectEnd={(e) => {
            const ids = e.selected.map((node) => node.dataset.elementId).filter((id) => !lockedIds.has(id));
            if (e.isDragStart && ids.length > 0) {
              e.inputEvent.preventDefault();
              moveableRef.current?.waitToChangeTarget().then(() => moveableRef.current?.dragStart(e.inputEvent));
            }
            onSelect(ids);
          }}
        />
      )}
    </Box>
  );
}

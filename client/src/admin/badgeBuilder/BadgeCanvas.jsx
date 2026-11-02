import { useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Typography } from '@mui/material';
import { renderSinglePanelHtml } from '../../../../shared/badge-renderer/index.js';

const PANEL_LABELS = { P1: 'P1 — Badge', P2: 'P2 — Infos pratiques', P3: 'P3 — Partenaires 1', P4: 'P4 — Partenaires 2' };

/**
 * Renders the real badge HTML (shared renderer) inside an iframe, then
 * reads each block's rendered position via its data-bloc-id attribute and
 * draws absolutely-positioned, interactive overlay boxes on top — the
 * canvas literally is the print output, per Addendum 3 §4.1, rather than a
 * simplified stand-in.
 */
function usePanelSheetHtml({ panelKey, config, theme, assets, event, participant, organisme, organisateur, categorie }) {
  return useMemo(() => {
    try {
      return renderSinglePanelHtml({ panelKey, config, theme, participant, event, organisme, organisateur, categorie, assets });
    } catch {
      return null;
    }
  }, [panelKey, config, theme, assets, event, participant, organisme, organisateur, categorie]);
}

function OverlayBlock({ bloc, rect, isSelected, onSelect }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: bloc.id, data: { blockId: bloc.id } });

  if (!rect) return null;

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(bloc.id);
      }}
      sx={{
        position: 'absolute',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        border: isSelected ? '2px solid #1971c2' : '1px solid transparent',
        opacity: isDragging ? 0.3 : 1,
        cursor: 'grab',
        '&:hover': { border: '1px dashed #1971c2' },
        boxSizing: 'border-box',
      }}
    />
  );
}

function PanelFrame({ panelKey, config, theme, assets, sample, blocs, selectedBlockId, onSelect, width, height }) {
  const sheetHtml = usePanelSheetHtml({
    panelKey,
    config,
    theme,
    assets,
    event: sample.event,
    participant: sample.participant,
    organisme: sample.organisme,
    organisateur: sample.organisateur,
    categorie: sample.categorie,
  });
  const iframeRef = useRef(null);
  const [rects, setRects] = useState({});
  const { setNodeRef: setDroppableRef } = useDroppable({ id: `panel-${panelKey}`, data: { panelKey } });

  // Real mm-to-px rendering inside the iframe; the overlay reads actual
  // getBoundingClientRect() values rather than assuming fixed block
  // heights, so it stays correct across font/content changes.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !sheetHtml) return;

    function measure() {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const panelEl = doc.querySelector(`.panel-${panelKey}`);
      if (!panelEl) return;
      const panelRect = panelEl.getBoundingClientRect();
      const next = {};
      doc.querySelectorAll(`.panel-${panelKey} [data-bloc-id]`).forEach((el) => {
        const id = el.getAttribute('data-bloc-id');
        if (!id) return;
        const r = el.getBoundingClientRect();
        next[id] = { left: r.left - panelRect.left, top: r.top - panelRect.top, width: r.width, height: r.height };
      });
      setRects(next);
    }

    iframe.addEventListener('load', measure);
    const timer = setTimeout(measure, 150);
    return () => {
      iframe.removeEventListener('load', measure);
      clearTimeout(timer);
    };
  }, [sheetHtml, panelKey, blocs]);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {PANEL_LABELS[panelKey]}
      </Typography>
      <Box
        ref={setDroppableRef}
        onClick={() => onSelect(null)}
        sx={{ position: 'relative', width, height, border: '1px solid #ccc', overflow: 'hidden', background: '#fff' }}
      >
        {sheetHtml && (
          <Box
            component="iframe"
            ref={iframeRef}
            title={panelKey}
            srcDoc={sheetHtml}
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
          />
        )}
        <SortableContext items={blocs.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <Box sx={{ position: 'absolute', inset: 0 }}>
            {blocs.map((bloc) => (
              <OverlayBlock
                key={bloc.id}
                bloc={bloc}
                rect={rects[bloc.id]}
                isSelected={selectedBlockId === bloc.id}
                onSelect={onSelect}
              />
            ))}
          </Box>
        </SortableContext>
        {blocs.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#aaa',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            Glissez un bloc ici
          </Box>
        )}
      </Box>
    </Box>
  );
}

const MM_TO_PX = 3.78;

export function BadgeCanvas({ panneaux, theme, format, carteLargeurMm, carteHauteurMm, sample, assets, selectedBlockId, onSelect }) {
  const config = { format, carteLargeurMm, carteHauteurMm, panneaux };

  const panelDims =
    format === 'CARTE'
      ? { width: (carteLargeurMm || 85.6) * MM_TO_PX, height: (carteHauteurMm || 54) * MM_TO_PX }
      : { width: 105 * MM_TO_PX, height: 148.5 * MM_TO_PX };

  const activePanels = format === 'A4_PLIE_4' ? ['P1', 'P2', 'P3', 'P4'] : ['P1'];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2 }}>
      {activePanels.map((panelKey) => (
        <PanelFrame
          key={panelKey}
          panelKey={panelKey}
          config={config}
          theme={theme}
          assets={assets}
          sample={sample}
          blocs={panneaux[panelKey]?.blocs || []}
          selectedBlockId={selectedBlockId}
          onSelect={onSelect}
          width={panelDims.width}
          height={panelDims.height}
        />
      ))}
    </Box>
  );
}

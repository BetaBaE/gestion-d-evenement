import { useState } from 'react';
import { Box, Button, IconButton, InputBase, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ELEMENT_CATALOG, elementLabel } from './elementCatalog.js';
import { activePanels } from './geometry.js';

function LayerRow({ el, selected, onSelect, onToggle, onRename, onDragStart, onDropOn }) {
  const [editing, setEditing] = useState(false);
  const [dropHint, setDropHint] = useState(false);
  const Icon = ELEMENT_CATALOG[el.type]?.icon;

  return (
    <Stack
      direction="row"
      spacing={0.5}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(el.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDropHint(true);
      }}
      onDragLeave={() => setDropHint(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropHint(false);
        onDropOn(el.id);
      }}
      onClick={(e) => onSelect(el.id, e.shiftKey)}
      sx={{
        alignItems: 'center',
        px: 0.5,
        py: 0.25,
        cursor: 'pointer',
        borderRadius: 1,
        bgcolor: selected ? 'action.selected' : 'transparent',
        borderTop: dropHint ? '2px solid' : '2px solid transparent',
        borderTopColor: dropHint ? 'primary.main' : 'transparent',
        opacity: el.masque ? 0.5 : 1,
        '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
      }}
    >
      <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'grab' }} />
      {Icon && <Icon sx={{ fontSize: 16 }} color="action" />}
      {editing ? (
        <InputBase
          autoFocus
          defaultValue={el.nom || ''}
          placeholder={elementLabel({ ...el, nom: '' })}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            onRename(el.id, e.target.value.trim() || undefined);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') setEditing(false);
            e.stopPropagation();
          }}
          sx={{ flex: 1, fontSize: 13 }}
        />
      ) : (
        <Typography
          variant="body2"
          noWrap
          sx={{ flex: 1, fontSize: 13 }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          title="Double-cliquez pour renommer"
        >
          {elementLabel(el)}
        </Typography>
      )}
      <Tooltip title={el.masque ? 'Afficher' : 'Masquer'}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(el.id, 'masque');
          }}
        >
          {el.masque ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Tooltip>
      <Tooltip title={el.verrouille ? 'Déverrouiller' : 'Verrouiller'}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(el.id, 'verrouille');
          }}
        >
          {el.verrouille ? <LockIcon sx={{ fontSize: 16 }} /> : <LockOpenIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

/**
 * Layers per panel, topmost first (highest z). Dragging a row onto another
 * row of the same panel moves it just above that row in the stacking order.
 */
export function LayersPanel({ badge, elements, selectedIds, onSelect, onToggle, onRename, onReorder, onBringBack }) {
  const [draggedId, setDraggedId] = useState(null);
  const panels = activePanels(badge);
  // Elements on a panel that no longer prints (format or panels changed):
  // kept, not printed, and can be brought back onto P1.
  const horsPage = elements.filter((e) => !panels.includes(e.panneau));

  return (
    <Box>
      {horsPage.length > 0 && (
        <Box sx={{ mb: 1, p: 0.5, borderRadius: 1, border: 1, borderColor: 'warning.main' }}>
          <Stack direction="row" sx={{ alignItems: 'center' }}>
            <Typography variant="overline" color="warning.main" sx={{ lineHeight: 2, flex: 1 }}>
              Hors page · {horsPage.length}
            </Typography>
            <Button size="small" onClick={() => onBringBack(horsPage.map((e) => e.id))}>
              Tout ramener sur P1
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.5, mb: 0.5 }}>
            Ces éléments ne sont pas imprimés.
          </Typography>
          {horsPage.map((el) => (
            <Stack key={el.id} direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 0.5 }}>
              <Typography variant="body2" noWrap sx={{ flex: 1, fontSize: 13 }}>
                {elementLabel(el)} <Typography component="span" variant="caption" color="text.disabled">({el.panneau})</Typography>
              </Typography>
              <Button size="small" onClick={() => onBringBack([el.id])}>
                Ramener
              </Button>
            </Stack>
          ))}
        </Box>
      )}
      {panels.map((panelKey) => {
        const layers = elements.filter((e) => e.panneau === panelKey).sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
        return (
          <Box key={panelKey} sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 2 }}>
              {panelKey} · {layers.length}
            </Typography>
            {layers.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', pl: 1 }}>
                Vide
              </Typography>
            )}
            {layers.map((el) => (
              <LayerRow
                key={el.id}
                el={el}
                selected={selectedIds.includes(el.id)}
                onSelect={onSelect}
                onToggle={onToggle}
                onRename={onRename}
                onDragStart={setDraggedId}
                onDropOn={(overId) => {
                  if (draggedId && draggedId !== overId) onReorder(draggedId, overId);
                  setDraggedId(null);
                }}
              />
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

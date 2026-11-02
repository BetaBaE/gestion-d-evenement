import { useDraggable } from '@dnd-kit/core';
import { Paper, Typography, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { BLOCK_CATEGORIES, BLOCK_CATALOG } from './blockCatalog.js';

function PaletteItem({ type }) {
  const entry = BLOCK_CATALOG[type];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: 'palette', blockType: type },
  });
  const Icon = entry.icon;

  return (
    <ListItemButton
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      dense
      sx={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={entry.label} primaryTypographyProps={{ variant: 'body2' }} />
    </ListItemButton>
  );
}

export function BlockPalette() {
  return (
    <Paper sx={{ p: 1, height: '100%', overflowY: 'auto' }}>
      {BLOCK_CATEGORIES.map((category, index) => (
        <div key={category.key}>
          {index > 0 && <Divider sx={{ my: 1 }} />}
          <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
            {category.label}
          </Typography>
          <List dense disablePadding>
            {Object.keys(BLOCK_CATALOG)
              .filter((type) => BLOCK_CATALOG[type].category === category.key)
              .map((type) => (
                <PaletteItem key={type} type={type} />
              ))}
          </List>
        </div>
      ))}
    </Paper>
  );
}

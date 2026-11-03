import { useMemo, useState } from 'react';
import { Box, Button, InputAdornment, Popover, Stack, TextField, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ICONS } from '../../../../shared/badge-renderer/index.js';

const GROUPS = [...new Set(Object.values(ICONS).map((i) => i.groupe))];

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The same SVG the badge prints (static markup from the shared ICONS table). */
export function IconGlyph({ name, size = 24, color = 'currentColor' }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
}

/** Icon of an "Icône" element: current icon + a searchable grid grouped by theme. */
export function IconPicker({ value, onChange }) {
  const [anchor, setAnchor] = useState(null);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const entries = Object.entries(ICONS).filter(([key, icon]) => !q || normalize(icon.label).includes(q) || normalize(key).includes(q) || normalize(icon.groupe).includes(q));
    return GROUPS.map((g) => ({ groupe: g, icons: entries.filter(([, icon]) => icon.groupe === g) })).filter((g) => g.icons.length > 0);
  }, [query]);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box sx={{ p: 1, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: '#fff', color: '#1f2a1f' }}>
          <IconGlyph name={value} size={32} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Icône
          </Typography>
          <Typography variant="body2" noWrap>
            {ICONS[value]?.label || value}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={(e) => setAnchor(e.currentTarget)}>
          Changer
        </Button>
      </Stack>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 460, p: 1.5, display: 'flex', flexDirection: 'column' } } }}
      >
        <TextField
          size="small"
          autoFocus
          placeholder="Rechercher (lieu, wifi, linkedin…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ mb: 1 }}
        />
        <Box sx={{ overflowY: 'auto' }}>
          {groups.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              Aucune icône trouvée.
            </Typography>
          )}
          {groups.map(({ groupe, icons }) => (
            <Box key={groupe} sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.secondary">
                {groupe}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {icons.map(([key, icon]) => (
                  <Tooltip key={key} title={icon.label}>
                    <Box
                      component="button"
                      type="button"
                      aria-label={icon.label}
                      onClick={() => {
                        onChange(key);
                        setAnchor(null);
                      }}
                      sx={{
                        p: 0.75,
                        display: 'flex',
                        justifyContent: 'center',
                        borderRadius: 1,
                        cursor: 'pointer',
                        color: 'text.primary',
                        bgcolor: key === value ? 'action.selected' : 'transparent',
                        border: 1,
                        borderColor: key === value ? 'primary.main' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <IconGlyph name={key} size={22} />
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}

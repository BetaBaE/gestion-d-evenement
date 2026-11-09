import { useState } from 'react';
import { Box, FormControlLabel, IconButton, InputAdornment, MenuItem, Popover, Slider, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { ColorField } from '../../components/form/index.js';

const STORAGE_KEY = 'badgeEditorGrid';
const DEFAULT_GRID = { show: false, sizeMm: 5, color: '#1971C2', opacity: 0.6, snap: true };
const SIZES = [1, 2, 2.5, 5, 10];

/** Grid settings of this browser (a per-viewer preference, not part of the badge). */
export function loadGridSettings() {
  try {
    return { ...DEFAULT_GRID, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULT_GRID;
  }
}

export function saveGridSettings(grid) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
  } catch {
    // private window / blocked storage: the setting just isn't remembered
  }
}

/** Toolbar control: the grid toggle, and its settings (size, color, snapping) in a popover. */
export function GridControl({ grid, onChange }) {
  const [anchor, setAnchor] = useState(null);
  const set = (patch) => onChange({ ...grid, ...patch });
  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
        <Tooltip title={grid.show ? `Masquer la grille (${grid.sizeMm} mm)` : `Afficher la grille (${grid.sizeMm} mm)`}>
          <IconButton size="small" color={grid.show ? 'primary' : 'default'} onClick={() => set({ show: !grid.show })}>
            <GridOnIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Réglages de la grille">
          <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} sx={{ ml: -0.75, px: 0 }} aria-label="Réglages de la grille">
            <ArrowDropDownIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2, width: 280 } } }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Grille</Typography>
          <FormControlLabel control={<Switch size="small" checked={grid.show} onChange={(e) => set({ show: e.target.checked })} />} label="Afficher la grille" />
          <TextField
            select
            size="small"
            label="Pas de la grille"
            value={SIZES.includes(grid.sizeMm) ? grid.sizeMm : 'autre'}
            onChange={(e) => e.target.value !== 'autre' && set({ sizeMm: Number(e.target.value), show: true })}
          >
            {SIZES.map((s) => (
              <MenuItem key={s} value={s}>
                {String(s).replace('.', ',')} mm
              </MenuItem>
            ))}
            {!SIZES.includes(grid.sizeMm) && <MenuItem value="autre">{String(grid.sizeMm).replace('.', ',')} mm</MenuItem>}
          </TextField>
          <TextField
            size="small"
            type="number"
            label="Pas personnalisé"
            value={grid.sizeMm}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v) && v >= 0.5 && v <= 50) set({ sizeMm: v, show: true });
            }}
            slotProps={{ htmlInput: { min: 0.5, max: 50, step: 0.5 }, input: { endAdornment: <InputAdornment position="end">mm</InputAdornment> } }}
          />
          <ColorField label="Couleur des lignes" value={grid.color} onChange={(color) => set({ color })} />
          <Box>
            <Typography variant="caption" color="text.secondary">
              Opacité : {Math.round((grid.opacity ?? 1) * 100)} %
            </Typography>
            <Slider
              size="small"
              min={10}
              max={100}
              step={5}
              value={Math.round((grid.opacity ?? 1) * 100)}
              onChange={(_, v) => set({ opacity: v / 100, show: true })}
              aria-label="Opacité de la grille"
            />
          </Box>
          <FormControlLabel
            control={<Switch size="small" checked={grid.snap} onChange={(e) => set({ snap: e.target.checked })} />}
            label="Aimanter les éléments à la grille"
          />
          <Typography variant="caption" color="text.secondary">
            Un trait plus marqué tous les 10 mm. Ces réglages sont gardés dans ce navigateur.
          </Typography>
        </Stack>
      </Popover>
    </>
  );
}

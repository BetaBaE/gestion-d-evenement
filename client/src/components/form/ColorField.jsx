import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Box, IconButton, Popover, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ColorizeIcon from '@mui/icons-material/Colorize';
import { DEFAULT_PALETTE, normalizeHex } from './colorUtils.js';

const CHECKERBOARD =
  'repeating-conic-gradient(#bbb 0% 25%, #eee 0% 50%) 50% / 10px 10px';

function Swatch({ color, label, selected, onClick, size = 22 }) {
  return (
    <Tooltip title={label || color}>
      <Box
        component="button"
        type="button"
        onClick={onClick}
        aria-label={label || color}
        sx={{
          width: size,
          height: size,
          p: 0,
          borderRadius: '50%',
          cursor: 'pointer',
          background: color || CHECKERBOARD,
          border: selected ? '2px solid' : '1px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          outlineOffset: 1,
        }}
      />
    </Tooltip>
  );
}

/**
 * The one color input of the app (Addendum "Fix" §3): swatch + popover
 * picker + hex field, kept in sync both ways.
 *
 * `value` is a hex color, or — when `tokens` are given (badge editor) — a
 * token key such as 'principale'. `presets` (e.g. the organisateur's brand
 * kit) are shown first, then the default palette, then the tokens.
 */
export function ColorField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  presets = [],
  tokens = [],
  allowNone = false,
  size = 'small',
  fullWidth = true,
  required,
  disabled,
  name,
}) {
  const token = tokens.find((t) => t.value === value);
  const hexValue = token ? null : normalizeHex(value || '');
  const [draft, setDraft] = useState(token ? token.label : value && value !== 'aucun' ? normalizeHex(value) || value : '');
  const [draftError, setDraftError] = useState(false);
  const [anchor, setAnchor] = useState(null);

  // Keep the text field in sync when the value changes from outside
  // (picker, preset, form reset, undo) — not while typing in it: '#FF0' is
  // already a valid color and would rewrite '#FF0000' half-way through.
  const typingRef = useRef(false);
  useEffect(() => {
    if (typingRef.current) return;
    setDraft(token ? token.label : value && value !== 'aucun' ? normalizeHex(value) || value : '');
    setDraftError(false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const swatchColor = token ? token.color : hexValue;
  const lastValid = swatchColor;

  function commitDraft(text) {
    if (!text) {
      setDraftError(!!required && !allowNone);
      if (allowNone) onChange('aucun');
      return;
    }
    const normalized = normalizeHex(text);
    if (normalized) {
      setDraftError(false);
      setDraft(normalized);
      if (normalized !== value) onChange(normalized);
    } else {
      setDraftError(true);
    }
  }

  async function pickWithEyeDropper() {
    try {
      const result = await new window.EyeDropper().open();
      const normalized = normalizeHex(result.sRGBHex);
      if (normalized) onChange(normalized);
    } catch {
      // User cancelled the eyedropper.
    }
  }

  const presetColors = [...new Set([...presets.map(normalizeHex).filter(Boolean), ...DEFAULT_PALETTE])];
  const showError = !!error || draftError;

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', width: fullWidth ? '100%' : 'auto' }}>
        <Box
          component="button"
          type="button"
          disabled={disabled}
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={`Choisir la couleur${label ? ` — ${label}` : ''}`}
          sx={{
            mt: size === 'small' ? 0.25 : 0.75,
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 1,
            cursor: disabled ? 'default' : 'pointer',
            background: lastValid || CHECKERBOARD,
            border: '1px solid',
            borderColor: showError ? 'error.main' : 'divider',
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15)',
          }}
        />
        <TextField
          label={label}
          name={name}
          size={size}
          fullWidth
          required={required}
          disabled={disabled}
          value={draft}
          error={showError}
          helperText={draftError ? 'Couleur invalide (ex. #1971C2)' : helperText}
          placeholder={allowNone ? 'Aucune' : '#RRGGBB'}
          onChange={(e) => {
            setDraft(e.target.value);
            const normalized = normalizeHex(e.target.value);
            if (normalized) {
              setDraftError(false);
              if (normalized !== value) onChange(normalized);
            }
          }}
          onFocus={() => {
            typingRef.current = true;
          }}
          onBlur={(e) => {
            typingRef.current = false;
            if (!token || e.target.value !== token.label) commitDraft(e.target.value.trim());
            onBlur?.(e);
          }}
          slotProps={{ htmlInput: { spellCheck: false, autoComplete: 'off' } }}
        />
      </Stack>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, width: 232 } } }}
      >
        <HexColorPicker
          color={hexValue || (token ? normalizeHex(token.color) : null) || '#1971C2'}
          onChange={(c) => onChange(c.toUpperCase())}
          style={{ width: '100%', height: 160 }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ flex: 1, fontFamily: 'monospace' }}>
            {token ? token.label : hexValue || '—'}
          </Typography>
          {typeof window !== 'undefined' && 'EyeDropper' in window && (
            <Tooltip title="Pipette (prendre une couleur à l'écran)">
              <IconButton size="small" onClick={pickWithEyeDropper}>
                <ColorizeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {presets.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Charte de l'organisateur
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {presets
                .map(normalizeHex)
                .filter(Boolean)
                .map((c) => (
                  <Swatch key={`p${c}`} color={c} selected={hexValue === c} onClick={() => onChange(c)} />
                ))}
            </Stack>
          </>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Palette
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {presetColors
            .filter((c) => !presets.map(normalizeHex).includes(c))
            .map((c) => (
              <Swatch key={c} color={c} selected={hexValue === c} onClick={() => onChange(c)} />
            ))}
        </Stack>

        {(tokens.length > 0 || allowNone) && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Couleurs du thème
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {allowNone && <Swatch label="Aucune" color={null} selected={!value || value === 'aucun'} onClick={() => onChange('aucun')} />}
              {tokens.map((t) => (
                <Swatch key={t.value} color={t.color} label={t.label} selected={value === t.value} onClick={() => onChange(t.value)} />
              ))}
            </Stack>
          </>
        )}
      </Popover>
    </>
  );
}

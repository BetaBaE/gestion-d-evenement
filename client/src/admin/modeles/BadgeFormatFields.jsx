import { Checkbox, FormControlLabel, FormGroup, Grid, MenuItem, TextField, Typography } from '@mui/material';

export const FORMAT_CHOICES = [
  { id: 'A4_PLIE_4', name: 'A4 plié en 4' },
  { id: 'A6', name: 'A6 (105 × 148,5 mm)' },
  { id: 'CARTE', name: 'Carte 85,6 × 54 mm' },
  { id: 'PERSONNALISE', name: 'Personnalisé' },
];

// Same limits as the server (modeleBadgeController CARTE_LIMITES_MM).
export const LIMITES_MM = { largeur: { min: 40, max: 210 }, hauteur: { min: 40, max: 297 } };
const CARTE_STANDARD = { largeur: 85.6, hauteur: 54 };

export const FORMAT_LABELS = {
  A4_PLIE_4: 'A4 plié en 4',
  A6: 'A6',
};

/** "A4 plié en 4", "Carte 85,6 × 54 mm", "100 × 70 mm"… */
export function formatLabel(modele) {
  if (modele.format !== 'CARTE') return FORMAT_LABELS[modele.format] || modele.format;
  const l = modele.carteLargeurMm ?? CARTE_STANDARD.largeur;
  const h = modele.carteHauteurMm ?? CARTE_STANDARD.hauteur;
  const dims = `${String(l).replace('.', ',')} × ${String(h).replace('.', ',')} mm`;
  return l === CARTE_STANDARD.largeur && h === CARTE_STANDARD.hauteur ? `Carte ${dims}` : dims;
}

/** Dialog state from a template (or defaults for a new one). */
export function formatStateFrom(modele = {}) {
  const largeur = modele.carteLargeurMm ?? CARTE_STANDARD.largeur;
  const hauteur = modele.carteHauteurMm ?? CARTE_STANDARD.hauteur;
  const custom = modele.format === 'CARTE' && (largeur !== CARTE_STANDARD.largeur || hauteur !== CARTE_STANDARD.hauteur);
  const actifs = modele.panneauxActifs?.length ? modele.panneauxActifs : ['P1', 'P2', 'P3', 'P4'];
  return {
    format: custom ? 'PERSONNALISE' : modele.format || 'A4_PLIE_4',
    largeur,
    hauteur,
    panneaux: { P2: actifs.includes('P2'), P3: actifs.includes('P3'), P4: actifs.includes('P4') },
  };
}

/** Fields sent to the API. "Personnalisé" is a card with free dimensions. */
export function formatPayload(state) {
  if (state.format === 'A4_PLIE_4') {
    return { format: 'A4_PLIE_4', panneauxActifs: ['P1', ...['P2', 'P3', 'P4'].filter((p) => state.panneaux[p])] };
  }
  if (state.format === 'A6') return { format: 'A6' };
  if (state.format === 'CARTE') return { format: 'CARTE', carteLargeurMm: CARTE_STANDARD.largeur, carteHauteurMm: CARTE_STANDARD.hauteur };
  return { format: 'CARTE', carteLargeurMm: Number(state.largeur), carteHauteurMm: Number(state.hauteur) };
}

export function formatErrors(state) {
  if (state.format !== 'PERSONNALISE') return {};
  const errors = {};
  const check = (key, label) => {
    const v = Number(state[key]);
    const { min, max } = LIMITES_MM[key];
    if (!Number.isFinite(v) || v < min || v > max) errors[key] = `${label} entre ${min} et ${max} mm`;
  };
  check('largeur', 'Largeur');
  check('hauteur', 'Hauteur');
  return errors;
}

export function BadgeFormatFields({ value, onChange }) {
  const errors = formatErrors(value);
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <Grid container columnSpacing={2} rowSpacing={1.5}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField select size="small" label="Format" value={value.format} onChange={(e) => set({ format: e.target.value })} fullWidth>
          {FORMAT_CHOICES.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {value.format === 'PERSONNALISE' && (
        <>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField
              size="small"
              type="number"
              label="Largeur (mm)"
              value={value.largeur}
              onChange={(e) => set({ largeur: e.target.value })}
              error={!!errors.largeur}
              helperText={errors.largeur || `${LIMITES_MM.largeur.min}–${LIMITES_MM.largeur.max}`}
              slotProps={{ htmlInput: { min: LIMITES_MM.largeur.min, max: LIMITES_MM.largeur.max, step: 0.5 } }}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField
              size="small"
              type="number"
              label="Hauteur (mm)"
              value={value.hauteur}
              onChange={(e) => set({ hauteur: e.target.value })}
              error={!!errors.hauteur}
              helperText={errors.hauteur || `${LIMITES_MM.hauteur.min}–${LIMITES_MM.hauteur.max}`}
              slotProps={{ htmlInput: { min: LIMITES_MM.hauteur.min, max: LIMITES_MM.hauteur.max, step: 0.5 } }}
              fullWidth
            />
          </Grid>
        </>
      )}
      {value.format === 'A4_PLIE_4' && (
        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" color="text.secondary">
            Panneaux imprimés (P1, la face avant, l'est toujours)
          </Typography>
          <FormGroup row>
            <FormControlLabel control={<Checkbox size="small" checked disabled />} label="P1" />
            {['P2', 'P3', 'P4'].map((p) => (
              <FormControlLabel
                key={p}
                control={<Checkbox size="small" checked={value.panneaux[p]} onChange={(e) => set({ panneaux: { ...value.panneaux, [p]: e.target.checked } })} />}
                label={p}
              />
            ))}
          </FormGroup>
        </Grid>
      )}
    </Grid>
  );
}

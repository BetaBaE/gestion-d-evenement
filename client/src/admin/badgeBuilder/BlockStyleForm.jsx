import { Stack, TextField, MenuItem, Divider, Typography } from '@mui/material';

export function BlockStyleForm({ style, onChange }) {
  function set(patch) {
    onChange({ ...style, ...patch });
  }

  return (
    <Stack spacing={1.5}>
      <Divider />
      <Typography variant="caption" color="text.secondary">
        Style
      </Typography>
      <TextField
        select
        label="Alignement"
        size="small"
        value={style.alignement || 'gauche'}
        onChange={(e) => set({ alignement: e.target.value })}
      >
        <MenuItem value="gauche">Gauche</MenuItem>
        <MenuItem value="centre">Centre</MenuItem>
        <MenuItem value="droite">Droite</MenuItem>
      </TextField>
      <Stack direction="row" spacing={1}>
        <TextField
          select
          label="Marge haut"
          size="small"
          fullWidth
          value={style.margeHaut || 'aucune'}
          onChange={(e) => set({ margeHaut: e.target.value })}
        >
          {['aucune', 'S', 'M', 'L'].map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Marge bas"
          size="small"
          fullWidth
          value={style.margeBas || 'M'}
          onChange={(e) => set({ margeBas: e.target.value })}
        >
          {['aucune', 'S', 'M', 'L'].map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <TextField
        select
        label="Couleur de fond"
        size="small"
        value={style.couleurFond || 'aucune'}
        onChange={(e) => set({ couleurFond: e.target.value })}
      >
        <MenuItem value="aucune">Aucune</MenuItem>
        <MenuItem value="principale">Principale</MenuItem>
        <MenuItem value="secondaire">Secondaire</MenuItem>
        <MenuItem value="accent">Accent</MenuItem>
      </TextField>
      <TextField
        select
        label="Couleur de texte"
        size="small"
        value={style.couleurTexte || 'auto'}
        onChange={(e) => set({ couleurTexte: e.target.value })}
      >
        <MenuItem value="auto">Auto</MenuItem>
        <MenuItem value="principale">Principale</MenuItem>
        <MenuItem value="accent">Accent</MenuItem>
        <MenuItem value="texte">Texte</MenuItem>
        <MenuItem value="blanc">Blanc</MenuItem>
      </TextField>
    </Stack>
  );
}

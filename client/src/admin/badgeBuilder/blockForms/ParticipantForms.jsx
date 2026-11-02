import { TextField, MenuItem, Stack, Slider, Typography } from '@mui/material';

export function NomPrenomForm({ props, onChange }) {
  return (
    <TextField
      select
      label="Format"
      value={props.format || 'NOM Prénom'}
      onChange={(e) => onChange({ ...props, format: e.target.value })}
      fullWidth
      size="small"
    >
      <MenuItem value="NOM Prénom">NOM Prénom</MenuItem>
      <MenuItem value="Prénom NOM">Prénom NOM</MenuItem>
      <MenuItem value="NOM PRÉNOM">NOM PRÉNOM</MenuItem>
    </TextField>
  );
}

export function OrganismeForm({ props, onChange }) {
  return (
    <TextField
      select
      label="Afficher"
      value={props.afficher || 'nom'}
      onChange={(e) => onChange({ ...props, afficher: e.target.value })}
      fullWidth
      size="small"
    >
      <MenuItem value="nom">Nom</MenuItem>
      <MenuItem value="logo">Logo</MenuItem>
      <MenuItem value="les deux">Les deux</MenuItem>
    </TextField>
  );
}

export function PhotoForm({ props, onChange }) {
  return (
    <TextField
      select
      label="Forme"
      value={props.forme || 'rond'}
      onChange={(e) => onChange({ ...props, forme: e.target.value })}
      fullWidth
      size="small"
    >
      <MenuItem value="rond">Rond</MenuItem>
      <MenuItem value="carre">Carré</MenuItem>
    </TextField>
  );
}

export function QrCodeForm({ props, onChange }) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2">Taille : {props.tailleMm ?? 55} mm</Typography>
      <Slider
        min={30}
        max={65}
        value={props.tailleMm ?? 55}
        onChange={(_e, value) => onChange({ ...props, tailleMm: value })}
      />
    </Stack>
  );
}

export function BandeCategorieForm({ props, onChange }) {
  return (
    <TextField
      label="Texte (vide = catégorie du participant)"
      value={props.texte === 'auto' ? '' : props.texte || ''}
      onChange={(e) => onChange({ ...props, texte: e.target.value || 'auto' })}
      fullWidth
      size="small"
    />
  );
}

export function ChampParticipantForm({ props, onChange }) {
  return (
    <TextField
      select
      label="Champ"
      value={props.champ || 'email'}
      onChange={(e) => onChange({ ...props, champ: e.target.value })}
      fullWidth
      size="small"
    >
      <MenuItem value="civilite">Civilité</MenuItem>
      <MenuItem value="email">Email</MenuItem>
      <MenuItem value="telephone">Téléphone</MenuItem>
    </TextField>
  );
}

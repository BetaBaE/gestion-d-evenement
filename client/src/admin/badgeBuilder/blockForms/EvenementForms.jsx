import { TextField, MenuItem, Stack, FormControlLabel, Switch, Typography } from '@mui/material';
import { BlockImagePicker } from '../BlockImagePicker.jsx';

export function EnteteEvenementForm({ props, onChange, eventId }) {
  function set(patch) {
    onChange({ ...props, ...patch });
  }

  return (
    <Stack spacing={1.5}>
      <TextField
        select
        label="Mode"
        value={props.mode || 'genere'}
        onChange={(e) => set({ mode: e.target.value })}
        fullWidth
        size="small"
      >
        <MenuItem value="genere">Généré (texte)</MenuItem>
        <MenuItem value="image">Image (bannière)</MenuItem>
      </TextField>

      {props.mode === 'image' ? (
        <BlockImagePicker
          label="Bannière d'en-tête"
          eventId={eventId}
          imageId={props.banniereImageId}
          onChange={(id) => set({ banniereImageId: id })}
        />
      ) : (
        <>
          <BlockImagePicker
            label="Logo de l'événement"
            eventId={eventId}
            imageId={props.logoImageId}
            onChange={(id) => set({ logoImageId: id })}
          />
          <TextField
            label="Patronage (arabe)"
            value={props.patronageAr || ''}
            onChange={(e) => set({ patronageAr: e.target.value })}
            fullWidth
            size="small"
            dir="rtl"
          />
          <TextField
            label="Patronage (français)"
            value={props.patronageFr || ''}
            onChange={(e) => set({ patronageFr: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Titre (vide = titre de l'événement)"
            value={props.titre || ''}
            onChange={(e) => set({ titre: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Sous-titre (ex: by Pollutec)"
            value={props.parLigne || ''}
            onChange={(e) => set({ parLigne: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Édition"
            value={props.edition || ''}
            onChange={(e) => set({ edition: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Descriptif"
            value={props.descriptif || ''}
            onChange={(e) => set({ descriptif: e.target.value })}
            fullWidth
            size="small"
            multiline
          />
          <FormControlLabel
            control={<Switch checked={props.afficherDates !== false} onChange={(e) => set({ afficherDates: e.target.checked })} />}
            label="Afficher les dates"
          />
          <FormControlLabel
            control={<Switch checked={props.degrade !== false} onChange={(e) => set({ degrade: e.target.checked })} />}
            label="Dégradé de fond"
          />
        </>
      )}
    </Stack>
  );
}

export function EnteteCompactForm({ props, onChange, eventId }) {
  function set(patch) {
    onChange({ ...props, ...patch });
  }
  return (
    <Stack spacing={1.5}>
      <BlockImagePicker
        label="Logo"
        eventId={eventId}
        imageId={props.logoImageId}
        onChange={(id) => set({ logoImageId: id })}
      />
      <FormControlLabel
        control={<Switch checked={props.afficherSiteWeb !== false} onChange={(e) => set({ afficherSiteWeb: e.target.checked })} />}
        label="Afficher le site web"
      />
      <FormControlLabel
        control={<Switch checked={!!props.afficherReseaux} onChange={(e) => set({ afficherReseaux: e.target.checked })} />}
        label="Afficher les réseaux sociaux"
      />
    </Stack>
  );
}

export function DatesEvenementForm({ props, onChange }) {
  return (
    <TextField
      select
      label="Format"
      value={props.format || 'long'}
      onChange={(e) => onChange({ ...props, format: e.target.value })}
      fullWidth
      size="small"
    >
      <MenuItem value="court">Court</MenuItem>
      <MenuItem value="long">Long</MenuItem>
    </TextField>
  );
}

export function LogoOrganisateurForm({ props, onChange }) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Utilise le logo déjà configuré pour l'organisateur.
      </Typography>
      <TextField
        select
        label="Taille"
        value={props.taille || 'M'}
        onChange={(e) => onChange({ ...props, taille: e.target.value })}
        fullWidth
        size="small"
      >
        <MenuItem value="S">S</MenuItem>
        <MenuItem value="M">M</MenuItem>
        <MenuItem value="L">L</MenuItem>
        <MenuItem value="XL">XL</MenuItem>
      </TextField>
    </Stack>
  );
}

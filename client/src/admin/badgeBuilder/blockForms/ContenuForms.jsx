import { useEffect, useState } from 'react';
import {
  TextField,
  MenuItem,
  Stack,
  Button,
  IconButton,
  Typography,
  Box,
  Chip,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { axiosClient } from '../../../api/axiosClient.js';
import { getSelectedOrganisateurId } from '../../organisateurContext.js';
import { BlockImagePicker } from '../BlockImagePicker.jsx';

export function TitrePiluleForm({ props, onChange }) {
  return (
    <TextField
      label="Texte"
      value={props.texte || ''}
      onChange={(e) => onChange({ ...props, texte: e.target.value })}
      fullWidth
      size="small"
      inputProps={{ maxLength: 100 }}
    />
  );
}

export function TexteForm({ props, onChange }) {
  function set(patch) {
    onChange({ ...props, ...patch });
  }
  return (
    <Stack spacing={1.5}>
      <TextField
        label="Contenu"
        value={props.contenu || ''}
        onChange={(e) => set({ contenu: e.target.value })}
        fullWidth
        multiline
        minRows={3}
        size="small"
        helperText="{{b}}gras{{/b}}  {{i}}italique{{/i}}  {{br}} retour à la ligne  {{a:https://...}}lien{{/a}}"
        inputProps={{ maxLength: 1000 }}
      />
      <TextField select label="Direction" value={props.dir || 'ltr'} onChange={(e) => set({ dir: e.target.value })} size="small">
        <MenuItem value="ltr">Gauche à droite</MenuItem>
        <MenuItem value="rtl">Droite à gauche (arabe)</MenuItem>
      </TextField>
    </Stack>
  );
}

const ICON_CHOICES = [
  'calendrier',
  'horloge',
  'lieu',
  'ticket',
  'itineraire',
  'info',
  'telephone',
  'email',
  'wifi',
  'repas',
  'parking',
];

export function ListeInfosForm({ props, onChange }) {
  const items = props.items || [];

  function setItems(next) {
    onChange({ ...props, items: next });
  }
  function updateItem(index, patch) {
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }
  function addItem() {
    setItems([...items, { icone: 'info', titre: '', texte: '' }]);
  }

  return (
    <Stack spacing={1.5}>
      <TextField
        label="Message d'en-tête"
        value={props.messageEnTete || ''}
        onChange={(e) => onChange({ ...props, messageEnTete: e.target.value })}
        fullWidth
        size="small"
        multiline
      />
      {items.map((item, index) => (
        <Box key={index} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 1 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <TextField
                select
                label="Icône"
                value={item.icone || 'info'}
                onChange={(e) => updateItem(index, { icone: e.target.value })}
                size="small"
                sx={{ width: 140 }}
              >
                {ICON_CHOICES.map((icon) => (
                  <MenuItem key={icon} value={icon}>
                    {icon}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Titre"
                value={item.titre || ''}
                onChange={(e) => updateItem(index, { titre: e.target.value })}
                size="small"
                fullWidth
              />
              <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
            <TextField
              label="Texte"
              value={item.texte || ''}
              onChange={(e) => updateItem(index, { texte: e.target.value })}
              size="small"
              fullWidth
              multiline
            />
          </Stack>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addItem}>
        Ajouter un élément
      </Button>
    </Stack>
  );
}

export function HorairesForm({ props, onChange }) {
  const lignes = props.lignes || [];

  function setLignes(next) {
    onChange({ ...props, lignes: next });
  }
  function updateLigne(index, patch) {
    setLignes(lignes.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function removeLigne(index) {
    setLignes(lignes.filter((_, i) => i !== index));
  }
  function addLigne() {
    setLignes([...lignes, { libelleJours: '', ouverture: '', fermeture: '' }]);
  }

  return (
    <Stack spacing={1.5}>
      {lignes.map((ligne, index) => (
        <Stack key={index} direction="row" spacing={1} alignItems="center">
          <TextField
            label="Jours"
            value={ligne.libelleJours || ''}
            onChange={(e) => updateLigne(index, { libelleJours: e.target.value })}
            size="small"
            fullWidth
          />
          <TextField
            label="Ouverture"
            value={ligne.ouverture || ''}
            onChange={(e) => updateLigne(index, { ouverture: e.target.value })}
            size="small"
            sx={{ width: 100 }}
            placeholder="10:00"
          />
          <TextField
            label="Fermeture"
            value={ligne.fermeture || ''}
            onChange={(e) => updateLigne(index, { fermeture: e.target.value })}
            size="small"
            sx={{ width: 100 }}
            placeholder="19:00"
          />
          <IconButton size="small" color="error" onClick={() => removeLigne(index)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addLigne}>
        Ajouter une ligne
      </Button>
    </Stack>
  );
}

export function EncadreForm({ props, onChange }) {
  function set(patch) {
    onChange({ ...props, ...patch });
  }
  return (
    <Stack spacing={1.5}>
      <TextField label="Texte" value={props.texte || ''} onChange={(e) => set({ texte: e.target.value })} fullWidth size="small" multiline />
      <TextField label="Lien" value={props.lien || ''} onChange={(e) => set({ lien: e.target.value })} fullWidth size="small" />
      <TextField select label="Style" value={props.style || 'contour'} onChange={(e) => set({ style: e.target.value })} size="small">
        <MenuItem value="contour">Contour</MenuItem>
        <MenuItem value="plein">Plein</MenuItem>
      </TextField>
    </Stack>
  );
}

export function ImageBlockForm({ props, onChange, eventId }) {
  return (
    <Stack spacing={1.5}>
      <BlockImagePicker label="Image" eventId={eventId} imageId={props.imageId} onChange={(id) => onChange({ ...props, imageId: id })} />
      <TextField
        label="Hauteur (mm)"
        type="number"
        value={props.hauteurMm ?? 20}
        onChange={(e) => onChange({ ...props, hauteurMm: Number(e.target.value) })}
        size="small"
      />
    </Stack>
  );
}

function usePartenaireOptions() {
  const organisateurId = getSelectedOrganisateurId();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    axiosClient
      .get(`/admin/organisateurs/${organisateurId}/partenaires`, { params: { limit: 100 } })
      .then(({ data }) => setOptions(data.items.map((p) => ({ id: p._id, label: p.nom }))))
      .catch(() => setOptions([]));
  }, [organisateurId]);

  return options;
}

export function GroupePartenairesForm({ props, onChange }) {
  const options = usePartenaireOptions();
  function set(patch) {
    onChange({ ...props, ...patch });
  }

  const selected = (props.partenaires || [])
    .map((p) => options.find((o) => o.id === String(p.partenaireId)))
    .filter(Boolean);

  return (
    <Stack spacing={1.5}>
      <TextField label="Titre" value={props.titre || ''} onChange={(e) => set({ titre: e.target.value })} fullWidth size="small" />
      <TextField
        select
        label="Colonnes"
        value={props.colonnes || 3}
        onChange={(e) => set({ colonnes: Number(e.target.value) })}
        size="small"
      >
        <MenuItem value={2}>2</MenuItem>
        <MenuItem value={3}>3</MenuItem>
        <MenuItem value={4}>4</MenuItem>
      </TextField>
      <TextField
        select
        label="Taille des logos"
        value={props.tailleLogos || 'M'}
        onChange={(e) => set({ tailleLogos: e.target.value })}
        size="small"
      >
        <MenuItem value="S">S</MenuItem>
        <MenuItem value="M">M</MenuItem>
        <MenuItem value="L">L</MenuItem>
      </TextField>
      <Autocomplete
        multiple
        size="small"
        options={options}
        value={selected}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onChange={(_e, newValue) => set({ partenaires: newValue.map((v) => ({ partenaireId: v.id })) })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => <Chip label={option.label} size="small" {...getTagProps({ index })} key={option.id} />)
        }
        renderInput={(params) => <TextField {...params} label="Partenaires" placeholder="Rechercher..." />}
      />
    </Stack>
  );
}

export function EncartPromoForm({ props, onChange }) {
  const options = usePartenaireOptions();
  function set(patch) {
    onChange({ ...props, ...patch });
  }
  const selected = options.find((o) => o.id === String(props.partenaireId)) || null;

  return (
    <Stack spacing={1.5}>
      <TextField label="Titre" value={props.titre || ''} onChange={(e) => set({ titre: e.target.value })} fullWidth size="small" />
      <TextField label="Pastille (ex: -30%)" value={props.pastille || ''} onChange={(e) => set({ pastille: e.target.value })} size="small" />
      <TextField label="Texte" value={props.texte || ''} onChange={(e) => set({ texte: e.target.value })} fullWidth size="small" multiline />
      <TextField
        label="Couleur (hex)"
        value={props.couleur || '#e8732c'}
        onChange={(e) => set({ couleur: e.target.value })}
        size="small"
        placeholder="#e8732c"
      />
      <Autocomplete
        size="small"
        options={options}
        value={selected}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onChange={(_e, newValue) => set({ partenaireId: newValue?.id || null })}
        renderInput={(params) => <TextField {...params} label="Logo partenaire (optionnel)" />}
      />
    </Stack>
  );
}

export function SiteEtReseauxForm({ props, onChange }) {
  function set(patch) {
    onChange({ ...props, ...patch });
  }
  return (
    <Stack spacing={1.5}>
      <TextField label="Site web" value={props.siteWeb || ''} onChange={(e) => set({ siteWeb: e.target.value })} fullWidth size="small" />
      <TextField label="Facebook" value={props.facebook || ''} onChange={(e) => set({ facebook: e.target.value })} fullWidth size="small" />
      <TextField label="Instagram" value={props.instagram || ''} onChange={(e) => set({ instagram: e.target.value })} fullWidth size="small" />
      <TextField label="LinkedIn" value={props.linkedin || ''} onChange={(e) => set({ linkedin: e.target.value })} fullWidth size="small" />
      <TextField label="YouTube" value={props.youtube || ''} onChange={(e) => set({ youtube: e.target.value })} fullWidth size="small" />
      <TextField label="X (Twitter)" value={props.x || ''} onChange={(e) => set({ x: e.target.value })} fullWidth size="small" />
    </Stack>
  );
}

export function SeparateurForm({ props, onChange }) {
  return (
    <TextField
      select
      label="Style"
      value={props.style || 'ligne'}
      onChange={(e) => onChange({ ...props, style: e.target.value })}
      fullWidth
      size="small"
    >
      <MenuItem value="ligne">Ligne</MenuItem>
      <MenuItem value="espace">Espace</MenuItem>
    </TextField>
  );
}

export function EmptyForm() {
  return (
    <Typography variant="body2" color="text.secondary">
      Ce bloc n'a pas d'options.
    </Typography>
  );
}

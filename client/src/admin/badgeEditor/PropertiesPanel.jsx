import { useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { ALLOWED_FONTS, listTextVariables, resolveToken } from '../../../../shared/badge-renderer/index.js';
import { CHAMP_OPTIONS, ELEMENT_CATALOG, ICON_OPTIONS, elementLabel } from './elementCatalog.js';
import { activePanels } from './geometry.js';
import { ImagePickerField } from './ImagePickerField.jsx';
import { ColorField as SharedColorField, useBrandKitColors } from '../../components/form/index.js';

const TOKENS = [
  { value: 'principale', label: 'Principale' },
  { value: 'secondaire', label: 'Secondaire' },
  { value: 'accent', label: 'Accent' },
  { value: 'texte', label: 'Texte' },
  { value: 'categorie', label: 'Catégorie' },
  { value: 'blanc', label: 'Blanc' },
  { value: 'noir', label: 'Noir' },
];

const VARIABLE_LABELS = {
  'participant.nomPrenom': 'Nom et prénom',
  'participant.fonction': 'Fonction',
  'participant.organisme': 'Organisme',
  'participant.categorie': 'Catégorie',
  'event.titre': "Titre de l'événement",
  'event.dateDebut': 'Date de début',
  'event.dateFin': 'Date de fin',
  'event.dates': 'Dates',
  'event.nbJours': 'Nombre de jours',
  'event.lieu': 'Lieu',
  'organisateur.nom': "Nom de l'organisateur",
  'organisateur.siteWeb': "Site web de l'organisateur",
};

/**
 * Number input that lets you clear it and type freely: only a complete,
 * in-range number is applied; on blur it shows the element's real value
 * again. (Applying every keystroke turned an empty field into 1 mm.)
 */
function NumberField({ label, value, onChange, step = 0.5, min, max, suffix }) {
  const [draft, setDraft] = useState(null);
  const inRange = (n) => Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max);
  return (
    <TextField
      label={label}
      type="number"
      size="small"
      value={draft ?? value ?? ''}
      error={draft !== null && draft !== '' && !inRange(parseFloat(draft))}
      slotProps={{
        htmlInput: { step, min, max },
        input: suffix ? { endAdornment: <Typography variant="caption">{suffix}</Typography> } : undefined,
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseFloat(e.target.value);
        if (inRange(n)) onChange(n);
      }}
      onBlur={() => setDraft(null)}
      fullWidth
    />
  );
}

const CATEGORY_SWATCH = 'linear-gradient(135deg,#e03131,#2f9e44,#1971c2)';

/** Shared ColorField with the badge theme tokens and the organisateur's brand kit. */
function ColorField({ label, value, onChange, theme, allowNone }) {
  const brandColors = useBrandKitColors();
  const tokens = TOKENS.map((t) => ({ ...t, color: t.value === 'categorie' ? CATEGORY_SWATCH : resolveToken(t.value, theme) }));
  return <SharedColorField label={label} value={value} onChange={onChange} tokens={tokens} presets={brandColors} allowNone={allowNone} />;
}

function VariableMenu({ onInsert }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <Button size="small" startIcon={<DataObjectIcon />} onClick={(e) => setAnchor(e.currentTarget)}>
        Insérer une variable
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {listTextVariables().map((v) => (
          <MenuItem
            key={v}
            dense
            onClick={() => {
              onInsert(`{{${v}}}`);
              setAnchor(null);
            }}
          >
            {VARIABLE_LABELS[v] || v}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function TypeProps({ el, onProps, eventId, context }) {
  const p = el.props || {};
  switch (el.type) {
    case 'texte':
      return (
        <Stack spacing={1}>
          <TextField
            label="Contenu"
            multiline
            minRows={3}
            size="small"
            value={p.contenu || ''}
            onChange={(e) => onProps({ contenu: e.target.value })}
            helperText="Les variables {{…}} sont remplacées par les données de chaque participant."
            fullWidth
          />
          <VariableMenu onInsert={(token) => onProps({ contenu: `${p.contenu || ''}${token}` })} />
        </Stack>
      );
    case 'champ':
      return (
        <Stack spacing={1}>
          <TextField select size="small" label="Champ" value={p.champ || 'nomPrenom'} onChange={(e) => onProps({ champ: e.target.value })}>
            {CHAMP_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          {p.champ === 'nomPrenom' && (
            <TextField select size="small" label="Ordre" value={p.formatNom || 'Prénom NOM'} onChange={(e) => onProps({ formatNom: e.target.value })}>
              <MenuItem value="Prénom NOM">Prénom NOM</MenuItem>
              <MenuItem value="NOM Prénom">NOM Prénom</MenuItem>
            </TextField>
          )}
        </Stack>
      );
    case 'qrCode':
      return (
        <TextField
          select
          size="small"
          label="Niveau de correction"
          value={p.niveauCorrection || 'M'}
          onChange={(e) => onProps({ niveauCorrection: e.target.value })}
        >
          {['L', 'M', 'Q', 'H'].map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      );
    case 'photo':
      return (
        <Stack spacing={1}>
          <TextField select size="small" label="Forme" value={p.forme || 'rond'} onChange={(e) => onProps({ forme: e.target.value })}>
            <MenuItem value="rond">Rond</MenuItem>
            <MenuItem value="carre">Carré</MenuItem>
            <MenuItem value="arrondi">Arrondi</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Switch size="small" checked={!!p.placeholder} onChange={(e) => onProps({ placeholder: e.target.checked })} />}
            label="Afficher un fond gris si pas de photo"
          />
        </Stack>
      );
    case 'image':
      return (
        <Stack spacing={1}>
          <ImagePickerField eventId={eventId} imageId={p.imageId} onChange={(imageId) => onProps({ imageId })} />
          <TextField select size="small" label="Ajustement" value={p.ajustement || 'contain'} onChange={(e) => onProps({ ajustement: e.target.value })}>
            <MenuItem value="contain">Contenir</MenuItem>
            <MenuItem value="cover">Remplir (recadrer)</MenuItem>
          </TextField>
        </Stack>
      );
    case 'forme':
      return (
        <TextField select size="small" label="Forme" value={p.forme || 'rectangle'} onChange={(e) => onProps({ forme: e.target.value })}>
          <MenuItem value="rectangle">Rectangle</MenuItem>
          <MenuItem value="pilule">Pilule</MenuItem>
          <MenuItem value="cercle">Cercle</MenuItem>
          <MenuItem value="ligne">Ligne</MenuItem>
        </TextField>
      );
    case 'bandeCategorie':
      return (
        <TextField
          size="small"
          label="Texte (vide = nom de la catégorie)"
          value={p.texte === 'auto' ? '' : p.texte || ''}
          onChange={(e) => onProps({ texte: e.target.value || 'auto' })}
          fullWidth
        />
      );
    case 'icone':
      return (
        <TextField select size="small" label="Icône" value={p.icone || 'info'} onChange={(e) => onProps({ icone: e.target.value })}>
          {ICON_OPTIONS.map((i) => (
            <MenuItem key={i} value={i}>
              {i}
            </MenuItem>
          ))}
        </TextField>
      );
    case 'dates':
      return (
        <TextField select size="small" label="Format" value={p.format || 'long'} onChange={(e) => onProps({ format: e.target.value })}>
          <MenuItem value="long">Long (14 septembre 2026)</MenuItem>
          <MenuItem value="court">Court (14 sept.)</MenuItem>
        </TextField>
      );
    case 'grillePartenaires': {
      const options = (context?.partenaires || []).map((pt) => ({ id: String(pt._id), label: pt.nom }));
      const selected = (p.partenaires || []).map((x) => options.find((o) => o.id === String(x.partenaireId))).filter(Boolean);
      return (
        <Stack spacing={1}>
          <Autocomplete
            multiple
            size="small"
            options={options}
            value={selected}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_e, value) => onProps({ partenaires: value.map((v, ordre) => ({ partenaireId: v.id, ordre })) })}
            renderInput={(params) => <TextField {...params} label="Partenaires" placeholder="Rechercher…" />}
          />
          <Typography variant="caption" color="text.secondary">
            L'ordre de sélection est l'ordre d'affichage. Les logos rétrécissent pour tenir dans le cadre.
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField select size="small" label="Colonnes" value={p.colonnes || 3} onChange={(e) => onProps({ colonnes: Number(e.target.value) })} fullWidth>
              {[2, 3, 4, 5].map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <NumberField label="Espacement" suffix="mm" value={p.espacementMm ?? 2} onChange={(v) => onProps({ espacementMm: v ?? 0 })} />
          </Stack>
        </Stack>
      );
    }
    default:
      return (
        <Typography variant="body2" color="text.secondary">
          {el.type === 'logoOrganisateur'
            ? "Utilise le logo de l'organisateur."
            : el.type === 'logoOrganisme'
              ? "Utilise le logo de l'organisme du participant (masqué s'il n'en a pas)."
              : 'Aucune option.'}
        </Typography>
      );
  }
}

const TEXT_TYPES = new Set(['texte', 'champ', 'dates', 'bandeCategorie']);

function StyleSection({ el, onStyle, theme }) {
  const s = el.style || {};
  const isText = TEXT_TYPES.has(el.type);
  return (
    <Stack spacing={1.5}>
      {isText && (
        <>
          <TextField select size="small" label="Police" value={s.police || ''} onChange={(e) => onStyle({ police: e.target.value || undefined })}>
            <MenuItem value="">Police du thème</MenuItem>
            {ALLOWED_FONTS.map((f) => (
              <MenuItem key={f} value={f} sx={{ fontFamily: f }}>
                {f}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <NumberField label="Taille max" suffix="pt" value={s.tailleMax ?? 14} onChange={(v) => onStyle({ tailleMax: v })} min={4} max={96} />
            <NumberField label="Taille min" suffix="pt" value={s.tailleMin ?? 6} onChange={(v) => onStyle({ tailleMin: v })} min={6} max={96} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <NumberField label="Lignes max" value={s.lignesMax ?? 1} step={1} onChange={(v) => onStyle({ lignesMax: v ? Math.round(v) : undefined })} min={1} max={20} />
            <NumberField label="Interligne" value={s.interligne ?? 1.2} step={0.1} onChange={(v) => onStyle({ interligne: v })} min={0.5} max={3} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField select size="small" label="Graisse" value={s.graisse || 400} onChange={(e) => onStyle({ graisse: Number(e.target.value) })} fullWidth>
              {[400, 500, 600, 700, 800].map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </TextField>
            <NumberField label="Espacement lettres" suffix="px" value={s.espacementLettres ?? 0} step={0.5} onChange={(v) => onStyle({ espacementLettres: v })} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <FormControlLabel control={<Switch size="small" checked={!!s.italique} onChange={(e) => onStyle({ italique: e.target.checked })} />} label="Italique" />
            <FormControlLabel control={<Switch size="small" checked={!!s.majuscules} onChange={(e) => onStyle({ majuscules: e.target.checked })} />} label="Majuscules" />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {[
              ['gauche', FormatAlignLeftIcon],
              ['centre', FormatAlignCenterIcon],
              ['droite', FormatAlignRightIcon],
            ].map(([v, Icon]) => (
              <IconButton key={v} size="small" color={(s.alignH || 'gauche') === v ? 'primary' : 'default'} onClick={() => onStyle({ alignH: v })}>
                <Icon fontSize="small" />
              </IconButton>
            ))}
            <Divider orientation="vertical" flexItem />
            {[
              ['haut', VerticalAlignTopIcon],
              ['milieu', VerticalAlignCenterIcon],
              ['bas', VerticalAlignBottomIcon],
            ].map(([v, Icon]) => (
              <IconButton key={v} size="small" color={(s.alignV || 'haut') === v ? 'primary' : 'default'} onClick={() => onStyle({ alignV: v })}>
                <Icon fontSize="small" />
              </IconButton>
            ))}
          </Stack>
          <TextField select size="small" label="Sens d'écriture" value={s.dir || 'auto'} onChange={(e) => onStyle({ dir: e.target.value })}>
            <MenuItem value="auto">Automatique</MenuItem>
            <MenuItem value="ltr">Gauche → droite</MenuItem>
            <MenuItem value="rtl">Droite → gauche (arabe)</MenuItem>
          </TextField>
          <ColorField label="Couleur du texte" value={s.couleur} onChange={(v) => onStyle({ couleur: v })} theme={theme} />
        </>
      )}
      <ColorField label="Fond" value={s.fond} onChange={(v) => onStyle({ fond: v, degrade: null })} theme={theme} allowNone />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={!!s.degrade}
            onChange={(e) => onStyle({ degrade: e.target.checked ? { de: 'secondaire', vers: 'blanc', angle: 135 } : null })}
          />
        }
        label="Dégradé"
      />
      {s.degrade && (
        <Stack spacing={1}>
          <ColorField label="Dégradé — de" value={s.degrade.de} onChange={(v) => onStyle({ degrade: { ...s.degrade, de: v } })} theme={theme} />
          <ColorField label="Dégradé — vers" value={s.degrade.vers} onChange={(v) => onStyle({ degrade: { ...s.degrade, vers: v } })} theme={theme} />
          <NumberField label="Angle" suffix="°" step={15} value={s.degrade.angle} onChange={(v) => onStyle({ degrade: { ...s.degrade, angle: v ?? 0 } })} />
        </Stack>
      )}
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={!!s.bordure}
            onChange={(e) => onStyle({ bordure: e.target.checked ? { couleur: 'principale', epaisseurMm: 0.4 } : null })}
          />
        }
        label="Bordure"
      />
      {s.bordure && (
        <Stack spacing={1}>
          <ColorField label="Couleur de bordure" value={s.bordure.couleur} onChange={(v) => onStyle({ bordure: { ...s.bordure, couleur: v } })} theme={theme} />
          <NumberField label="Épaisseur" suffix="mm" step={0.1} value={s.bordure.epaisseurMm} onChange={(v) => onStyle({ bordure: { ...s.bordure, epaisseurMm: v ?? 0 } })} />
        </Stack>
      )}
      <Stack direction="row" spacing={1}>
        <NumberField label="Arrondi" suffix="mm" value={s.rayonMm ?? 0} onChange={(v) => onStyle({ rayonMm: v })} min={0} />
        <NumberField label="Marge intérieure" suffix="mm" value={s.paddingMm ?? 0} onChange={(v) => onStyle({ paddingMm: v })} min={0} />
      </Stack>
      <NumberField label="Opacité (0 à 1)" step={0.05} value={s.opacite ?? 1} onChange={(v) => onStyle({ opacite: v })} min={0} max={1} />
    </Stack>
  );
}

function ThemeColorField({ label, value, onChange }) {
  const brandColors = useBrandKitColors();
  return <SharedColorField label={label} value={value} onChange={onChange} presets={brandColors} />;
}

function ThemeSection({ theme, onTheme }) {
  const colors = [
    ['couleurPrincipale', 'Principale'],
    ['couleurSecondaire', 'Secondaire'],
    ['couleurAccent', 'Accent'],
    ['couleurTexte', 'Texte'],
  ];
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Thème du badge</Typography>
      <Typography variant="body2" color="text.secondary">
        Sélectionnez un élément pour le modifier. Les couleurs du thème recolorent tous les éléments qui les utilisent.
      </Typography>
      {colors.map(([key, label]) => (
        <ThemeColorField key={key} label={label} value={theme[key]} onChange={(v) => onTheme({ [key]: v })} />
      ))}
      {[
        ['policeTitres', 'Police des titres'],
        ['policeTexte', 'Police du texte'],
        ['policeNom', 'Police du nom'],
      ].map(([key, label]) => (
        <TextField key={key} select size="small" label={label} value={theme[key] || ''} onChange={(e) => onTheme({ [key]: e.target.value })}>
          {ALLOWED_FONTS.map((f) => (
            <MenuItem key={f} value={f} sx={{ fontFamily: f }}>
              {f}
            </MenuItem>
          ))}
        </TextField>
      ))}
    </Stack>
  );
}

export function PropertiesPanel({ badge, selected, theme, context, eventId, onChangeElement, onTheme }) {
  if (selected.length === 0) {
    return <ThemeSection theme={theme} onTheme={onTheme} />;
  }
  if (selected.length > 1) {
    return (
      <Typography variant="body2" color="text.secondary">
        {selected.length} éléments sélectionnés. Utilisez la barre d'outils pour les aligner, les répartir ou les grouper.
      </Typography>
    );
  }

  const el = selected[0];
  const change = (patch, mergeKey) => onChangeElement(el.id, patch, mergeKey);
  const catalog = ELEMENT_CATALOG[el.type] || {};
  const categories = context?.categories || [];
  const visibleIds = el.visibleSi?.categories || [];

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {catalog.icon && <catalog.icon fontSize="small" color="action" />}
        <Typography variant="subtitle2">{catalog.label || el.type}</Typography>
      </Stack>
      <TextField
        size="small"
        label="Nom du calque"
        value={el.nom || ''}
        placeholder={elementLabel({ ...el, nom: '' })}
        onChange={(e) => change({ nom: e.target.value || undefined }, `${el.id}:nom`)}
      />

      <Typography variant="caption" color="text.secondary">
        Position et taille
      </Typography>
      <Stack direction="row" spacing={1}>
        <NumberField label="X" suffix="mm" value={el.x} onChange={(v) => change({ x: v ?? 0 }, `${el.id}:x`)} />
        <NumberField label="Y" suffix="mm" value={el.y} onChange={(v) => change({ y: v ?? 0 }, `${el.id}:y`)} />
      </Stack>
      <Stack direction="row" spacing={1}>
        <NumberField
          label="Largeur"
          suffix="mm"
          value={el.largeur}
          min={1}
          onChange={(v) => change(catalog.keepRatio ? { largeur: v ?? 1, hauteur: v ?? 1 } : { largeur: v ?? 1 }, `${el.id}:w`)}
        />
        <NumberField
          label="Hauteur"
          suffix="mm"
          value={el.hauteur}
          min={1}
          onChange={(v) => change(catalog.keepRatio ? { largeur: v ?? 1, hauteur: v ?? 1 } : { hauteur: v ?? 1 }, `${el.id}:h`)}
        />
      </Stack>
      <Stack direction="row" spacing={1}>
        {catalog.rotation === 'none' ? (
          <TextField size="small" label="Rotation" value="0° (fixe)" disabled fullWidth />
        ) : catalog.rotation === 'quarter' ? (
          <TextField select size="small" label="Rotation" value={el.rotation || 0} onChange={(e) => change({ rotation: Number(e.target.value) })} fullWidth>
            {[0, 90, 180, 270].map((r) => (
              <MenuItem key={r} value={r}>
                {r}°
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <NumberField label="Rotation" suffix="°" step={15} value={el.rotation || 0} onChange={(v) => change({ rotation: v ?? 0 }, `${el.id}:r`)} />
        )}
        {activePanels(badge).length > 1 && (
          <TextField select size="small" label="Panneau" value={el.panneau} onChange={(e) => change({ panneau: e.target.value })} fullWidth>
            {activePanels(badge).map((k) => (
              <MenuItem key={k} value={k}>
                {k}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      <Divider />
      <TypeProps el={el} eventId={eventId} context={context} onProps={(patch) => change({ props: { ...el.props, ...patch } }, `${el.id}:props`)} />

      <Divider />
      <Typography variant="caption" color="text.secondary">
        Style
      </Typography>
      <StyleSection el={el} theme={theme} onStyle={(patch) => change({ style: { ...el.style, ...patch } }, `${el.id}:style`)} />

      <Divider />
      <Autocomplete
        multiple
        size="small"
        options={categories.map((c) => ({ id: String(c._id), label: c.nom }))}
        value={categories.filter((c) => visibleIds.includes(String(c._id))).map((c) => ({ id: String(c._id), label: c.nom }))}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onChange={(_e, value) => change({ visibleSi: value.length ? { categories: value.map((v) => v.id) } : null })}
        renderInput={(params) => <TextField {...params} label="Visible seulement pour…" placeholder="Toutes les catégories" />}
      />
    </Stack>
  );
}

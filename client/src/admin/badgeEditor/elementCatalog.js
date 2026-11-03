import TextFieldsIcon from '@mui/icons-material/TextFields';
import PersonIcon from '@mui/icons-material/Person';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import FaceIcon from '@mui/icons-material/Face';
import ImageIcon from '@mui/icons-material/Image';
import BusinessIcon from '@mui/icons-material/Business';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import LabelIcon from '@mui/icons-material/Label';
import EmojiSymbolsIcon from '@mui/icons-material/EmojiSymbols';
import HandshakeIcon from '@mui/icons-material/Handshake';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { getDefaultProps, getDefaultSizeMm, nanoid } from '../../../../shared/badge-renderer/index.js';
import { placeNewElement } from './placement.js';

/**
 * UI metadata per element type. `rotation`: 'free' (15° snap, Shift = free),
 * 'quarter' (0/90/180/270 only — dynamic text, Addendum 3 v2 §3) or 'none'
 * (QR code). `keepRatio` locks the aspect ratio while resizing.
 */
export const ELEMENT_CATALOG = {
  texte: { label: 'Texte', icon: TextFieldsIcon, rotation: 'free' },
  champ: { label: 'Champ participant', icon: PersonIcon, rotation: 'quarter' },
  qrCode: { label: 'QR code', icon: QrCode2Icon, rotation: 'none', keepRatio: true },
  photo: { label: 'Photo', icon: FaceIcon, rotation: 'free', keepRatio: true },
  image: { label: 'Image', icon: ImageIcon, rotation: 'free' },
  logoOrganisateur: { label: 'Logo organisateur', icon: BusinessIcon, rotation: 'free' },
  logoOrganisme: { label: 'Logo organisme', icon: ApartmentIcon, rotation: 'free' },
  forme: { label: 'Forme', icon: CropSquareIcon, rotation: 'free' },
  bandeCategorie: { label: 'Bande catégorie', icon: LabelIcon, rotation: 'quarter' },
  icone: { label: 'Icône', icon: EmojiSymbolsIcon, rotation: 'free', keepRatio: true },
  grillePartenaires: { label: 'Partenaires', icon: HandshakeIcon, rotation: 'none' },
  dates: { label: 'Dates', icon: DateRangeIcon, rotation: 'quarter' },
};

export const CHAMP_OPTIONS = [
  { value: 'nomPrenom', label: 'Nom et prénom' },
  { value: 'nom', label: 'Nom' },
  { value: 'prenom', label: 'Prénom' },
  { value: 'fonction', label: 'Fonction' },
  { value: 'organisme', label: 'Organisme' },
  { value: 'categorie', label: 'Catégorie' },
  { value: 'civilite', label: 'Civilité' },
  { value: 'email', label: 'Email' },
  { value: 'telephone', label: 'Téléphone' },
];

const DEFAULT_STYLES = {
  texte: { tailleMax: 10, tailleMin: 6, lignesMax: 3, alignV: 'haut' },
  champ: { tailleMax: 12, tailleMin: 7, lignesMax: 1, alignH: 'centre', alignV: 'milieu' },
  dates: { tailleMax: 9, tailleMin: 6, lignesMax: 1, alignV: 'milieu' },
  forme: { fond: 'principale' },
  bandeCategorie: {
    fond: 'categorie',
    couleur: 'blanc',
    graisse: 700,
    majuscules: true,
    alignH: 'centre',
    alignV: 'milieu',
    tailleMax: 12,
    tailleMin: 7,
  },
  icone: { couleur: 'principale', alignH: 'centre', alignV: 'milieu' },
};

export function elementLabel(el) {
  if (el.nom) return el.nom;
  if (el.type === 'champ') {
    return CHAMP_OPTIONS.find((o) => o.value === el.props?.champ)?.label || 'Champ';
  }
  if (el.type === 'texte' && el.props?.contenu) {
    // Show variables by their field name ({{event.titre}} → ‹titre›).
    const text = el.props.contenu.replace(/\{\{[a-zA-Z]+\.([a-zA-Z]+)\}\}/g, '‹$1›');
    return text.length > 28 ? `${text.slice(0, 28)}…` : text;
  }
  return ELEMENT_CATALOG[el.type]?.label || el.type;
}

/**
 * A new element on top of everything else, placed by placeNewElement:
 * centred in the panel's safe zone (or on `at`, a drop point), cascaded
 * if that spot is taken, scaled down if bigger than the panel.
 */
export function createElement(type, { badge, panneau, elements, props, at }) {
  const geometry = placeNewElement({
    badge,
    panneau,
    elements,
    size: getDefaultSizeMm(type),
    at,
    fullWidth: type === 'bandeCategorie',
  });
  const maxZ = elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0);

  return {
    id: nanoid(),
    type,
    panneau,
    ...geometry,
    rotation: 0,
    z: maxZ + 1,
    verrouille: false,
    masque: false,
    groupeId: null,
    visibleSi: null,
    props: { ...getDefaultProps(type), ...(props || {}) },
    style: { ...(DEFAULT_STYLES[type] || {}) },
  };
}

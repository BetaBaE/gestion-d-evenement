import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import ApartmentIcon from '@mui/icons-material/Apartment';
import FaceIcon from '@mui/icons-material/Face';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LabelIcon from '@mui/icons-material/Label';
import BadgeIcon from '@mui/icons-material/Badge';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import SmartButtonIcon from '@mui/icons-material/SmartButton';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ImageIcon from '@mui/icons-material/Image';
import TitleIcon from '@mui/icons-material/Title';
import NotesIcon from '@mui/icons-material/Notes';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LanguageIcon from '@mui/icons-material/Language';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';

/**
 * Palette metadata (label, icon, category) for every block type the shared
 * renderer knows how to render. This file is UI-only (MUI icons, French
 * labels) — the renderer itself (shared/badge-renderer) has no idea this
 * exists, it only cares about type/props/style.
 */
export const BLOCK_CATEGORIES = [
  { key: 'participant', label: 'Participant' },
  { key: 'evenement', label: 'Événement' },
  { key: 'contenu', label: 'Contenu' },
];

export const BLOCK_CATALOG = {
  nomPrenom: { label: 'Nom et prénom', icon: PersonIcon, category: 'participant' },
  fonction: { label: 'Fonction', icon: WorkIcon, category: 'participant' },
  organisme: { label: 'Organisme', icon: ApartmentIcon, category: 'participant' },
  photo: { label: 'Photo', icon: FaceIcon, category: 'participant' },
  qrCode: { label: 'QR code', icon: QrCode2Icon, category: 'participant' },
  bandeCategorie: { label: 'Bande de catégorie', icon: LabelIcon, category: 'participant' },
  champParticipant: { label: 'Champ participant', icon: BadgeIcon, category: 'participant' },

  enteteEvenement: { label: "En-tête de l'événement", icon: ViewHeadlineIcon, category: 'evenement' },
  enteteCompact: { label: 'En-tête compact', icon: SmartButtonIcon, category: 'evenement' },
  datesEvenement: { label: "Dates de l'événement", icon: DateRangeIcon, category: 'evenement' },
  logoOrganisateur: { label: "Logo de l'organisateur", icon: ImageIcon, category: 'evenement' },

  titrePilule: { label: 'Titre (pilule)', icon: TitleIcon, category: 'contenu' },
  texte: { label: 'Texte', icon: NotesIcon, category: 'contenu' },
  listeInfos: { label: "Liste d'informations", icon: ListAltIcon, category: 'contenu' },
  horaires: { label: 'Horaires', icon: AccessTimeIcon, category: 'contenu' },
  encadre: { label: 'Encadré', icon: CropSquareIcon, category: 'contenu' },
  image: { label: 'Image', icon: PhotoLibraryIcon, category: 'contenu' },
  groupePartenaires: { label: 'Groupe de partenaires', icon: HandshakeIcon, category: 'contenu' },
  encartPromo: { label: 'Encart promo', icon: LocalOfferIcon, category: 'contenu' },
  siteEtReseaux: { label: 'Site et réseaux', icon: LanguageIcon, category: 'contenu' },
  separateur: { label: 'Séparateur', icon: HorizontalRuleIcon, category: 'contenu' },
};

export function blockCatalogEntry(type) {
  return BLOCK_CATALOG[type] || { label: type, icon: CropSquareIcon, category: 'contenu' };
}

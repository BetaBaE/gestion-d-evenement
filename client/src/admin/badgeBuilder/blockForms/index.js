import {
  NomPrenomForm,
  OrganismeForm,
  PhotoForm,
  QrCodeForm,
  BandeCategorieForm,
  ChampParticipantForm,
} from './ParticipantForms.jsx';
import { EnteteEvenementForm, EnteteCompactForm, DatesEvenementForm, LogoOrganisateurForm } from './EvenementForms.jsx';
import {
  TitrePiluleForm,
  TexteForm,
  ListeInfosForm,
  HorairesForm,
  EncadreForm,
  ImageBlockForm,
  GroupePartenairesForm,
  EncartPromoForm,
  SiteEtReseauxForm,
  SeparateurForm,
  EmptyForm,
} from './ContenuForms.jsx';

export const BLOCK_FORM_COMPONENTS = {
  nomPrenom: NomPrenomForm,
  fonction: EmptyForm,
  organisme: OrganismeForm,
  photo: PhotoForm,
  qrCode: QrCodeForm,
  bandeCategorie: BandeCategorieForm,
  champParticipant: ChampParticipantForm,

  enteteEvenement: EnteteEvenementForm,
  enteteCompact: EnteteCompactForm,
  datesEvenement: DatesEvenementForm,
  logoOrganisateur: LogoOrganisateurForm,

  titrePilule: TitrePiluleForm,
  texte: TexteForm,
  listeInfos: ListeInfosForm,
  horaires: HorairesForm,
  encadre: EncadreForm,
  image: ImageBlockForm,
  groupePartenaires: GroupePartenairesForm,
  encartPromo: EncartPromoForm,
  siteEtReseaux: SiteEtReseauxForm,
  separateur: SeparateurForm,
};

export function getBlockFormComponent(type) {
  return BLOCK_FORM_COMPONENTS[type] || EmptyForm;
}

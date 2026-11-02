import { adminImageUrl } from '../../api/imageApi.js';

const SAMPLE_PARTICIPANT = {
  civilite: 'M.',
  nom: 'Dupont',
  prenom: 'Jean',
  fonction: 'Directeur commercial',
  email: 'jean.dupont@exemple.ma',
  telephone: '+212 600 000 000',
  badgeCode: 'APERCU-EXEMPLE',
};

// Used when the event has no real data long enough to stress the layout.
const SYNTHETIC_WORST = {
  nom: 'De La Fontaine-Bennani El Alaoui',
  prenom: 'Marie-Christine Alexandra',
  fonction: 'Directrice Générale Adjointe en charge du Développement International',
  organisme: "Office National des Hydrocarbures et des Mines du Royaume du Maroc",
};

function longest(values) {
  return values.filter(Boolean).reduce((best, v) => (v.length > best.length ? v : best), '');
}

function defaultCategorie(categories) {
  return categories.find((c) => c.isDefault) || categories[0] || { nom: 'Invité', couleur: '#1971c2' };
}

/**
 * Preview subjects for the canvas: "exemple", "pireCas" (longest name,
 * fonction and organisme found in the event, no photo — Addendum 3 v2 §4.3),
 * and every real participant loaded.
 */
export function buildPreviewSubjects({ context, participants }) {
  const categories = context?.categories || [];
  const organismes = context?.organismes || [];
  const organismeById = new Map(organismes.map((o) => [String(o._id), o]));
  const categorieById = new Map(categories.map((c) => [String(c._id), c]));

  const subjects = [
    {
      key: 'exemple',
      label: 'Participant exemple',
      participant: SAMPLE_PARTICIPANT,
      organisme: organismes[0] || { nom: 'Organisme exemple' },
      categorie: defaultCategorie(categories),
    },
  ];

  const longestName = participants.reduce(
    (best, p) => {
      const full = `${p.prenom || ''} ${p.nom || ''}`.trim();
      return full.length > best.full.length ? { full, p } : best;
    },
    { full: '', p: null },
  );
  const worstUsesRealName = longestName.full.length >= `${SYNTHETIC_WORST.prenom} ${SYNTHETIC_WORST.nom}`.length;
  const worstFonction = longest(participants.map((p) => p.fonction));
  const worstOrganisme = longest(organismes.map((o) => o.nom));

  subjects.push({
    key: 'pireCas',
    label: 'Pire cas (textes les plus longs)',
    participant: {
      ...SAMPLE_PARTICIPANT,
      nom: worstUsesRealName ? longestName.p.nom : SYNTHETIC_WORST.nom,
      prenom: worstUsesRealName ? longestName.p.prenom : SYNTHETIC_WORST.prenom,
      fonction: worstFonction.length > SYNTHETIC_WORST.fonction.length ? worstFonction : SYNTHETIC_WORST.fonction,
      badgeCode: 'APERCU-PIRE-CAS',
      photoImageId: null,
    },
    organisme: { nom: worstOrganisme.length > SYNTHETIC_WORST.organisme.length ? worstOrganisme : SYNTHETIC_WORST.organisme },
    categorie: defaultCategorie(categories),
  });

  participants.forEach((p) => {
    subjects.push({
      key: `p:${p.id || p._id}`,
      label: `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Participant',
      participant: p,
      organisme: organismeById.get(String(p.invitedOrganismId)) || null,
      categorie: categorieById.get(String(p.categorieId)) || defaultCategorie(categories),
    });
  });

  return subjects;
}

/**
 * Same asset shape the server builds for Puppeteer, but as authenticated
 * image URLs (the browser has the admin session) instead of data URIs.
 */
export function buildEditorAssets({ elements, context, subject, qrCodeSvg }) {
  const freeImages = {};
  elements
    .filter((el) => el.type === 'image' && el.props?.imageId)
    .forEach((el) => {
      freeImages[String(el.props.imageId)] = adminImageUrl(el.props.imageId);
    });

  const partenaireLogos = {};
  (context?.partenaires || []).forEach((p) => {
    if (p.logoImageId) partenaireLogos[String(p._id)] = adminImageUrl(p.logoImageId);
  });

  const logo = (id) => (id ? adminImageUrl(id) : null);

  return {
    organisateurLogo: logo(context?.organisateur?.logoImageId),
    organismeLogo: logo(subject?.organisme?.logoImageId),
    participantPhoto: logo(subject?.participant?.photoImageId),
    freeImages,
    partenaireLogos,
    qrCodeSvg,
  };
}

import { adminImageUrl } from '../../api/imageApi.js';

function allBlocks(panneaux) {
  return ['P1', 'P2', 'P3', 'P4'].flatMap((key) => panneaux[key]?.blocs || []);
}

function findBlockProps(panneaux, type) {
  return allBlocks(panneaux).find((b) => b.type === type)?.props;
}

/**
 * Client-side counterpart of server/src/services/badgeService.js's
 * buildAssets() — same shape, but authenticated /api/images/:id URLs
 * instead of data URIs (the client has a live session; Puppeteer on the
 * server does not), per Addendum 3 §4.1. Partner logos are resolved from
 * the already-fetched partenaireList rather than a second API round trip.
 */
export function buildClientAssets({ panneaux, organisateur, participant, organisme, partenaireList, qrCodeSvg }) {
  const entete = findBlockProps(panneaux, 'enteteEvenement');
  const enteteCompact = findBlockProps(panneaux, 'enteteCompact');

  const blockImages = {};
  allBlocks(panneaux)
    .filter((b) => b.type === 'image' && b.props?.imageId)
    .forEach((b) => {
      blockImages[String(b.props.imageId)] = adminImageUrl(b.props.imageId);
    });

  const partenaireLogos = {};
  (partenaireList || []).forEach((p) => {
    if (p.logoImageId) partenaireLogos[String(p._id || p.id)] = adminImageUrl(p.logoImageId);
  });

  return {
    enteteBanniere: entete?.banniereImageId ? adminImageUrl(entete.banniereImageId) : null,
    enteteLogo: entete?.logoImageId ? adminImageUrl(entete.logoImageId) : null,
    enteteCompactLogo: enteteCompact?.logoImageId ? adminImageUrl(enteteCompact.logoImageId) : null,
    organisateurLogo: organisateur?.logoImageId ? adminImageUrl(organisateur.logoImageId) : null,
    organismeLogo: organisme?.logoImageId ? adminImageUrl(organisme.logoImageId) : null,
    participantPhoto: participant?.photoImageId ? adminImageUrl(participant.photoImageId) : null,
    blockImages,
    partenaireLogos,
    qrCodeSvg,
  };
}

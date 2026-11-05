/**
 * Fonts bundled with the renderer (./fonts, variable woff2 from Fontsource,
 * SIL Open Font License — OFL-LICENSE.txt): the editor and the PDFs use the
 * same files, so text measures and prints identically everywhere. Without
 * them every family fell back to a system font (a Montserrat name printed in
 * Georgia).
 *
 * fontFaceCss(srcFor) builds the @font-face rules; srcFor(file) returns the
 * URL of a file (data URI on the server, bundled asset URL in the editor).
 */
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const ARABIC = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';

export const FONT_FILES = [
  { family: 'Montserrat', file: 'montserrat-latin-wght-normal.woff2', style: 'normal', weight: '100 900', range: LATIN },
  { family: 'Montserrat', file: 'montserrat-latin-wght-italic.woff2', style: 'italic', weight: '100 900', range: LATIN },
  { family: 'Open Sans', file: 'open-sans-latin-wght-normal.woff2', style: 'normal', weight: '300 800', range: LATIN },
  { family: 'Open Sans', file: 'open-sans-latin-wght-italic.woff2', style: 'italic', weight: '300 800', range: LATIN },
  { family: 'Merriweather', file: 'merriweather-latin-wght-normal.woff2', style: 'normal', weight: '300 900', range: LATIN },
  { family: 'Merriweather', file: 'merriweather-latin-wght-italic.woff2', style: 'italic', weight: '300 900', range: LATIN },
  { family: 'Noto Naskh Arabic', file: 'noto-naskh-arabic-arabic-wght-normal.woff2', style: 'normal', weight: '400 700', range: ARABIC },
];

export const BUNDLED_FONT_FAMILIES = [...new Set(FONT_FILES.map((f) => f.family))];

export function fontFaceCss(srcFor) {
  return FONT_FILES.map(
    (f) =>
      `@font-face{font-family:'${f.family}';font-style:${f.style};font-display:block;font-weight:${f.weight};src:url("${srcFor(f.file)}") format('woff2');unicode-range:${f.range};}`,
  ).join('\n');
}

/** Loads every bundled family (normal + italic, light to bold) before measuring text. */
export function loadBundledFonts(fontSet) {
  const probes = BUNDLED_FONT_FAMILIES.flatMap((family) => [`400 16px "${family}"`, `700 16px "${family}"`, `italic 400 16px "${family}"`]);
  return Promise.all(probes.map((p) => fontSet.load(p).catch(() => []))).then(() => fontSet.ready);
}

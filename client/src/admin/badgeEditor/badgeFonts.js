import { fontFaceCss, loadBundledFonts } from '../../../../shared/badge-renderer/index.js';
import montserrat from '../../../../shared/badge-renderer/fonts/montserrat-latin-wght-normal.woff2?url';
import montserratItalic from '../../../../shared/badge-renderer/fonts/montserrat-latin-wght-italic.woff2?url';
import openSans from '../../../../shared/badge-renderer/fonts/open-sans-latin-wght-normal.woff2?url';
import openSansItalic from '../../../../shared/badge-renderer/fonts/open-sans-latin-wght-italic.woff2?url';
import merriweather from '../../../../shared/badge-renderer/fonts/merriweather-latin-wght-normal.woff2?url';
import merriweatherItalic from '../../../../shared/badge-renderer/fonts/merriweather-latin-wght-italic.woff2?url';
import notoNaskh from '../../../../shared/badge-renderer/fonts/noto-naskh-arabic-arabic-wght-normal.woff2?url';

const URLS = {
  'montserrat-latin-wght-normal.woff2': montserrat,
  'montserrat-latin-wght-italic.woff2': montserratItalic,
  'open-sans-latin-wght-normal.woff2': openSans,
  'open-sans-latin-wght-italic.woff2': openSansItalic,
  'merriweather-latin-wght-normal.woff2': merriweather,
  'merriweather-latin-wght-italic.woff2': merriweatherItalic,
  'noto-naskh-arabic-arabic-wght-normal.woff2': notoNaskh,
};

let loading = null;

/**
 * The badge fonts (same files as the PDFs, shared/badge-renderer/fonts),
 * declared once in the page and loaded before the editor measures text.
 */
export function ensureBadgeFonts() {
  if (!loading) {
    const style = document.createElement('style');
    style.dataset.badgeFonts = '';
    style.textContent = fontFaceCss((file) => URLS[file]);
    document.head.appendChild(style);
    loading = loadBundledFonts(document.fonts);
  }
  return loading;
}

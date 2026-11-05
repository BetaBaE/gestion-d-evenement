import signal from './starters/signal.badge.json' with { type: 'json' };
import gala from './starters/gala.badge.json' with { type: 'json' };
import epure from './starters/epure.badge.json' with { type: 'json' };
import pass from './starters/pass.badge.json' with { type: 'json' };

/**
 * The app's built-in starter templates: .badge.json files (the export
 * format, schemaVersion 1) in ./starters — no template is defined in code.
 * A server test runs each one through the same validation and rules as an
 * import, so a starter can never ship broken.
 *
 * starterKey is stable (stored on templates created from a starter);
 * bump starterVersion when a file changes.
 */
const FILES = [
  { key: 'signal', version: 1, file: signal },
  { key: 'gala', version: 1, file: gala },
  { key: 'epure', version: 1, file: epure },
  { key: 'pass', version: 1, file: pass },
];

const BADGE_FIELDS = ['format', 'carteLargeurMm', 'carteHauteurMm', 'rotationLigneBas180', 'traitsDePliage', 'safeZoneMm', 'panneauxActifs', 'theme', 'elements'];

export const FORMAT_LABELS = { A4_PLIE_4: 'A4 plié', A6: 'A6', CARTE: 'Carte' };

export const STARTER_TEMPLATES = Object.fromEntries(
  FILES.map(({ key, version, file }) => [
    key,
    {
      key,
      starterVersion: version,
      label: file.modele.nom,
      description: file.modele.description || '',
      format: file.modele.format,
      /** A fresh copy of the badge fields (format, panels, theme, elements). */
      build() {
        const copy = structuredClone(file.modele);
        return Object.fromEntries(BADGE_FIELDS.filter((f) => copy[f] !== undefined).map((f) => [f, copy[f]]));
      },
      /** The whole .badge.json, for validation. */
      file: () => structuredClone(file),
    },
  ]),
);

/** Template used when nothing else is chosen (new event without a default template). */
export const DEFAULT_STARTER_KEY = 'signal';

const registry = new Map();

/**
 * Registers an element type (Addendum 3 v2 §3 — free-positioned elements,
 * replacing the old vertical-stack "block" model). No zod here: this
 * package has zero dependencies so it can be imported by both client and
 * server — Node resolves bare specifiers from the importing file's own
 * node_modules, which client/ and server/ don't share, so any dependency
 * would have to be duplicated in both. Simplest to just not have one.
 *
 * `validateProps(props)` returns `{ valid: true, value }` or
 * `{ valid: false, errors: [string, ...] }` — hand-written, not a zod
 * schema. `defaultProps` seeds a freshly-dropped element (along with a
 * default largeur/hauteur in mm — see defaultSizeMm). `render` returns an
 * HTML string for the element's inner content; the caller positions it
 * absolutely and applies its Style via styleToCss.
 */
export function registerElement(type, { validateProps, defaultProps, defaultSizeMm, render }) {
  if (registry.has(type)) {
    throw new Error(`Element type already registered: ${type}`);
  }
  registry.set(type, { type, validateProps, defaultProps, defaultSizeMm, render });
}

export function getElementDefinition(type) {
  const def = registry.get(type);
  if (!def) throw new Error(`Unknown element type: ${type}`);
  return def;
}

export function hasElementType(type) {
  return registry.has(type);
}

export function getDefaultProps(type) {
  return structuredClone(getElementDefinition(type).defaultProps);
}

export function getDefaultSizeMm(type) {
  return structuredClone(getElementDefinition(type).defaultSizeMm || { largeur: 30, hauteur: 10 });
}

export function listElementTypes() {
  return [...registry.keys()];
}

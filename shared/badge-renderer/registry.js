const registry = new Map();

/**
 * Registers a block type. No zod here: this package has zero dependencies
 * so it can be imported by both client and server (Node resolves bare
 * specifiers from the importing file's own node_modules, which the client
 * and server don't share, so any dependency would have to be duplicated in
 * both — simplest to just not have one).
 *
 * `validateProps(props)` returns `{ valid: true, value }` or
 * `{ valid: false, errors: [string, ...] }` — hand-written, not a zod
 * schema. `defaultProps` seeds a freshly-dropped block. `render` returns an
 * HTML string for the block's content (the caller wraps it with the
 * block's style/alignment via blockStyleToCss).
 */
export function registerBlock(type, { validateProps, defaultProps, render }) {
  if (registry.has(type)) {
    throw new Error(`Block type already registered: ${type}`);
  }
  registry.set(type, { type, validateProps, defaultProps, render });
}

export function getBlockDefinition(type) {
  const def = registry.get(type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return def;
}

export function hasBlockType(type) {
  return registry.has(type);
}

export function getDefaultProps(type) {
  return structuredClone(getBlockDefinition(type).defaultProps);
}

export function listBlockTypes() {
  return [...registry.keys()];
}

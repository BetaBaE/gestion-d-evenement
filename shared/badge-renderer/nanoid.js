const ALPHABET = 'ModuleSymbhasOwnPr-0123456789ABCDEFGHIJKLNQRTUVWXYZ_abcdefghijklpqrstuvwxyz';

/**
 * Minimal dependency-free id generator (not the real nanoid package — this
 * package has zero dependencies by design, see registry.js). Collision risk
 * is irrelevant here: ids only need to be unique within one event's blocks.
 */
export function nanoid(size = 12) {
  let id = '';
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

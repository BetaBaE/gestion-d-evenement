/**
 * Badge editor document history (pure, unit tested).
 *
 * The document is { elements, theme, meta }. Every change goes through one
 * action — { type: 'commit', label, apply(doc) → doc, coalesceKey?, selection? }
 * — so element moves, properties, styles, theme, format, panels, layers,
 * lock / hide, rename, group, add / delete are all undoable the same way.
 *
 * - Snapshots are structured clones: a step never shares objects with the
 *   document that follows it, so later edits can't alter history.
 * - Coalescing: changes carrying the same coalesceKey while a gesture is open
 *   form ONE step (a color-picker drag, typing in a field, arrow nudges).
 *   The gesture closes on 'endGesture' (pointer up, blur, Enter, idle), on
 *   another key, on a change without key, and on undo / redo. It is not a
 *   time window between changes: a slow re-render between two picker events
 *   must not split the drag into hundreds of steps.
 * - Each step remembers the selection of its time: undo restores it.
 */

export const HISTORY_LIMIT = 100;

const clone = (value) => structuredClone(value);
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

export function createHistory(doc, selection = []) {
  return { past: [], present: clone(doc), future: [], selection: [...selection], gesture: null };
}

export function historyReducer(state, action) {
  switch (action.type) {
    case 'reset':
      return createHistory(action.doc, action.selection || []);

    case 'select':
      return same(state.selection, action.selection) ? state : { ...state, selection: [...action.selection] };

    case 'commit': {
      const next = action.apply(state.present);
      const selection = action.selection ? [...action.selection] : state.selection;
      if (!next || same(next, state.present)) {
        return action.selection ? { ...state, selection } : state;
      }
      const present = clone(next);
      const key = action.coalesceKey || null;
      if (key && state.gesture?.key === key) {
        return { ...state, present, future: [], selection };
      }
      const step = { doc: state.present, selection: state.selection, label: action.label || 'modification' };
      return {
        past: [...state.past, step].slice(-HISTORY_LIMIT),
        present,
        future: [],
        selection,
        gesture: key ? { key } : null,
      };
    }

    case 'endGesture':
      if (!state.gesture || (action.key && action.key !== state.gesture.key)) return state;
      return { ...state, gesture: null };

    case 'undo': {
      const step = state.past[state.past.length - 1];
      if (!step) return state;
      return {
        past: state.past.slice(0, -1),
        present: step.doc,
        future: [{ doc: state.present, selection: state.selection, label: step.label }, ...state.future],
        selection: step.selection,
        gesture: null,
      };
    }

    case 'redo': {
      const step = state.future[0];
      if (!step) return state;
      return {
        past: [...state.past, { doc: state.present, selection: state.selection, label: step.label }],
        present: step.doc,
        future: state.future.slice(1),
        selection: step.selection,
        gesture: null,
      };
    }

    default:
      return state;
  }
}

/** Name of the step Ctrl+Z / Ctrl+Y would undo / redo ("couleur du texte"). */
export const undoLabel = (state) => state.past[state.past.length - 1]?.label || null;
export const redoLabel = (state) => state.future[0]?.label || null;

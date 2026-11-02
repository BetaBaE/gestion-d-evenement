import { useCallback, useReducer } from 'react';

const MAX_STEPS = 100;
const MERGE_WINDOW_MS = 800;

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return { past: [], present: action.elements, future: [], lastMergeKey: null, lastAt: 0 };
    case 'set': {
      const next = typeof action.updater === 'function' ? action.updater(state.present) : action.updater;
      if (next === state.present) return state;
      const now = Date.now();
      // Typing in a field fires one change per keystroke; fold those into a
      // single undo step when they target the same field in quick succession.
      const merge = action.mergeKey && action.mergeKey === state.lastMergeKey && now - state.lastAt < MERGE_WINDOW_MS;
      const past = merge ? state.past : [...state.past, state.present].slice(-MAX_STEPS);
      return { past, present: next, future: [], lastMergeKey: action.mergeKey || null, lastAt: now };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastMergeKey: null,
        lastAt: 0,
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        lastMergeKey: null,
        lastAt: 0,
      };
    }
    default:
      return state;
  }
}

/**
 * Element-list state with undo/redo. `setElements(updater, mergeKey?)`
 * records a step; `resetElements` replaces history (e.g. after loading).
 */
export function useBadgeHistory(initialElements = []) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initialElements,
    future: [],
    lastMergeKey: null,
    lastAt: 0,
  });

  const setElements = useCallback((updater, mergeKey) => dispatch({ type: 'set', updater, mergeKey }), []);
  const resetElements = useCallback((elements) => dispatch({ type: 'reset', elements }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  return {
    elements: state.present,
    setElements,
    resetElements,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { createHistory, historyReducer, redoLabel, undoLabel } from '../../../../shared/badge-renderer/index.js';

const IDLE_CLOSE_MS = 500;
const EMPTY_DOC = { elements: [], theme: {}, meta: null };

/**
 * The editor's single source of document state ({ elements, theme, meta })
 * and selection, with undo / redo (shared/badge-renderer/editorHistory.js).
 *
 * commit(label, apply, { coalesceKey, selection }) is the only way to change
 * the document. A coalesced gesture (picker drag, typing, nudges) closes on
 * pointer up, blur, Enter or arrow-key release, or after 500 ms without a
 * change — counted from the end of the re-render, not between events.
 */
export function useEditorHistory() {
  const [state, dispatch] = useReducer(historyReducer, EMPTY_DOC, (doc) => createHistory(doc));
  const gestureKey = state.gesture?.key || null;
  // While a pointer is pressed (picker / slider drag) idleness never closes the
  // gesture: pointerup does. A busy main thread (re-fitting every text after a
  // theme change) delays pointer events past any timer.
  const pointerDown = useRef(false);
  const lastCommitAt = useRef(0);
  useEffect(() => {
    const down = () => {
      pointerDown.current = true;
    };
    const up = () => {
      pointerDown.current = false;
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
  }, []);

  // Layout effect: the previous idle timer is cleared at commit time.
  useLayoutEffect(() => {
    if (!gestureKey) return undefined;
    const end = () => dispatch({ type: 'endGesture', key: gestureKey });
    const armedAt = performance.now();
    let frame = 0;
    const timer = setTimeout(() => {
      if (pointerDown.current) return;
      // Checked after the next frame's input events: a change dispatched since
      // the timer was armed means the gesture is still going.
      frame = requestAnimationFrame(() => {
        if (lastCommitAt.current <= armedAt) end();
      });
    }, IDLE_CLOSE_MS);
    // Leaving a text field ends its typing gesture. Other focus moves don't:
    // pressing in the color picker moves the focus into it after its first change.
    const onFocusOut = (e) => {
      const t = e.target;
      if (t?.isContentEditable || t?.tagName === 'TEXTAREA' || t?.tagName === 'INPUT') end();
    };
    const onKeyUp = (e) => {
      if (e.key === 'Enter' || e.key.startsWith('Arrow')) end();
    };
    window.addEventListener('pointerup', end, true);
    window.addEventListener('focusout', onFocusOut, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('focusout', onFocusOut, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
    // A new change in the same gesture produces a new present: restart the idle timer.
  }, [gestureKey, state.present]);

  const commit = useCallback(
    (label, apply, { coalesceKey, selection } = {}) => {
      lastCommitAt.current = performance.now();
      dispatch({ type: 'commit', label, apply, coalesceKey, selection });
    },
    [],
  );
  const select = useCallback((selection) => dispatch({ type: 'select', selection }), []);
  const reset = useCallback((doc) => dispatch({ type: 'reset', doc }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  return useMemo(
    () => ({
      doc: state.present,
      selection: state.selection,
      commit,
      select,
      reset,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undoLabel: undoLabel(state),
      redoLabel: redoLabel(state),
    }),
    [state, commit, select, reset, undo, redo],
  );
}

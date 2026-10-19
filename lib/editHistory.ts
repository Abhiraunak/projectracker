/**
 * Undo and redo, as a pure function (a reducer). Edits made in quick succession with the same key
 * (typing in one cell) are merged into one step, so Undo takes back the whole word, not one letter.
 */

export const HISTORY_LIMIT = 200;
export const MERGE_WINDOW_MS = 1500;

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  lastKey: string | null;
  lastAt: number;
}

export type HistoryAction<T> =
  | { type: "apply"; update: (current: T) => T; key?: string; now: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

export const initialHistory = <T>(value: T): HistoryState<T> => ({ past: [], present: value, future: [], lastKey: null, lastAt: 0 });

export function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  switch (action.type) {
    case "apply": {
      const next = action.update(state.present);
      if (next === state.present) return state; // nothing changed: no undo step
      const merge = !!action.key && action.key === state.lastKey && action.now - state.lastAt < MERGE_WINDOW_MS;
      return {
        past: merge ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [], // a new edit makes the old "redo" path meaningless
        lastKey: action.key ?? null,
        lastAt: action.now,
      };
    }
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (previous === undefined) return state;
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future], lastKey: null, lastAt: 0 };
    }
    case "redo": {
      const next = state.future[0];
      if (next === undefined) return state;
      return { past: [...state.past, state.present], present: next, future: state.future.slice(1), lastKey: null, lastAt: 0 };
    }
    case "reset":
      return initialHistory(action.value);
  }
}

import { useEffect, useState, useRef, useCallback } from "react";

import type { BoardState } from "../types";
import type { Action } from "../actions";

interface State {
  board?: BoardState;
}

export type DispatchFn = (action: Action) => Promise<void>;

export function useRemoteBoard(): [BoardState | undefined, DispatchFn] {
  const [state, setState] = useState<State>({});
  const active = useRef(true);
  const requestId = useRef(0);

  const dispatch: DispatchFn = useCallback(async (action: Action) => {
    const id = ++requestId.current;
    try {
      const newBoard: BoardState = await webviewApi.postMessage(action);
      if (active.current && id === requestId.current) setState({ board: newBoard });
    } catch (error) {
      if (active.current && id === requestId.current) {
        setState({ board: {
          name: "Kanban",
          hiddenTags: [],
          messages: [{
            id: "loadError",
            severity: "error",
            title: "Unable to load the board",
            details: String(error),
            actions: [],
          }],
        } });
      }
    }
  }, []);

  useEffect(() => {
    active.current = true;
    webviewApi.onMessage(() => {
      if (active.current) dispatch({ type: "poll" });
    });
    dispatch({ type: "load" });
    return () => {
      active.current = false;
    };
  }, [dispatch]);

  return [state.board, dispatch];
}

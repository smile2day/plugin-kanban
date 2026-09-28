import type { BoardState } from "../src/types";

const mockSetState = jest.fn();
let mockEffect: () => (() => void);
jest.mock("react", () => ({
  useState: () => [{}, mockSetState],
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: typeof mockEffect) => { mockEffect = effect; },
}));

import { useRemoteBoard } from "../src/gui/hooks";

it("accepts a later refresh after the initial load returned no board", async () => {
  const board: BoardState = { name: "Test board", hiddenTags: [], messages: [], columns: [] };
  const postMessage = jest.fn().mockResolvedValueOnce(undefined).mockResolvedValue(board);
  const onMessage = jest.fn();
  (global as any).webviewApi = { postMessage, onMessage };
  useRemoteBoard();
  const cleanup = mockEffect();
  await Promise.resolve();
  expect(mockSetState).toHaveBeenLastCalledWith({ board: undefined });

  onMessage.mock.calls[0][0]({ message: { type: "refresh" } });
  await Promise.resolve();
  expect(postMessage).toHaveBeenLastCalledWith({ type: "poll" });
  expect(mockSetState).toHaveBeenLastCalledWith({ board });
  cleanup();
  delete (global as any).webviewApi;
});

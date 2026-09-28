const mockJoplin = {
  plugins: { register: jest.fn() },
  settings: { globalValue: jest.fn(async () => "YYYY-MM-DD") },
  views: { panels: {
    create: jest.fn(async () => "panel"),
    onMessage: jest.fn(),
    postMessage: jest.fn(),
    setHtml: jest.fn(),
    addScript: jest.fn(),
    visible: jest.fn(async () => false),
    show: jest.fn(),
    hide: jest.fn(),
  } },
  workspace: {
    onNoteSelectionChange: jest.fn(),
    onNoteChange: jest.fn(),
    selectedNote: jest.fn(async () => null),
  },
};

jest.mock("api", () => ({ __esModule: true, default: mockJoplin }), { virtual: true });
jest.mock("../src/noteData", () => ({
  getConfigNote: jest.fn(async () => ({
    id: "board", title: "Test board", parent_id: "folder",
    body: "```kanban\nfilters:\n  rootNotebookPath: /\ncolumns:\n  - name: Tasks\n    backlog: true\n```",
  })),
  searchNotes: jest.fn(async () => []),
}));

it("refreshes an already mounted panel when a board opens, closes, and reopens", async () => {
  require("../src/index");
  const panels = mockJoplin.views.panels;
  let startupResponse: unknown = "not called";
  panels.addScript.mockImplementation(async (_handle, path) => {
    if (path.endsWith("index.js")) {
      // The webview mounts during startup, before any note is selected.
      const handler = panels.onMessage.mock.calls[0]?.[1];
      expect(handler).toBeDefined();
      startupResponse = await handler({ type: "load" });
    }
  });
  await mockJoplin.plugins.register.mock.calls[0][0].onStart();
  expect(startupResponse).toBeUndefined();

  const selectNote = mockJoplin.workspace.onNoteSelectionChange.mock.calls[0][0];
  const handleMessage = panels.onMessage.mock.calls[0][1];
  for (let attempt = 0; attempt < 2; attempt++) {
    panels.postMessage.mockClear();
    await selectNote({ value: ["board"] });
    expect(panels.postMessage).toHaveBeenCalledWith("panel", { type: "refresh" });
    const state = await handleMessage({ type: "poll" });
    expect(state.name).toBe("Test board");
    expect(state.columns).toEqual([{ name: "Tasks", notes: [] }]);
    await handleMessage({ type: "close" });
  }
  expect(panels.create).toHaveBeenCalledTimes(1);
});

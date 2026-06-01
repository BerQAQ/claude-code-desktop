import { create } from "zustand";

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Task {
  id: string;
  name: string;
  created: string;
  model: string;
  message_count: number;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamBuffer: string;
}

export type LeftTab = "tasks" | "callchain" | "artifacts";
export type RightTab = "explorer" | "outline" | "timeline";
export type BottomTab = "terminal" | "chat";

export interface ChangeEntry {
  file: string;
  status: "modified" | "added" | "deleted";
  additions: number;
  deletions: number;
  before: string;
  after: string;
}

interface AppState {
  // Project
  activeProject: { name: string; path: string } | null;
  setActiveProject: (p: { name: string; path: string } | null) => void;

  // Editor files
  openFiles: OpenFile[];
  activeFile: string | null;
  openFile: (f: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileDirty: (path: string, dirty: boolean) => void;

  // Panels
  leftPanelTab: LeftTab;
  setLeftPanelTab: (t: LeftTab) => void;
  leftPanelOpen: boolean;
  leftExpanded: boolean;
  toggleLeftPanel: () => void;
  setLeftExpanded: (v: boolean) => void;
  rightPanelTab: RightTab;
  setRightPanelTab: (t: RightTab) => void;
  rightPanelOpen: boolean;
  rightExpanded: boolean;
  toggleRightPanel: () => void;
  setRightExpanded: (v: boolean) => void;
  bottomExpanded: boolean;
  bottomPanelTab: BottomTab;
  setBottomPanelTab: (t: BottomTab) => void;
  toggleBottomPanel: () => void;

  // Editor preferences
  editorFontSize: number;
  setEditorFontSize: (n: number) => void;
  editorMinimap: boolean;
  setEditorMinimap: (v: boolean) => void;
  editorWordWrap: "off" | "on" | "wordWrapColumn";
  setEditorWordWrap: (v: "off" | "on" | "wordWrapColumn") => void;
  statusBarVisible: boolean;
  setStatusBarVisible: (v: boolean) => void;

  // Editor mode
  editorMode: "editor" | "diff";
  setEditorMode: (m: "editor" | "diff") => void;
  diffContent: { original: string; modified: string } | null;
  setDiffContent: (d: { original: string; modified: string } | null) => void;

  // ── Change management ──
  selectedChangeFile: string | null;
  setSelectedChangeFile: (file: string | null) => void;
  changes: ChangeEntry[];
  setChanges: (changes: ChangeEntry[]) => void;
  refreshChanges: () => Promise<void>;
  activeProjectPath: string | null;
  setActiveProjectPath: (path: string | null) => void;
  performingGitAction: string | null;
  setPerformingGitAction: (action: string | null) => void;

  // ── Chat / Tasks ──
  tasks: Task[];
  activeTaskId: string | null;
  selectedModel: string;
  createTaskTrigger: number; // incremented to trigger TaskList new-task input

  setTasks: (tasks: Task[]) => void;
  setActiveTask: (taskId: string | null) => void;
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  updateTaskName: (taskId: string, name: string) => void;
  setSelectedModel: (model: string) => void;
  triggerCreateTask: () => void;

  // Messages
  addUserMessage: (taskId: string, content: string) => void;
  appendToStreamBuffer: (taskId: string, text: string) => void;
  finalizeStreamMessage: (taskId: string) => void;
  setStreaming: (taskId: string, streaming: boolean) => void;
  setTaskMessages: (taskId: string, messages: ChatMessage[]) => void;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Best-effort fire-and-forget save — never throws, silently fails
async function _saveTask(taskId: string, messages: ChatMessage[]) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_session_messages", {
      taskId,
      messagesJson: JSON.stringify(
        messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      ),
    });
  } catch {
    // ignore
  }
}

export const useStore = create<AppState>((set, get) => ({
  activeProject: null,
  setActiveProject: (p) => set({ activeProject: p }),

  openFiles: [],
  activeFile: null,
  openFile: (f) =>
    set((s) => {
      const exists = s.openFiles.find((x) => x.path === f.path);
      if (exists) return { activeFile: f.path };
      return { openFiles: [...s.openFiles, f], activeFile: f.path };
    }),
  closeFile: (path) =>
    set((s) => {
      const files = s.openFiles.filter((x) => x.path !== path);
      const active =
        s.activeFile === path
          ? files.length > 0
            ? files[files.length - 1].path
            : null
          : s.activeFile;
      return { openFiles: files, activeFile: active };
    }),
  setActiveFile: (path) => set({ activeFile: path }),
  updateFileContent: (path, content) =>
    set((s) => ({
      openFiles: s.openFiles.map((f) =>
        f.path === path ? { ...f, content, isDirty: true } : f
      ),
    })),
  markFileDirty: (path, dirty) =>
    set((s) => ({
      openFiles: s.openFiles.map((f) =>
        f.path === path ? { ...f, isDirty: dirty } : f
      ),
    })),

  leftPanelTab: "tasks",
  setLeftPanelTab: (t) => set({ leftPanelTab: t }),
  leftPanelOpen: true,
  leftExpanded: true,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  setLeftExpanded: (v) => set({ leftExpanded: v }),
  rightPanelTab: "explorer",
  setRightPanelTab: (t) => set({ rightPanelTab: t }),
  rightPanelOpen: true,
  rightExpanded: true,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightExpanded: (v) => set({ rightExpanded: v }),
  bottomExpanded: true,
  bottomPanelTab: "terminal",
  setBottomPanelTab: (t) => set({ bottomPanelTab: t }),
  toggleBottomPanel: () => set((s) => ({ bottomExpanded: !s.bottomExpanded })),

  editorFontSize: 13,
  setEditorFontSize: (n) => set({ editorFontSize: n }),
  editorMinimap: true,
  setEditorMinimap: (v) => set({ editorMinimap: v }),
  editorWordWrap: "off",
  setEditorWordWrap: (v) => set({ editorWordWrap: v }),
  statusBarVisible: true,
  setStatusBarVisible: (v) => set({ statusBarVisible: v }),

  editorMode: "editor",
  setEditorMode: (m) => set({ editorMode: m }),
  diffContent: null,
  setDiffContent: (d) => set({ diffContent: d, editorMode: d ? "diff" : "editor" }),

  // ── Change management ──
  selectedChangeFile: null,
  setSelectedChangeFile: (file) =>
    set((s) => ({
      selectedChangeFile: s.selectedChangeFile === file ? null : file,
      ...(file !== null && !s.bottomExpanded ? { bottomExpanded: true } : {}),
    })),

  changes: [],
  setChanges: (changes) => set({ changes }),
  refreshChanges: async () => {
    const projectPath = get().activeProjectPath;
    if (!projectPath) {
      set({ changes: [] });
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const diffs = await invoke<ChangeEntry[]>("get_structured_diff", {
        projectPath,
      });
      set({ changes: diffs });
    } catch {
      set({ changes: [] });
    }
  },
  activeProjectPath: null,
  setActiveProjectPath: (path) => set({ activeProjectPath: path }),
  performingGitAction: null,
  setPerformingGitAction: (action) => set({ performingGitAction: action }),

  // ── Chat / Tasks ──
  tasks: [],
  activeTaskId: null,
  selectedModel: "deepseek-v4-pro",
  createTaskTrigger: 0,

  setTasks: (tasks) => set({ tasks }),
  setActiveTask: (taskId) => set({ activeTaskId: taskId }),
  addTask: (task) =>
    set((s) => ({
      tasks: [task, ...s.tasks],
      activeTaskId: task.id,
    })),
  removeTask: (taskId) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
      activeTaskId: s.activeTaskId === taskId ? null : s.activeTaskId,
    })),
  updateTaskName: (taskId, name) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, name } : t)),
    })),
  setSelectedModel: (model) => set({ selectedModel: model }),
  triggerCreateTask: () =>
    set((s) => ({ createTaskTrigger: s.createTaskTrigger + 1 })),

  addUserMessage: (taskId, content) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              messages: [
                ...t.messages,
                {
                  id: generateId(),
                  role: "user",
                  content,
                  timestamp: Date.now(),
                },
              ],
              message_count: t.message_count + 1,
            }
          : t
      ),
    }));
    const task = get().tasks.find((t) => t.id === taskId);
    if (task) _saveTask(taskId, task.messages);
  },

  appendToStreamBuffer: (taskId, text) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, streamBuffer: t.streamBuffer + text, isStreaming: true }
          : t
      ),
    })),

  finalizeStreamMessage: (taskId) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              messages: [
                ...t.messages,
                {
                  id: generateId(),
                  role: "assistant",
                  content: t.streamBuffer,
                  timestamp: Date.now(),
                },
              ],
              streamBuffer: "",
              isStreaming: false,
              message_count: t.message_count + 1,
            }
          : t
      ),
    }));
    const task = get().tasks.find((t) => t.id === taskId);
    if (task) _saveTask(taskId, task.messages);
  },

  setStreaming: (taskId, streaming) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, isStreaming: streaming } : t
      ),
    })),

  setTaskMessages: (taskId, messages) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, messages, message_count: messages.length } : t
      ),
    })),
}));

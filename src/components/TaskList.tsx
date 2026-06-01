import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore, type Task, type ChatMessage } from "@/store";
import { Clock, Bot, Play, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface SessionInfo {
  id: string;
  name: string;
  created: string;
  message_count: number;
}

interface SavedMessage {
  role: string;
  content: string;
  timestamp: number;
}

export default function TaskList() {
  const tasks = useStore((s) => s.tasks);
  const activeTaskId = useStore((s) => s.activeTaskId);
  const createTaskTrigger = useStore((s) => s.createTaskTrigger);
  const setTasks = useStore((s) => s.setTasks);
  const setActiveTask = useStore((s) => s.setActiveTask);
  const addTask = useStore((s) => s.addTask);
  const removeTaskFromStore = useStore((s) => s.removeTask);
  const setTaskMessages = useStore((s) => s.setTaskMessages);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    try {
      const sessions = await invoke<SessionInfo[]>("list_sessions");
      if (sessions.length > 0) {
        const taskList: Task[] = sessions.map((s) => ({
          id: s.id,
          name: s.name,
          created: s.created,
          model: "deepseek-v4-pro",
          message_count: s.message_count,
          messages: [],
          isStreaming: false,
          streamBuffer: "",
        }));
        setTasks(taskList);
      }
    } catch (err) {
      // No sessions yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [setTasks]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Respond to trigger from LeftSidebar Plus button
  useEffect(() => {
    if (createTaskTrigger > 0) {
      setShowNewInput(true);
    }
  }, [createTaskTrigger]);

  // Load messages when switching to a task
  const handleContinue = useCallback(
    async (taskId: string) => {
      setActiveTask(taskId);
      try {
        const savedMessages = await invoke<SavedMessage[]>("load_session_messages", {
          taskId,
        });
        const chatMessages: ChatMessage[] = savedMessages.map((m, i) => ({
          id: `${taskId}-${i}`,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.timestamp || Date.now(),
        }));
        setTaskMessages(taskId, chatMessages);
      } catch {
        // No history yet
      }
    },
    [setActiveTask, setTaskMessages]
  );

  // Create new task
  const handleCreate = useCallback(async () => {
    const name = newTaskName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const meta = await invoke<{ id: string; name: string; created: string; model: string; message_count: number }>(
        "create_task",
        { name }
      );
      const task: Task = {
        id: meta.id,
        name: meta.name,
        created: meta.created,
        model: meta.model,
        message_count: 0,
        messages: [],
        isStreaming: false,
        streamBuffer: "",
      };
      addTask(task);
      setNewTaskName("");
      setShowNewInput(false);
    } catch (err) {
      toast(`创建任务失败: ${err}`);
    } finally {
      setCreating(false);
    }
  }, [newTaskName, addTask]);

  // Delete task
  const handleDelete = useCallback(
    async (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleting(taskId);
      try {
        await invoke("delete_task", { taskId });
        removeTaskFromStore(taskId);
      } catch (err) {
        toast(`删除失败: ${err}`);
      } finally {
        setDeleting(null);
      }
    },
    [removeTaskFromStore]
  );

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    } else if (e.key === "Escape") {
      setShowNewInput(false);
      setNewTaskName("");
    }
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-medium text-slate-400">任务列表</span>
        <button
          onClick={() => setShowNewInput(true)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          title="新建任务"
        >
          +
        </button>
      </div>

      {/* New task input */}
      {showNewInput && (
        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
          <input
            autoFocus
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            placeholder="任务名称..."
            className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-2"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleCreate}
              disabled={!newTaskName.trim() || creating}
              className="flex-1 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded transition-colors"
            >
              {creating ? "创建中…" : "创建"}
            </button>
            <button
              onClick={() => {
                setShowNewInput(false);
                setNewTaskName("");
              }}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1 py-4">
          <Loader2 className="w-3 h-3 animate-spin" />
          加载中...
        </div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && !showNewInput && (
        <p className="text-xs text-slate-600 text-center py-4">
          暂无任务，点击 + 新建
        </p>
      )}

      {/* Task list */}
      {tasks.map((task) => {
        const isActive = task.id === activeTaskId;
        const isDeleting = deleting === task.id;
        return (
          <div
            key={task.id}
            onClick={() => handleContinue(task.id)}
            className={`group p-3 rounded-lg border cursor-pointer transition-colors ${
              isActive
                ? "bg-blue-600/10 border-blue-500/30"
                : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50"
            }`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <span
                className={`text-sm font-medium truncate flex-1 ${
                  isActive ? "text-blue-300" : "text-slate-200"
                }`}
              >
                {task.name}
              </span>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                {task.isStreaming && (
                  <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                )}
                <button
                  onClick={(e) => handleDelete(task.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                  title="删除任务"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.created}
              </span>
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {task.model || "Claude Sonnet 4"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-600">
                {task.message_count} 条消息
              </span>
              {!isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContinue(task.id);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  <Play className="w-3 h-3" />
                  继续
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom "new task" button */}
      {!showNewInput && tasks.length > 0 && (
        <button
          onClick={() => setShowNewInput(true)}
          className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-dashed border-slate-700 rounded-lg transition-colors"
        >
          + 新建任务
        </button>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@/store";
import { Bot, User, Send, Square, ChevronDown } from "lucide-react";
import { toast } from "@/components/ui/toast";
import MarkdownRenderer from "./MarkdownRenderer";

const MODELS = ["deepseek-v4-pro", "deepseek-v4-flash", "claude-sonnet-4-20250514"];

export default function AiChatPanel() {
  const tasks = useStore((s) => s.tasks);
  const activeTaskId = useStore((s) => s.activeTaskId);
  const selectedModel = useStore((s) => s.selectedModel);
  const setSelectedModel = useStore((s) => s.setSelectedModel);
  const addUserMessage = useStore((s) => s.addUserMessage);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  const [input, setInput] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when messages or streaming changes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTask?.messages, activeTask?.streamBuffer]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeTaskId) return;
    setInput("");

    const model = activeTask?.model || selectedModel;
    addUserMessage(activeTaskId, text);

    try {
      const task = useStore.getState().tasks.find((t) => t.id === activeTaskId);
      const apiMessages = (task?.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await invoke("send_message", {
        taskId: activeTaskId,
        model,
        messages: apiMessages,
      });
    } catch (err) {
      toast(`发送失败: ${err}`);
    }
  }, [input, activeTaskId, activeTask, selectedModel, addUserMessage]);

  const handleStop = useCallback(async () => {
    if (!activeTaskId) return;
    try {
      await invoke("stop_stream", { taskId: activeTaskId });
    } catch {
      // ignore
    }
  }, [activeTaskId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const taskModel = activeTask?.model || selectedModel;

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <span className="text-sm font-medium text-slate-200 truncate">
          {activeTask ? activeTask.name : "AI 编程助手"}
        </span>
        {activeTask && (
          <div className="relative">
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-md text-slate-300 hover:border-slate-600 transition-colors"
            >
              <span className="max-w-[120px] truncate">{taskModel}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {modelOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setModelOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-20 min-w-[180px]">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedModel(m);
                        setModelOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                        m === taskModel
                          ? "text-blue-400 bg-slate-700"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Empty state: no task selected */}
        {!activeTask && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Bot className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm mb-1">AI 编程助手</p>
            <p className="text-xs">在左侧选择任务或创建新任务开始</p>
          </div>
        )}

        {/* Empty state: task selected but no messages yet */}
        {activeTask && activeTask.messages.length === 0 && !activeTask.isStreaming && (
          <p className="text-xs text-slate-600 text-center py-8">
            输入消息开始 AI 对话
          </p>
        )}

        {/* Message bubbles */}
        {activeTask?.messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                m.role === "user" ? "bg-blue-600" : "bg-purple-600"
              }`}
            >
              {m.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600/20 text-blue-100"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              <MarkdownRenderer content={m.content} />
            </div>
          </div>
        ))}

        {/* Streaming buffer */}
        {activeTask?.isStreaming && activeTask.streamBuffer && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-purple-600">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-800 text-slate-300">
              <MarkdownRenderer content={activeTask.streamBuffer} />
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-blue-400 animate-pulse align-middle" />
            </div>
          </div>
        )}

        {/* Loading indicator (before first chunk) */}
        {activeTask?.isStreaming && !activeTask.streamBuffer && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pl-9">
            <Bot className="w-4 h-4 animate-pulse" />
            思考中...
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3 shrink-0">
        {activeTask ? (
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息… (Enter 发送, Shift+Enter 换行)"
              rows={1}
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none transition-colors"
            />
            {activeTask.isStreaming ? (
              <button
                onClick={handleStop}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md shrink-0 transition-colors"
                title="停止生成"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md disabled:text-slate-600 shrink-0 transition-colors"
                title="发送"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-600 text-center">
            请先选择或创建一个任务
          </p>
        )}
      </div>
    </div>
  );
}

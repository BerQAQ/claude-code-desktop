import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@/store";
import { Send, Square, Bot, User, ChevronDown } from "lucide-react";
import { toast } from "@/components/ui/toast";

const MODELS = ["deepseek-v4-pro", "deepseek-v4-flash", "claude-sonnet-4-20250514"];

export default function BottomInputBar() {
  const bottomExpanded = useStore((s) => s.bottomExpanded);
  const activeTaskId = useStore((s) => s.activeTaskId);
  const tasks = useStore((s) => s.tasks);
  const selectedModel = useStore((s) => s.selectedModel);
  const setSelectedModel = useStore((s) => s.setSelectedModel);
  const addUserMessage = useStore((s) => s.addUserMessage);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  const [input, setInput] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Get display messages for the active task
  const displayMessages = activeTask?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, activeTask?.streamBuffer]);

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

  const model = activeTask?.model || selectedModel;

  return (
    <div
      className={`shrink-0 bg-slate-900 border-t border-slate-800 overflow-hidden transition-all duration-200 ${
        bottomExpanded ? "h-[220px]" : "h-0 border-t-0"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Messages (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {displayMessages.length === 0 && (
            <p className="text-xs text-slate-600 text-center">
              {activeTaskId ? "输入消息开始对话" : "请先在左侧选择或创建一个任务"}
            </p>
          )}
          {displayMessages.map((m, i) => (
            <div
              key={m.id ?? i}
              className={`flex gap-2 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  m.role === "user" ? "bg-blue-600" : "bg-purple-600"
                }`}
              >
                {m.role === "user" ? (
                  <User className="w-3 h-3 text-white" />
                ) : (
                  <Bot className="w-3 h-3 text-white" />
                )}
              </div>
              <div
                className={`max-w-[70%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600/20 text-blue-100"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            </div>
          ))}
          {/* Streaming indicator */}
          {activeTask?.isStreaming && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-7">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
              {activeTask.streamBuffer ? (
                <span className="text-slate-400 truncate">
                  {activeTask.streamBuffer.slice(-100)}
                </span>
              ) : (
                "思考中..."
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input row */}
        <div className="px-3 pb-2.5 pt-1 shrink-0">
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative shrink-0">
              <button
                onClick={() => setModelOpen(!modelOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-md text-slate-300 hover:border-slate-600 transition-colors"
              >
                <span className="max-w-[100px] truncate">{model}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
              {modelOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setModelOpen(false)}
                  />
                  <div className="absolute bottom-full mb-1 left-0 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-20">
                    {MODELS.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedModel(m);
                          setModelOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                          m === model
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

            {/* Input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeTaskId ? "输入消息… (Enter 发送)" : "请先创建任务"}
              disabled={!activeTaskId}
              className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />

            {/* Send / Stop */}
            {activeTask?.isStreaming ? (
              <button
                onClick={handleStop}
                className="p-1.5 text-red-400 hover:text-red-300 shrink-0 transition-colors"
                title="停止生成"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !activeTaskId}
                className="p-1.5 text-blue-400 hover:text-blue-300 disabled:text-slate-600 shrink-0 transition-colors"
                title="发送"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

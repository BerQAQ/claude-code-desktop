import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import { invoke } from "@tauri-apps/api/core";
import Editor from "@monaco-editor/react";
import { X, PanelLeft, PanelRight, PanelBottom, Settings, ChevronRight, Save, RotateCcw, AlertCircle } from "lucide-react";

export default function TopBar() {
  const navigate = useNavigate();
  const project = useStore((s) => s.activeProject);
  const openFiles = useStore((s) => s.openFiles);
  const activeFile = useStore((s) => s.activeFile);
  const setActiveFile = useStore((s) => s.setActiveFile);
  const closeFile = useStore((s) => s.closeFile);
  const toggleLeft = useStore((s) => s.toggleLeftPanel);
  const toggleRight = useStore((s) => s.toggleRightPanel);
  const toggleBottom = useStore((s) => s.toggleBottomPanel);

  // ── Settings dialog state ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [configText, setConfigText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openSettings = () => {
    setSettingsOpen(true);
    loadConfig();
  };

  const loadConfig = async () => {
    try {
      const data = await invoke<string>("read_config_raw");
      setConfigText(data);
      setOriginalText(data);
      setMessage(null);
    } catch (err) {
      setConfigText(JSON.stringify({ error: "无法加载配置" }, null, 2));
      setOriginalText("");
    }
  };

  const handleSave = async () => {
    try {
      await invoke("update_config", { content: configText });
      setOriginalText(configText);
      setMessage({ type: "success", text: "配置已保存（已自动备份）" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: `保存失败: ${err}` });
    }
  };

  const handleReset = () => {
    setConfigText(originalText);
    setMessage(null);
  };

  const isModified = configText !== originalText;

  return (
    <>
      <div className="h-10 flex items-center bg-slate-900 border-b border-slate-800 shrink-0 select-none">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 px-3 text-xs text-slate-400 min-w-[200px]">
          <span className="text-slate-300 font-medium">{project?.name || "Claude Code Desktop"}</span>
          {activeFile && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-400">{activeFile.split("\\").pop()}</span>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto gap-0.5 px-1">
          {openFiles.map((f) => (
            <div
              key={f.path}
              onClick={() => setActiveFile(f.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t cursor-pointer whitespace-nowrap max-w-[180px] group ${
                activeFile === f.path
                  ? "bg-slate-950 text-slate-200 border-t border-x border-slate-700"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="truncate">{f.isDirty && "● "}{f.name}</span>
              <X
                onClick={(e) => { e.stopPropagation(); closeFile(f.path); }}
                className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-red-400 shrink-0"
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 px-2">
          <button onClick={toggleLeft} className="p-1.5 text-slate-500 hover:text-slate-300 rounded" title="切换左侧栏">
            <PanelLeft className="w-4 h-4" />
          </button>
          <button onClick={toggleRight} className="p-1.5 text-slate-500 hover:text-slate-300 rounded" title="切换右侧栏">
            <PanelRight className="w-4 h-4" />
          </button>
          <button onClick={toggleBottom} className="p-1.5 text-slate-500 hover:text-slate-300 rounded" title="切换底部栏">
            <PanelBottom className="w-4 h-4" />
          </button>
          <button onClick={openSettings} className="p-1.5 text-slate-500 hover:text-slate-300 rounded" title="设置">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Dialog — z-[9999] fixed overlay */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSettingsOpen(false)}
          />
          {/* Dialog */}
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl mx-4 flex flex-col" style={{ height: "75vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-200">设置</h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  D:\claude_data\.claude\settings.json
                </span>
                {isModified && (
                  <span className="text-[11px] text-yellow-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />已修改
                  </span>
                )}
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1" style={{ height: "calc(100% - 110px)" }}>
              <Editor
                height="100%"
                language="json"
                value={configText}
                onChange={(v) => setConfigText(v || "")}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "off",
                }}
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className={`absolute top-14 left-5 right-5 px-4 py-2 rounded-md text-xs z-10 ${
                  message.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => { setSettingsOpen(false); navigate("/settings"); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
              >
                旧版编辑器
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={!isModified}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重置
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isModified}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存
                </button>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

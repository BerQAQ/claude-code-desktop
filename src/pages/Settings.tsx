import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Save, RotateCcw, AlertCircle } from "lucide-react";

export default function Settings() {
  const [configText, setConfigText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await invoke<string>("read_config_raw");
      setConfigText(data);
      setOriginalText(data);
    } catch (err) {
      console.error("加载配置失败:", err);
      setConfigText(JSON.stringify({ error: "无法加载配置" }, null, 2));
    }
  };

  const handleSave = async () => {
    try {
      await invoke("write_config", { content: configText });
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
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100">配置</h2>
        <p className="text-sm text-slate-400 mt-1">
          编辑 Claude Code 的 settings.json 配置文件
        </p>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">
            D:\claude_data\.claude\settings.json
          </span>
          {isModified && (
            <span className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              已修改
            </span>
          )}
        </div>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            保存
          </button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-md text-xs ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* JSON 编辑器 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <textarea
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          className="w-full h-[500px] px-4 py-4 bg-transparent text-sm text-slate-300 font-mono leading-relaxed resize-none focus:outline-none"
          spellCheck={false}
          placeholder='{ "key": "value" }'
        />
      </div>
    </div>
  );
}

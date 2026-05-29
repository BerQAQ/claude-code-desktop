import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Play, FolderOpen, Terminal, Sparkles, MessageSquare } from "lucide-react";

interface ConfigData {
  default_model?: string;
  [key: string]: unknown;
}

export default function Home() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [folderPath, setFolderPath] = useState<string>("");

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择项目文件夹",
      });
      if (selected && typeof selected === "string") {
        setFolderPath(selected);
      }
    } catch (err) {
      console.error("选择文件夹失败:", err);
    }
  };

  const handleLoadConfig = async () => {
    try {
      const data = await invoke<ConfigData>("read_config");
      setConfig(data);
    } catch (err) {
      console.error("读取配置失败:", err);
    }
  };

  const handleLaunchClaude = async () => {
    try {
      await invoke("launch_claude", { path: folderPath });
    } catch (err) {
      console.error("启动 Claude 失败:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 mb-6">
          <Sparkles className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-100 mb-3">
          欢迎使用 Claude Code Desktop
        </h2>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
          基于 Tauri 的桌面客户端，管理你的 Claude Code 项目、
          会话记录与配置信息。
        </p>
      </div>

      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">
          快速启动
        </h3>

        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">
            项目文件夹路径
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={folderPath}
              readOnly
              placeholder="选择项目文件夹..."
              className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSelectFolder}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 hover:bg-slate-700 transition-colors"
              title="浏览文件夹"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleLaunchClaude}
          disabled={!folderPath}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Play className="w-4 h-4" />
          启动 Claude Code
        </button>
      </div>

      <div className="w-full max-w-lg mt-6 grid grid-cols-2 gap-4">
        <button
          onClick={handleLoadConfig}
          className="flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:border-slate-700 transition-colors"
        >
          <Terminal className="w-4 h-4 text-slate-500" />
          <div className="text-left">
            <p className="font-medium text-slate-200">读取配置</p>
            <p className="text-xs text-slate-500">查看 settings.json</p>
          </div>
        </button>

        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <div className="text-left">
            <p className="font-medium text-slate-200">最近会话</p>
            <p className="text-xs text-slate-500">查看历史记录</p>
          </div>
        </div>
      </div>

      {config && (
        <div className="w-full max-w-lg mt-6">
          <pre className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 overflow-x-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Save, RotateCcw, Eye, EyeOff, Zap, RefreshCw, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/toast";

const MODEL_OPTIONS = [
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
];

interface ParsedConfig {
  ANTHROPIC_MODEL: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_BASE_URL: string;
  DEFAULT_AGENT_MODEL: string;
  DEFAULT_CHAT_MODEL: string;
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = "https://api.deepseek.com/anthropic";

function parseConfig(raw: string): ParsedConfig {
  try {
    const obj = JSON.parse(raw);
    return {
      ANTHROPIC_MODEL: obj.ANTHROPIC_MODEL || "",
      ANTHROPIC_API_KEY: obj.ANTHROPIC_API_KEY || "",
      ANTHROPIC_BASE_URL: obj.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL,
      DEFAULT_AGENT_MODEL: obj.DEFAULT_AGENT_MODEL || "",
      DEFAULT_CHAT_MODEL: obj.DEFAULT_CHAT_MODEL || "",
      ...obj,
    };
  } catch {
    return {
      ANTHROPIC_MODEL: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_BASE_URL: DEFAULT_BASE_URL,
      DEFAULT_AGENT_MODEL: "",
      DEFAULT_CHAT_MODEL: "",
    };
  }
}

function serializeConfig(parsed: ParsedConfig): string {
  const { ANTHROPIC_MODEL, ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL, DEFAULT_AGENT_MODEL, DEFAULT_CHAT_MODEL, ...rest } = parsed;
  const obj: Record<string, unknown> = {
    ...rest, ANTHROPIC_MODEL, ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL, DEFAULT_AGENT_MODEL, DEFAULT_CHAT_MODEL,
  };
  return JSON.stringify(obj, null, 2);
}

export default function ConfigEditor() {
  const [rawJson, setRawJson] = useState("");
  const [parsed, setParsed] = useState<ParsedConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [originalRaw, setOriginalRaw] = useState("");

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await invoke<string>("read_config_raw");
      setRawJson(raw);
      setParsed(parseConfig(raw));
      setOriginalRaw(raw);
      setIsDirty(false);
    } catch (err) {
      console.error("load failed:", err);
      toast("无法加载配置: " + err, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const updateField = (field: keyof ParsedConfig, value: string) => {
    if (!parsed) return;
    const next = { ...parsed, [field]: value };
    setParsed(next);
    setRawJson(serializeConfig(next));
    setIsDirty(true);
  };

  const handleModelChange = (model: string) => {
    if (!parsed) return;
    const next = { ...parsed, ANTHROPIC_MODEL: model, DEFAULT_AGENT_MODEL: model, DEFAULT_CHAT_MODEL: model };
    setParsed(next);
    setRawJson(serializeConfig(next));
    setIsDirty(true);
  };

  const handleRawChange = (value: string) => {
    setRawJson(value);
    try { setParsed(parseConfig(value)); } catch { /* ignore */ }
    setIsDirty(value !== originalRaw);
  };

  const handleReset = () => {
    setRawJson(originalRaw);
    setParsed(parseConfig(originalRaw));
    setIsDirty(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke("update_config", { content: rawJson });
      setOriginalRaw(rawJson);
      setIsDirty(false);
      toast("配置已保存（已自动备份到 backups/）", "success");
    } catch (err) {
      toast("保存失败: " + err, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const config = await invoke<Record<string, unknown>>("read_config");
      setTestResult({ ok: true, text: "OK\n" + JSON.stringify(config, null, 2) });
    } catch (err) {
      setTestResult({ ok: false, text: "ERR: " + err });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">配置管理</h2>
          <p className="text-sm text-slate-400 mt-1">编辑 settings.json · 自动备份到 backups/</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} disabled={!isDirty} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />重置
          </button>
          <button onClick={handleSave} disabled={!isDirty || saving} className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Save className="w-3.5 h-3.5" />{saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="mb-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-xs text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          配置已修改，请点击保存按钮写入文件
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <label className="block text-xs font-medium text-slate-400 mb-3">模型选择</label>
            <select value={parsed?.ANTHROPIC_MODEL || ""} onChange={(e) => handleModelChange(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-blue-500">
              <option value="" disabled>请选择模型...</option>
              {MODEL_OPTIONS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
            <p className="text-xs text-slate-600 mt-2">切换后自动同步 ANTHROPIC_MODEL / DEFAULT_AGENT_MODEL / DEFAULT_CHAT_MODEL</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <label className="block text-xs font-medium text-slate-400 mb-3">API Key</label>
            <div className="relative">
              <input type={showKey ? "text" : "password"} value={parsed?.ANTHROPIC_API_KEY || ""} onChange={(e) => updateField("ANTHROPIC_API_KEY", e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 pr-10 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors" title={showKey ? "隐藏" : "显示"}>
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <label className="block text-xs font-medium text-slate-400 mb-3">Base URL</label>
            <input type="text" value={parsed?.ANTHROPIC_BASE_URL || ""} onChange={(e) => updateField("ANTHROPIC_BASE_URL", e.target.value)} placeholder={DEFAULT_BASE_URL} className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
            <p className="text-xs text-slate-600 mt-2">默认: {DEFAULT_BASE_URL}</p>
          </div>

          <button onClick={handleTest} disabled={testing} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 disabled:opacity-50 transition-colors">
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            测试连接（读取当前配置）
          </button>

          {testResult && (
            <div className={"p-4 rounded-lg border text-xs font-mono whitespace-pre-wrap " + (testResult.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300")}>
              <div className="flex items-center gap-2 mb-2">
                {testResult.ok ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-red-400" />}
                <span className="font-medium text-sm">{testResult.ok ? "连接正常" : "连接失败"}</span>
              </div>
              {testResult.text}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-400">RAW JSON 编辑</label>
          <textarea value={rawJson} onChange={(e) => handleRawChange(e.target.value)} className="w-full h-[520px] px-4 py-4 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-blue-500" spellCheck={false} />
        </div>
      </div>
    </div>
  );
}

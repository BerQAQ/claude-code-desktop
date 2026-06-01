import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DiffEditor } from "@monaco-editor/react";
import {
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
} from "lucide-react";
import { useStore, type ChangeEntry } from "@/store";
import { toast } from "@/components/ui/toast";

interface DiffModalProps {
  entry: ChangeEntry;
  allEntries: ChangeEntry[];
  onClose: () => void;
  onNavigate: (entry: ChangeEntry) => void;
}

export default function DiffModal({
  entry,
  allEntries,
  onClose,
  onNavigate,
}: DiffModalProps) {
  const currentIndex = allEntries.findIndex((e) => e.file === entry.file);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allEntries.length - 1;

  const activeProjectPath = useStore((s) => s.activeProjectPath);

  // Guess language from file extension
  const guessLang = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const langMap: Record<string, string> = {
      java: "java", js: "javascript", ts: "typescript", tsx: "typescript",
      json: "json", yml: "yaml", yaml: "yaml", xml: "xml",
      sql: "sql", py: "python", rs: "rust", md: "markdown",
      html: "html", css: "css", sh: "shell", ps1: "powershell",
    };
    return langMap[ext] || "plaintext";
  };

  const handleOpenInEditor = async () => {
    if (!activeProjectPath) return;
    const fullPath = `${activeProjectPath}/${entry.file}`.replace(/\\/g, "/");
    try {
      await invoke("open_file", { path: fullPath });
      toast("已在系统编辑器中打开");
    } catch (err) {
      toast(`打开文件失败: ${err}`);
    }
  };

  // ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleCopyDiff = async () => {
    const text = `--- a/${entry.file}\n+++ b/${entry.file}\n\n--- Original ---\n${entry.before}\n\n+++ Modified +++\n${entry.after}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
  };

  const handleDownloadDiff = () => {
    const text = `--- a/${entry.file}\n+++ b/${entry.file}\n\n--- Original ---\n${entry.before}\n\n+++ Modified +++\n${entry.after}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.file.split("/").pop()}.diff`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pathParts = entry.file.split("/");
  const fileName = pathParts.pop() || entry.file;
  const breadcrumb = pathParts.join(" / ");

  const changeCount = entry.additions + entry.deletions;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-[90vw] h-[90vh] bg-slate-950 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-medium text-slate-200 truncate">
              {fileName}
            </span>
            <span className="text-xs text-slate-600 truncate hidden sm:inline">
              {breadcrumb}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenInEditor}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              title="在编辑器中打开"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">编辑器中打开</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: Monaco DiffEditor ── */}
        <div className="flex-1 min-h-0">
          <DiffEditor
            height="100%"
            language={guessLang(entry.file)}
            original={entry.before}
            modified={entry.after}
            theme="vs-dark"
            options={{
              readOnly: true,
              fontSize: 14,
              lineNumbers: "on",
              renderSideBySide: true,
              minimap: { enabled: true, scale: 1, showSlider: "mouseover" },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              folding: true,
              renderOverviewRuler: true,
              diffWordWrap: "off",
            }}
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800 shrink-0">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400 font-medium">
              +{entry.additions} 行
            </span>
            <span className="text-red-400 font-medium">
              -{entry.deletions} 行
            </span>
            <span className="text-slate-500">{changeCount} 处变更</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => hasPrev && onNavigate(allEntries[currentIndex - 1])}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              上一个
            </button>
            <span className="text-xs text-slate-600 min-w-[60px] text-center">
              {currentIndex + 1} / {allEntries.length}
            </span>
            <button
              onClick={() => hasNext && onNavigate(allEntries[currentIndex + 1])}
              disabled={!hasNext}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              下一个
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDiff}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">复制 Diff</span>
            </button>
            <button
              onClick={handleDownloadDiff}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">下载 Diff</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

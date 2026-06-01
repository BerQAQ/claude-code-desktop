import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Panel, Group, Separator } from "react-resizable-panels";
import { DiffEditor } from "@monaco-editor/react";
import { useStore, type ChangeEntry } from "@/store";
import {
  FileText, ChevronUp, Plus, Minus, Pencil,
  RefreshCw, FolderGit2, Undo2, GitCommitHorizontal,
  Check, X, Maximize2, ExternalLink,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import DiffModal from "./DiffModal";

const sepClass =
  "bg-transparent hover:bg-slate-600 active:bg-blue-500 transition-colors z-50 shrink-0";

function guessLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    java: "java", js: "javascript", ts: "typescript", tsx: "typescript",
    json: "json", yml: "yaml", yaml: "yaml", xml: "xml",
    sql: "sql", py: "python", rs: "rust", md: "markdown",
    html: "html", css: "css", sh: "shell", ps1: "powershell",
  };
  return langMap[ext] || "plaintext";
}

// ── Bottom panel ──
export default function BottomPanel() {
  const changes = useStore((s) => s.changes);
  const selectedFile = useStore((s) => s.selectedChangeFile);
  const setSelectedFile = useStore((s) => s.setSelectedChangeFile);
  const refreshChanges = useStore((s) => s.refreshChanges);
  const activeProjectPath = useStore((s) => s.activeProjectPath);
  const performingGitAction = useStore((s) => s.performingGitAction);
  const setPerformingGitAction = useStore((s) => s.setPerformingGitAction);
  const toggleBottom = useStore((s) => s.toggleBottomPanel);

  const [refreshing, setRefreshing] = useState(false);
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [diffModalEntry, setDiffModalEntry] = useState<ChangeEntry | null>(null);

  const selectedEntry = changes.find((c) => c.file === selectedFile);
  const hasProject = !!activeProjectPath;

  // ── Actions ──
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshChanges();
    setTimeout(() => setRefreshing(false), 300);
  }, [refreshChanges]);

  const handleStageAll = async () => {
    if (!activeProjectPath) return;
    setPerformingGitAction("staging_all");
    try {
      await invoke("git_stage_all", { projectPath: activeProjectPath });
      toast("已暂存所有变更");
      await refreshChanges();
    } catch (err) { toast(`暂存失败: ${err}`); }
    setPerformingGitAction(null);
  };

  const handleUnstageAll = async () => {
    if (!activeProjectPath) return;
    setPerformingGitAction("unstaging_all");
    try {
      await invoke("git_unstage_all", { projectPath: activeProjectPath });
      toast("已撤销所有暂存");
      await refreshChanges();
    } catch (err) { toast(`撤销失败: ${err}`); }
    setPerformingGitAction(null);
  };

  const handleCommit = async () => {
    if (!activeProjectPath || !commitMsg.trim()) return;
    setPerformingGitAction("committing");
    try {
      await invoke("git_commit", { projectPath: activeProjectPath, message: commitMsg.trim() });
      toast("提交成功");
      setCommitMsg("");
      setShowCommitInput(false);
      await refreshChanges();
    } catch (err) { toast(`提交失败: ${err}`); }
    setPerformingGitAction(null);
  };

  const handleNavigate = (entry: ChangeEntry) => {
    setSelectedFile(entry.file);
    setDiffModalEntry(entry);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-t border-slate-800">
      {/* ── Title + Action bar ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border-b border-slate-700 shrink-0">
        <span className="text-xs font-medium text-slate-300 mr-2 select-none">变更</span>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-1 text-slate-500 hover:text-slate-300 rounded transition-colors ${refreshing ? "animate-spin" : ""}`}
          title="刷新变更"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleStageAll}
          disabled={!hasProject || performingGitAction !== null}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
        >
          <FolderGit2 className="w-3 h-3" />
          {performingGitAction === "staging_all" ? "暂存中..." : "全部暂存"}
        </button>
        <button
          onClick={handleUnstageAll}
          disabled={!hasProject || performingGitAction !== null}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
        >
          <Undo2 className="w-3 h-3" />
          {performingGitAction === "unstaging_all" ? "撤销中..." : "全部撤销"}
        </button>

        <button
          onClick={() => setShowCommitInput(!showCommitInput)}
          disabled={!hasProject || performingGitAction !== null}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors disabled:opacity-50"
        >
          <GitCommitHorizontal className="w-3 h-3" />
          {performingGitAction === "committing" ? "提交中..." : "提交"}
        </button>

        <span className="text-[11px] text-slate-600 ml-auto">
          {changes.length > 0 && `+${changes.reduce((a, c) => a + c.additions, 0)} / -${changes.reduce((a, c) => a + c.deletions, 0)} | ${changes.length} 个文件`}
        </span>

        <button
          onClick={toggleBottom}
          className="p-0.5 text-slate-500 hover:text-slate-300 rounded transition-colors ml-1"
          title="收起面板"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Commit message input ── */}
      {showCommitInput && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border-b border-slate-800/50 shrink-0">
          <input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommit();
              if (e.key === "Escape") { setShowCommitInput(false); setCommitMsg(""); }
            }}
            placeholder="输入提交信息…"
            autoFocus
            className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <button onClick={handleCommit} disabled={!commitMsg.trim()} className="p-1 text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setShowCommitInput(false); setCommitMsg(""); }} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Body: horizontal split ── */}
      <div className="flex-1 min-h-0">
        {!hasProject ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-600">
            打开一个 Git 项目查看变更
          </div>
        ) : (
          <Group orientation="horizontal">
            {/* Left: file list */}
            <Panel defaultSize={40} minSize={20} maxSize={50}>
              <CompactChangeList
                changes={changes}
                selectedFile={selectedFile}
                onSelect={(f) => setSelectedFile(f)}
                onOpenDiff={(entry) => setDiffModalEntry(entry)}
              />
            </Panel>
            <Separator className={sepClass} style={{ width: 4 }} />
            {/* Right: diff preview */}
            <Panel defaultSize={60} minSize={30}>
              {selectedEntry ? (
                <DiffPreview
                  entry={selectedEntry}
                  onOpenFull={() => setDiffModalEntry(selectedEntry)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-600">
                  选择文件查看 Diff 预览
                </div>
              )}
            </Panel>
          </Group>
        )}
      </div>

      {/* ── Diff Modal (full-screen) ── */}
      {diffModalEntry && (
        <DiffModal
          entry={diffModalEntry}
          allEntries={changes}
          onClose={() => setDiffModalEntry(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}

// ── Compact file list (left side) ──
function CompactChangeList({
  changes,
  selectedFile,
  onSelect,
  onOpenDiff,
}: {
  changes: ChangeEntry[];
  selectedFile: string | null;
  onSelect: (file: string) => void;
  onOpenDiff: (entry: ChangeEntry) => void;
}) {
  if (changes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950/50 text-xs text-slate-600">
        没有检测到变更
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950/50">
      <div className="flex-1 overflow-y-auto">
        {changes.map((c) => (
          <button
            key={c.file}
            onClick={() => onSelect(c.file)}
            onDoubleClick={() => onOpenDiff(c)}
            className={`w-full text-left px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-slate-800/30 transition-colors border-b border-slate-800/20 text-[11px] ${
              selectedFile === c.file
                ? "bg-blue-500/10 border-l-2 border-l-blue-500"
                : "border-l-2 border-l-transparent"
            }`}
          >
            {c.status === "added" && <Plus className="w-3 h-3 text-emerald-400 shrink-0" />}
            {c.status === "deleted" && <Minus className="w-3 h-3 text-red-400 shrink-0" />}
            {c.status === "modified" && <Pencil className="w-3 h-3 text-yellow-400 shrink-0" />}
            <span className="text-slate-300 truncate flex-1 min-w-0">
              {c.file.split("/").pop()}
            </span>
            <span
              className={`text-[10px] px-1 py-0.5 rounded border shrink-0 ${
                c.status === "added"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : c.status === "deleted"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              }`}
            >
              {c.status === "added" ? "新增" : c.status === "deleted" ? "删除" : "修改"}
            </span>
            <span className="text-emerald-400 shrink-0 text-[10px]">+{c.additions}</span>
            <span className="text-red-400 shrink-0 text-[10px]">-{c.deletions}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Diff preview (right side) ──
function DiffPreview({ entry, onOpenFull }: { entry: ChangeEntry; onOpenFull: () => void }) {
  const lang = guessLang(entry.file);
  const fileName = entry.file.split("/").pop() || entry.file;

  const handleOpenInEditor = async () => {
    const projectPath = useStore.getState().activeProjectPath;
    if (!projectPath) return;
    const fullPath = `${projectPath}/${entry.file}`.replace(/\\/g, "/");
    try {
      await invoke("open_file", { path: fullPath });
    } catch (err) { toast(`打开文件失败: ${err}`); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* File info header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-xs text-slate-200 truncate flex-1">{fileName}</span>
        <span className="text-[10px] text-emerald-400">+{entry.additions}</span>
        <span className="text-[10px] text-red-400">-{entry.deletions}</span>
        <button
          onClick={onOpenFull}
          className="p-0.5 text-slate-500 hover:text-slate-300 rounded transition-colors ml-1"
          title="查看完整 Diff"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
        <button
          onClick={handleOpenInEditor}
          className="p-0.5 text-slate-500 hover:text-slate-300 rounded transition-colors"
          title="在编辑器中打开"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      {/* Monaco DiffEditor */}
      <div className="flex-1 min-h-0">
        <DiffEditor
          height="100%"
          language={lang}
          original={entry.before}
          modified={entry.after}
          theme="vs-dark"
          options={{
            readOnly: true,
            fontSize: 12,
            lineNumbers: "on",
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            folding: true,
            diffWordWrap: "off",
          }}
        />
      </div>
    </div>
  );
}

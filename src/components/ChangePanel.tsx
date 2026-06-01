import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore, type ChangeEntry } from "@/store";
import { RefreshCw, Plus, Minus, Pencil, GitCompare, Undo2, GitCommitHorizontal, FolderGit2, ExternalLink, Check, X } from "lucide-react";
import { toast } from "@/components/ui/toast";

// ── Status icon helpers ──
function statusIcon(status: string) {
  if (status === "added")
    return <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === "deleted")
    return <Minus className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  return <Pencil className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    added: {
      label: "新增",
      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    modified: {
      label: "修改",
      cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    },
    deleted: {
      label: "删除",
      cls: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  };
  const s = map[status] || map.modified;
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border ${s.cls} shrink-0`}
    >
      {s.label}
    </span>
  );
}

// ── Component ──
export default function ChangePanel() {
  const selectedFile = useStore((s) => s.selectedChangeFile);
  const setSelectedFile = useStore((s) => s.setSelectedChangeFile);
  const changes = useStore((s) => s.changes);
  const refreshChanges = useStore((s) => s.refreshChanges);
  const performingGitAction = useStore((s) => s.performingGitAction);
  const setPerformingGitAction = useStore((s) => s.setPerformingGitAction);
  const activeProjectPath = useStore((s) => s.activeProjectPath);

  const [refreshing, setRefreshing] = useState(false);
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: ChangeEntry;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const totalAdded = changes.reduce((a, c) => a + c.additions, 0);
  const totalDel = changes.reduce((a, c) => a + c.deletions, 0);

  // Load changes on mount + poll every 5s
  useEffect(() => {
    refreshChanges();
    const interval = setInterval(refreshChanges, 5000);
    return () => clearInterval(interval);
  }, [refreshChanges]);

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: Event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("click", handler);
    document.addEventListener("scroll", handler, true);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("scroll", handler, true);
    };
  }, [contextMenu]);

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
    } catch (err) {
      toast(`暂存失败: ${err}`);
    }
    setPerformingGitAction(null);
  };

  const handleUnstageAll = async () => {
    if (!activeProjectPath) return;
    setPerformingGitAction("unstaging_all");
    try {
      await invoke("git_unstage_all", { projectPath: activeProjectPath });
      toast("已撤销所有暂存");
      await refreshChanges();
    } catch (err) {
      toast(`撤销失败: ${err}`);
    }
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
    } catch (err) {
      toast(`提交失败: ${err}`);
    }
    setPerformingGitAction(null);
  };

  const handleUndoFile = async (entry: ChangeEntry) => {
    if (!activeProjectPath) return;
    try {
      await invoke("git_unstage_file", { projectPath: activeProjectPath, filePath: entry.file });
      toast(`已撤销: ${entry.file.split("/").pop()}`);
      await refreshChanges();
    } catch (err) {
      toast(`撤销失败: ${err}`);
    }
  };

  const handleStageFile = async (entry: ChangeEntry) => {
    if (!activeProjectPath) return;
    try {
      await invoke("git_stage_file", { projectPath: activeProjectPath, filePath: entry.file });
      toast(`已暂存: ${entry.file.split("/").pop()}`);
      await refreshChanges();
    } catch (err) {
      toast(`暂存失败: ${err}`);
    }
  };

  const handleOpenFile = async (entry: ChangeEntry) => {
    if (!activeProjectPath) return;
    const fullPath = `${activeProjectPath}/${entry.file}`.replace(/\\/g, "/");
    try {
      await invoke("open_file", { path: fullPath });
    } catch (err) {
      toast(`打开文件失败: ${err}`);
    }
  };

  const handleFileHistory = async (entry: ChangeEntry) => {
    if (!activeProjectPath) return;
    try {
      const commits = await invoke<{ hash: string; message: string; author: string; date: string }[]>(
        "git_file_history",
        { projectPath: activeProjectPath, filePath: entry.file }
      );
      if (commits.length === 0) {
        toast("该文件无提交历史");
      } else {
        const preview = commits.slice(0, 5).map(c => `${c.date} ${c.message}`).join("\n");
        toast(`最近提交:\n${preview}`);
      }
    } catch (err) {
      toast(`获取历史失败: ${err}`);
    }
  };

  const hasProject = !!activeProjectPath;

  return (
    <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800">
      {/* ── Title bar ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">变更</span>
          <span className="text-xs text-slate-500">
            {changes.length} 个文件
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-1 text-slate-500 hover:text-slate-300 rounded transition-colors ${
            refreshing ? "animate-spin" : ""
          }`}
          title="刷新"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border-b border-slate-800/50 shrink-0">
        <button
          onClick={handleStageAll}
          disabled={!hasProject || performingGitAction !== null}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title="全部暂存"
        >
          <FolderGit2 className="w-3 h-3" />
          {performingGitAction === "staging_all" ? "暂存中..." : "全部暂存"}
        </button>
        <button
          onClick={handleUnstageAll}
          disabled={!hasProject || performingGitAction !== null}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title="全部撤销"
        >
          <Undo2 className="w-3 h-3" />
          {performingGitAction === "unstaging_all" ? "撤销中..." : "全部撤销"}
        </button>
        <button
          onClick={() => setShowCommitInput(!showCommitInput)}
          disabled={!hasProject || performingGitAction !== null}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors disabled:opacity-50 ml-auto"
          title="提交变更"
        >
          <GitCommitHorizontal className="w-3 h-3" />
          {performingGitAction === "committing" ? "提交中..." : "提交"}
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
          <button
            onClick={handleCommit}
            disabled={!commitMsg.trim()}
            className="p-1 text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setShowCommitInput(false); setCommitMsg(""); }}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="flex items-center gap-3 px-3 py-2 bg-slate-900/50 border-b border-slate-800/50 shrink-0">
        <span className="text-sm font-semibold text-emerald-400">
          +{totalAdded}
        </span>
        <span className="text-sm font-semibold text-red-400">-{totalDel}</span>
        <span className="text-xs text-slate-500">
          {changes.length} 个文件已更改
        </span>
        {!hasProject && (
          <span className="text-xs text-slate-600 ml-auto">未打开项目</span>
        )}
      </div>

      {/* ── File list ── */}
      <div className="flex-1 overflow-y-auto">
        {changes.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-8">
            {hasProject ? "没有检测到变更" : "打开一个 Git 项目查看变更"}
          </p>
        )}
        {changes.map((c) => (
          <button
            key={c.file}
            onClick={() => setSelectedFile(c.file)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                x: Math.min(e.clientX, window.innerWidth - 180),
                y: Math.min(e.clientY, window.innerHeight - 130),
                entry: c,
              });
            }}
            className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800/30 transition-colors cursor-pointer border-b border-slate-800/30 ${
              selectedFile === c.file
                ? "bg-slate-800/60 border-l-2 border-l-blue-500"
                : "border-l-2 border-l-transparent"
            }`}
          >
            {statusIcon(c.status)}
            <span className="text-xs text-slate-300 truncate flex-1 min-w-0">
              {c.file.split("/").pop()}
            </span>
            {statusBadge(c.status)}
            <span className="text-xs text-emerald-400 shrink-0">
              +{c.additions}
            </span>
            <span className="text-xs text-red-400 shrink-0">
              -{c.deletions}
            </span>
          </button>
        ))}
      </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[80] bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-1 text-[11px] text-slate-500 border-b border-slate-700/50 truncate max-w-[200px]">
            {contextMenu.entry.file.split("/").pop()}
          </div>
          <button
            onClick={() => {
              handleUndoFile(contextMenu.entry);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-red-400 flex items-center gap-2 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            撤销更改
          </button>
          <button
            onClick={() => {
              handleStageFile(contextMenu.entry);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-emerald-400 flex items-center gap-2 transition-colors"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            暂存文件
          </button>
          <button
            onClick={() => {
              handleOpenFile(contextMenu.entry);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-blue-400 flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            打开文件
          </button>
          <button
            onClick={() => {
              handleFileHistory(contextMenu.entry);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-blue-400 flex items-center gap-2 transition-colors"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            查看历史
          </button>
        </div>
      )}
    </div>
  );
}

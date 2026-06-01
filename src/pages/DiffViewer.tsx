import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, GitBranch, History, FolderOpen, FileText, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { html as diff2html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";

interface FileVersion {
  file_name: string;
  full_path: string;
  version_time: string;
  size_bytes: number;
}

type Tab = "git" | "history";

export default function DiffViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const projectPath = (location.state as { path?: string })?.path || "D:\\";
  const projectName = projectPath.split("\\").pop() || projectPath;
  const onBack = () => navigate(-1);
  const [tab, setTab] = useState<Tab>("git");
  const [gitDiff, setGitDiff] = useState("");
  const [gitLoading, setGitLoading] = useState(false);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(null);
  const [versionContent, setVersionContent] = useState("");
  const [contentLoading, setContentLoading] = useState(false);

  // Load git diff
  const loadGitDiff = useCallback(async () => {
    setGitLoading(true);
    try {
      const diff = await invoke<string>("get_git_diff", { projectPath });
      setGitDiff(diff);
    } catch (err) {
      setGitDiff("");
      toast("Git Diff 失败: " + err, "error");
    } finally {
      setGitLoading(false);
    }
  }, [projectPath]);

  // Load file history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await invoke<FileVersion[]>("get_file_history");
      setVersions(data);
    } catch (err) {
      toast("加载历史失败: " + err, "error");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "git") loadGitDiff();
    else loadHistory();
  }, [tab, loadGitDiff, loadHistory]);

  // Load version content
  const handleSelectVersion = async (v: FileVersion) => {
    setSelectedVersion(v);
    setContentLoading(true);
    try {
      const content = await invoke<string>("get_file_version_content", { filePath: v.full_path });
      setVersionContent(content);
    } catch (err) {
      setVersionContent("读取失败: " + err);
    } finally {
      setContentLoading(false);
    }
  };

  // Render git diff
  const diffHtml = gitDiff && !gitLoading
    ? diff2html(gitDiff, {
        drawFileList: true,
        matching: "lines",
        outputFormat: "side-by-side",
        renderNothingWhenEmpty: true,
      })
    : "";

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <Button onClick={onBack} variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />返回
          </Button>
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">{projectName}</span>
          <span className="text-xs text-slate-600">变更查看</span>
        </div>
        <Button onClick={() => tab === "git" ? loadGitDiff() : loadHistory()} variant="outline" size="sm" className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" />刷新
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 shrink-0 bg-slate-900/50">
        <button
          onClick={() => setTab("git")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "git" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <GitBranch className="w-4 h-4" />Git Diff
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "history" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <History className="w-4 h-4" />文件历史
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {tab === "git" ? (
          /* ── Git Diff Tab ── */
          <div className="flex-1 overflow-y-auto">
            {gitLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : diffHtml ? (
              <div
                className="diff-container p-4"
                dangerouslySetInnerHTML={{ __html: diffHtml }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <GitBranch className="w-12 h-12 mb-4" />
                <p className="text-sm">{gitDiff || "无 Git 仓库或暂无变更"}</p>
              </div>
            )}
          </div>
        ) : (
          /* ── File History Tab ── */
          <div className="flex-1 flex overflow-hidden">
            {/* Left: file list */}
            <div className="w-[320px] border-r border-slate-800 overflow-y-auto shrink-0 bg-slate-900/30">
              {historyLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 px-4">
                  <FolderOpen className="w-10 h-10 mb-3" />
                  <p className="text-sm text-center">暂无文件历史</p>
                  <p className="text-xs mt-1 text-center">Claude Code 修改文件后会自动记录</p>
                </div>
              ) : (
                <div className="py-2">
                  {versions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectVersion(v)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 ${
                        selectedVersion?.full_path === v.full_path ? "bg-slate-800/70 border-l-2 border-l-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-300 truncate">{v.file_name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 ml-6">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />{v.version_time}
                        </span>
                        <Badge variant="outline" className="text-xs">{fmtSize(v.size_bytes)}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: version content */}
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedVersion ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <FileText className="w-12 h-12 mb-4" />
                  <p className="text-sm">选择左侧文件查看内容</p>
                </div>
              ) : contentLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        {selectedVersion.file_name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">{fmtSize(selectedVersion.size_bytes)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-[70vh] overflow-y-auto bg-slate-950 rounded-md p-4 border border-slate-800">
                      {versionContent}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* diff2html dark theme override */}
      <style>{`
        .diff-container { background: #0f172a !important; }
        .diff-container .d2h-wrapper { background: #0f172a; color: #e2e8f0; }
        .diff-container .d2h-file-header { background: #1e293b; border-color: #334155; color: #e2e8f0; }
        .diff-container .d2h-file-wrapper { border-color: #334155; background: #0f172a; }
        .diff-container .d2h-diff-table { font-size: 12px; }
        .diff-container .d2h-code-line { color: #cbd5e1; }
        .diff-container .d2h-code-side-line { color: #cbd5e1; }
        .diff-container .d2h-ins { background: #064e3b !important; border-color: #065f46; }
        .diff-container .d2h-del { background: #7f1d1d !important; border-color: #991b1b; }
        .diff-container .d2h-code-line-ctn { color: #e2e8f0; }
        .diff-container .d2h-file-list-wrapper { background: #1e293b; border-color: #334155; }
        .diff-container .d2h-file-list-header { background: #1e293b; color: #e2e8f0; }
        .diff-container .d2h-file-list-line { color: #cbd5e1; border-color: #334155; }
        .diff-container .d2h-tag { background: #334155; color: #e2e8f0; }
        .diff-container .d2h-info { background: #1e293b; color: #94a3b8; }
      `}</style>
    </div>
  );
}

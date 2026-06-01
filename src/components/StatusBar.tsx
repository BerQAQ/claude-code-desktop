import { useStore } from "@/store";
import { GitBranch, FileCode, ChevronDown, ChevronUp } from "lucide-react";

export default function StatusBar() {
  const visible = useStore((s) => s.statusBarVisible);
  const activeFile = useStore((s) => s.activeFile);
  const file = useStore((s) => s.openFiles.find((f) => f.path === s.activeFile));
  const bottomExpanded = useStore((s) => s.bottomExpanded);
  const toggleBottom = useStore((s) => s.toggleBottomPanel);
  const lineCount = file?.content.split("\n").length || 1;
  const lang = file?.name.split(".").pop()?.toUpperCase() || "—";

  if (!visible) return null;

  return (
    <div className="h-6 flex items-center justify-between bg-slate-900 border-t border-slate-800 px-3 text-xs text-slate-500 select-none shrink-0">
      <div className="flex items-center gap-3">
        {/* Collapse / expand bottom panel */}
        <button
          onClick={toggleBottom}
          className="p-0.5 text-slate-500 hover:text-slate-300 rounded"
          title={bottomExpanded ? "收起底部面板" : "展开底部面板"}
        >
          {bottomExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />main
        </span>
        <span>0↓ 0↑</span>
      </div>
      <div className="flex items-center gap-4">
        {activeFile && (
          <>
            <span>Ln 1, Col 1</span>
            <span>UTF-8</span>
            <span>CRLF</span>
            <span className="flex items-center gap-1">
              <FileCode className="w-3 h-3" />{lang}
            </span>
          </>
        )}
        <span>{lineCount} 行</span>
      </div>
    </div>
  );
}

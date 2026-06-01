import { useRef, useState, useEffect } from "react";
import { useStore, type RightTab } from "@/store";
import { FolderTree, ListTree, Clock, PanelRightClose, PanelRightOpen } from "lucide-react";
import FileExplorer from "./FileExplorer";
import Outline from "./Outline";
import Timeline from "./Timeline";

const tabs: { id: RightTab; icon: typeof FolderTree; label: string }[] = [
  { id: "explorer", icon: FolderTree, label: "资源管理器" },
  { id: "outline", icon: ListTree, label: "大纲" },
  { id: "timeline", icon: Clock, label: "时间线" },
];

export default function RightSidebar() {
  const tab = useStore((s) => s.rightPanelTab);
  const setTab = useStore((s) => s.setRightPanelTab);
  const expanded = useStore((s) => s.rightExpanded);
  const setExpanded = useStore((s) => s.setRightExpanded);

  // ── Narrow detection: hide text below 160px ──
  const headerRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 160);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Collapsed: 48px icon-only strip ──
  if (!expanded) {
    return (
      <div className="h-full w-[48px] flex flex-col items-center gap-2 py-2 bg-slate-900 border-l border-slate-800">
        <button
          onClick={() => setExpanded(true)}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded"
          title="展开侧边栏"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setExpanded(true); }}
            className={`p-1.5 rounded transition-colors ${
              tab === t.id ? "bg-slate-800 text-blue-400" : "text-slate-500 hover:text-slate-300"
            }`}
            title={t.label}
          >
            <t.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  }

  // ── Expanded: full content panel ──
  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Header: collapse button far left, tab icons with optional text */}
      <div
        ref={headerRef}
        className="flex items-center border-b border-slate-800 px-1 py-1 gap-0.5 shrink-0 overflow-hidden"
      >
        <button
          onClick={() => setExpanded(false)}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded shrink-0 mr-0.5"
          title="折叠侧边栏"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`min-w-0 flex items-center gap-1.5 px-1.5 py-1.5 rounded text-xs transition-colors ${
              tab === t.id
                ? "bg-slate-800 text-slate-200"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title={narrow ? t.label : undefined}
          >
            <t.icon className="w-3.5 h-3.5 shrink-0" />
            {!narrow && <span className="truncate">{t.label}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "explorer" && <FileExplorer />}
        {tab === "outline" && <Outline />}
        {tab === "timeline" && <Timeline />}
      </div>
    </div>
  );
}

import { useRef, useState, useEffect } from "react";
import { useStore, type LeftTab } from "@/store";
import { ListTodo, GitBranch, Package, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import TaskList from "./TaskList";
import CallChain from "./CallChain";
import Artifacts from "./Artifacts";

const tabs: { id: LeftTab; icon: typeof ListTodo; label: string }[] = [
  { id: "tasks", icon: ListTodo, label: "任务" },
  { id: "callchain", icon: GitBranch, label: "调用链" },
  { id: "artifacts", icon: Package, label: "产物" },
];

export default function LeftSidebar() {
  const tab = useStore((s) => s.leftPanelTab);
  const setTab = useStore((s) => s.setLeftPanelTab);
  const expanded = useStore((s) => s.leftExpanded);
  const setExpanded = useStore((s) => s.setLeftExpanded);
  const triggerCreateTask = useStore((s) => s.triggerCreateTask);

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
      <div className="h-full w-[48px] flex flex-col items-center gap-2 py-2 bg-slate-900 border-r border-slate-800">
        <button
          onClick={() => setExpanded(true)}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded"
          title="展开侧边栏"
        >
          <PanelLeftOpen className="w-4 h-4" />
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
        <div className="flex-1" />
        <button
          onClick={() => { triggerCreateTask(); setExpanded(true); setTab("tasks"); }}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded"
          title="新建任务"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Expanded: full content panel ──
  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800">
      {/* Header: icon + optional text, collapse button far right */}
      <div
        ref={headerRef}
        className="flex items-center border-b border-slate-800 px-1 py-1 gap-0.5 shrink-0 overflow-hidden"
      >
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
        <div className="flex-1 min-w-0" />
        {!narrow && (
          <button onClick={() => triggerCreateTask()} className="p-1.5 text-slate-500 hover:text-slate-300 rounded shrink-0" title="新建任务">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setExpanded(false)}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded shrink-0 ml-0.5"
          title="折叠侧边栏"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "tasks" && <TaskList />}
        {tab === "callchain" && <CallChain />}
        {tab === "artifacts" && <Artifacts />}
      </div>
    </div>
  );
}

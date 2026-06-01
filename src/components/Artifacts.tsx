import { Plus, Minus, Pencil, GitCompare } from "lucide-react";
import { useStore } from "@/store";

const mockChanges = [
  { file: "src/main/.../OrderController.java", status: "modified", additions: 15, deletions: 1 },
  { file: "src/main/.../OrderService.java", status: "modified", additions: 23, deletions: 0 },
  { file: "src/main/.../OrderMapper.java", status: "added", additions: 8, deletions: 0 },
  { file: "src/main/.../application.yml", status: "modified", additions: 1, deletions: 0 },
  { file: "pom.xml", status: "modified", additions: 2, deletions: 0 },
  { file: "src/main/.../OrderDTO.java", status: "added", additions: 12, deletions: 0 },
  { file: "src/test/.../OrderTest.java", status: "added", additions: 4, deletions: 0 },
];

const statusIcon = (s: string) => {
  if (s === "added") return <Plus className="w-3.5 h-3.5 text-emerald-400" />;
  if (s === "deleted") return <Minus className="w-3.5 h-3.5 text-red-400" />;
  return <Pencil className="w-3.5 h-3.5 text-yellow-400" />;
};

export default function Artifacts() {
  const setDiff = useStore((s) => s.setDiffContent);
  const totalAdded = mockChanges.reduce((a, c) => a + c.additions, 0);
  const totalDel = mockChanges.reduce((a, c) => a + c.deletions, 0);

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-medium text-slate-400 px-1">产物汇总</p>
      <div className="flex items-center gap-2 px-2 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <span className="text-sm font-semibold text-emerald-400">+{totalAdded}</span>
        <span className="text-sm font-semibold text-red-400">-{totalDel}</span>
        <span className="text-xs text-slate-500">{mockChanges.length} 个文件已更改</span>
      </div>
      <div className="space-y-1">
        {mockChanges.map((c, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800/30 text-xs">
            {statusIcon(c.status)}
            <span className="text-slate-300 truncate flex-1">{c.file.split("/").pop()}</span>
            <span className="text-emerald-400 shrink-0">+{c.additions}</span>
            <span className="text-red-400 shrink-0">-{c.deletions}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setDiff({ original: "// Original content", modified: "// Modified content\n+ new line" })}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
      >
        <GitCompare className="w-3.5 h-3.5" />查看变更
      </button>
    </div>
  );
}

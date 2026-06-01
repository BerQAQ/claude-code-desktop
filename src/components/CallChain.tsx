import { useState } from "react";
import { ChevronRight, ChevronDown, Globe, Database, Server, Zap } from "lucide-react";

interface ChainNode {
  id: string; label: string; detail: string; type: "http" | "db" | "service" | "function";
  children?: ChainNode[];
}

const mockChain: ChainNode = {
  id: "1", label: "POST /order/add", detail: "HTTP 200 - 342ms", type: "http",
  children: [
    { id: "2", label: "OrderController.add()", detail: "Controller", type: "function",
      children: [
        { id: "3", label: "orderService.addOrder()", detail: "Service Layer - 128ms", type: "function",
          children: [
            { id: "4", label: "INSERT INTO orders", detail: "2 rows affected - 45ms", type: "db" },
            { id: "5", label: "POST /coin/deduct", detail: "Feign → 金币微服务 - 89ms", type: "service",
              children: [
                { id: "6", label: "UPDATE user_coins SET", detail: "1 row - 12ms", type: "db" },
              ]
            },
          ]
        },
      ]
    },
  ]
};

const typeConfig: Record<string, { icon: typeof Globe; color: string; bg: string }> = {
  http: { icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10" },
  db: { icon: Database, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  service: { icon: Server, color: "text-orange-400", bg: "bg-orange-500/10" },
  function: { icon: Zap, color: "text-purple-400", bg: "bg-purple-500/10" },
};

function TreeNode({ node, depth = 0 }: { node: ChainNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasKids = node.children && node.children.length > 0;
  const cfg = typeConfig[node.type];

  return (
    <div>
      <div
        onClick={() => hasKids && setOpen(!open)}
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded text-xs cursor-pointer hover:bg-slate-800/50 transition-colors ${cfg.bg} border border-transparent hover:border-slate-700/50`}
        style={{ marginLeft: depth * 16 }}
      >
        {hasKids ? (
          open ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <cfg.icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
        <span className="text-slate-200 font-medium truncate">{node.label}</span>
        <span className="text-slate-500 ml-auto shrink-0">{node.detail}</span>
      </div>
      {open && hasKids && node.children!.map((c) => (
        <TreeNode key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CallChain() {
  return (
    <div className="p-3">
      <p className="text-xs font-medium text-slate-400 px-1 mb-3">调用链路</p>
      <div className="space-y-0.5">
        <TreeNode node={mockChain} />
      </div>
      <div className="mt-4 px-2 flex items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-blue-400" />HTTP</span>
        <span className="flex items-center gap-1"><Database className="w-3 h-3 text-emerald-400" />数据库</span>
        <span className="flex items-center gap-1"><Server className="w-3 h-3 text-orange-400" />微服务</span>
      </div>
    </div>
  );
}

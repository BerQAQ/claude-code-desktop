
const mockSymbols = [
  { name: "OrderController", type: "class", line: 12,
    children: [
      { name: "addOrder(OrderDTO)", type: "method", line: 25 },
      { name: "getOrder(Long)", type: "method", line: 42 },
      { name: "listOrders(Page)", type: "method", line: 58 },
    ]
  },
  { name: "orderService", type: "field", line: 16 },
  { name: "orderMapper", type: "field", line: 17 },
];

function SymbolItem({ s, depth = 0 }: { s: typeof mockSymbols[0]; depth?: number }) {
  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-slate-800/50 transition-colors"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className="text-purple-400 font-mono text-xs">{s.type === "class" ? "C" : s.type === "method" ? "M" : "F"}</span>
        <span className="text-slate-300 truncate">{s.name}</span>
        <span className="text-slate-600 ml-auto text-xs">L{s.line}</span>
      </div>
      {"children" in s && s.children?.map((c, i) => (
        <SymbolItem key={i} s={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function Outline() {
  return (
    <div className="py-2">
      <p className="text-xs font-medium text-slate-400 px-3 mb-2">大纲</p>
      {mockSymbols.map((s, i) => (
        <SymbolItem key={i} s={s} />
      ))}
    </div>
  );
}

import { Clock, User } from "lucide-react";

const mockTimeline = [
  { time: "2026-05-29 15:42", author: "Claude Code", summary: "优化订单查询 SQL，添加索引" },
  { time: "2026-05-29 14:30", author: "Claude Code", summary: "重构 OrderController，提取公共逻辑" },
  { time: "2026-05-29 13:15", author: "Claude Code", summary: "新增 OrderDTO 和参数校验" },
  { time: "2026-05-28 18:00", author: "User", summary: "初始提交：订单模块基础结构" },
];

export default function Timeline() {
  return (
    <div className="py-2">
      <p className="text-xs font-medium text-slate-400 px-3 mb-2">修改历史</p>
      <div className="relative pl-6">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-700" />
        {mockTimeline.map((t, i) => (
          <div key={i} className="relative pb-4 last:pb-0">
            <div className="absolute left-[-17px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-700 bg-slate-900" />
            <div className="pl-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                <Clock className="w-3 h-3" />{t.time}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t.summary}</p>
              <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                <User className="w-3 h-3" />{t.author}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

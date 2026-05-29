import { NavLink } from "react-router-dom";
import {
  FolderOpen,
  MessageSquare,
  Settings,
  Home,
  Bot,
} from "lucide-react";

const navItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/projects", label: "项目", icon: FolderOpen },
  { to: "/sessions", label: "会话", icon: MessageSquare },
  { to: "/settings", label: "配置", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside
      className="w-[280px] flex flex-col bg-slate-900 border-r border-slate-800 select-none"
    >
      {/* Logo 区域 */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100">
            Claude Code Desktop
          </h1>
          <p className="text-xs text-slate-500">v0.1.0</p>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部署名 */}
      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-600">
          基于 Tauri + React 构建
        </p>
      </div>
    </aside>
  );
}

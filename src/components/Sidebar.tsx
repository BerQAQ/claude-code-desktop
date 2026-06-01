import { NavLink } from "react-router-dom";
import { FolderOpen, MessageSquare, Settings, Home, Bot } from "lucide-react";

const navItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/projects", label: "项目", icon: FolderOpen },
  { to: "/sessions", label: "会话", icon: MessageSquare },
  { to: "/settings", label: "配置", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="h-full w-full flex flex-col items-center bg-slate-900 border-r border-slate-800 select-none py-3 gap-1">
      {/* Logo icon */}
      <NavLink
        to="/"
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 mb-2 transition-colors"
        title="Claude Code Desktop"
      >
        <Bot className="w-5 h-5 text-white" />
      </NavLink>

      {/* Nav items */}
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
              isActive
                ? "bg-slate-800 text-blue-400"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            }`
          }
          title={item.label}
        >
          <item.icon className="w-4.5 h-4.5" />
        </NavLink>
      ))}

      <div className="flex-1" />

      {/* Version */}
      <span className="text-[10px] text-slate-700 mb-1">v0.1</span>
    </aside>
  );
}

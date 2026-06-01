# Claude Code Desktop

Tauri v2 桌面应用，封装 Claude Code CLI 的 GUI 前端。React + TypeScript + Rust 后端。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Tauri v2 |
| 前端 | React 18 + TypeScript + Vite |
| 路由 | react-router-dom v6 |
| 状态管理 | Zustand |
| UI 样式 | Tailwind CSS + lucide-react 图标 |
| 代码编辑器 | Monaco Editor (`@monaco-editor/react`) |
| Markdown | react-markdown + remark-gfm |
| 面板布局 | react-resizable-panels v4 |
| Rust 后端 | tauri + reqwest + portable-pty + chrono + serde |
| 终端 | Xterm.js (xterm + xterm-addon-fit) |

## 目录结构

```
src/
├── components/
│   ├── Layout.tsx          # 主布局（vertical + horizontal PanelGroup）
│   ├── TopBar.tsx          # 顶部栏（面包屑、标签页、面板切换、设置弹窗）
│   ├── Sidebar.tsx         # 56px 导航图标栏
│   ├── LeftSidebar.tsx     # 左侧面板（任务/调用链/工件）
│   ├── RightSidebar.tsx    # 右侧面板（资源管理器/大纲/时间线）
│   ├── BottomPanel.tsx     # 底部变更面板（Git diff + 文件列表）
│   ├── AiChatPanel.tsx     # AI 聊天主面板
│   ├── TaskList.tsx        # 任务列表
│   ├── FileExplorer.tsx    # 文件资源管理器
│   └── ui/                 # 通用 UI 组件（toast, card, badge, button）
├── pages/
│   ├── Projects.tsx        # 项目管理页
│   ├── Sessions.tsx        # 会话历史页
│   ├── Settings.tsx        # 设置页
│   └── TerminalPanel.tsx   # 终端页
├── hooks/
│   └── useChatStream.ts    # AI 流式消息监听
├── store.ts                # Zustand 全局状态（任务、面板、变更、编辑器配置）
├── App.tsx                 # 路由入口
└── main.tsx                # React 挂载点

src-tauri/src/
├── main.rs                 # Tauri 入口
├── lib.rs                  # 命令注册 + 配置管理 + 项目扫描 + 会话管理
├── chat.rs                 # Anthropic API 流式对话 + 会话持久化
├── git.rs                  # Git 操作（diff、stage、commit、文件历史）
└── pty.rs                  # 伪终端
```

## 开发命令

```bash
npm run dev          # 仅启动 Vite 前端开发服务器
npm run build        # tsc 类型检查 + Vite 生产构建
cargo tauri dev      # 完整 Tauri 桌面应用开发
cargo tauri build    # 打包生产安装程序
```

## 关键约定

### react-resizable-panels v4
- `Group` 用 `orientation` 控制方向，**不是** `direction`
- 垂直外层 Group 包含顶部内容区和底部面板
- 底部面板始终渲染（不条件渲染），通过 `minSize`/`maxSize`/`collapsible` 控制
- Panel 拖拽范围：底部面板 5%~50%，拖到 5% 以下 `collapsible` 自动折叠

### 窗口关闭
- **不在前端拦截 `onCloseRequested`** —— IPC 在关闭时可能挂起
- 消息采用增量自动保存：`addUserMessage` 和 `finalizeStreamMessage` 触发时立即写盘
- `_saveTask()` 是 fire-and-forget，永不抛错

### 状态管理
- Zustand store 在 `src/store.ts`，单一 store 文件
- `refreshChanges()` 和 `_saveTask()` 使用动态 `import("@tauri-apps/api/core")` 以兼容浏览器开发环境
- 面板展开/折叠状态：`leftExpanded`, `rightExpanded`, `bottomExpanded`

### TypeScript
- `tsc --noEmit` 零错误才能通过 `npm run build`
- 未使用的 import/变量会导致构建失败
- 废弃变量用 `_` 前缀（如 `_loadingDetail`）

### 数据路径
- 配置和数据统一存储在 `D:\claude_data\.claude\`
- `settings.json` — 用户配置（API key、模型、主题）
- `sessions/` — 会话消息持久化目录
- `backups/` — 配置自动备份目录

## 当前状态

项目处于早期开发阶段。面板布局、AI 对话、终端、Git 变更面板基本可用。右键菜单、Diff 全屏查看等功能尚在完善中。

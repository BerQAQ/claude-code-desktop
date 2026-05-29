# Claude Code Desktop

<div align="center">

基于 **Tauri 2.x + React 18 + TypeScript + Tailwind CSS** 构建的 Claude Code 桌面管理客户端。

[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?logo=tauri)](https://v2.tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## 项目简介

Claude Code Desktop 是一个 Windows 桌面应用，用于集中管理 Claude Code 的配置、项目、会话记录。它读取 `D:\claude_data\.claude\` 目录下的配置文件和历史数据，提供图形化界面进行编辑和浏览。

## 功能概览

### 首页 — 快速启动

- 展示欢迎信息和版本号
- **选择文件夹** → 一键启动 Claude Code
- 读取配置快捷按钮

### 配置管理 — 可视化设置编辑器

- **模型切换**：下拉框切换 `ANTHROPIC_MODEL`，自动同步 `DEFAULT_AGENT_MODEL` / `DEFAULT_CHAT_MODEL`
- **API Key**：密码输入框，支持 👁 显示/隐藏切换
- **Base URL**：可自定义 API 端点（默认 `https://api.deepseek.com/anthropic`）
- **RAW JSON 编辑器**：表单 ↔ JSON 实时双向同步
- **保存**：写入前自动备份到 `backups/settings.{时间戳}.json`
- **测试连接**：读取当前配置并返回结果
- Toast 通知系统

### 项目管理 — 扫描与启动

- 输入工作区路径（如 `D:\`），递归扫描含 `.git` 或 `.claude` 的文件夹
- 自动跳过 `node_modules`、`target` 等目录（深度 ≤ 4）
- 卡片式展示：项目名、路径、Git / Claude 标签、最后修改时间
- 手动添加项目文件夹
- 每张卡片底部 **"启动 Claude Code"** 按钮

### 会话记录 — 历史浏览

- 读取 `sessions/` 目录，卡片式展示所有历史会话
- 每张卡片显示：会话名、创建时间、消息数
- 点击进入详情：
  - 会话元信息（时间、模型、消息数）
  - 最近 20 条对话历史摘要（角色 + 内容预览）

## 技术架构

```
┌─────────────────────────────────────────┐
│              前端 (WebView)              │
│   React 18 · TypeScript · Tailwind CSS  │
│   shadcn/ui · React Router · Lucide     │
├─────────────────────────────────────────┤
│          Tauri Bridge (IPC)             │
│          invoke / Command               │
├─────────────────────────────────────────┤
│          Rust 后端 (src-tauri)          │
│   ┌─────────────────────────────────┐  │
│   │  read_config / update_config    │  │
│   │  backup_config                  │  │
│   │  list_sessions / get_detail     │  │
│   │  list_history                   │  │
│   │  scan_projects / launch_claude  │  │
│   └─────────────────────────────────┘  │
├─────────────────────────────────────────┤
│      D:\claude_data\.claude\            │
│   ├── settings.json                    │
│   ├── history.jsonl                    │
│   ├── sessions/                        │
│   ├── backups/                         │
│   └── projects.json                    │
└─────────────────────────────────────────┘
```

## 后端 Command 一览

| Command | 参数 | 功能 |
|---|---|---|
| `read_config` | — | 读取 `settings.json`，返回 JSON |
| `read_config_raw` | — | 读取 `settings.json`，返回原始字符串 |
| `update_config` | `content: String` | 验证 JSON → 备份 → 写入 |
| `backup_config` | — | 备份到 `backups/settings.{时间戳}.json` |
| `list_sessions` | — | 扫描 `sessions/` 子目录，返回会话列表 |
| `get_session_detail` | `sessionId: String` | 读取会话详情 + 最近 20 条历史 |
| `list_history` | — | 读取 `history.jsonl` 最近 50 条 |
| `scan_projects` | `workspace: String` | 递归扫描目录查找项目 |
| `list_projects` | — | 读取 `projects.json` |
| `launch_claude` | `path: String` | 在指定目录启动 Claude Code |

## 项目结构

```
claude-code-desktop/
├── package.json                 # 前端依赖
├── vite.config.ts               # Vite 配置 (端口 5173, @/ 别名)
├── tsconfig.json                # TypeScript 配置
├── tailwind.config.ts           # Tailwind + shadcn 主题变量
├── components.json              # shadcn/ui 配置
├── index.html                   # 入口 HTML
├── public/
│   └── vite.svg
├── src/
│   ├── main.tsx                 # React 入口 + ToastProvider
│   ├── App.tsx                  # 路由配置
│   ├── index.css                # 深色主题 CSS 变量
│   ├── lib/
│   │   └── utils.ts             # cn() 工具函数
│   ├── components/
│   │   ├── Layout.tsx           # 侧边栏 + 主区域布局
│   │   ├── Sidebar.tsx          # 280px 深色导航栏
│   │   └── ui/
│   │       ├── button.tsx       # shadcn Button
│   │       ├── card.tsx         # shadcn Card 套件
│   │       ├── badge.tsx        # shadcn Badge
│   │       └── toast.tsx        # Toast 通知系统
│   └── pages/
│       ├── Home.tsx             # 首页 / 快速启动
│       ├── Projects.tsx         # 项目管理
│       ├── Sessions.tsx         # 会话记录
│       └── ConfigEditor.tsx     # 配置管理
└── src-tauri/
    ├── Cargo.toml               # Rust 依赖
    ├── tauri.conf.json          # Tauri 窗口/插件配置
    ├── capabilities/
    │   └── default.json         # 权限声明
    ├── icons/
    │   └── icon.ico
    └── src/
        ├── lib.rs               # 10 个 Tauri Command
        └── main.rs              # 二进制入口
```

## 快速开始

### 前提条件

- [Node.js](https://nodejs.org) ≥ 18
- [Rust](https://rustup.rs) 工具链
- Windows 10/11（以管理员身份运行终端）

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/claude-code-desktop.git
cd claude-code-desktop

# 2. 安装前端依赖
npm install

# 3. 启动开发模式
npm run tauri dev
```

首次编译 Rust 依赖需 5-10 分钟，后续热更新秒级。

### 端口说明

| 服务 | 端口 |
|---|---|
| Vite 开发服务器 | `127.0.0.1:5173` |
| Tauri WebView | 自动 |

> 若端口被占用，修改 `vite.config.ts` 和 `tauri.conf.json` 中的端口号。

## 数据目录

应用依赖 `D:\claude_data\.claude\` 目录，首次启动自动创建：

```
D:\claude_data\.claude\
├── settings.json       # 配置文件（自动生成默认值）
├── history.jsonl       # 对话历史（每行一条 JSON）
├── projects.json       # 项目列表
├── sessions/           # 会话目录
│   └── {session_id}/
└── backups/            # 配置备份
    └── settings.20260529_153000.json
```

## 主题

深色模式（slate-950 背景），基于 shadcn/ui CSS 变量体系，全中文界面。

## License

MIT

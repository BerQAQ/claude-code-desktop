# Claude Code Desktop 操作手册

## 目录

1. [安装与启动](#1-安装与启动)
2. [界面概览](#2-界面概览)
3. [AI 对话](#3-ai-对话)
4. [任务管理](#4-任务管理)
5. [配置管理](#5-配置管理)
6. [项目管理](#6-项目管理)
7. [终端](#7-终端)
8. [会话历史](#8-会话历史)
9. [快捷键](#9-快捷键)
10. [常见问题](#10-常见问题)

---

## 1. 安装与启动

### 前提条件

| 组件 | 最低版本 |
|------|---------|
| Node.js | ≥ 18 |
| Rust 工具链 | stable |
| 操作系统 | Windows 10/11 |

### 安装步骤

```bash
# 1. 进入项目目录
cd claude-code-desktop

# 2. 安装前端依赖
npm install

# 3. 启动开发模式
npm run tauri dev
```

首次编译 Rust 后端需要 5-10 分钟下载和编译依赖。后续启动秒级。

### 数据目录

应用依赖 `D:\claude_data\.claude\` 目录。首次启动自动创建：

```
D:\claude_data\.claude\
├── settings.json       # 配置文件
├── sessions/           # 任务/会话存储
└── backups/            # 配置备份
```

---

## 2. 界面概览

```
┌──────────────────────────────────────────────────────────┐
│  TopBar: 项目名 · 文件标签 · 面板切换 · 设置              │
├────┬───────┬────────────────────────┬──────────────────────┤
│    │       │                        │                      │
│ 导  │ 左    │      中间区域           │     右侧栏           │
│ 航  │ 侧    │                        │                      │
│ 栏  │ 栏    │  AI 对话 │ 变更面板     │  资源管理器/大纲     │
│    │       │                        │  /时间线              │
│    │ 任务  │                        │                      │
│ 首  │ 调用  │                        │                      │
│ 页  │ 链    │                        │                      │
│ 项  │ 产物  │                        │                      │
│ 目  │       │                        │                      │
│ 会  │       │                        │                      │
│ 话  │       │                        │                      │
│ 配  │       │                        │                      │
│ 置  │       │                        │                      │
├────┴───────┴────────────────────────┴──────────────────────┤
│  BottomInputBar: 快捷输入（点击底部栏展开）                  │
├──────────────────────────────────────────────────────────┤
│  StatusBar: Git 分支 · 文件信息 · 面板切换                  │
└──────────────────────────────────────────────────────────┘
```

### 面板说明

| 面板 | 位置 | 功能 |
|------|------|------|
| 导航栏 | 最左侧（56px 图标条） | 页面切换：首页/项目/会话/配置 |
| 左侧栏 | 导航栏右侧 | 任务列表、调用链、产物 |
| 中间区域 | 中央 | AI 对话（左）、变更面板（右） |
| 右侧栏 | 右侧 | 文件资源管理器、大纲、时间线 |
| 底部栏 | 底部（可收起） | 快捷输入 + 消息预览 |
| 状态栏 | 最底部 | Git 分支、文件类型、编码 |

### 面板操作

- **展开/折叠左侧栏**：点击 TopBar 的 `PanelLeft` 按钮，或点击左侧栏头部的折叠按钮
- **展开/折叠右侧栏**：点击 TopBar 的 `PanelRight` 按钮
- **展开底部栏**：点击 StatusBar 的 `PanelBottom` 按钮，或点击底部的展开箭头
- **切换左侧栏标签**：任务 / 调用链 / 产物
- **切换右侧栏标签**：资源管理器 / 大纲 / 时间线

---

## 3. AI 对话

### 开始对话

1. 在左侧任务列表中点击 **+** 或 **新建任务** 按钮
2. 为任务命名（如 "API 联调"）
3. 任务创建后自动选中，在中间区域显示 AI 对话界面
4. 在底部输入框输入消息，按 **Enter** 发送

### 消息输入

- **Enter**：发送消息
- **Shift + Enter**：换行
- **停止按钮**（红色方块）：中断 AI 生成

### 模型选择

对话界面顶部有模型选择下拉框，支持以下模型：

| 模型 | 说明 |
|------|------|
| deepseek-v4-pro | DeepSeek V4 Pro（默认） |
| deepseek-v4-flash | DeepSeek V4 Flash（快速） |
| claude-sonnet-4-20250514 | Claude Sonnet 4 |

模型在 `D:\claude_data\.claude\settings.json` 的 `env.ANTHROPIC_MODEL` 中配置。

### 流式响应

AI 回复以流式方式逐字输出，打字过程中即可阅读内容。代码块自动高亮显示：

```
代码块
├── 语言标签（如 java, python, rust）
├── 深色背景显示
└── 等宽字体
```

### 对话持久化

- 用户消息在发送时立即保存到 `sessions/{任务ID}/history.jsonl`
- AI 回复完成后自动保存
- 切换任务后重新加载历史消息

---

## 4. 任务管理

### 创建任务

三种方式：

1. **左侧栏 + 按钮**：点击任务列表头部的 `+`
2. **底部新建按钮**：任务列表底部的 "新建任务" 按钮
3. **导航栏 Plus**：左侧栏折叠时点击 Plus 图标，自动展开并切换到任务标签

创建后输入任务名称，按 Enter 确认。

### 切换任务

点击任务列表中的任务卡片，或点击任务卡片的 **继续** 按钮。切换后自动加载该任务的历史消息。

### 删除任务

鼠标悬停在任务卡片上，右上角出现垃圾桶图标，点击删除。

> ⚠️ 删除操作不可恢复，任务目录及其所有历史消息将被永久删除。

### 任务存储

每个任务存储在独立的目录中：

```
D:\claude_data\.claude\sessions\{任务UUID}\
├── metadata.json   # 任务元数据（名称、创建时间、模型）
└── history.jsonl   # 对话历史（每行一条 JSON）
```

### 任务状态

| 图标 | 含义 |
|------|------|
| 🔵 旋转圆圈 | 正在流式生成 |
| 🔵 蓝色高亮 | 当前活跃任务 |

---

## 5. 配置管理

### 快速配置（TopBar）

点击 TopBar 右侧的齿轮图标 → 弹出 Monaco 编辑器 → 直接编辑 `settings.json` → 保存。

保存前自动备份到 `backups/settings.{时间戳}.json`。

### 完整配置页面

左侧导航栏 → **配置** → 进入独立配置编辑页。

### 配置文件结构

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_API_KEY": "sk-xxxxxxxx",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxxxxxxx",
    "ANTHROPIC_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash"
  },
  "model": "sonnet"
}
```

### 配置项说明

| 配置项 | 必需 | 说明 |
|--------|------|------|
| `ANTHROPIC_BASE_URL` | 是 | API 端点地址 |
| `ANTHROPIC_API_KEY` | 是 | API 密钥 |
| `ANTHROPIC_MODEL` | 是 | 默认模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 否 | Sonnet 级别模型 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 否 | Opus 级别模型 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 否 | Haiku 级别模型 |

---

## 6. 项目管理

### 扫描项目

1. 导航栏 → **项目**
2. 输入工作区路径（如 `D:\projects`）或点击 **浏览** 选择文件夹
3. 点击 **扫描**
4. 自动发现含 `.git` 或 `.claude` 目录的项目
5. 跳过 `node_modules`、`target`、`.git` 目录（最多 4 层深度）

### 项目卡片

每个项目卡片显示：
- 项目名称和路径
- Git / Claude 标签
- 最后修改时间
- **Launch Terminal** 按钮 → 在新终端打开 Claude Code
- **Changes** 按钮 → 查看 Git 变更

### 手动添加

在项目页底部点击 **手动添加** → 选择文件夹。

---

## 7. 终端

### 打开终端

1. 底部栏切换到 **终端** 标签
2. 或导航到 `/terminal` 路由

### 终端功能

- 通过 PTY 连接到系统 Shell（Windows: cmd.exe）
- 支持 `.claude` 命令直接启动 Claude Code
- 自动适应窗口大小
- 支持 URL 点击跳转（WebLinksAddon）

### 状态指示

| 颜色 | 状态 |
|------|------|
| 🟡 黄色闪烁 | 正在连接 |
| 🟢 绿色 | 已连接 |
| 🔴 红色 | 已关闭 |

---

## 8. 会话历史

### 查看历史

导航栏 → **会话** → 查看所有历史会话卡片。

### 会话详情

点击任一卡片查看：
- 会话元数据（创建时间、模型、消息数）
- 最近 20 条对话记录
- 角色标识（用户 / AI）

### 继续历史会话

在任务列表中点击任务的 **继续** 按钮，即可加载历史消息并继续对话。

---

## 9. 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送消息 |
| `Shift + Enter` | 消息换行 |
| `Escape` | 关闭弹窗 / 取消新建任务 |

---

## 10. 常见问题

### Q: 发送消息后没有回复？

**检查配置**：确保 `D:\claude_data\.claude\settings.json` 中已正确设置：
- `env.ANTHROPIC_API_KEY` — 有效的 API 密钥
- `env.ANTHROPIC_BASE_URL` — 正确的 API 端点

**检查网络**：确认能访问 `https://api.deepseek.com`。

### Q: 如何更换 API 端点？

编辑 `settings.json` 中的 `ANTHROPIC_BASE_URL`：
- DeepSeek: `https://api.deepseek.com/anthropic`
- Anthropic 官方: `https://api.anthropic.com`
- 自定义代理: `http://your-proxy:port`

### Q: 配置保存失败？

两种可能：
1. `D:\claude_data\.claude\` 目录无写入权限 → 检查文件夹权限
2. JSON 格式错误 → 使用在线 JSON 校验工具检查

### Q: 任务消息会丢失吗？

不会。每条消息在发送/接收后立即写入 `sessions/{任务ID}/history.jsonl`。即使应用崩溃，消息也已持久化。

### Q: 如何备份数据？

整个数据目录在 `D:\claude_data\.claude\`：
- 直接复制该目录即可完整备份
- 配置修改时自动备份到 `backups/` 子目录

### Q: 能同时进行多个对话吗？

可以。创建多个任务，每个任务有独立的对话上下文和历史。在任务列表间点击切换。

### Q: 流式生成太长可以中断吗？

可以。生成过程中点击红色方块停止按钮，已生成的内容会保留。

### Q: 应用启动失败？

1. 确保 Node.js ≥ 18 和 Rust 已安装
2. 确保 `npm install` 成功完成
3. 检查 `D:\claude_data\.claude\` 目录权限
4. 查看终端错误日志

---

## 技术支持

- **配置路径**: `D:\claude_data\.claude\settings.json`
- **会话存储**: `D:\claude_data\.claude\sessions\`
- **配置备份**: `D:\claude_data\.claude\backups\`

---

*最后更新: 2026-06-01*

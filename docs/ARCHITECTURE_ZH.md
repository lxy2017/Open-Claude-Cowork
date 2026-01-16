# 🏗️ Claude-Cowork 项目架构分析

> 本文档详细分析了 Claude-Cowork 项目的整体框架、核心逻辑，以及它是如何成为 AI 协作伙伴并调用底层 Claude Code 的。

---

## 一、项目概览

**Claude-Cowork** 是一个基于 **Electron** 的桌面 AI 协作助手，它封装了 Anthropic 官方的 `@anthropic-ai/claude-agent-sdk` SDK，将原本只能在终端运行的 **Claude Code** 转变为一个具有可视化界面的桌面应用。

### 核心价值

- 🖥️ **可视化界面**：将 Claude Code 的终端交互转为图形界面
- 🔄 **完全兼容**：复用 `~/.claude/settings.json` 配置
- 📂 **会话管理**：支持多会话、历史记录、流式输出可视化
- 🔐 **权限控制**：敏感操作需要用户确认

---

## 二、技术栈架构

| 层级 | 技术 | 说明 |
|------|------|------|
| **桌面框架** | Electron 39 | 主进程 + 渲染进程架构 |
| **前端** | React 19 + Tailwind CSS 4 | 现代化 UI 框架 |
| **状态管理** | Zustand | 轻量级状态管理 |
| **数据库** | better-sqlite3 (WAL 模式) | 本地会话持久化 |
| **AI 核心** | `@anthropic-ai/claude-agent-sdk` | 调用底层 Claude Code |
| **构建工具** | Vite + electron-builder | 开发和打包 |

---

## 三、项目目录结构

```
Claude-Cowork/
├── src/
│   ├── electron/                    # Electron 主进程代码
│   │   ├── main.ts                  # 应用入口点
│   │   ├── preload.cts              # 预加载脚本 (IPC 桥接)
│   │   ├── ipc-handlers.ts          # IPC 事件处理器
│   │   ├── types.ts                 # 类型定义
│   │   └── libs/
│   │       ├── runner.ts            # 🔑 核心：Claude SDK 调用
│   │       ├── claude-settings.ts   # 配置加载
│   │       ├── session-store.ts     # 会话存储 (SQLite)
│   │       └── util.ts              # 工具函数
│   │
│   └── ui/                          # 渲染进程 (React 前端)
│       ├── App.tsx                  # 主应用组件
│       ├── main.tsx                 # React 入口
│       ├── types.ts                 # 前端类型定义
│       ├── components/              # UI 组件
│       │   ├── Sidebar.tsx          # 侧边栏会话列表
│       │   ├── PromptInput.tsx      # 输入框
│       │   ├── EventCard.tsx        # 消息卡片
│       │   ├── StartSessionModal.tsx # 新建会话弹窗
│       │   └── DecisionPanel.tsx    # 权限决策面板
│       ├── hooks/
│       │   └── useIPC.ts            # IPC 通信 Hook
│       └── store/
│           └── useAppStore.ts       # 全局状态管理
```

---

## 四、整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Claude-Cowork Desktop App                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────┐        IPC          ┌──────────────────┐  │
│  │   渲染进程 (React)    │ ◄───────────────► │   主进程 (Node)   │  │
│  │                      │   preload.cts      │                  │  │
│  │  • App.tsx           │                    │  • main.ts       │  │
│  │  • useAppStore.ts    │   ClientEvent ──►  │  • ipc-handlers  │  │
│  │  • useIPC.ts         │   ◄── ServerEvent  │  • runner.ts     │  │
│  │  • Components        │                    │  • session-store │  │
│  └──────────────────────┘                    └────────┬─────────┘  │
│                                                       │             │
│                                                       ▼             │
│                              ┌─────────────────────────────────┐   │
│                              │  @anthropic-ai/claude-agent-sdk │   │
│                              │                                 │   │
│                              │  • query() - 核心交互函数        │   │
│                              │  • unstable_v2_prompt()         │   │
│                              │  • 流式消息处理                   │   │
│                              └─────────────────────────────────┘   │
│                                              │                      │
│                                              ▼                      │
│                              ┌─────────────────────────────────┐   │
│                              │     ~/.claude/settings.json     │   │
│                              │     (Claude Code 配置文件)       │   │
│                              └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 五、核心流程分析

### 1. 🔑 如何调用底层 Claude Code

核心代码位于 **`src/electron/libs/runner.ts`**，这是项目成为 "AI 协作伙伴" 的关键：

```typescript
import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";

export async function runClaude(options: RunnerOptions): Promise<RunnerHandle> {
  const { prompt, session, resumeSessionId, onEvent, onSessionUpdate } = options;
  const abortController = new AbortController();

  // 调用 Claude Agent SDK 的核心函数
  const q = query({
    prompt,                                      // 用户输入
    options: {
      cwd: session.cwd ?? DEFAULT_CWD,           // 工作目录
      resume: resumeSessionId,                   // 恢复会话
      abortController,                           // 中止控制器
      env: enhancedEnv,                          // 环境变量
      pathToClaudeCodeExecutable: claudeCodePath, // Claude CLI 路径
      permissionMode: "bypassPermissions",        // 权限模式
      includePartialMessages: true,              // 包含部分消息
      allowDangerouslySkipPermissions: true,     // 跳过权限
      
      // 🔑 工具权限回调
      canUseTool: async (toolName, input, { signal }) => {
        if (toolName === "AskUserQuestion") {
          // 需要用户交互的工具，发送权限请求到前端
          const toolUseId = crypto.randomUUID();
          sendPermissionRequest(toolUseId, toolName, input);
          
          // 等待用户响应
          return new Promise<PermissionResult>((resolve) => {
            session.pendingPermissions.set(toolUseId, {
              toolUseId, toolName, input,
              resolve: (result) => {
                session.pendingPermissions.delete(toolUseId);
                resolve(result as PermissionResult);
              }
            });
          });
        }
        // 其他工具自动批准
        return { behavior: "allow", updatedInput: input };
      }
    }
  });

  // 处理流式消息
  for await (const message of q) {
    // 提取 session_id
    if (message.type === "system" && message.subtype === "init") {
      session.claudeSessionId = message.session_id;
      onSessionUpdate?.({ claudeSessionId: message.session_id });
    }

    // 发送消息到前端
    sendMessage(message);

    // 更新会话状态
    if (message.type === "result") {
      const status = message.subtype === "success" ? "completed" : "error";
      onEvent({ type: "session.status", payload: { sessionId, status, title } });
    }
  }
}
```

#### 关键点解析

| 功能 | SDK API | 说明 |
|------|---------|------|
| **核心调用** | `query()` | 发送 prompt 到 Claude，返回流式响应迭代器 |
| **会话恢复** | `resume` 参数 | 支持继续之前的对话 |
| **权限控制** | `canUseTool` 回调 | 自定义工具执行权限 |
| **标题生成** | `unstable_v2_prompt()` | 用于生成会话标题 |
| **流式处理** | `for await...of` | 实时处理 Claude 响应 |

---

### 2. 配置兼容性

**`src/electron/libs/claude-settings.ts`** 实现了与 Claude Code 的配置兼容：

```typescript
export function loadClaudeSettingsEnv(): ClaudeSettingsEnv {
  const settingsPath = join(homedir(), ".claude", "settings.json");
  const parsed = JSON.parse(readFileSync(settingsPath, "utf8"));
  
  // 将 settings.json 中的 env 注入到 process.env
  if (parsed.env) {
    for (const [key, value] of Object.entries(parsed.env)) {
      if (process.env[key] === undefined && value !== undefined) {
        process.env[key] = String(value);
      }
    }
  }
}
```

支持的环境变量：

- `ANTHROPIC_AUTH_TOKEN` - API 密钥
- `ANTHROPIC_BASE_URL` - API 端点
- `ANTHROPIC_MODEL` - 默认模型
- `ANTHROPIC_DEFAULT_HAIKU_MODEL` - Haiku 模型
- `ANTHROPIC_DEFAULT_OPUS_MODEL` - Opus 模型
- `ANTHROPIC_DEFAULT_SONNET_MODEL` - Sonnet 模型
- `API_TIMEOUT_MS` - API 超时时间
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` - 禁用非必要流量

---

### 3. 前后端通信 (IPC)

#### 事件类型定义 (`src/electron/types.ts`)

```typescript
// 服务器 -> 客户端 事件
type ServerEvent =
  | { type: "stream.message"; payload: { sessionId, message } }
  | { type: "stream.user_prompt"; payload: { sessionId, prompt } }
  | { type: "session.status"; payload: { sessionId, status, title, cwd, error? } }
  | { type: "session.list"; payload: { sessions } }
  | { type: "session.history"; payload: { sessionId, status, messages } }
  | { type: "session.deleted"; payload: { sessionId } }
  | { type: "permission.request"; payload: { sessionId, toolUseId, toolName, input } }
  | { type: "runner.error"; payload: { sessionId?, message } };

// 客户端 -> 服务器 事件
type ClientEvent =
  | { type: "session.start"; payload: { title, prompt, cwd?, allowedTools? } }
  | { type: "session.continue"; payload: { sessionId, prompt } }
  | { type: "session.stop"; payload: { sessionId } }
  | { type: "session.delete"; payload: { sessionId } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId } }
  | { type: "permission.response"; payload: { sessionId, toolUseId, result } };
```

#### 预加载桥接 (`src/electron/preload.cts`)

```typescript
electron.contextBridge.exposeInMainWorld("electron", {
  // 发送客户端事件到主进程
  sendClientEvent: (event) => electron.ipcRenderer.send("client-event", event),
  
  // 订阅服务器事件
  onServerEvent: (callback) => {
    electron.ipcRenderer.on("server-event", (_, payload) => {
      callback(JSON.parse(payload));
    });
  },
  
  // 生成会话标题
  generateSessionTitle: (userInput) => ipcInvoke("generate-session-title", userInput),
  
  // 获取最近的工作目录
  getRecentCwds: (limit) => ipcInvoke("get-recent-cwds", limit),
  
  // 选择目录
  selectDirectory: () => ipcInvoke("select-directory")
});
```

---

### 4. 数据持久化

**`src/electron/libs/session-store.ts`** 使用 SQLite 存储会话数据：

```typescript
export class SessionStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    // 启用 WAL 模式提高写入性能
    this.db.exec(`pragma journal_mode = WAL;`);
    
    // 会话表
    this.db.exec(`
      create table if not exists sessions (
        id text primary key,
        title text,
        claude_session_id text,
        status text not null,
        cwd text,
        allowed_tools text,
        last_prompt text,
        created_at integer not null,
        updated_at integer not null
      )
    `);

    // 消息表
    this.db.exec(`
      create table if not exists messages (
        id text primary key,
        session_id text not null,
        data text not null,        -- JSON 存储消息
        created_at integer not null,
        foreign key (session_id) references sessions(id)
      )
    `);
    
    // 索引
    this.db.exec(`create index if not exists messages_session_id on messages(session_id)`);
  }
}
```

---

## 六、成为 "AI 协作伙伴" 的关键设计

### 1. 🔄 会话管理流程

```
用户创建会话 → ipc-handlers.ts (session.start)
                    ↓
              runner.ts (runClaude)
                    ↓
              Claude Agent SDK (query)
                    ↓
              流式消息 → 前端实时渲染
                    ↓
              会话结果存入 SQLite
```

### 2. 🎯 流式输出处理

前端 **`App.tsx`** 中的实时消息处理：

```typescript
const handlePartialMessages = useCallback((partialEvent: ServerEvent) => {
  if (partialEvent.type !== "stream.message") return;

  const message = partialEvent.payload.message;
  
  if (message.event.type === "content_block_start") {
    setShowPartialMessage(true);  // 开始显示
  }

  if (message.event.type === "content_block_delta") {
    partialMessageRef.current += getPartialMessageContent(message.event);
    setPartialMessage(partialMessageRef.current);  // 逐字更新
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });  // 自动滚动
  }

  if (message.event.type === "content_block_stop") {
    setShowPartialMessage(false);  // 完成
  }
}, []);
```

### 3. 🔐 权限控制机制

```
Claude 请求使用工具 (如 AskUserQuestion)
           ↓
runner.ts canUseTool 回调
           ↓
创建 pendingPermission, 发送 permission.request 到前端
           ↓
前端 DecisionPanel 显示权限请求
           ↓
用户决策 (允许/拒绝) → permission.response 发回主进程
           ↓
resolve Promise, 继续执行
```

---

## 七、IPC 事件处理

**`src/electron/ipc-handlers.ts`** 是事件处理的核心：

```typescript
export function handleClientEvent(event: ClientEvent) {
  // 列出所有会话
  if (event.type === "session.list") {
    emit({
      type: "session.list",
      payload: { sessions: sessions.listSessions() }
    });
    return;
  }

  // 获取会话历史
  if (event.type === "session.history") {
    const history = sessions.getSessionHistory(event.payload.sessionId);
    emit({
      type: "session.history",
      payload: {
        sessionId: history.session.id,
        status: history.session.status,
        messages: history.messages
      }
    });
    return;
  }

  // 开始新会话
  if (event.type === "session.start") {
    const session = sessions.createSession({
      cwd: event.payload.cwd,
      title: event.payload.title,
      allowedTools: event.payload.allowedTools,
      prompt: event.payload.prompt
    });

    // 调用 Claude
    runClaude({
      prompt: event.payload.prompt,
      session,
      resumeSessionId: session.claudeSessionId,
      onEvent: emit,
      onSessionUpdate: (updates) => {
        sessions.updateSession(session.id, updates);
      }
    });
    return;
  }

  // 继续会话
  if (event.type === "session.continue") {
    // ... 恢复之前的对话
  }

  // 停止会话
  if (event.type === "session.stop") {
    // ... 中止正在运行的会话
  }

  // 删除会话
  if (event.type === "session.delete") {
    // ... 删除会话及其消息
  }

  // 权限响应
  if (event.type === "permission.response") {
    // ... 处理用户的权限决策
  }
}
```

---

## 八、工作流程时序图

```
┌─────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐     ┌─────────────┐
│用户 │     │React UI │     │IPC Bridge │     │  主进程   │     │ Claude SDK  │
└──┬──┘     └────┬────┘     └─────┬─────┘     └─────┬─────┘     └──────┬──────┘
   │             │                │                 │                   │
   │ 输入Prompt  │                │                 │                   │
   │────────────►│                │                 │                   │
   │             │ session.start  │                 │                   │
   │             │───────────────►│                 │                   │
   │             │                │ handleClientEvent                   │
   │             │                │────────────────►│                   │
   │             │                │                 │ 创建Session        │
   │             │                │                 │──────────┐        │
   │             │                │                 │          │        │
   │             │                │                 │◄─────────┘        │
   │             │                │                 │                   │
   │             │                │                 │ runClaude()       │
   │             │                │                 │──────────────────►│
   │             │                │                 │                   │
   │             │                │                 │      query()      │
   │             │                │                 │                   │───► Anthropic API
   │             │                │                 │                   │
   │             │                │                 │   流式响应         │◄─── 响应
   │             │                │                 │◄──────────────────│
   │             │                │  stream.message │                   │
   │             │                │◄────────────────│                   │
   │             │  更新UI        │                 │                   │
   │             │◄───────────────│                 │                   │
   │  实时显示   │                │                 │                   │
   │◄────────────│                │                 │                   │
   │             │                │                 │                   │
   │             │                │                 │      result       │
   │             │                │                 │◄──────────────────│
   │             │                │ session.status  │                   │
   │             │                │◄────────────────│                   │
   │             │  完成          │                 │                   │
   │◄────────────│◄───────────────│                 │                   │
   │             │                │                 │                   │
```

---

## 九、前端状态管理

**`src/ui/store/useAppStore.ts`** 使用 Zustand 管理全局状态：

```typescript
interface AppState {
  sessions: Record<string, SessionView>;      // 所有会话
  activeSessionId: string | null;             // 当前活动会话
  prompt: string;                             // 当前输入
  cwd: string;                                // 当前工作目录
  pendingStart: boolean;                      // 是否正在启动
  globalError: string | null;                 // 全局错误
  sessionsLoaded: boolean;                    // 会话是否已加载
  showStartModal: boolean;                    // 是否显示启动弹窗
  historyRequested: Set<string>;              // 已请求历史的会话
  
  // Actions
  handleServerEvent: (event: ServerEvent) => void;  // 处理服务器事件
  setActiveSessionId: (id: string | null) => void;  // 设置活动会话
  resolvePermissionRequest: (sessionId, toolUseId) => void;  // 解决权限请求
  // ...
}
```

---

## 十、核心能力总结

| 能力 | 实现方式 |
|------|----------|
| **代码编写/编辑** | Claude SDK 内置工具 |
| **文件管理** | Claude SDK 文件系统工具 |
| **命令执行** | Claude SDK bash 工具 |
| **问答交互** | 自然语言处理 |
| **工具调用可视化** | EventCard.tsx 组件 |
| **会话恢复** | claudeSessionId + SQLite 持久化 |
| **配置兼容** | 直接读取 ~/.claude/settings.json |
| **流式输出** | for await...of 异步迭代 |
| **权限控制** | canUseTool 回调 + 前端决策面板 |

---

## 十一、关键创新点

1. **SDK 封装**：将 `@anthropic-ai/claude-agent-sdk` 的 `query()` 函数封装为可视化交互

2. **配置复用**：直接读取 Claude Code 的 `~/.claude/settings.json`，无需重复配置

3. **会话持久化**：使用 SQLite 存储会话和消息，支持历史恢复

4. **流式渲染**：实时显示 Claude 的思考过程和输出

5. **权限交互**：将工具权限请求可视化，用户可以明确控制 Claude 的操作

---

## 十二、总结

Claude-Cowork 的核心创新在于：**将 Claude Code CLI 的强大功能封装成可视化桌面应用**。

通过以下技术实现：

- **Electron** 提供桌面应用框架
- **IPC 机制** 桥接前后端通信
- **`@anthropic-ai/claude-agent-sdk`** 的 `query()` 函数作为底层调用入口
- **SQLite** 实现数据持久化
- **React + Zustand** 构建响应式 UI

最终实现了完全兼容 Claude Code 配置的 AI 协作体验，让用户能够通过图形界面与 Claude 进行自然语言交互，完成代码编写、文件管理、命令执行等各种任务。

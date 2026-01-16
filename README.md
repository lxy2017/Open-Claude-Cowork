
<div align="center">

# Open Claude Cowork

[![Version](https://img.shields.io/badge/version-0.0.3-blue.svg)](https://github.com/DevAgentForge/Claude-Cowork/releases)
[![Platform](https://img.shields.io/badge/platform-%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/DevAgentForge/Claude-Cowork/releases)
[![Fork](https://img.shields.io/badge/Fork%20From-DevAgentForge%2FClaude--Cowork-green.svg)](https://github.com/DevAgentForge/Claude-Cowork)

> 🔱 **Forked from [DevAgentForge/Claude-Cowork](https://github.com/DevAgentForge/Claude-Cowork)**

[简体中文](README_ZH.md)
  
</div>

![Architecture](docs/Gemini_Generated_Image_21vt9021vt9021vt.png)

---

## 📋 Changelog

### v0.0.3 (2026-01-16)

#### 🆕 Custom LLM Provider Support (PR #26)
- **Multi-Model Support**: Added ability to configure custom API providers (Anthropic native API, OpenRouter, LiteLLM, etc.)
- **Secure Encryption**: API tokens are encrypted using Electron's `safeStorage` for secure credential storage
- **Auto Environment Mapping**: Automatically overrides `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` when custom provider is selected
- **Model Tiers**: Support for specifying different model names for Opus, Sonnet, and Haiku tiers

#### 🌐 Internationalization & UI Improvements (PR #21)
- **Multi-Language Support (i18n)**: Introduced internationalization framework with English and Chinese support
- **UI Polish**:
  - Optimized sidebar navigation logic
  - Improved scrollbar styling
  - Fixed visual flickering during window switching

#### 🔧 Application Stability & Process Management (PR #15)
- **Reliable Resource Cleanup**: Ensures Vite and Claude Code processes are properly terminated on app exit
- **Startup Fix**: Resolved Claude Code initialization failures in Electron environment
- **Race Condition Fix**: Fixed window display race conditions

#### 🛠 Developer Tools & Build Scripts
- **One-Click Scripts**: Added `start.sh` (quick start) and `build-dmg.sh` (macOS packaging)
- **Smart Package Manager Detection**: Automatically detects and uses bun or npm
- **Build Optimization**: Updated TypeScript configuration for improved compilation stability

#### 🔒 Code Quality & Security Enhancements
- **Path Validation Fix**: Rewrote `sanitizePath` function to fix path corruption bug
- **Provider Validation**: Added URL format validation to ensure correct configuration
- **Multi-Platform Support**: Smart Node.js path detection for ARM/Intel Mac and Linux
- **Error Handling**: Improved encryption/decryption error logging, graceful window load failure handling

---

# About Open Claude Cowork

A **desktop AI assistant** that helps you with **programming, file management, and any task you can describe**.

It is **fully compatible with the exact same configuration as Claude Code**, which means you can run it with **any Anthropic-compatible large language model**.

> Not just a GUI.  
> A real AI collaboration partner.  
> No need to learn the Claude Agent SDK — just create tasks and choose execution paths.

An example of organizing a local folder:


https://github.com/user-attachments/assets/8ce58c8b-4024-4c01-82ee-f8d8ed6d4bba


---

## ✨ Why Claude Cowork?

Claude Code is powerful — but it **only runs in the terminal**.

That means:
- ❌ No visual feedback for complex tasks
- ❌ Hard to track multiple sessions
- ❌ Tool outputs are inconvenient to inspect

**Agent Cowork solves these problems:**

- 🖥️ Runs as a **native desktop application**
- 🤖 Acts as your **AI collaboration partner** for any task
- 🔁 Reuses your **existing `~/.claude/settings.json`**
- 🧠 **100% compatible** with Claude Code

If Claude Code works on your machine —  
**Agent Cowork works too.**

---

## 🚀 Quick Start

Before using Agent Cowork, make sure Claude Code is installed and properly configured.

### Option 1: Download a Release

👉 [Go to Releases](https://github.com/DevAgentForge/agent-cowork/releases)

---

### Option 2: Build from Source

#### Prerequisites

- [Bun](https://bun.sh/) or Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

bash
# Clone the repository
git clone https://github.com/DevAgentForge/agent-cowork.git
cd agent-cowork

# Install dependencies
bun install

# Run in development mode
bun run dev

# Or build production binaries
bun run dist:mac    # macOS
bun run dist:win    # Windows
bun run dist:linux  # Linux
`

---

## 🧠 Core Capabilities

### 🤖 AI Collaboration Partner — Not Just a GUI

Agent Cowork is your AI partner that can:

* **Write and edit code** — in any programming language
* **Manage files** — create, move, and organize
* **Run commands** — build, test, deploy
* **Answer questions** — about your codebase
* **Do anything** — as long as you can describe it in natural language

---

### 📂 Session Management

* Create sessions with **custom working directories**
* Resume any previous conversation
* Complete local session history (stored in SQLite)
* Safe deletion and automatic persistence

---

### 🎯 Real-Time Streaming Output

* **Token-by-token streaming output**
* View Claude’s reasoning process
* Markdown rendering with syntax-highlighted code
* Visualized tool calls with status indicators

---

### 🔐 Tool Permission Control

* Explicit approval required for sensitive actions
* Allow or deny per tool
* Interactive decision panels
* Full control over what Claude is allowed to do

---

## 🔁 Fully Compatible with Claude Code

Agent Cowork **shares configuration with Claude Code**.

It directly reuses:

text
~/.claude/settings.json


This means:

* Same API keys
* Same base URL
* Same models
* Same behavior

> Configure Claude Code once — use it everywhere.

---

## 🧩 Architecture Overview

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Framework        | Electron 39                    |
| Frontend         | React 19, Tailwind CSS 4       |
| State Management | Zustand                        |
| Database         | better-sqlite3 (WAL mode)      |
| AI               | @anthropic-ai/claude-agent-sdk |
| Build            | Vite, electron-builder         |

---

## 🛠 Development

bash
# Start development server (hot reload)
bun run dev

# Type checking / build
bun run build


---

## 🗺 Roadmap

Planned features:

* GUI-based configuration for models and API keys
* 🚧 More features coming soon

---

## 🤝 Contributing

Pull requests are welcome.

1. Fork this repository
2. Create your feature branch
3. Commit your changes
4. Open a Pull Request

---

## ⭐ Final Words

If you’ve ever wanted:

* A persistent desktop AI collaboration partner
* Visual insight into how Claude works
* Convenient session management across projects

This project is built for you.

👉 **If it helps you, please give it a Star.**

---

## License

MIT




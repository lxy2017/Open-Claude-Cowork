import { claudeCodeEnv } from "./claude-settings.js";
import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk";
import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { app } from "electron";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

// Get Claude Code CLI path for packaged app
export function getClaudeCodePath(): string | undefined {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk/cli.js'
    );
  }
  // In development, we can use the one in node_modules
  return join(app.getAppPath(), 'node_modules/@anthropic-ai/claude-agent-sdk/cli.js');
}

// Get Node.js executable path with smart detection
export function getNodePath(): string {
  // Check environment variable first (allows user override)
  if (process.env.NODE_EXECUTABLE && existsSync(process.env.NODE_EXECUTABLE)) {
    return process.env.NODE_EXECUTABLE;
  }

  // Common Node.js installation paths in order of preference
  const candidates = [
    '/opt/homebrew/bin/node',      // macOS ARM (Homebrew)
    '/usr/local/bin/node',         // macOS Intel (Homebrew) / Linux
    '/usr/bin/node',               // Linux system
    join(homedir(), '.nvm/versions/node', process.version, 'bin/node'),  // NVM
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback: use the current process executable if it's Node
  // (This works when running in Electron with ELECTRON_RUN_AS_NODE=1)
  if (process.execPath && process.execPath.includes('node')) {
    return process.execPath;
  }

  // Last resort: rely on PATH
  console.warn('[util] Could not find Node.js executable, falling back to "node" from PATH');
  return 'node';
}

// Build enhanced PATH for packaged environment
export function getEnhancedEnv(): Record<string, string | undefined> {
  const home = homedir();
  const additionalPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${home}/.bun/bin`,
    '/usr/bin',
    '/bin',
  ];

  const currentPath = process.env.PATH || '';
  const newPath = [...additionalPaths, currentPath].join(':');

  return {
    ...process.env,
    PATH: newPath,
    ELECTRON_RUN_AS_NODE: '1',
    // Include settings from settings.json if they exist in claudeCodeEnv
    ANTHROPIC_AUTH_TOKEN: claudeCodeEnv.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN,
    ANTHROPIC_BASE_URL: claudeCodeEnv.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_BASE_URL,
    ANTHROPIC_MODEL: claudeCodeEnv.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL,
  };
}

// Exported constants for convenience
export const claudeCodePath = getClaudeCodePath();
export const enhancedEnv = getEnhancedEnv();
export const nodePath = getNodePath();

export const generateSessionTitle = async (userIntent: string | null) => {
  if (!userIntent) return "New Session";

  // Get fresh env with API settings explicitly included
  // IMPORTANT: ELECTRON_RUN_AS_NODE=1 is required when running SDK from Electron main process
  // Without it, the spawned 'node' process would actually run as Electron, causing failures
  const envForPrompt = getEnhancedEnv();

  console.log("[generateSessionTitle] Starting with config:", {
    model: claudeCodeEnv.ANTHROPIC_MODEL,
    baseUrl: claudeCodeEnv.ANTHROPIC_BASE_URL,
    hasAuthToken: !!claudeCodeEnv.ANTHROPIC_AUTH_TOKEN,
    pathToClaudeCodeExecutable: claudeCodePath,
    envHasToken: !!envForPrompt.ANTHROPIC_AUTH_TOKEN,
    envBaseUrl: envForPrompt.ANTHROPIC_BASE_URL,
  });

  try {
    const result: SDKResultMessage = await unstable_v2_prompt(
      `please analynis the following user input to generate a short but clearly title to identify this conversation theme:
      ${userIntent}
      directly output the title, do not include any other content`, {
      model: claudeCodeEnv.ANTHROPIC_MODEL,
      env: envForPrompt,
      pathToClaudeCodeExecutable: claudeCodePath,
      executable: nodePath, // Explicitly use system node
      stderr: (msg: string) => {
        console.error("[generateSessionTitle] Claude Code Stderr:", msg);
      }
    } as any);

    console.log("[generateSessionTitle] Result:", result);

    if (result.subtype === "success") {
      return result.result;
    }

    console.warn("[generateSessionTitle] Result was not success:", result.subtype);
    return "New Session";
  } catch (error) {
    console.error("[generateSessionTitle] Error:", error);
    throw error; // Re-throw to let frontend handle it with the original error message
  }
};

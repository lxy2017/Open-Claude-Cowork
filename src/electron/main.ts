import { app, ipcMain, dialog, globalShortcut } from "electron"
import { execSync } from "child_process";
import { ipcMainHandle, isDev, DEV_PORT } from "./util.js";
import { getPreloadPath } from "./pathResolver.js";
import { getStaticData, pollResources, stopPolling } from "./test.js";
import { handleClientEvent, sessions, cleanupAllSessions } from "./ipc-handlers.js";
import { generateSessionTitle } from "./libs/util.js";
import type { ClientEvent } from "./types.js";
import { WindowManager } from "./window-manager.js";
import "./libs/claude-settings.js";
import { existsSync } from "fs";

const windowManager = WindowManager.getInstance();

// Cleanup logic from PR #15
let cleanupComplete = false;

function killViteDevServer(): void {
    if (!isDev()) return;
    try {
        console.log(`[Main] Cleaning up Vite dev server on port ${DEV_PORT}...`);
        if (process.platform === 'win32') {
            // Windows: find and kill process by port
            execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${DEV_PORT} ^| findstr LISTENING') do taskkill /PID %a /F 2>nul`, { stdio: 'ignore', shell: 'cmd.exe' });
        } else {
            // Unix: use lsof to find process by port, then kill
            // Only kill if the process exists (graceful)
            execSync(`lsof -ti:${DEV_PORT} | xargs kill 2>/dev/null || true`, { stdio: 'ignore' });
        }
        console.log('[Main] Vite dev server cleanup completed');
    } catch (e) {
        // Process may already be dead or port not in use
        console.log('[Main] Vite dev server cleanup: no process found or already terminated');
    }
}

function cleanup(): void {
    if (cleanupComplete) return;
    cleanupComplete = true;

    console.log('[Main] Running cleanup...');
    globalShortcut.unregisterAll();
    stopPolling();
    cleanupAllSessions();
    killViteDevServer();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    // Handle second instance
    app.on("second-instance", () => {
        windowManager.focus();
    });
}

app.on("ready", async () => {
    try {
        // Validate resources exist
        if (!existsSync(getPreloadPath())) {
            throw new Error(`Preload script not found at ${getPreloadPath()}`);
        }

        await windowManager.initialize();

        const win = windowManager.getMainWindow();
        if (!win) {
            throw new Error("Failed to create main window");
        }

        if (isDev()) {
            win.webContents.openDevTools();
            console.log('[Main] Loading dev URL:', `http://localhost:${DEV_PORT}`);
        }

        pollResources(win);

        // IPC handlers
        ipcMainHandle("getStaticData", () => {
            return getStaticData();
        });

        ipcMain.on("client-event", (_event: any, event: ClientEvent) => {
            handleClientEvent(event);
        });

        ipcMainHandle("generate-session-title", async (_: any, userInput: string | null) => {
            return await generateSessionTitle(userInput);
        });

        ipcMainHandle("get-recent-cwds", (_: any, limit?: number) => {
            const boundedLimit = limit ? Math.min(Math.max(limit, 1), 20) : 8;
            return sessions.listRecentCwds(boundedLimit);
        });

        ipcMainHandle("select-directory", async () => {
            const result = await dialog.showOpenDialog(win, {
                properties: ['openDirectory']
            });

            if (result.canceled) {
                return null;
            }

            return result.filePaths[0];
        });

        // Register global shortcuts
        globalShortcut.register('CommandOrControl+Q', () => {
            app.quit();
        });

        console.log('App ready');
    } catch (error) {
        console.error("Failed to initialize app:", error);
        dialog.showErrorBox(
            "Initialization Error",
            `Failed to start the application:\n${error instanceof Error ? error.message : String(error)}`
        );
        app.quit();
    }
});

// Window lifecycle handlers
app.on("before-quit", cleanup);
app.on("will-quit", cleanup);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (windowManager.isDestroyed()) {
        windowManager.initialize();
    } else {
        windowManager.focus();
    }
});

// Signal handling
function handleSignal(): void {
    app.quit();
}

process.on("SIGTERM", handleSignal);
process.on("SIGINT", handleSignal);
process.on("SIGHUP", handleSignal);

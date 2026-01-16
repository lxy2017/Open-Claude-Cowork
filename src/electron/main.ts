import { app, ipcMain, dialog } from "electron"
import { ipcMainHandle, isDev, DEV_PORT } from "./util.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";
import { getStaticData, pollResources, cleanupPolling } from "./test.js";
import { handleClientEvent, sessions } from "./ipc-handlers.js";
import { generateSessionTitle } from "./libs/util.js";
import type { ClientEvent } from "./types.js";
import { WindowManager } from "./window-manager.js";
import "./libs/claude-settings.js";
import { existsSync } from "fs";

// Track polling interval for cleanup
let pollingIntervalId: ReturnType<typeof setInterval> | null = null;

const windowManager = WindowManager.getInstance();

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

        pollingIntervalId = pollResources(win);

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

        // Window lifecycle handlers
        win.on("closed", () => {
            cleanupPolling(pollingIntervalId);
            pollingIntervalId = null;
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

// Window lifecycle - Mac
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        cleanupPolling(pollingIntervalId);
        app.quit();
    }
});

app.on("before-quit", () => {
    cleanupPolling(pollingIntervalId);
});

app.on("activate", () => {
    if (windowManager.isDestroyed()) {
        windowManager.initialize();
    } else {
        windowManager.focus();
    }
});

import { BrowserWindow, screen, type WebContents } from "electron";
import { getPreloadPath, getUIPath, getIconPath } from "./pathResolver.js";
import { isDev, DEV_PORT } from "./util.js";

export class WindowManager {
    private static instance: WindowManager | null = null;
    private mainWindow: BrowserWindow | null = null;

    static getInstance(): WindowManager {
        if (!WindowManager.instance) {
            WindowManager.instance = new WindowManager();
        }
        return WindowManager.instance;
    }

    private createWindow(): BrowserWindow {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;

        const win = new BrowserWindow({
            width: Math.min(1200, width * 0.85),
            height: Math.min(800, height * 0.85),
            minWidth: 900,
            minHeight: 600,
            webPreferences: {
                preload: getPreloadPath(),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true
            },
            icon: getIconPath(),
            titleBarStyle: "hidden",
            titleBarOverlay: {
                color: "#FAF9F6",
                symbolColor: "#333333",
                height: 40
            },
            backgroundColor: "#FAF9F6",
            show: false
        });

        return win;
    }

    async initialize(): Promise<void> {
        this.mainWindow = this.createWindow();

        // Show window when ready (prevents flash of white screen)
        this.mainWindow.once("ready-to-show", () => {
            console.log('[WindowManager] Window ready-to-show');
            this.mainWindow?.show();
            this.mainWindow?.focus();
        });

        // Handle page load failures gracefully
        this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
            console.error(`[WindowManager] Failed to load ${validatedURL}: ${errorDescription} (code: ${errorCode})`);
            // Still show the window so user can see something went wrong
            if (this.mainWindow && !this.mainWindow.isVisible()) {
                this.mainWindow.show();
            }
        });

        // Log console messages in development
        if (isDev()) {
            this.mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
                const levels = ['LOG', 'WARN', 'ERROR'];
                console.log(`[Renderer ${levels[level] || 'LOG'}] ${message} (${sourceId}:${line})`);
            });
        }

        try {
            if (isDev()) {
                console.log(`[WindowManager] Loading dev URL: http://localhost:${DEV_PORT}`);
                await this.mainWindow.loadURL(`http://localhost:${DEV_PORT}`);
            } else {
                console.log(`[WindowManager] Loading production UI: ${getUIPath()}`);
                await this.mainWindow.loadFile(getUIPath());
            }
        } catch (error) {
            console.error('[WindowManager] Failed to load content:', error);
            // Ensure window is visible even if loading failed
            if (this.mainWindow && !this.mainWindow.isVisible()) {
                this.mainWindow.show();
            }
            throw error;
        }

        this.mainWindow.on("closed", () => {
            this.mainWindow = null;
        });
    }

    getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    getWebContents(): WebContents | null {
        return this.mainWindow?.webContents ?? null;
    }

    focus(): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            if (this.mainWindow.isMinimized()) {
                this.mainWindow.restore();
            }
            this.mainWindow.focus();
            this.mainWindow.show();
        }
    }

    isDestroyed(): boolean {
        return !this.mainWindow || this.mainWindow.isDestroyed();
    }
}

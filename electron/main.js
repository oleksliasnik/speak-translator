"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const isDev = !electron_1.app.isPackaged;
const electron_serve_1 = __importDefault(require("electron-serve"));
const loadURL = (0, electron_serve_1.default)({ directory: "out" });
let mainWindow = null;
let mouseEventsIgnored = false;
let winX = 0;
let winY = 0;
let winW = 0;
let winH = 0;
let isMovingProgrammatically = false;
function createWindow() {
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    // 3/4 of the screen size
    const windowWidth = Math.round(width * 0.75);
    const windowHeight = Math.round(height * 0.75);
    mainWindow = new electron_1.BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        // Center it initially
        x: (winX = Math.round((width - windowWidth) / 2)),
        y: (winY = Math.round((height - windowHeight) / 2)),
        icon: path_1.default.join(__dirname, "../assets/icon.png"),
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
        frame: false, // Frameless
        transparent: true, // Transparent
        alwaysOnTop: true, // Always on top
        hasShadow: false,
        resizable: false, // Disable by default
        backgroundColor: "#00000000",
        skipTaskbar: false,
    });
    winW = windowWidth;
    winH = windowHeight;
    mainWindow.setFullScreenable(false);
    // Enable visibility across all workspaces and screens
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    if (process.platform === "win32") {
        // High-level always-on-top for Windows
        mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    }
    // CRITICAL: Content Protection for "Invisible Mode" against screenshots/recording
    // Default to false to make app visible for screenshots
    mainWindow.setContentProtection(false);
    // Load the app
    if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
    }
    else {
        loadURL(mainWindow);
    }
    // Handle desktop capture requests for system audio
    electron_1.session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        electron_1.desktopCapturer
            .getSources({ types: ["screen"] })
            .then((sources) => {
            callback({ video: sources[0], audio: "loopback" });
        })
            .catch((err) => {
            console.error("Error getting sources:", err);
            callback({});
        });
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    // Register global shortcuts
    console.log("Main Process: registerShortcuts() called");
    registerShortcuts();
    // Sync state ONLY when user drags with mouse
    mainWindow.on("move", () => {
        if (!isMovingProgrammatically && mainWindow) {
            const b = mainWindow.getBounds();
            winX = b.x;
            winY = b.y;
        }
    });
    mainWindow.on("resize", () => {
        if (mainWindow) {
            const b = mainWindow.getBounds();
            winW = b.width;
            winH = b.height;
        }
    });
}
function registerShortcuts() {
    // Shortcut to toggle "Ignore Mouse Events" (Click-through)
    electron_1.globalShortcut.register("CommandOrControl+I", () => {
        if (mainWindow) {
            toggleClickThrough();
        }
    });
    // Shortcut to Minimize/Restore (Hide/Show)
    electron_1.globalShortcut.register("CommandOrControl+\|", () => {
        if (!mainWindow)
            return;
        if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
            mainWindow.minimize();
        }
        else {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    // Window Movement Shortcuts (Ctrl + Num 8, 2, 4, 6)
    const MOVE_STEP = 20;
    const performMove = () => {
        if (mainWindow && mainWindow.isVisible()) {
            isMovingProgrammatically = true;
            mainWindow.setBounds({
                x: Math.round(winX),
                y: Math.round(winY),
                width: Math.round(winW),
                height: Math.round(winH),
            }, false);
            setTimeout(() => {
                isMovingProgrammatically = false;
            }, 50);
        }
    };
    const moveUp = () => {
        winY -= MOVE_STEP;
        performMove();
    };
    const moveDown = () => {
        winY += MOVE_STEP;
        performMove();
    };
    const moveLeft = () => {
        winX -= MOVE_STEP;
        performMove();
    };
    const moveRight = () => {
        winX += MOVE_STEP;
        performMove();
    };
    electron_1.globalShortcut.register("CommandOrControl+num8", moveUp);
    electron_1.globalShortcut.register("CommandOrControl+num2", moveDown);
    electron_1.globalShortcut.register("CommandOrControl+num4", moveLeft);
    electron_1.globalShortcut.register("CommandOrControl+num6", moveRight);
    // Arrows fallback
    electron_1.globalShortcut.register("CommandOrControl+Up", moveUp);
    electron_1.globalShortcut.register("CommandOrControl+Down", moveDown);
    electron_1.globalShortcut.register("CommandOrControl+Left", moveLeft);
    electron_1.globalShortcut.register("CommandOrControl+Right", moveRight);
}
function toggleClickThrough() {
    if (!mainWindow)
        return;
    mouseEventsIgnored = !mouseEventsIgnored;
    if (mouseEventsIgnored) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    else {
        mainWindow.setIgnoreMouseEvents(false);
    }
    // Notify renderer of state change
    mainWindow.webContents.send("click-through-state", mouseEventsIgnored);
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("will-quit", () => {
    electron_1.globalShortcut.unregisterAll();
});
// IPC Handlers
electron_1.ipcMain.handle("set-ignore-mouse-events", (event, ignore) => {
    if (!mainWindow)
        return;
    mouseEventsIgnored = ignore;
    if (ignore) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    else {
        mainWindow.setIgnoreMouseEvents(false);
    }
    mainWindow.webContents.send("click-through-state", mouseEventsIgnored);
});
electron_1.ipcMain.handle("set-opacity", (event, opacity) => {
    if (mainWindow) {
        mainWindow.setOpacity(opacity);
    }
});
electron_1.ipcMain.handle("minimize-window", () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle("close-window", () => {
    mainWindow?.close();
});
electron_1.ipcMain.handle("get-desktop-sources", async () => {
    const sources = await electron_1.desktopCapturer.getSources({ types: ["screen"] });
    return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
    }));
});
electron_1.ipcMain.handle("resize-window", (event, { width, height, x, y }) => {
    if (mainWindow) {
        mainWindow.setResizable(true);
        mainWindow.setBounds({ width, height, x, y });
        mainWindow.setResizable(false);
        // Also update our state
        winX = x;
        winY = y;
        winW = width;
        winH = height;
    }
});
electron_1.ipcMain.handle("get-window-bounds", () => {
    return mainWindow ? mainWindow.getBounds() : null;
});
// IPC handler for move-window is now DEPRECATED.
// Using global shortcuts in the main process for better monitor support.
electron_1.ipcMain.handle("move-window", (event, dx, dy) => {
    if (mainWindow) {
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({
            x: Math.round(bounds.x + dx),
            y: Math.round(bounds.y + dy),
            width: bounds.width,
            height: bounds.height,
        });
    }
});
electron_1.ipcMain.handle("set-content-protection", (event, protect) => {
    if (mainWindow) {
        mainWindow.setContentProtection(protect);
        // Hide the taskbar icon when the app is invisible for screenshots
        mainWindow.setSkipTaskbar(protect);
    }
});

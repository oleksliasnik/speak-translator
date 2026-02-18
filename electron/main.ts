import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  screen,
  session,
  desktopCapturer,
} from "electron";
import path from "path";
const isDev = !app.isPackaged;
import serve from "electron-serve";

const loadURL = serve({ directory: "out" });

let mainWindow: BrowserWindow | null = null;
let mouseEventsIgnored = false;
let winX = 0;
let winY = 0;
let winW = 0;
let winH = 0;
let isMovingProgrammatically = false;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // 3/4 of the screen size
  const windowWidth = Math.round(width * 0.75);
  const windowHeight = Math.round(height * 0.75);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    // Center it initially
    x: (winX = Math.round((width - windowWidth) / 2)),
    y: (winY = Math.round((height - windowHeight) / 2)),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
    skipTaskbar: true,
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
  mainWindow.setContentProtection(true);

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    loadURL(mainWindow);
  }

  // Handle desktop capture requests for system audio
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer
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
  globalShortcut.register("CommandOrControl+I", () => {
    if (mainWindow) {
      toggleClickThrough();
    }
  });

  // Shortcut to Minimize/Restore (Hide/Show)
  globalShortcut.register("CommandOrControl+\|", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.minimize();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Window Movement Shortcuts (Ctrl + Num 8, 2, 4, 6)
  const MOVE_STEP = 20;

  const performMove = () => {
    if (mainWindow && mainWindow.isVisible()) {
      isMovingProgrammatically = true;
      mainWindow.setBounds(
        {
          x: Math.round(winX),
          y: Math.round(winY),
          width: Math.round(winW),
          height: Math.round(winH),
        },
        false,
      );
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

  globalShortcut.register("CommandOrControl+num8", moveUp);
  globalShortcut.register("CommandOrControl+num2", moveDown);
  globalShortcut.register("CommandOrControl+num4", moveLeft);
  globalShortcut.register("CommandOrControl+num6", moveRight);

  // Arrows fallback
  globalShortcut.register("CommandOrControl+Up", moveUp);
  globalShortcut.register("CommandOrControl+Down", moveDown);
  globalShortcut.register("CommandOrControl+Left", moveLeft);
  globalShortcut.register("CommandOrControl+Right", moveRight);
}

function toggleClickThrough() {
  if (!mainWindow) return;
  mouseEventsIgnored = !mouseEventsIgnored;
  if (mouseEventsIgnored) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
  // Notify renderer of state change
  mainWindow.webContents.send("click-through-state", mouseEventsIgnored);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.handle("set-ignore-mouse-events", (event, ignore: boolean) => {
  if (!mainWindow) return;
  mouseEventsIgnored = ignore;
  if (ignore) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
  mainWindow.webContents.send("click-through-state", mouseEventsIgnored);
});

ipcMain.handle("set-opacity", (event, opacity: number) => {
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
  }
});

ipcMain.handle("minimize-window", () => {
  mainWindow?.minimize();
});

ipcMain.handle("close-window", () => {
  mainWindow?.close();
});

ipcMain.handle("get-desktop-sources", async () => {
  const sources = await desktopCapturer.getSources({ types: ["screen"] });
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
  }));
});

ipcMain.handle("resize-window", (event, { width, height, x, y }) => {
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

ipcMain.handle("get-window-bounds", () => {
  return mainWindow ? mainWindow.getBounds() : null;
});

// IPC handler for move-window is now DEPRECATED.
// Using global shortcuts in the main process for better monitor support.
ipcMain.handle("move-window", (event, dx: number, dy: number) => {
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

const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  screen,
  session,
  desktopCapturer,
} = require("electron");
const path = require("path");
const isDev = !app.isPackaged;
const _serve = require("electron-serve");
const serve = typeof _serve === "function" ? _serve : _serve.default;

const loadURL = serve({ directory: "out" });

let mainWindow;
let mouseEventsIgnored = false;
let captureProtectionEnabled = false;
let winX = 0;
let winY = 0;
let winW = 0;
let winH = 0;
let isMovingProgrammatically = false;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.speak-translator.app");
}

function getAppIconPath() {
  return path.join(app.getAppPath(), "assets", "icon.png");
}

function setCaptureProtection(enabled) {
  if (!mainWindow) return;
  captureProtectionEnabled = !!enabled;
  mainWindow.setContentProtection(!!enabled);
  mainWindow.setSkipTaskbar(!!enabled);
}

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
    width: (winW = windowWidth),
    height: (winH = windowHeight),
    icon: getAppIconPath(),
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
    backgroundColor: "#00000000", // Fully transparent
    resizable: false, // Prevents Windows Snap Layouts during movement
    skipTaskbar: false,
  });

  // Enable visibility across all workspaces and screens
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setFullScreenable(false);

  if (process.platform === "win32") {
    // High-level always-on-top for Windows
    mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
  }

  setCaptureProtection(false);

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
        // Grant access to the first screen source
        callback({ video: sources[0], audio: "loopback" });
      })
      .catch((err) => {
        console.error("Error getting sources:", err);
        callback({});
      });
  });

  // Open the DevTools in dev mode
  if (isDev) {
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

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
  // Ctrl+I
  globalShortcut.register("CommandOrControl+I", () => {
    if (mainWindow) {
      toggleClickThrough();
    }
  });

  // Shortcut to Minimize/Restore (Hide/Show)
  // Ctrl+\
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
      // Reset flag after a short delay to allow 'move' event to fire and be ignored
      // setTimeout(() => {
      //   isMovingProgrammatically = false;
      // }, 50);
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

  // Numpad Support
  globalShortcut.register("CommandOrControl+num8", moveUp);
  globalShortcut.register("CommandOrControl+num2", moveDown);
  globalShortcut.register("CommandOrControl+num4", moveLeft);
  globalShortcut.register("CommandOrControl+num6", moveRight);

  // Arrow Keys Support (as fallback)
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
  if (gotTheLock) createWindow();

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
ipcMain.handle("set-ignore-mouse-events", (event, ignore) => {
  if (!mainWindow) return;
  mouseEventsIgnored = ignore;
  if (ignore) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
  mainWindow.webContents.send("click-through-state", mouseEventsIgnored);
});

// Deprecated: UI now handles opacity via CSS
// keeping it just in case, but functionality is moved to renderer for 'background only' opacity
ipcMain.handle("set-opacity", (event, opacity) => {
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
  }
});

ipcMain.handle("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("close-window", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("set-capture-protection", (_event, enabled) => {
  setCaptureProtection(enabled);
});

ipcMain.handle("get-capture-protection", () => {
  return captureProtectionEnabled;
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

ipcMain.handle("move-window", (event, dx, dy) => {
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

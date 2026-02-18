"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electron", {
    setIgnoreMouseEvents: (ignore) => electron_1.ipcRenderer.invoke("set-ignore-mouse-events", ignore),
    setOpacity: (opacity) => electron_1.ipcRenderer.invoke("set-opacity", opacity),
    minimize: () => electron_1.ipcRenderer.invoke("minimize-window"),
    close: () => electron_1.ipcRenderer.invoke("close-window"),
    moveWindow: (dx, dy) => electron_1.ipcRenderer.invoke("move-window", dx, dy),
    resizeWindow: (bounds) => electron_1.ipcRenderer.invoke("resize-window", bounds),
    getWindowBounds: () => electron_1.ipcRenderer.invoke("get-window-bounds"),
    getDesktopSources: () => electron_1.ipcRenderer.invoke("get-desktop-sources"),
    setContentProtection: (protect) => electron_1.ipcRenderer.invoke("set-content-protection", protect),
    onClickThroughState: (callback) => {
        electron_1.ipcRenderer.on("click-through-state", (_event, state) => callback(state));
    },
});

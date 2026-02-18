const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  setIgnoreMouseEvents: (ignore) =>
    ipcRenderer.invoke("set-ignore-mouse-events", ignore),
  setOpacity: (opacity) => ipcRenderer.invoke("set-opacity", opacity),
  minimize: () => ipcRenderer.invoke("minimize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),
  resizeWindow: (bounds) => ipcRenderer.invoke("resize-window", bounds),
  getWindowBounds: () => ipcRenderer.invoke("get-window-bounds"),
  moveWindow: (dx, dy) => ipcRenderer.invoke("move-window", dx, dy),
  onClickThroughState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("click-through-state", listener);
    return () => ipcRenderer.removeListener("click-through-state", listener);
  },
});

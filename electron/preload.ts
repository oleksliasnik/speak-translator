import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.invoke("set-ignore-mouse-events", ignore),
  setOpacity: (opacity: number) => ipcRenderer.invoke("set-opacity", opacity),
  minimize: () => ipcRenderer.invoke("minimize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  setCaptureProtection: (enabled: boolean) =>
    ipcRenderer.invoke("set-capture-protection", enabled),
  getCaptureProtection: () => ipcRenderer.invoke("get-capture-protection"),
  moveWindow: (dx: number, dy: number) =>
    ipcRenderer.invoke("move-window", dx, dy),
  resizeWindow: (bounds: any) => ipcRenderer.invoke("resize-window", bounds),
  getWindowBounds: () => ipcRenderer.invoke("get-window-bounds"),
  getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),
  onClickThroughState: (callback: (state: boolean) => void) => {
    ipcRenderer.on("click-through-state", (_event, state) => callback(state));
  },
});

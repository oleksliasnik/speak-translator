export {};

declare global {
  interface Window {
    electron?: {
      setIgnoreMouseEvents: (ignore: boolean) => Promise<void>;
      setOpacity: (opacity: number) => Promise<void>;
      minimize: () => Promise<void>;
      close: () => Promise<void>;
      setCaptureProtection: (enabled: boolean) => Promise<void>;
      getCaptureProtection: () => Promise<boolean>;
      getDesktopSources: () => Promise<any[]>;
      moveWindow: (dx: number, dy: number) => Promise<void>;
      resizeWindow: (bounds: {
        width: number;
        height: number;
        x: number;
        y: number;
      }) => Promise<void>;
      getWindowBounds: () => Promise<{
        width: number;
        height: number;
        x: number;
        y: number;
      } | null>;
      onClickThroughState: (callback: (state: boolean) => void) => () => void;
    };
  }
}

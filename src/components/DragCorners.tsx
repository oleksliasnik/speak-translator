"use client";

import { useState, useEffect } from "react";
import { Move } from "lucide-react";

export const DragCorners = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render if mounted and inside Electron
  if (!mounted || (typeof window !== "undefined" && !window.electron))
    return null;

  const dragStyle = { WebkitAppRegion: "drag" } as React.CSSProperties;

  return (
    <>
      {/* Bottom Left Corner */}
      <div
        className="fixed bottom-2 left-2 z-50 bg-black/20 p-6 px-14 rounded-lg backdrop-blur text-white border border-white/10 shadow-lg hover:bg-black/30 transition-all cursor-default"
        style={dragStyle}
        title="Drag to move window"
      >
        <Move className="w-4 h-4 text-gray-400" />
      </div>

      {/* Bottom Right Corner */}
      <div
        className="fixed bottom-2 right-2 z-50 bg-black/20 p-6 px-14 rounded-lg backdrop-blur text-white border border-white/10 shadow-lg hover:bg-black/30 transition-all cursor-default"
        style={dragStyle}
        title="Drag to move window"
      >
        <Move className="w-4 h-4 text-gray-400" />
      </div>
    </>
  );
};

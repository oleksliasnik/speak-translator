"use client";

import React, { useState, useEffect, useRef } from "react";

type Direction = "n" | "s" | "e" | "w";

export const ResizeHandles = () => {
  const [mounted, setMounted] = useState(false);
  const isResizing = useRef(false);
  const direction = useRef<Direction | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startBounds = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    setMounted(true);

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !direction.current || !window.electron) return;

      const deltaX = e.screenX - startPos.current.x;
      const deltaY = e.screenY - startPos.current.y;

      const newBounds = { ...startBounds.current };

      if (direction.current === "e") {
        newBounds.width = Math.max(400, startBounds.current.width + deltaX);
      } else if (direction.current === "w") {
        const width = Math.max(400, startBounds.current.width - deltaX);
        newBounds.x =
          startBounds.current.x + (startBounds.current.width - width);
        newBounds.width = width;
      } else if (direction.current === "s") {
        newBounds.height = Math.max(300, startBounds.current.height + deltaY);
      } else if (direction.current === "n") {
        const height = Math.max(300, startBounds.current.height - deltaY);
        newBounds.y =
          startBounds.current.y + (startBounds.current.height - height);
        newBounds.height = height;
      }

      window.electron.resizeWindow(newBounds);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      direction.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onMouseDown = async (e: React.MouseEvent, dir: Direction) => {
    if (!window.electron) return;

    e.preventDefault();
    e.stopPropagation();

    const bounds = await window.electron.getWindowBounds();
    if (!bounds) return;

    isResizing.current = true;
    direction.current = dir;
    startPos.current = { x: e.screenX, y: e.screenY };
    startBounds.current = bounds;

    document.body.style.cursor = "default";
  };

  if (!mounted || (typeof window !== "undefined" && !window.electron))
    return null;

  const noDragStyle = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

  return (
    <>
      {/* Top */}
      <div
        onMouseDown={(e) => onMouseDown(e, "n")}
        className="group fixed -top-4 left-1/2 -translate-x-1/2 w-full h-8 flex items-center justify-center z-100 cursor-default"
        style={noDragStyle}
      >
        <div className="w-10 h-3 bg-gray-500/50 rounded-full group-hover:bg-gray-400 transition-colors" />
      </div>
      {/* Bottom */}
      <div
        onMouseDown={(e) => onMouseDown(e, "s")}
        className="group fixed -bottom-4 left-3/4 -translate-x-1/2 w-full h-8 flex items-center justify-center z-100 cursor-default"
        style={noDragStyle}
      >
        <div className="w-10 h-3 bg-gray-500/50 rounded-full group-hover:bg-gray-400 transition-colors" />
      </div>
      {/* Left */}
      <div
        onMouseDown={(e) => onMouseDown(e, "w")}
        className="group fixed -left-4 top-1/2 -translate-y-1/2 w-8 h-full flex items-center justify-center z-100 cursor-default"
        style={noDragStyle}
      >
        <div className="w-3 h-10 bg-gray-500/50 rounded-full group-hover:bg-gray-400 transition-colors" />
      </div>
      {/* Right */}
      <div
        onMouseDown={(e) => onMouseDown(e, "e")}
        className="group fixed -right-5 top-1/2 -translate-y-1/2 w-10 h-full flex items-center justify-center z-100 cursor-default"
        style={noDragStyle}
      >
        <div className="w-3 h-10 bg-gray-500/50 rounded-full group-hover:bg-gray-400 transition-colors" />
      </div>
    </>
  );
};

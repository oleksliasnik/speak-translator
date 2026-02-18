"use client";

import { useState, useEffect } from "react";
import { MousePointerClick, Minus, X, Move, ChevronLeft, Eye } from "lucide-react";

interface WindowControlsProps {
  onOpacityChange: (opacity: number) => void;
}

export const WindowControls = ({ onOpacityChange }: WindowControlsProps) => {
  const [opacity, setOpacity] = useState(0.9); // CSS Opacity
  const [clickThrough, setClickThrough] = useState(false);
  const [contentProtection, setContentProtection] = useState(false); // Default to false (visible for screenshots)
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      const cleanup = window.electron.onClickThroughState((state) => {
        setClickThrough(state);
      });
      return cleanup;
    }
  }, []);

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setOpacity(value);
    onOpacityChange(value);
  };

  const toggleClickThrough = () => {
    const newState = !clickThrough;
    setClickThrough(newState);
    window.electron?.setIgnoreMouseEvents(newState);
  };

  const toggleContentProtection = () => {
    const newState = !contentProtection;
    setContentProtection(newState);
    window.electron?.setContentProtection(newState);
  };

  // Only render if mounted and inside Electron
  if (!mounted || (typeof window !== "undefined" && !window.electron))
    return null;

  const dragStyle = { WebkitAppRegion: "drag" } as React.CSSProperties;
  const noDragStyle = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

  return (
    <div
      className="flex items-center justify-end gap-2 bg-black/20 p-2 py-1 rounded-lg backdrop-blur text-white border border-white/10 shadow-lg"
      style={dragStyle}
    >
      {/* Drag Handle Icon (Visual indicator) */}
      <div
        className="flex items-center justify-center w-5 text-gray-400 hover:text-white ml-1"
        title="Drag to move"
      >
        <Move className="w-4 h-4" />
      </div>

      <div className="w-px h-4 bg-white/20 mx-1" />

      {/* Settings Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseDown={(e) => e.stopPropagation()}
        className={`p-1.5 rounded-md transition-all text-gray-400 hover:text-white hover:bg-white/10`}
        title={isExpanded ? "Hide Settings" : "Show Settings"}
        style={noDragStyle}
      >
        <ChevronLeft
          className={`w-4 h-4 transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsible Content */}
      <div
        className={`flex items-center gap-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-w-[300px] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        {/* Content Protection Toggle (Screenshot Visibility) */}
        <button
          onClick={toggleContentProtection}
          onMouseDown={(e) => e.stopPropagation()}
          className={`p-1.5 rounded-md transition-all shrink-0 ${
            contentProtection
              ? "bg-green-500/10 hover:bg-green-500/20 text-green-400"
              : "hover:bg-white/10 text-gray-300 hover:text-white"
          }`}
          title={
            contentProtection
              ? "Invisible for screenshots ON (icon hidden from taskbar)"
              : "Visible for screenshots (icon visible in taskbar)"
          }
          style={noDragStyle}
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Opacity Slider */}
        <div
          className="flex items-center gap-2 group mx-1 p-1"
          style={noDragStyle}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={handleOpacityChange}
            className="w-20 h-0.5 bg-gray-600 rounded-lg appearance-none cursor-default accent-blue-900"
            title="Adjust Background Opacity"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* Click Through Toggle */}
        <button
          onClick={toggleClickThrough}
          onMouseDown={(e) => e.stopPropagation()}
          className={`p-1.5 rounded-md transition-all shrink-0 ${
            clickThrough
              ? "hover:bg-white/10 text-gray-300 hover:text-white"
              : "bg-red-500/10 hover:bg-red-500/20 text-white"
          }`}
          title={
            clickThrough
              ? "Click-through ON. Press Ctrl+I to disable."
              : "Enable Click-through (Ctrl+I)"
          }
          style={noDragStyle}
        >
          {clickThrough ? (
            <div className="text-[8px] font-bold">Ctrl+I</div>
          ) : (
            <MousePointerClick className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="w-px h-4 bg-white/20 mx-1" />

      {/* Window Actions */}
      <button
        onClick={() => window.electron?.minimize()}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 hover:bg-white/10 rounded-md text-gray-300 hover:text-white"
        title="Minimize (Ctrl+| to restore)"
        style={noDragStyle}
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={() => window.electron?.close()}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md text-gray-300 transition-colors"
        style={noDragStyle}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

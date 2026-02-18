"use client";
import React from "react";
import { Type } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";

const FontSizeControl: React.FC = () => {
  const { fontSize, setFontSize } = useLiveStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(parseFloat(e.target.value));
  };

  return (
    <div className="flex items-center gap-2 transition-all">
      {/* <Type className="w-4 h-4 text-gray-400" /> */}
      <input
        type="range"
        min="0.8"
        max="2"
        step="0.1"
        value={fontSize}
        onChange={handleChange}
        className="w-16 h-0.5 bg-gray-600 rounded-lg appearance-none cursor-default accent-blue-900"
        title={`Font Size: ${fontSize.toFixed(1)}x`}
      />
      <span className="text-xs text-gray-400 w-8">{fontSize.toFixed(1)}x</span>
    </div>
  );
};

export default FontSizeControl;

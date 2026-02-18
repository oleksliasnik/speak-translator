"use client";
import React from "react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import { Circle } from "lucide-react";

const RecordingToggle: React.FC = () => {
  const { isRecordingEnabled, setIsRecordingEnabled, interfaceLanguage } =
    useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  return (
    <button
      className={`group flex items-center justify-center w-7 h-7 sm:w-7 sm:h-7 p-0.5 rounded-full border-3 transition-all duration-300 cursor-pointer
                ${
                  isRecordingEnabled
                    ? "bg-red-500/0 hover:bg-red-500/50 border-red-500/30 hover:border-red-500/80 animate-pulse"
                    : "bg-slate-800/50 border-slate-500/50 hover:bg-slate-600 hover:border-slate-400"
                }`}
      style={{ WebkitAppRegion: "no-drag" } as any}
      onClick={() => setIsRecordingEnabled(!isRecordingEnabled)}
      title={isRecordingEnabled ? t.recordingOff : t.recordingOn}
    >
      <Circle
        className={`w-5 h-5 transition-all duration-300 
          ${
            isRecordingEnabled
              ? "text-transparent fill-red-500/40 group-hover:fill-red-500"
              : "text-transparent fill-slate-500/50 group-hover:fill-slate-400"
          }`}
      />
    </button>
  );
};

export default RecordingToggle;

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
                    ? "bg-red-500/0 border-red-500/70 hover:border-red-500 animate-pulse"
                    : "bg-slate-800/50 border-slate-500/80 hover:bg-red-500/10 hover:border-red-500/30"
                }`}
      style={{ WebkitAppRegion: "no-drag" } as any}
      onClick={() => setIsRecordingEnabled(!isRecordingEnabled)}
      title={isRecordingEnabled ? t.recordingOff : t.recordingOn}
    >
      <Circle
        className={`w-5 h-5 transition-all duration-300 
          ${
            isRecordingEnabled
              ? "text-transparent fill-red-500/70 group-hover:fill-red-500"
              : "text-transparent fill-slate-500/80 group-hover:fill-red-500/30"
          }`}
      />
    </button>
  );
};

export default RecordingToggle;

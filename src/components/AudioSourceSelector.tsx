"use client";

import { Mic, Laptop, Layers } from "lucide-react";
import { AudioMode } from "@/hooks/useSystemAudio";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

interface AudioSourceSelectorProps {
  mode: AudioMode;
  onChange: (mode: AudioMode) => void;
  disabled?: boolean;
}

export const AudioSourceSelector = ({
  mode,
  onChange,
  disabled,
}: AudioSourceSelectorProps) => {
  const { interfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  return (
    <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg w-fit">
      <button
        onClick={() => onChange("microphone")}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
          mode === "microphone"
            ? "bg-blue-600/30 text-white shadow-sm"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}
        title={t.microphone || "Microphone Only"}
      >
        <Mic className="w-4 h-4" />
        <span className="hidden lg:inline">{t.microphoneShort || "Mic"}</span>
      </button>

      <button
        onClick={() => onChange("system")}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
          mode === "system"
            ? "bg-blue-600/30 text-white shadow-sm"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}
        title={t.system || "System Audio Only"}
      >
        <Laptop className="w-4 h-4" />
        <span className="hidden lg:inline">{t.system || "System"}</span>
      </button>

      <button
        onClick={() => onChange("both")}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
          mode === "both"
            ? "bg-blue-600/30 text-white shadow-sm"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}
        title={t.both || "System + Microphone"}
      >
        <Layers className="w-4 h-4" />
        <span className="hidden lg:inline">{t.bothShort || "Both"}</span>
      </button>
    </div>
  );
};

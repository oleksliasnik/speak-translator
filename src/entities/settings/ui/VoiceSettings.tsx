"use client";
import React from "react";
import { Mic2, ChevronDown } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

interface VoiceSettingsProps {
  onVoiceChange: () => void;
}

const VOICES = ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Zephyr"];

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ onVoiceChange }) => {
  const { voiceName, setVoiceName, interfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  const handleVoiceSelect = (voice: string) => {
    setVoiceName(voice);
    onVoiceChange();
  };

  return (
    <div className="p-4 border-b border-slate-800">
      <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <Mic2 className="w-4 h-4" />
        {t.voice}
      </h3>
      <div className="relative group">
        <select
          value={voiceName}
          onChange={(e) => handleVoiceSelect(e.target.value)}
          className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-4 py-2.5 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition-colors"
        >
          {VOICES.map((v) => (
            <option key={v} value={v} className="bg-slate-800 text-slate-200">
              {v}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 group-hover:text-blue-400 transition-colors">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;

"use client";
import React, { useState } from "react";
import { Settings as SettingsIcon, ChevronUp, X } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import InterfaceLanguageSettings from "@/entities/settings/ui/InterfaceLanguageSettings";
import ApiKeySettings from "@/entities/settings/ui/ApiKeySettings";
import VoiceSettings from "@/entities/settings/ui/VoiceSettings";
import VolumeControls from "@/entities/chat/ui/VolumeControls";

interface SettingsProps {
  onVoiceChange: () => void;
  isSidebarOpen: boolean;
}

const Settings: React.FC<SettingsProps> = ({
  onVoiceChange,
  isSidebarOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { interfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  return (
    <div
      className={`relative ${isOpen && isSidebarOpen ? "translate-x-3 duration-300 transition-transform ease-in-out" : "translate-x-0 duration-300 transition-transform ease-in-out"} bg-slate-900 border-t border-slate-800`}
    >
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {isOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-0.5 right-0.5 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="overflow-hidden bg-slate-950/50">
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar shadow-inner">
            <InterfaceLanguageSettings />
            <VoiceSettings onVoiceChange={onVoiceChange} />
            <ApiKeySettings />
            <VolumeControls />
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group outline-none"
      >
        <div className="flex items-center gap-2">
          <SettingsIcon
            className={`w-5 h-5 transition-colors ${isOpen ? "text-blue-400" : "text-slate-100"}`}
          />
          <span
            className={`text-sm font-bold transition-colors ${isOpen ? "text-blue-400" : "text-slate-100"}`}
          >
            {t.settings}
          </span>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-400" : ""}`}
        />
      </button>
    </div>
  );
};

export default Settings;

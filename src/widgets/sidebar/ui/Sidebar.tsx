"use client";
import React from "react";
import { X, Settings2 } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import Settings from "./Settings";
import ChatHistory from "@/widgets/chat-window/ui/ChatHistory";
import { profilePrompts } from "@/shared/lib/prompts";
import { ChevronDown, Sparkles } from "lucide-react";
import CustomInstructionSettings from "@/entities/settings/ui/CustomInstructionSettings";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceChange: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onVoiceChange,
}) => {
  const { interfaceLanguage, promptProfile, setPromptProfile } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  const profiles = [
    "default",
    ...Object.keys(profilePrompts).filter(
      (p) => p !== "default" && p !== "translation",
    ),
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          style={{ WebkitAppRegion: "no-drag" } as any}
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`
        fixed top-0 left-0 h-full w-80 bg-slate-900 border-r border-slate-800 z-100 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <button
              onClick={onClose}
              className=" text-blue-400 hover:text-white transition-colors"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            {t.menu}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Profile Selector */}
        <div className="relative border-b border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors group">
          <div className="p-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 whitespace-nowrap">
                {t.promptProfile}
              </span>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {t[
                  `profile${promptProfile.charAt(0).toUpperCase() + promptProfile.slice(1)}`
                ] || promptProfile}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
          </div>
          <select
            value={promptProfile}
            onChange={(e) => setPromptProfile(e.target.value)}
            className="p-4 absolute inset-0 w-full h-full opacity-0 cursor-pointer bg-slate-900 text-slate-100"
          >
            {profiles.map((profile) => (
              <option
                key={profile}
                value={profile}
                className="bg-slate-900 text-slate-100"
              >
                {t[
                  `profile${profile.charAt(0).toUpperCase() + profile.slice(1)}`
                ] || profile}
              </option>
            ))}
          </select>
        </div>

        <CustomInstructionSettings />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ChatHistory onSessionSelect={onClose} />
        </div>

        <Settings onVoiceChange={onVoiceChange} />
      </div>
    </>
  );
};

export default Sidebar;

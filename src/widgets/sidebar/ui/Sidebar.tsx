"use client";
import React from "react";
import { X, Settings2, Database } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import Settings from "./Settings";
import ChatHistory from "@/widgets/chat-window/ui/ChatHistory";
import { profilePrompts } from "@/shared/lib/prompts";
import PromptProfileSelector from "@/entities/settings/ui/PromptProfileSelector";
import CustomInstructionSettings from "@/entities/settings/ui/CustomInstructionSettings";
import DataManagementModal from "@/entities/settings/ui/DataManagementModal";

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
  const [isDataModalOpen, setIsDataModalOpen] = React.useState(false);
  const { interfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];


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

        <PromptProfileSelector />


        <CustomInstructionSettings />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ChatHistory onSessionSelect={onClose} />
        </div>

        <Settings onVoiceChange={onVoiceChange} isSidebarOpen={isOpen} />

        {/* Data Management Button */}
        <div className="bg-slate-900 border-t border-slate-800">
          <button
            onClick={() => setIsDataModalOpen(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group outline-none"
          >
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-100 group-hover:text-blue-400 transition-colors" />
              <span className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                {t.dataManagement}
              </span>
            </div>
          </button>
        </div>
      </div>

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
      />
    </>
  );
};

export default Sidebar;

"use client";
import React, { useState } from "react";
import { Terminal, Eraser, X, Maximize2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

const CustomInstructionSettings: React.FC = () => {
  const {
    customSystemInstruction,
    setCustomSystemInstruction,
    interfaceLanguage,
    promptProfile,
  } = useLiveStore();
  const [isOpen, setIsOpen] = useState(false);
  const t = translations[interfaceLanguage] || translations["uk"];

  const profileName =
    t[
      `profile${promptProfile.charAt(0).toUpperCase() + promptProfile.slice(1)}`
    ] || promptProfile;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomSystemInstruction("");
  };

  return (
    <div className="border-b border-slate-800">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group outline-none"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-400">
            {t.systemInstruction}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {customSystemInstruction && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          )}
          <Maximize2 className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
        </div>
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-200 flex items-center justify-center p-4 md:p-8">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Content */}
            <div className="relative w-full md:w-2/3 max-w-[800px] h-[85vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue-400" />
                    {t.systemInstruction}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
                    {t.currentMode}:{" "}
                    <span className="text-blue-400">{profileName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
                <div className="relative flex-1 flex flex-col">
                  <textarea
                    value={customSystemInstruction}
                    onChange={(e) => setCustomSystemInstruction(e.target.value)}
                    placeholder={t.systemInstructionPlaceholder}
                    autoFocus
                    className="flex-1 w-full bg-slate-950/50 text-slate-100 text-base rounded-lg px-4 py-4 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600 resize-none font-mono"
                  />
                  {customSystemInstruction && (
                    <button
                      onClick={handleClear}
                      className="absolute bottom-4 right-4 px-3 py-1.5 bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold backdrop-blur-sm border border-slate-700 hover:border-red-400/30"
                    >
                      <Eraser className="w-4 h-4" />
                      {t.clearAll}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default CustomInstructionSettings;

"use client";
import React from "react";
import { Globe, Sparkles } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import { LANGUAGES } from "@/shared/lib/constants";

interface LanguageModeControlProps {
  onSettingsChange: (updateFn: () => void) => void;
  onToggle: (isOpen: boolean) => void;
  isOpen: boolean;
}

const LanguageModeControl: React.FC<LanguageModeControlProps> = ({
  onSettingsChange,
  onToggle,
  isOpen,
}) => {
  const {
    targetLanguage,
    setTargetLanguage,
    translationSource,
    setTranslationSource,
    translationTarget,
    setTranslationTarget,
    mode,
    setMode,
    interfaceLanguage,
  } = useLiveStore();

  const t = translations[interfaceLanguage] || translations["uk"];

  const getDisplayName = (name: string) => {
    if (name === "Universal") return t.languageUniversal;
    return name;
  };

  return (
    <div className="relative group">
      <button
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors
                    ${isOpen && mode === "conversation" ? "bg-slate-700 text-blue-400 border-blue-500/50" : isOpen && mode === "translation" ? "bg-slate-700 text-purple-400 border-purple-500/50" : "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700"}`}
        onClick={() => onToggle(!isOpen)}
      >
        {mode === "conversation" ? (
          targetLanguage === "Universal" ? (
            <Sparkles className="w-4 h-4 text-blue-400" />
          ) : (
            <Globe className="w-4 h-4 text-blue-400" />
          )
        ) : (
          <div className="flex items-center gap-0.5">
            <Globe className="w-4 h-4 text-purple-400" />
          </div>
        )}
        <span className="hidden lg:inline">
          {mode === "conversation"
            ? getDisplayName(targetLanguage)
            : `${translationSource} ↔ ${translationTarget}`}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onToggle(false)} />
          <div className="absolute lg:left-0 lg:right-auto right-0 mt-2 w-64 bg-slate-800/80 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-700 bg-slate-900/50">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">
                {t.mode}
              </label>
              <div className="flex bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() =>
                    onSettingsChange(() => setMode("conversation"))
                  }
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === "conversation" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {t.modeConversation}
                </button>
                <button
                  onClick={() => onSettingsChange(() => setMode("translation"))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === "translation" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {t.modeTranslation}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                {mode === "conversation" ? t.modeConvDesc : t.modeTransDesc}
              </p>
            </div>

            <div className="max-h-[400px] bg-slate-900/70 overflow-y-auto py-1">
              {mode === "conversation" ? (
                <>
                  <label className="px-3 py-2 text-xs text-slate-500 font-bold uppercase tracking-wider block">
                    {t.targetLanguage}
                  </label>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() =>
                        onSettingsChange(() => {
                          setTargetLanguage(lang.name);
                          onToggle(false);
                        })
                      }
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center justify-between group ${targetLanguage === lang.name ? "text-blue-400 bg-slate-700/30" : "text-slate-300"}`}
                    >
                      <span className="flex items-center gap-2">
                        {lang.name === "Universal" && (
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        {getDisplayName(lang.name)}
                      </span>
                      {targetLanguage === lang.name && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <div className="flex w-full justify-center">
                  <div className="px-2 py-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">
                      {t.langA}
                    </label>
                    <div className="flex w-full flex-col gap-1">
                      {LANGUAGES.filter((l) => l.name !== "Universal").map(
                        (lang) => (
                          <button
                            key={lang.code}
                            onClick={() =>
                              onSettingsChange(() =>
                                setTranslationSource(lang.name),
                              )
                            }
                            className={`flex w-full justify-start px-2 py-1.5 text-[12px] rounded border transition-all ${translationSource === lang.name ? "bg-purple-600/20 text-purple-400 border-purple-500/50" : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700"}`}
                          >
                            {lang.name}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="border-l border-slate-700 " />

                  <div className="px-2 py-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">
                      {t.langB}
                    </label>
                    <div className="flex w-full flex-col gap-1">
                      {LANGUAGES.filter((l) => l.name !== "Universal").map(
                        (lang) => (
                          <button
                            key={lang.code}
                            onClick={() =>
                              onSettingsChange(() =>
                                setTranslationTarget(lang.name),
                              )
                            }
                            className={`flex w-full justify-start px-2 py-1.5 text-[12px] rounded border transition-all ${translationTarget === lang.name ? "bg-purple-600/20 text-purple-400 border-purple-500/50" : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700"}`}
                          >
                            {lang.name}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageModeControl;

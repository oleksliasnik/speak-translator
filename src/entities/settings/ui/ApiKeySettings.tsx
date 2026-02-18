"use client";
import React, { useState } from "react";
import { Key, Eye, EyeOff, ExternalLink, Info, Sparkles } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

const ApiKeySettings: React.FC = () => {
  const { apiKey, setApiKey, interfaceLanguage } = useLiveStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const t = translations[interfaceLanguage] || translations["uk"];

  const isApiKeyMissing = !apiKey || apiKey.trim() === "";

  return (
    <div className="p-4 border-b border-slate-800">
      <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <Key className="w-4 h-4" />
        {t.apiKey}
      </h3>
      <div className="relative group/input">
        <input
          type={showApiKey ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t.apiKeyPlaceholder}
          className={`
                        w-full bg-slate-800 text-slate-200 text-sm rounded-lg pl-4 pr-10 py-2.5 border 
                        outline-none transition-all duration-200 placeholder-slate-500
                        ${
                          isApiKeyMissing
                            ? "border-blue-500/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                            : "border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        }
                    `}
        />
        <button
          onClick={() => setShowApiKey(!showApiKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
        >
          {showApiKey ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Helper Link and Tooltip */}
      <div className="flex items-center justify-between mt-3">
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className={`
                        text-[11px] flex items-center gap-1.5 transition-all duration-300 group
                        ${
                          isApiKeyMissing
                            ? "text-blue-400 font-medium"
                            : "text-slate-400 hover:text-blue-400"
                        }
                    `}
        >
          <span>{t.getApiKey}</span>
          <ExternalLink
            className={`w-3 h-3 transition-transform duration-300 ${isApiKeyMissing ? "group-hover:translate-x-0.5 group-hover:-translate-y-0.5" : ""}`}
          />

          {isApiKeyMissing && (
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </a>

        <div className="relative flex items-center group cursor-help">
          <div
            className={`p-1 rounded-full transition-colors ${isApiKeyMissing ? "bg-blue-500/10 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Info className="w-3.5 h-3.5" />
          </div>

          {/* Enhanced Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 w-60 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-20 overflow-hidden">
            {/* Gradient Border Top */}
            <div className="h-1 w-full bg-linear-to-r from-blue-500 via-purple-500 to-blue-500"></div>

            <div className="p-3">
              <div className="flex items-start gap-3 mb-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200 mb-0.5">
                    Google AI Studio
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {t.apiKeyFreeTry}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/50">
                <p className="text-[10px] text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                  {t.apiKeyTooltip}
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="absolute -bottom-1.5 right-1.5 w-3 h-3 bg-slate-800 border-b border-r border-slate-700 rotate-45"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettings;

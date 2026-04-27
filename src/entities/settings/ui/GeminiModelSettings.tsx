"use client";
import React from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

const GeminiModelSettings: React.FC = () => {
  const { interfaceLanguage, geminiModel, setGeminiModel } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  const models = [
    { id: "live", name: t.modelLive },
    { id: "native", name: t.modelNative },
  ];

  return (
    <div className="p-4 border-b border-slate-800">
      <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <Cpu className="w-4 h-4" />
        {t.geminiModel}
      </h3>
      <div className="relative group">
        <select
          value={geminiModel}
          onChange={(e) => setGeminiModel(e.target.value as "live" | "native")}
          className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-4 py-2.5 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition-colors"
        >
          {models.map((m) => (
            <option
              key={m.id}
              value={m.id}
              className="bg-slate-800 text-slate-200"
            >
              {m.name}
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

export default GeminiModelSettings;

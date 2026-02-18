"use client";
import React from "react";
import { Languages, ChevronDown } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

const INTERFACE_LANGUAGES = [
  { code: "uk", name: "Українська" },
  { code: "en", name: "English" },
  { code: "pl", name: "Polski" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
];

const InterfaceLanguageSettings: React.FC = () => {
  const { interfaceLanguage, setInterfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  return (
    <div className="p-4 border-b border-slate-800">
      <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <Languages className="w-4 h-4" />
        {t.interfaceLanguage}
      </h3>
      <div className="relative group">
        <select
          value={interfaceLanguage}
          onChange={(e) => setInterfaceLanguage(e.target.value)}
          className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-4 py-2.5 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition-colors"
        >
          {INTERFACE_LANGUAGES.map((l) => (
            <option
              key={l.code}
              value={l.code}
              className="bg-slate-800 text-slate-200"
            >
              {l.name}
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

export default InterfaceLanguageSettings;

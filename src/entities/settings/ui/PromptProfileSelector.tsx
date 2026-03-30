"use client";
import React, { useState, useRef, useEffect } from "react";
import { Sparkles, ChevronDown, Check } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import { profilePrompts } from "@/shared/lib/prompts";

const PromptProfileSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { interfaceLanguage, promptProfile, setPromptProfile } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  const profiles = [
    "default",
    ...Object.keys(profilePrompts).filter(
      (p) => p !== "default" && p !== "translation",
    ),
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getProfileLabel = (profile: string) => {
    return (
      t[`profile${profile.charAt(0).toUpperCase() + profile.slice(1)}`] ||
      profile
    );
  };

  return (
    <div className="relative border-b border-slate-800" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/50 transition-colors group outline-none"
      >
        <div className="flex items-center gap-2">
          <Sparkles
            className={`w-4 h-4 transition-colors ${isOpen ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400"}`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 whitespace-nowrap">
            {t.promptProfile}
          </span>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            {getProfileLabel(promptProfile)}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`
          absolute left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 shadow-xl overflow-y-auto transition-all duration-300 ease-in-out
          ${isOpen ? "max-h-[calc(100vh-250px)] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}
        `}
      >
        <div className="p-1">
          {profiles.map((profile) => (
            <button
              key={profile}
              onClick={() => {
                setPromptProfile(profile);
                setIsOpen(false);
              }}
              className={`
                w-full p-3 flex items-center justify-between rounded-lg transition-colors text-left
                ${promptProfile === profile ? "bg-blue-500/10 text-blue-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"}
              `}
            >
              <span className="text-sm font-medium">
                {getProfileLabel(profile)}
              </span>
              {promptProfile === profile && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptProfileSelector;

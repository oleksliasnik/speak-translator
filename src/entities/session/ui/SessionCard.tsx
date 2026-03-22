"use client";
import React from "react";
import { Download, Trash2, MessageSquare, Bot } from "lucide-react";
import { ChatSession } from "@/shared/types";
import { translations } from "@/shared/lib/translations";

interface SessionCardProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onDownload: (e: React.MouseEvent, session: ChatSession) => void;
  interfaceLanguage: string;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
  onDownload,
  interfaceLanguage,
}) => {
  const t = translations[interfaceLanguage] || translations["uk"];

  // Determine mode label
  const getModeLabel = () => {
    if (session.mode === "translation") {
      return t.modeTranslation;
    }
    if (session.promptProfile) {
      const profileKey = `profile${
        session.promptProfile.charAt(0).toUpperCase() +
        session.promptProfile.slice(1)
      }`;
      // Map some keys if they don't match pattern
      const mappedKey =
        session.promptProfile === "default" ? "profileDefault" : profileKey;
      return t[mappedKey] || session.promptProfile;
    }
    return t.modeConversation;
  };

  return (
    <div
      onClick={() => onSelect(session.id)}
      className={`
        rounded-xl p-4 border transition-all cursor-pointer group
        ${
          isActive
            ? "bg-blue-900/20 border-blue-500/50"
            : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800"
        }
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-blue-400 font-medium opacity-80 uppercase tracking-tight">
            {new Date(session.startTime).toLocaleDateString()} &bull;{" "}
            {new Date(session.startTime).toLocaleTimeString()}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => onDownload(e, session)}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors"
            title={t.download}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => onDelete(e, session.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            title={t.delete}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-300 uppercase tracking-wide">
          <Bot className="w-3 h-3" />
          {getModeLabel()}
        </div>
      </div>

      <div className="text-sm text-slate-300 line-clamp-1 leading-relaxed">
        {session.messages.length > 0 ? (
          session.messages[0].text
        ) : (
          <span className="italic text-slate-500">{t.noMessages}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
        <MessageSquare className="w-3 h-3" />
        <span>
          {session.messages.length} {t.messages}
        </span>
      </div>
    </div>
  );
};

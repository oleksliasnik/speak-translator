"use client";
import React, { useState } from "react";
import { Calendar, Download, Trash2, MessageSquare } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import { ChatSession } from "@/shared/types";
import ConfirmModal from "@/shared/ui/ConfirmModal";

interface ChatHistoryProps {
  onSessionSelect: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ onSessionSelect }) => {
  const {
    history,
    deleteSession,
    loadSession,
    currentSessionId,
    interfaceLanguage,
  } = useLiveStore();

  const t = translations[interfaceLanguage] || translations["uk"];

  // State for deleting
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const downloadSession = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    const textContent = session.messages
      .map(
        (msg) =>
          `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.role.toUpperCase()}: ${msg.text}`,
      )
      .join("\n\n");

    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-history-${new Date(session.startTime).toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteSession(deleteId);
      setDeleteId(null);
    }
  };

  const handleSessionClick = (id: string) => {
    loadSession(id);
    onSessionSelect();
  };

  return (
    <div className="p-4">
      <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        {t.history}
      </h3>
      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-4">
            <p>{t.historyEmpty}</p>
          </div>
        ) : (
          history.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session.id)}
              className={`
                        rounded-xl p-4 border transition-all cursor-pointer group
                        ${
                          currentSessionId === session.id
                            ? "bg-blue-900/20 border-blue-500/50"
                            : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800"
                        }
                    `}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-blue-400 font-medium">
                    {new Date(session.startTime).toLocaleDateString()} &bull;{" "}
                    {new Date(session.startTime).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => downloadSession(e, session)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title={t.download}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, session.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-sm text-slate-300 line-clamp-1 leading-relaxed">
                {session.messages.length > 0 ? (
                  session.messages[0].text
                ) : (
                  <span className="italic text-slate-500">{t.noMessages}</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <MessageSquare className="w-3 h-3" />
                <span>
                  {session.messages.length} {t.messages}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title={t.delete}
        message={t.deleteConfirmation}
      />
    </div>
  );
};

export default ChatHistory;

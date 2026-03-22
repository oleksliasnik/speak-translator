"use client";
import React, { useState } from "react";
import { Calendar, Download, Trash2, MessageSquare } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import { ChatSession } from "@/shared/types";
import { SessionCard } from "@/entities/session/ui/SessionCard";
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
            <SessionCard
              key={session.id}
              session={session}
              isActive={currentSessionId === session.id}
              onSelect={handleSessionClick}
              onDelete={handleDeleteClick}
              onDownload={downloadSession}
              interfaceLanguage={interfaceLanguage}
            />
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

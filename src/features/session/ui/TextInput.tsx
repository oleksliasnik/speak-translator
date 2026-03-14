"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import { ConnectionStatus } from "@/shared/types";

interface TextInputProps {
  onSend: (text: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  onSend,
  onClose,
  isVisible,
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { interfaceLanguage, status } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
      adjustHeight();
    }
  }, [isVisible]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // Reset to recalculate shrink
      textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`; // 144px is roughly 6 lines of ~24px
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // Adjust height whenever text changes
  useEffect(() => {
    adjustHeight();
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText("");
      // Height reset handled by useEffect on [text]
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="absolute bottom-0 left-4 right-4 z-40 sm:max-w-[700px] max-w-[400px] mx-auto animate-in slide-in-from-bottom-5 fade-in duration-200"
      style={{ WebkitAppRegion: "no-drag" } as any}
    >
      <div className="relative bg-slate-800/60 backdrop-blur-md border border-slate-700/50 shadow-2xl rounded-2xl p-2">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 m-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xl px-3 py-1 outline-none resize-none max-h-[144px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent cursor-default"
          />
          <button
            type="submit"
            disabled={!text.trim() || status !== ConnectionStatus.CONNECTED}
            className="p-2 mb-1 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TextInput;

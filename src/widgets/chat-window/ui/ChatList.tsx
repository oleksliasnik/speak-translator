"use client";
import React, { useEffect, useRef, useState } from "react";
import { useLiveStore } from "@/app/store/useLiveStore";
import MessageItem from "@/entities/chat/ui/MessageItem";
import { translations } from "@/shared/lib/translations";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import "./ChatList.css";

interface ChatListProps {
  onDoubleClick?: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ onDoubleClick }) => {
  const { transcripts, streamingContent, interfaceLanguage, fontSize } =
    useLiveStore();

  const isStreamingInFlow =
    streamingContent &&
    (streamingContent.text !== "" || streamingContent.role === "model");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const t = translations[interfaceLanguage] || translations["uk"];

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Use a small threshold (10px) to determine if we're at the bottom
      const isBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      setIsAtBottom(isBottom);
    }
  };

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    if (scrollRef.current && isAtBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, streamingContent, isAtBottom]);

  return (
    <div
      className="h-full w-full p-0 overflow-hidden flex flex-col relative"
      onDoubleClick={onDoubleClick}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pr-1 pb-10 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        <div className="h-full max-w-[95%] sm:max-w-[90%] xl:max-w-[80%] mx-auto">
          {transcripts.length === 0 && !streamingContent && (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
              {t.startPrompt}
            </div>
          )}

          {transcripts.map((msg, index) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              className={
                index === transcripts.length - 1 && !isStreamingInFlow
                  ? "pb-16"
                  : ""
              }
            />
          ))}

          {/* Flow-based streaming content (Text or Model response) */}
          {isStreamingInFlow && (
            <div
              className={`flex ${streamingContent.role === "user" ? "justify-end" : "justify-start"} pb-15`}
            >
              <div
                className={`
                      rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                      ${
                        streamingContent.role === "user"
                          ? "max-w-[95%] bg-blue-600/10 text-blue-200 rounded-br-sm border border-blue-500/10"
                          : "max-w-full bg-slate-800/50 text-slate-300 rounded-bl-sm border border-slate-700/50"
                      }
                  `}
                style={{ fontSize: `${fontSize}rem` }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingContent.text}
                </ReactMarkdown>
                <Loader2 className="w-3 h-3 ml-1 animate-spin inline-block align-middle opacity-50" />
              </div>
            </div>
          )}

          {/* Fixed spacer to ensure the last message doesn't hug the bottom and to stabilize scroll */}
          {/* <div className="h-24 shrink-0" /> */}
        </div>
      </div>

      {/* Absolute-based "three dots" indicator for user speech */}
      {streamingContent &&
        streamingContent.role === "user" &&
        streamingContent.text === "" && (
          <div className="absolute bottom-10 right-5 md:right-15 xl:right-34 z-50 pointer-events-none">
            <div
              className="bg-blue-600/20 text-blue-200 rounded-2xl rounded-br-sm px-4 py-2 border border-blue-500/20 shadow-xl backdrop-blur-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ fontSize: `${fontSize}rem` }}
            >
              <span className="typing-dots inline-block min-h-6">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatList;

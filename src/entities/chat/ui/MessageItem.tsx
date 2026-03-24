"use client";
import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Loader2, Copy, Check } from "lucide-react";
import { Message } from "@/shared/types";
import { getAudio } from "@/shared/lib/db";
import { useLiveStore } from "@/app/store/useLiveStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Trash2, MicOff, ChevronUp } from "lucide-react";
import ConfirmationModal from "@/components/ConfirmationModal";
import { translations } from "@/shared/lib/translations";

interface MessageItemProps {
  msg: Message;
  className?: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ msg, className }) => {
  const {
    currentlyPlayingAudioId,
    setCurrentlyPlayingAudioId,
    fontSize,
    isMessageDeletionEnabled,
    isAudioDeletionEnabled,
    deleteMessage,
    deleteAudio,
    currentSessionId,
    interfaceLanguage,
  } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  const [confirmMessageDelete, setConfirmMessageDelete] = useState(false);
  const [confirmAudioDelete, setConfirmAudioDelete] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Watch for other audios playing to pause this one
  useEffect(() => {
    if (
      currentlyPlayingAudioId &&
      currentlyPlayingAudioId !== msg.id &&
      isPlaying
    ) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [currentlyPlayingAudioId, msg.id, isPlaying]);

  // Cleanup audio object URL when it changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Cleanup audio instance only on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadAudio = async () => {
    if (audioUrl) return audioUrl;

    setIsLoading(true);
    try {
      const blob = await getAudio(msg.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        return url;
      }
    } catch (e) {
      console.error("Failed to load audio", e);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const togglePlayback = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Ensure audio object exists
    if (!audioRef.current) {
      const url = await loadAudio();
      if (!url) return;

      // Check ref again in case of async race conditions
      if (!audioRef.current) {
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener("loadedmetadata", () => {
          if (isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
        });

        audio.addEventListener("timeupdate", () => {
          setCurrentTime(audio.currentTime);
        });

        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          setCurrentTime(0);
          setCurrentlyPlayingAudioId(null);
        });
      }
    }

    const currentAudio = audioRef.current!;

    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentlyPlayingAudioId(null);
    } else {
      try {
        // Set Global ID before playing to stop others
        setCurrentlyPlayingAudioId(msg.id);
        await currentAudio.play();
        setIsPlaying(true);
      } catch (e) {
        console.error("Playback failed", e);
        setIsPlaying(false);
        setCurrentlyPlayingAudioId(null);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const isUser = msg.role === "user";

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showProgress =
    msg.hasAudio &&
    (isPlaying || (currentTime > 0 && currentTime < duration - 0.05));

  const handleDeleteMessage = async () => {
    if (currentSessionId) {
      await deleteMessage(currentSessionId, msg.id);
    }
  };

  const handleDeleteAudio = async () => {
    if (currentSessionId) {
      await deleteAudio(currentSessionId, msg.id);
    }
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();

    const el = contentRef.current;
    if (!el) return;

    if (isCollapsed) {
      // Expand
      setMeasuredHeight(el.scrollHeight);
      // Wait a frame for height to be applied before expanding
      requestAnimationFrame(() => {
        setIsCollapsed(false);
      });
    } else {
      // Collapse
      setMeasuredHeight(el.scrollHeight);

      requestAnimationFrame(() => {
        setMeasuredHeight(0);
        setIsCollapsed(true);
      });
    }
  };

  return (
    <div
      className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-5 ${className || ""}`}
    >
      <div
        className={`
            relative min-h-[40px] p-4 rounded-2xl text-sm leading-relaxed shadow-sm group transition-all duration-300
            ${isUser ? "max-w-[95%] bg-blue-600/20 text-blue-100 rounded-br-sm border border-blue-500/20" : "max-w-full bg-slate-800/50 text-slate-200 rounded-bl-sm border border-slate-700"}
            
        `}
      >
        <button
          onClick={handleCopy}
          className={`
              absolute top-0 right-0 p-1.5 rounded-lg transition-all z-10
              ${isUser ? "hover:bg-blue-500/30 text-blue-200" : "hover:bg-slate-700 text-slate-400"}
              md:opacity-0 md:group-hover:opacity-100 
              opacity-40 hover:opacity-100
          `}
          title="Copy message"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Delete Message Button */}
        {isMessageDeletionEnabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmMessageDelete(true);
            }}
            className={`
                absolute top-0 right-7 p-1.5 rounded-lg transition-all z-10
                text-red-400 hover:bg-red-500/20
                md:opacity-0 md:group-hover:opacity-100 
                opacity-40 hover:opacity-100
            `}
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete Audio Button */}
        {isAudioDeletionEnabled && msg.hasAudio && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmAudioDelete(true);
            }}
            className={`
                absolute top-0 ${isMessageDeletionEnabled ? "right-14" : "right-7"} p-1.5 rounded-lg transition-all z-10
                text-yellow-400 hover:bg-yellow-500/20
                md:opacity-0 md:group-hover:opacity-100 
                opacity-40 hover:opacity-100
            `}
            title="Delete audio"
          >
            <MicOff className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          ref={contentRef}
          className={`
            transition-all duration-300 ease-in-out overflow-hidden
            ${isCollapsed ? "opacity-0" : "opacity-100"}
          `}
          style={{
            maxHeight: isCollapsed
              ? "0px"
              : measuredHeight === null
                ? "none"
                : `${measuredHeight}px`,
          }}
          onTransitionEnd={() => {
            if (!isCollapsed) {
              setMeasuredHeight(null);
            }
          }}
        >
          <div
            className="wrap-break-word whitespace-pre-wrap prose prose-invert prose-sm max-w-none"
            style={{ fontSize: `${fontSize}rem` }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.text}
            </ReactMarkdown>
          </div>
        </div>
        {msg.hasAudio && (
          <>
            {/* Playback Button - Absolute positioned, always visible */}
            <button
              onClick={togglePlayback}
              disabled={isLoading}
              className={`
                  absolute -bottom-3 ${isUser ? "-left-3" : "-right-3"}
                  w-7 h-7 rounded-full flex items-center justify-center 
                  bg-slate-700 border border-slate-600 shadow-md text-slate-300
                  hover:bg-blue-500 hover:text-white hover:border-blue-400 transition-all z-20
                  ${isLoading ? "opacity-70 cursor-wait" : ""}
              `}
              title="Play Audio"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Interactive Progress Bar - Visible when playing or paused with progress */}
            {showProgress && (
              <div className="absolute bottom-0 left-1 right-1 h-3 z-10 group/slider">
                {/* Invisible range input for interaction (larger hit area) */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                />

                {/* Visible Track Background (2px height) */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black/10 rounded-full" />

                {/* Visible Progress Fill */}
                <div
                  className={`absolute bottom-0 left-0 h-[2px] transition-all duration-100 ease-linear rounded-full ${isUser ? "bg-blue-300" : "bg-blue-500"}`}
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Visible Thumb (Circle) */}
                <div
                  className={`absolute -bottom-[3px] w-2 h-2 rounded-full shadow-sm pointer-events-none transition-all duration-75
                                        ${isUser ? "bg-blue-100" : "bg-blue-400"}
                                    `}
                  style={{ left: `calc(${progressPercent}% - 4px)` }}
                />
              </div>
            )}
          </>
        )}

        {/* Collapse/Expand Toggle Button */}
        <button
          onClick={toggleCollapse}
          className={`
              absolute -bottom-1 ${isUser && msg.hasAudio ? "left-5" : isUser ? "left-2" : "left-0"}
              w-6 h-6 rounded-full flex items-center justify-center 
              text-slate-500 hover:text-white
          `}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <ChevronUp className="w-4 h-4 transition-transform -translate-y-2.5 rotate-180" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="text-[10px] text-slate-500 mt-2 px-1 opacity-70">
        {new Date(msg.timestamp).toLocaleTimeString([], {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      <ConfirmationModal
        isOpen={confirmMessageDelete}
        onClose={() => setConfirmMessageDelete(false)}
        onConfirm={handleDeleteMessage}
        title={t.delete}
        message={t.confirmDeleteMessage}
      />

      <ConfirmationModal
        isOpen={confirmAudioDelete}
        onClose={() => setConfirmAudioDelete(false)}
        onConfirm={handleDeleteAudio}
        title={t.delete}
        message={t.confirmDeleteAudio}
      />
    </div>
  );
};

export default MessageItem;

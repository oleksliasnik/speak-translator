"use client";
import React from "react";
import { MoreVertical, Mic, Laptop, Layers } from "lucide-react";
import { AudioMode } from "@/hooks/useSystemAudio";
import { useLiveStore, PlaybackSpeed } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

interface MobileMenuProps {
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  disabled?: boolean;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  audioMode,
  onAudioModeChange,
  disabled,
  isOpen,
  onToggle,
}) => {
  const { playbackRate, setPlaybackRate, interfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  const audioButtons = [
    {
      mode: "microphone" as AudioMode,
      icon: <Mic className="w-4 h-4" />,
      label: t.microphoneShort || "Mic",
      title: t.microphone || "Microphone Only",
    },
    {
      mode: "system" as AudioMode,
      icon: <Laptop className="w-4 h-4" />,
      label: t.systemShort || "System",
      title: t.system || "System Audio Only",
    },
    {
      mode: "both" as AudioMode,
      icon: <Layers className="w-4 h-4" />,
      label: t.bothShort || "Both",
      title: t.both || "System + Microphone",
    },
  ];

  const speedOptions: PlaybackSpeed[] = ["very_slow", "slow", "normal", "fast", "very_fast"];

  return (
    <div className="relative sm:hidden">
      <button
        onClick={() => onToggle(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${
          isOpen ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
        title={t.moreOptions || "More options"}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onToggle(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            {/* Audio Source Section */}
            <div className="border-b border-slate-700">
              <div className="px-3 py-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
                {t.audioSource || "Audio Source"}
              </div>
              <div className="p-2">
                <div className="flex flex-col items-start gap-1 bg-gray-800/50 rounded-lg p-1">
                  {audioButtons.map(({ mode, icon, title }) => (
                    <button
                      key={mode}
                      onClick={() => {
                        onAudioModeChange(mode);
                        onToggle(false);
                      }}
                      disabled={disabled}
                      className={`flex-1 flex gap-2 items-center justify-center p-2 rounded-md transition-all ${
                        audioMode === mode
                          ? "bg-blue-600/30 text-white shadow-sm"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                      title={title}
                    >
                      {icon}
                      <span className="text-xs">{title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Playback Speed Section */}
            <div>
              <div className="px-3 py-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
                {t.playbackSpeed || "Playback Speed"}
              </div>
              <div className="p-1">
                {speedOptions.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      onToggle(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center justify-between ${
                      playbackRate === rate ? "text-blue-400 bg-slate-700/50" : "text-slate-300"
                    }`}
                  >
                    <span>
                      {rate === "normal" && t.speedNormal}
                      {rate === "slow" && t.speedSlow}
                      {rate === "very_slow" && t.speedVerySlow}
                      {rate === "fast" && t.speedFast}
                      {rate === "very_fast" && t.speedVeryFast}
                    </span>
                    {playbackRate === rate && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileMenu;

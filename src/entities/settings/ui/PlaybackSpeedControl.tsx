"use client";
import React from "react";
import { Gauge } from "lucide-react";
import { useLiveStore, PlaybackSpeed } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

interface PlaybackSpeedControlProps {
  onToggle: (isOpen: boolean) => void;
  isOpen: boolean;
}

const PlaybackSpeedControl: React.FC<PlaybackSpeedControlProps> = ({
  onToggle,
  isOpen,
}) => {
  const { playbackRate, setPlaybackRate, interfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  return (
    <div className="relative group">
      <button
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors
                    ${isOpen ? "bg-slate-700 text-blue-400 border-blue-500/50" : "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700"}`}
        onClick={() => onToggle(!isOpen)}
      >
        <Gauge className="w-4 h-4" />
        <span className="hidden lg:inline">
          {playbackRate === "normal" && t.speedNormal}
          {playbackRate === "slow" && t.speedSlow}
          {playbackRate === "very_slow" && t.speedVerySlow}
          {playbackRate === "fast" && t.speedFast}
          {playbackRate === "very_fast" && t.speedVeryFast}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onToggle(false)} />
          <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            {(["very_slow", "slow", "normal", "fast", "very_fast"] as PlaybackSpeed[]).map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  setPlaybackRate(rate);
                  onToggle(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${playbackRate === rate ? "text-blue-400 bg-slate-700/50" : "text-slate-300"}`}
              >
                {rate === "normal" && t.speedNormal}
                {rate === "slow" && t.speedSlow}
                {rate === "very_slow" && t.speedVerySlow}
                {rate === "fast" && t.speedFast}
                {rate === "very_fast" && t.speedVeryFast}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PlaybackSpeedControl;

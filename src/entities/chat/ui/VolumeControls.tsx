"use client";
import React from "react";
import { Mic, Volume2 } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

const VolumeControls: React.FC = () => {
  const {
    inputGain,
    setInputGain,
    outputGain,
    setOutputGain,
    noiseSuppression,
    setNoiseSuppression,
    isUserRecordingEnabled,
    setIsUserRecordingEnabled,
    interfaceLanguage,
  } = useLiveStore();

  const t = translations[interfaceLanguage] || translations["uk"];

  return (
    <div className="p-4 bg-slate-950/50 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
            <Mic className="w-3 h-3" /> {t.mic}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsUserRecordingEnabled(!isUserRecordingEnabled)}
              className={`p-1 w-[75px] text-left rounded text-[10px] font-medium transition-colors border ${isUserRecordingEnabled ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-slate-800 text-slate-500 border-slate-700"}`}
              title={t.userRecordingToggle}
            >
              {isUserRecordingEnabled ? "USER REC ON" : "USER REC OFF"}
            </button>
            <button
              onClick={() => setNoiseSuppression(!noiseSuppression)}
              className={`p-1 w-[45px] rounded text-[10px] text-left font-medium transition-colors border ${noiseSuppression ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-slate-800 text-slate-500 border-slate-700"}`}
              title={t.noiseSuppression}
            >
              {noiseSuppression ? "NR ON" : "NR OFF"}
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={inputGain}
          onChange={(e) => setInputGain(parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          title={`${t.mic}: ${(inputGain * 100).toFixed(0)}%`}
        />
      </div>
      <div>
        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
          <Volume2 className="w-3 h-3" /> {t.volume}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={outputGain}
          onChange={(e) => setOutputGain(parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400 hover:accent-purple-500"
          title={`${t.volume}: ${(outputGain * 100).toFixed(0)}%`}
        />
      </div>
    </div>
  );
};

export default VolumeControls;

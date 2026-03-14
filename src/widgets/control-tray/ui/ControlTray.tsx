"use client";
import React from "react";
import {
  Mic,
  MicOff,
  MessageSquare,
  AlertCircle,
  Keyboard,
  Power,
} from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { ConnectionStatus } from "@/shared/types";
import { translations } from "@/shared/lib/translations";
import RecordingToggle from "@/features/session/ui/RecordingToggle";
import Visualizer from "@/entities/chat/ui/Visualizer";

interface ControlTrayProps {
  viewMode: "visualizer" | "text";
  setViewMode: (mode: "visualizer" | "text") => void;
  onToggleConnection: () => void;
  onToggleInput: () => void;
  isInputVisible: boolean;
  outputLevel: number;
  inputLevel: number;
}

const ControlTray: React.FC<ControlTrayProps> = ({
  viewMode,
  setViewMode,
  onToggleConnection,
  onToggleInput,
  isInputVisible,
  inputLevel,
  outputLevel,
}) => {
  const { status, errorMessage, interfaceLanguage, isMicOn, setIsMicOn } =
    useLiveStore();

  const t = translations[interfaceLanguage] || translations["uk"];

  const isConnected = status === ConnectionStatus.CONNECTED;
  const isConnecting = status === ConnectionStatus.CONNECTING;
  const isError = status === ConnectionStatus.ERROR;

  const getStatusText = () => {
    switch (status) {
      case ConnectionStatus.CONNECTING:
        return t.statusConnecting;
      case ConnectionStatus.CONNECTED:
        return t.statusListening;
      case ConnectionStatus.ERROR:
        return t.statusError;
      default:
        return t.statusReady;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case ConnectionStatus.CONNECTING:
        return "text-yellow-400";
      case ConnectionStatus.CONNECTED:
        return "text-emerald-400";
      case ConnectionStatus.ERROR:
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="shrink-0 w-full max-w-[500px] flex flex-col items-center gap-4 relative">
      {/* Top Row: View Mode & Status */}
      <div className="flex flex-col items-center gap-4 w-full max-w-[280px]">
        {/* Status Indicator */}
        <div
          className={`flex items-center gap-2 text-xs font-medium ${getStatusColor()} transition-colors duration-300`}
        >
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : isError ? "bg-red-500" : "bg-slate-500"}`}
          />
          {getStatusText()}
        </div>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="w-full p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-red-200 text-xs">{errorMessage}</p>
        </div>
      )}

      {/* Main Controls Row */}
      <div className="relative flex items-center justify-center gap-4 sm:gap-6 w-full px-4">
        {/* View Mode Toggle */}
        <button
          onClick={() =>
            setViewMode(viewMode === "text" ? "visualizer" : "text")
          }
          className={`
              items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all duration-200 cursor-default
              ${
                viewMode === "text"
                  ? "bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 border-blue-500/50 shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-300 border-slate-700 hover:bg-slate-700"
              }
          `}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <MessageSquare
            className={`w-3 h-3 ${viewMode === "text" ? "text-blue-400" : "text-slate-400"}`}
          />
        </button>
        {/* Keyboard/Text Input Toggle */}
        <div className="sm:static absolute left-12 bottom-14 ">
          <button
            onClick={onToggleInput}
            className={`
                w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-default
                ${
                  isInputVisible
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                    : "bg-slate-800/50 text-slate-500 hover:text-slate-300 border border-slate-700/50 hover:bg-slate-700"
                }
            `}
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Toggle Keyboard"
          >
            <Keyboard className="w-5 h-5" />
          </button>
        </div>

        {/* Start/Stop Button (Center) */}
        <button
          onClick={onToggleConnection}
          disabled={isConnecting}
          className={`
              group relative px-8 py-3 rounded-full font-semibold text-base transition-all duration-300 transform active:scale-95 cursor-default
              flex items-center gap-3 shadow-lg shadow-blue-500/20 w-full max-w-[200px] justify-center
              ${
                isConnected
                  ? "bg-blue-900/40 text-blue-300 hover:bg-blue-800/50 border border-blue-500/50"
                  : "bg-white text-slate-900 hover:bg-blue-100 border border-white"
              }
              ${isConnecting ? "opacity-70 cursor-wait" : ""}
          `}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          {isConnected ? (
            <>
              <Power className="w-5 h-5" />
              <span>{t.end}</span>
            </>
          ) : (
            <>
              <Power
                className={`w-5 h-5 ${isConnecting ? "animate-bounce" : ""}`}
              />
              <span>{isConnecting ? t.statusConnecting : t.start}</span>
            </>
          )}
        </button>

        {/* Mic Toggle */}
        <div className="sm:static absolute right-11 bottom-14 ">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`
              relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 cursor-default
              ${
                isMicOn
                  ? "bg-blue-900/40 text-blue-300 hover:bg-blue-800/50 border border-blue-500/50"
                  : "bg-slate-800/50 text-slate-500 hover:text-slate-300 border border-slate-700/50 hover:bg-slate-700"
              }
          `}
            style={{ WebkitAppRegion: "no-drag" } as any}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? (
              <Mic className="z-50 w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
            {isMicOn && (
              <div className="absolute right-0 bottom-0 ">
                <Visualizer
                  inputLevel={inputLevel}
                  outputLevel={outputLevel}
                  isActive={isConnected}
                />
              </div>
            )}
          </button>
        </div>
        {/* <div className="absolute sm:right-8 right-12 sm:bottom-3 bottom-16 "> */}
        <div className="">
          <RecordingToggle />
        </div>
      </div>
    </div>
  );
};

export default ControlTray;

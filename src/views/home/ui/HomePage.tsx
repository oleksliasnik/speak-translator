"use client";

import React, { useState } from "react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { useGeminiLive } from "@/features/session/model/useGeminiLive";
import { ConnectionStatus } from "@/shared/types";
import Sidebar from "@/widgets/sidebar/ui/Sidebar";
import TopBar from "@/widgets/top-bar/ui/TopBar";
import ChatList from "@/widgets/chat-window/ui/ChatList";
import ControlTray from "@/widgets/control-tray/ui/ControlTray";
import TextInput from "@/features/session/ui/TextInput";
import { translations } from "@/shared/lib/translations";

// Electron Integrations
import { ResizeHandles } from "@/components/ResizeHandles";
import { useSystemAudio, AudioMode } from "@/hooks/useSystemAudio";
import OrbitVisualizer from "@/entities/chat/ui/OrbitVisualizer";

export default function HomePage() {
  const {
    status,
    inputVolume,
    outputVolume,
    interfaceLanguage,
    startNewSession,
    isMicOn,
  } = useLiveStore();

  const {
    connect,
    disconnect,
    sendTextMessage,
    setAudioMode: setGeminiAudioMode,
    interrupt,
  } = useGeminiLive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);

  // Audio System Hooks
  const [audioMode, setAudioMode] = useState<AudioMode>("microphone");
  const { startCapture, stopCapture } = useSystemAudio();

  // Sync Audio Mode with Gemini Hook for suppression
  React.useEffect(() => {
    if (setGeminiAudioMode) {
      setGeminiAudioMode(audioMode);
    }
  }, [audioMode, setGeminiAudioMode]);

  // viewMode state: if 'text', show transcript; if 'visualizer', show visualizer.
  const [viewMode, setViewMode] = useState<"visualizer" | "text">("text");

  const t = translations[interfaceLanguage] || translations["uk"];

  const isConnected = status === ConnectionStatus.CONNECTED;
  const isConnecting = status === ConnectionStatus.CONNECTING;

  const handleToggleConnection = async () => {
    if (isConnected || isConnecting) {
      disconnect();
      stopCapture();
    } else {
      try {
        // Start capturing audio (System/Mic/Both)
        const stream = await startCapture(audioMode);
        if (stream) {
          connect(stream);
        } else {
          console.error("Failed to acquire audio stream");
          // Optionally show toast error here
        }
      } catch (err) {
        console.error("Error starting connection:", err);
      }
    }
  };

  const handleNewSession = () => {
    if (isConnected) {
      disconnect();
      stopCapture();
    }
    startNewSession();
  };

  const handleReconnect = (updateFn: () => void) => {
    updateFn();
    // If connected, reconnect to apply new system instruction/settings
    if (isConnected) {
      handleToggleConnection().then(() => {
        setTimeout(() => {
          handleToggleConnection();
        }, 300);
      });
    }
  };

  const handleInterrupt = () => {
    if (isConnected) {
      interrupt();
    }
  };

  // Electron Window Controls state
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.9);

  // Keyboard Window Movement (Ctrl + Numpad 2, 4, 6, 8)
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-200"
      style={
        {
          // backgroundColor: `rgba(15, 23, 42, ${backgroundOpacity})`,
          backgroundColor: `rgba(8, 13, 26, ${backgroundOpacity})`,
          WebkitAppRegion: "drag",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      }
    >
      <ResizeHandles />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onVoiceChange={() => {
          if (isConnected) {
            disconnect();
            setTimeout(() => connect(), 300); // Reconnect with new voice
          }
        }}
      />
      <TopBar
        onMenuClick={() => setIsSidebarOpen(true)}
        onNewSession={handleNewSession}
        onReconnect={handleReconnect}
        audioMode={audioMode}
        onAudioModeChange={setAudioMode}
        disabled={isConnected || isConnecting}
        onOpacityChange={setBackgroundOpacity}
      />
      <main className="z-10 w-full flex flex-col items-center h-full max-h-[95vh]">
        {/* Header - Fixed */}
        <div className="text-center space-y-1 shrink-0 mb-6 mt-12 flex flex-col items-center"></div>

        {/* Main Content Area - Fills available space */}
        <div
          className="flex-1 w-full min-h-0 relative mb-6"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          {viewMode === "visualizer" ? (
            <div className="h-full w-full flex items-center justify-center">
              <div 
                className="relative w-full aspect-square max-w-[400px] max-h-full rounded-full flex items-center justify-center"
                onDoubleClick={handleInterrupt}
              >
                {isConnected && (
                  <OrbitVisualizer
                    inputLevel={inputVolume}
                    outputLevel={outputVolume}
                    isActive={isConnected}
                    isMicOn={isMicOn}
                  />
                )}
              </div>
            </div>
          ) : (
            <ChatList onDoubleClick={handleInterrupt} />
          )}
          {/* Text Input Overlay */}
          <TextInput
            isVisible={isTextInputVisible}
            onClose={() => setIsTextInputVisible(false)}
            onSend={sendTextMessage}
          />
        </div>
        <ControlTray
          viewMode={viewMode}
          setViewMode={setViewMode}
          onToggleConnection={handleToggleConnection}
          onToggleInput={() => setIsTextInputVisible(!isTextInputVisible)}
          isInputVisible={isTextInputVisible}
          inputLevel={inputVolume}
          outputLevel={outputVolume}
        />
      </main>
    </div>
  );
}

"use client";
import React, { useState } from "react";
import { Menu, Plus } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";
import LanguageModeControl from "@/entities/settings/ui/LanguageModeControl";
import PlaybackSpeedControl from "@/entities/settings/ui/PlaybackSpeedControl";
import { AudioSourceSelector } from "@/components/AudioSourceSelector";
import { AudioMode } from "@/hooks/useSystemAudio";
import { WindowControls } from "@/components/WindowControls";
import FontSizeControl from "@/entities/settings/ui/FontSizeControl";
import MobileMenu from "@/components/MobileMenu";

interface TopBarProps {
  onMenuClick: () => void;
  onNewSession: () => void;
  onReconnect: (callback: () => void) => void;
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  supportsSystemAudio?: boolean;
  disabled?: boolean;
  onOpacityChange: (opacity: number) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  onNewSession,
  onReconnect,
  audioMode,
  onAudioModeChange,
  supportsSystemAudio,
  disabled,
  onOpacityChange,
}) => {
  const { interfaceLanguage } = useLiveStore();
  const [activeDropdown, setActiveDropdown] = useState<"lang" | "speed" | "mobile" | null>(
    null,
  );
  const t = translations[interfaceLanguage] || translations["uk"];

  const handleSettingsChange = (updateFn: () => void) => {
    onReconnect(updateFn);
  };

  return (
    <>
      {/* Top Left: Menu & New Chat */}
      <div
        className="absolute top-4 left-4 z-30 flex items-center gap-4"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title={t.menu}
        >
          <Menu className="w-6 h-6" />
        </button>

        <button
          onClick={onNewSession}
          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
          title="New Chat"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Top Center: Controls */}
      <div
        className="absolute top-4 right-2 xs:right-auto xs:left-30 z-30 flex items-center gap-2"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <div className="ml-2">
          <FontSizeControl />
        </div>
        <LanguageModeControl
          isOpen={activeDropdown === "lang"}
          onToggle={(isOpen) => setActiveDropdown(isOpen ? "lang" : null)}
          onSettingsChange={handleSettingsChange}
        />

        {/* Desktop: Show controls directly */}
        <div className="hidden sm:flex items-center gap-2">
          <PlaybackSpeedControl
            isOpen={activeDropdown === "speed"}
            onToggle={(isOpen) => setActiveDropdown(isOpen ? "speed" : null)}
          />
          {supportsSystemAudio !== false && (
            <div className="ml-2">
              <AudioSourceSelector
                mode={audioMode}
                onChange={onAudioModeChange}
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {/* Mobile: Show menu button */}
        <MobileMenu
          audioMode={audioMode}
          onAudioModeChange={onAudioModeChange}
          supportsSystemAudio={supportsSystemAudio}
          disabled={disabled}
          isOpen={activeDropdown === "mobile"}
          onToggle={(isOpen) => setActiveDropdown(isOpen ? "mobile" : null)}
        />
      </div>

      {/* Top Right: Window Controls */}
      <div
        className="absolute top-4 right-4 z-30"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <WindowControls onOpacityChange={onOpacityChange} />
      </div>
    </>
  );
};

export default TopBar;

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConnectionStatus, Message, ChatSession } from "@/shared/types";
import { getSessions, saveSession, deleteSessionById } from "@/shared/lib/db";
 
export type PlaybackSpeed = "slow" | "very_slow" | "normal" | "fast" | "very_fast";

interface LiveStore {
  status: ConnectionStatus;
  errorMessage: string | null;
  inputVolume: number; // For visualization
  outputVolume: number; // For visualization

  // Settings
  playbackRate: PlaybackSpeed;
  inputGain: number; // 0.0 to 2.0 (Volume control)
  outputGain: number; // 0.0 to 2.0 (Volume control)
  targetLanguage: string; // Used for Chat mode
  translationSource: string; // Used for Translation mode (Lang A)
  translationTarget: string; // Used for Translation mode (Lang B)
  mode: "conversation" | "translation";
  noiseSuppression: boolean;
  voiceName: string;
  interfaceLanguage: string;
  isRecordingEnabled: boolean;
  isUserRecordingEnabled: boolean; // Controls whether user audio is saved
  isMicOn: boolean; // New Mute State
  apiKey: string;
  customSystemInstruction: string;
  customInstructions: Record<string, string>;
  resumptionToken: string | null; // For fast session resumption
  fontSize: number; // Font size for messages (0.8 to 1.5)
  promptProfile: string;

  // Data
  currentSessionId: string | null;
  transcripts: Message[];
  streamingContent: { role: "user" | "model"; text: string } | null;
  history: ChatSession[]; // Loaded from DB

  // Transient State (not persisted)
  currentlyPlayingAudioId: string | null;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setVolumes: (input: number, output: number) => void;

  setPlaybackRate: (rate: PlaybackSpeed) => void;
  setInputGain: (gain: number) => void;
  setOutputGain: (gain: number) => void;
  setTargetLanguage: (lang: string) => void;
  setTranslationSource: (lang: string) => void;
  setTranslationTarget: (lang: string) => void;
  setMode: (mode: "conversation" | "translation") => void;
  setNoiseSuppression: (enabled: boolean) => void;
  setVoiceName: (name: string) => void;
  setInterfaceLanguage: (lang: string) => void;
  setIsRecordingEnabled: (enabled: boolean) => void;
  setIsUserRecordingEnabled: (enabled: boolean) => void;
  setIsMicOn: (isOn: boolean) => void; // Action for Mic
  setApiKey: (key: string) => void;
  setCustomSystemInstruction: (instruction: string) => void;
  setResumptionToken: (token: string | null) => void;
  setFontSize: (size: number) => void;
  setPromptProfile: (profile: string) => void;

  startNewSession: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  addTranscript: (message: Message) => void;
  setStreamingContent: (
    content: { role: "user" | "model"; text: string } | null,
  ) => void;

  loadHistory: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setCurrentlyPlayingAudioId: (id: string | null) => void;
  reset: () => void;
}

export const useLiveStore = create<LiveStore>()(
  persist(
    (set, get) => ({
      status: ConnectionStatus.DISCONNECTED,
      errorMessage: null,
      inputVolume: 0,
      outputVolume: 0,

      playbackRate: "normal",
      inputGain: 1.0,
      outputGain: 1.0,
      targetLanguage: "Universal",
      translationSource: "English",
      translationTarget: "Ukrainian",
      mode: "translation" as "conversation" | "translation",
      noiseSuppression: true,
      voiceName: "Kore",
      interfaceLanguage: "uk",
      isRecordingEnabled: false, // Default to false
      isUserRecordingEnabled: false, // Default to false for user
      isMicOn: true,
      apiKey: "",
      customSystemInstruction: "",
      customInstructions: {},
      resumptionToken: null,
      fontSize: 1.0,
      promptProfile: "default",

      currentSessionId: null,
      transcripts: [],
      streamingContent: null,
      history: [],

      currentlyPlayingAudioId: null,

      setStatus: (status) => set({ status }),
      setError: (errorMessage) => set({ errorMessage }),
      setVolumes: (inputVolume, outputVolume) =>
        set({ inputVolume, outputVolume }),

      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setInputGain: (inputGain) => set({ inputGain }),
      setOutputGain: (outputGain) => set({ outputGain }),
      setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
      setTranslationSource: (translationSource) => set({ translationSource }),
      setTranslationTarget: (translationTarget) => set({ translationTarget }),
      setMode: (mode: "conversation" | "translation") => set({ mode }),
      setNoiseSuppression: (noiseSuppression) => set({ noiseSuppression }),
      setVoiceName: (voiceName) => set({ voiceName }),
      setInterfaceLanguage: (interfaceLanguage) => set({ interfaceLanguage }),
      setIsRecordingEnabled: (isRecordingEnabled) =>
        set({ isRecordingEnabled }),
      setIsUserRecordingEnabled: (isUserRecordingEnabled) =>
        set({ isUserRecordingEnabled }),
      setIsMicOn: (isMicOn) => set({ isMicOn }),
      setApiKey: (apiKey) => set({ apiKey }),
      setCustomSystemInstruction: (customSystemInstruction) =>
        set((state) => ({
          customSystemInstruction,
          customInstructions: {
            ...state.customInstructions,
            [state.promptProfile]: customSystemInstruction,
          },
        })),
      setResumptionToken: (resumptionToken) => set({ resumptionToken }),
      setFontSize: (fontSize) => set({ fontSize }),
      setPromptProfile: (promptProfile) =>
        set((state) => ({
          promptProfile,
          customSystemInstruction:
            state.customInstructions[promptProfile] || "",
        })),

      startNewSession: () => {
        set({
          currentSessionId: crypto.randomUUID(),
          transcripts: [],
          streamingContent: null,
          isRecordingEnabled: false, // Force recording off for new session
          resumptionToken: null, // Clear resumption token for fresh start
        });
      },

      loadSession: async (sessionId) => {
        const sessions = get().history;
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
          set({
            currentSessionId: session.id,
            transcripts: session.messages,
            status: ConnectionStatus.DISCONNECTED, // loading a historical session implies disconnect
            voiceName: session.voiceName || get().voiceName, // Restore voice if exists, else keep current
            isRecordingEnabled: false, // Force recording off when loading old session
            resumptionToken: null, // Loading old session clears resumption token
          });
        }
      },

      addTranscript: (message) => {
        set((state) => {
          const newTranscripts = [...state.transcripts, message];

          // Autosave to DB if we have a session ID
          let sessionId = state.currentSessionId;
          if (!sessionId) {
            sessionId = crypto.randomUUID();
          }

          const session: ChatSession = {
            id: sessionId,
            startTime:
              state.history.find((h) => h.id === sessionId)?.startTime ||
              Date.now(),
            messages: newTranscripts,
            voiceName: state.voiceName, // Save current voice to session
          };

          // Fire and forget save
          saveSession(session).then(() => {
            get().loadHistory(); // Reload history list to update UI
          });

          return {
            transcripts: newTranscripts,
            currentSessionId: sessionId,
          };
        });
      },

      setStreamingContent: (streamingContent) => set({ streamingContent }),

      loadHistory: async () => {
        try {
          const sessions = await getSessions();
          set({ history: sessions });
        } catch (e) {
          console.error("Failed to load history", e);
        }
      },

      deleteSession: async (id) => {
        await deleteSessionById(id);
        const sessions = await getSessions();
        set((state) => ({
          history: sessions,
          // If deleting current session, clear view
          transcripts: state.currentSessionId === id ? [] : state.transcripts,
          currentSessionId:
            state.currentSessionId === id ? null : state.currentSessionId,
        }));
      },

      setCurrentlyPlayingAudioId: (id) => set({ currentlyPlayingAudioId: id }),

      reset: () =>
        set({
          status: ConnectionStatus.DISCONNECTED,
          inputVolume: 0,
          outputVolume: 0,
          streamingContent: null,
          isRecordingEnabled: false, // Force recording off on reset/disconnect
          // Note: We DO NOT clear resumptionToken here, because we want to resume after disconnects
        }),
    }),
    {
      name: "speak-translator-storage",
      partialize: (state) => ({
        // Only persist settings in LocalStorage. History moves to IDB.
        playbackRate: state.playbackRate,
        inputGain: state.inputGain,
        outputGain: state.outputGain,
        targetLanguage: state.targetLanguage,
        translationSource: state.translationSource,
        translationTarget: state.translationTarget,
        mode: state.mode,
        noiseSuppression: state.noiseSuppression,
        voiceName: state.voiceName,
        interfaceLanguage: state.interfaceLanguage,
        // isRecordingEnabled removed from persistence
        isUserRecordingEnabled: state.isUserRecordingEnabled,
        apiKey: state.apiKey,
        customSystemInstruction: state.customSystemInstruction,
        customInstructions: state.customInstructions,
        resumptionToken: state.resumptionToken, // Persist token to survive refreshes
        fontSize: state.fontSize,
        promptProfile: state.promptProfile,
      }),
    },
  ),
);

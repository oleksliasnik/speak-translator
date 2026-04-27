import { useRef, useCallback, useEffect } from "react";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { useLiveStore } from "@/app/store/useLiveStore";
import {
  createBlob,
  decode,
  decodeAudioData,
  PCM_SAMPLE_RATE_INPUT,
  PCM_SAMPLE_RATE_OUTPUT,
  mergeBuffers,
  pcmToWav,
  trimSilence,
} from "@/shared/lib/audioUtils";
import { saveAudio } from "@/shared/lib/db";
import { ConnectionStatus } from "@/shared/types";
import { getSystemPrompt } from "@/shared/lib/prompts";

export const useGeminiNativeAudio = () => {
  const {
    setStatus,
    setError,
    setVolumes,
    addTranscript,
    setStreamingContent,
    startNewSession,
    reset,
    playbackRate,
    inputGain,
    outputGain,
    noiseSuppression,
    isMicOn, // Get Mic state
    loadHistory,
    setResumptionToken, // Action to update token
  } = useLiveStore();

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Refs for non-React state (AudioContexts, Streams, etc.)
  const audioContextsRef = useRef<{
    input: AudioContext | null;
    output: AudioContext | null;
  }>({ input: null, output: null });
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Refs for dynamic values accessed inside callbacks/audio loop
  const settingsRef = useRef({
    playbackRate,
    inputGain,
    outputGain,
    noiseSuppression,
    isMicOn,
  });

  // Retry management
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRetryingRef = useRef(false);

  // Audio Mode Ref for suppression
  const audioModeRef = useRef<"microphone" | "system" | "both">("microphone");

  // Track active audio nodes to stop them immediately on interruption
  const activeSourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Update refs when store changes
  useEffect(() => {
    settingsRef.current = {
      playbackRate,
      inputGain,
      outputGain,
      noiseSuppression,
      isMicOn,
    };

    // Update live audio nodes if they exist
    if (resourcesRef.current.inputGainNode) {
      // If Mic is OFF, set gain to 0. Otherwise use inputGain.
      const effectiveInputGain = isMicOn ? inputGain : 0;
      resourcesRef.current.inputGainNode.gain.setValueAtTime(
        effectiveInputGain,
        audioContextsRef.current.input?.currentTime || 0,
      );
    }
    if (resourcesRef.current.outputGainNode) {
      const isSystemAudio =
        audioModeRef.current === "system" || audioModeRef.current === "both";
      const effectiveOutputGain = isSystemAudio ? 0 : outputGain;
      resourcesRef.current.outputGainNode.gain.setValueAtTime(
        effectiveOutputGain,
        audioContextsRef.current.output?.currentTime || 0,
      );
    }
  }, [playbackRate, inputGain, outputGain, noiseSuppression, isMicOn]);

  // Audio processing resources
  const resourcesRef = useRef<{
    inputSource: MediaStreamAudioSourceNode | null;
    inputGainNode: GainNode | null;
    outputGainNode: GainNode | null;
    scriptProcessor: ScriptProcessorNode | null;
    inputAnalyser: AnalyserNode | null;
    outputAnalyser: AnalyserNode | null;
    analysisInterval: number | null;
  }>({
    inputSource: null,
    inputGainNode: null,
    outputGainNode: null,
    scriptProcessor: null,
    inputAnalyser: null,
    outputAnalyser: null,
    analysisInterval: null,
  });

  // Session management
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Buffer Accumulation for Recording
  const audioAccumulatorRef = useRef<{
    input: Uint8Array[];
    output: Uint8Array[];
  }>({ input: [], output: [] });

  const transcriptionBufferRef = useRef<{ input: string; output: string }>({
    input: "",
    output: "",
  });

  // Timeout ref for detecting model silence (no response after user input)
  const modelResponseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flag to track if the disconnection was initiated by the user
  const isUserDisconnectRef = useRef(false);

  // --- Flush unsaved buffers (reusable helper) ---
  const flushBuffers = useCallback(() => {
    const { isRecordingEnabled, isUserRecordingEnabled } = useLiveStore.getState();

    // Clear model response timeout
    if (modelResponseTimeoutRef.current) {
      clearTimeout(modelResponseTimeoutRef.current);
      modelResponseTimeoutRef.current = null;
    }

    // Save unsaved user input
    if (transcriptionBufferRef.current.input.trim()) {
      const msgId = crypto.randomUUID();
      let hasAudio =
        isRecordingEnabled && isUserRecordingEnabled && audioAccumulatorRef.current.input.length > 0;

      if (hasAudio) {
        const combined = mergeBuffers(audioAccumulatorRef.current.input);
        const trimmed = trimSilence(combined, PCM_SAMPLE_RATE_INPUT);
        if (trimmed.length > 0) {
          const wavBlob = pcmToWav(trimmed, PCM_SAMPLE_RATE_INPUT);
          saveAudio(msgId, wavBlob);
        } else {
          hasAudio = false;
        }
      }

      addTranscript({
        id: msgId,
        role: "user",
        text: transcriptionBufferRef.current.input.trim(),
        timestamp: Date.now(),
        hasAudio: hasAudio,
      });
    }

    // Save unsaved model output
    if (transcriptionBufferRef.current.output.trim()) {
      const msgId = crypto.randomUUID();
      const hasAudio =
        isRecordingEnabled && audioAccumulatorRef.current.output.length > 0;

      if (hasAudio) {
        const combined = mergeBuffers(audioAccumulatorRef.current.output);
        const wavBlob = pcmToWav(combined, PCM_SAMPLE_RATE_OUTPUT);
        saveAudio(msgId, wavBlob);
      }

      addTranscript({
        id: msgId,
        role: "model",
        text: transcriptionBufferRef.current.output.trim(),
        timestamp: Date.now(),
        hasAudio: hasAudio,
      });
    }

    // Clear buffers after flushing
    transcriptionBufferRef.current = { input: "", output: "" };
    audioAccumulatorRef.current = { input: [], output: [] };
    setStreamingContent(null);
  }, [addTranscript, setStreamingContent]);

  // Internal cleanup function to release resources without resetting store state (unless needed)
  const cleanupResources = useCallback(async (preserveMediaStream = false) => {
    // Stop Analysis Loop
    if (resourcesRef.current.analysisInterval) {
      clearInterval(resourcesRef.current.analysisInterval);
      resourcesRef.current.analysisInterval = null;
    }

    // Clear model response timeout
    if (modelResponseTimeoutRef.current) {
      clearTimeout(modelResponseTimeoutRef.current);
      modelResponseTimeoutRef.current = null;
    }

    // Stop all active audio sources
    activeSourceNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        /* ignore */
      }
    });
    activeSourceNodesRef.current.clear();

    // Disconnect Audio Nodes
    if (resourcesRef.current.scriptProcessor) {
      resourcesRef.current.scriptProcessor.disconnect();
      resourcesRef.current.scriptProcessor.onaudioprocess = null;
      resourcesRef.current.scriptProcessor = null;
    }

    if (resourcesRef.current.inputSource) {
      resourcesRef.current.inputSource.disconnect();
      resourcesRef.current.inputSource = null;
    }

    if (resourcesRef.current.inputGainNode) {
      resourcesRef.current.inputGainNode.disconnect();
      resourcesRef.current.inputGainNode = null;
    }

    if (resourcesRef.current.outputGainNode) {
      resourcesRef.current.outputGainNode.disconnect();
      resourcesRef.current.outputGainNode = null;
    }

    // Stop Media Stream (ONLY if not preserving for reconnect)
    if (!preserveMediaStream && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close Audio Contexts
    if (audioContextsRef.current.input) {
      await audioContextsRef.current.input.close();
      audioContextsRef.current.input = null;
    }

    if (audioContextsRef.current.output) {
      await audioContextsRef.current.output.close();
      audioContextsRef.current.output = null;
    }

    // Reset internal state (buffers are NOT cleared here — use flushBuffers before cleanup)
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
  }, []);

  const disconnect = useCallback(async () => {
    // Prevent any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Set flag so onclose knows this is intentional
    isUserDisconnectRef.current = true;

    retryCountRef.current = 0;
    isRetryingRef.current = false;

    // Flush unsaved buffers before cleanup
    flushBuffers();

    await cleanupResources();

    // Update Store
    reset();
  }, [reset, cleanupResources, flushBuffers]);

  const connect = useCallback(
    async (customStream?: MediaStream) => {
      // Check environment variable first, then store
      const apiKey =
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        useLiveStore.getState().apiKey;

      if (!apiKey) {
        setError(
          "API Key not found. Please set it in Settings or environment variables.",
        );
        setStatus(ConnectionStatus.ERROR);
        return;
      }

      // Reset user disconnect flag on new attempt
      isUserDisconnectRef.current = false;

      // Ensure we are starting fresh or appending to current
      if (!useLiveStore.getState().currentSessionId) {
        startNewSession();
      }

      const storeState = useLiveStore.getState();
      const {
        targetLanguage,
        mode,
        voiceName,
        transcripts,
        customSystemInstruction,
        resumptionToken,
        promptProfile,
        translationSource,
        translationTarget,
        playbackRate: currentPlaybackRate,
      } = storeState;

      let systemInstruction = getSystemPrompt(
        promptProfile,
        customSystemInstruction,
        true, // googleSearchEnabled
        mode,
        {
          targetLanguage,
          langA: translationSource,
          langB: translationTarget,
        },
        currentPlaybackRate,
        voiceName,
      );

      // If we are NOT resuming, restore Context from previous messages manually
      if (!resumptionToken && transcripts && transcripts.length > 0) {
        const MAX_CONTEXT_MESSAGES = 10;
        const recentMessages = transcripts.slice(-MAX_CONTEXT_MESSAGES);
        const contextString = recentMessages
          .map(
            (msg) =>
              `${msg.role === "user" ? "User" : "Assistant"}: ${msg.text}`,
          )
          .join("\n");

        systemInstruction += `\n\nIMPORTANT: Here is the recent history of the conversation. Use it to maintain context, but do not repeat what has already been said:\n${contextString}`;
      }

      try {
        if (!isRetryingRef.current) {
          setStatus(ConnectionStatus.CONNECTING);
        }
        setError(null);

        // --- Initialize Audio ---
        const inputCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: PCM_SAMPLE_RATE_INPUT,
        });
        const outputCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: PCM_SAMPLE_RATE_OUTPUT,
        });

        audioContextsRef.current = { input: inputCtx, output: outputCtx };

        // Setup Analysers
        const inputAnalyser = inputCtx.createAnalyser();
        // inputAnalyser.fftSize = 256;
        inputAnalyser.fftSize = 32;
        const outputAnalyser = outputCtx.createAnalyser();
        outputAnalyser.fftSize = 32;
        // inputAnalyser.smoothingTimeConstant = 0.8;
        // outputAnalyser.smoothingTimeConstant = 0.8;

        resourcesRef.current.inputAnalyser = inputAnalyser;
        resourcesRef.current.outputAnalyser = outputAnalyser;

        // Setup Gain Nodes
        const inputGainNode = inputCtx.createGain();
        // Initial value based on mic state
        const initialInputGain = settingsRef.current.isMicOn
          ? settingsRef.current.inputGain
          : 0;
        inputGainNode.gain.value = initialInputGain;
        resourcesRef.current.inputGainNode = inputGainNode;

        const outputGainNode = outputCtx.createGain();
        const initialOutputGain =
          audioModeRef.current === "system" || audioModeRef.current === "both"
            ? 0
            : settingsRef.current.outputGain;
        outputGainNode.gain.value = initialOutputGain;
        resourcesRef.current.outputGainNode = outputGainNode;

        outputGainNode.connect(outputAnalyser);
        outputAnalyser.connect(outputCtx.destination);

        let stream = customStream;
        if (
          !stream &&
          mediaStreamRef.current &&
          mediaStreamRef.current.active
        ) {
          console.log("Reusing existing active media stream for reconnect");
          stream = mediaStreamRef.current;
        }

        // Strict check: Block fallback if System/Both mode to prevent "Mic Switch" bug
        if (
          !stream &&
          (audioModeRef.current === "system" || audioModeRef.current === "both")
        ) {
          const msg =
            "Cannot auto-reconnect System Audio: Stream lost or inactive.";
          console.error(msg);
          setError("System Audio connection lost. Please reconnect manually.");
          setStatus(ConnectionStatus.ERROR);
          disconnect();
          return;
        }

        if (!stream) {
          console.log("No stream provided, falling back to microphone");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              autoGainControl: true,
              noiseSuppression: settingsRef.current.noiseSuppression,
            },
          });
        }
        mediaStreamRef.current = stream;

        // --- Initialize Gemini ---
        const ai = new GoogleGenAI({ apiKey });
        transcriptionBufferRef.current = { input: "", output: "" };
        audioAccumulatorRef.current = { input: [], output: [] };

        // Configure session
        const liveConfig: any = {
          model: "gemini-2.5-flash-native-audio-preview-12-2025",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
              },
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: [{ googleSearch: {} }],
          },
        };

        // Add resumption token if present
        if (resumptionToken) {
          console.log(
            "Attempting to resume session with token:",
            resumptionToken,
          );
          // Add session ID to config for resumption
          liveConfig.config.session = { id: resumptionToken };
        }

        const sessionPromise = ai.live.connect({
          ...liveConfig,
          callbacks: {
            onopen: () => {
              console.log("Gemini Live Session Opened");
              setStatus(ConnectionStatus.CONNECTED);

              // Reset retry count ONLY after stabilization (e.g. 5 seconds of connection)
              // This prevents infinite loops if connection opens but immediately closes
              if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
              }
              // We do not reset isRetryingRef here immediately for logic safety,
              // but we should reset count eventually.
              isRetryingRef.current = false;

              setTimeout(() => {
                if (
                  useLiveStore.getState().status === ConnectionStatus.CONNECTED
                ) {
                  retryCountRef.current = 0;
                }
              }, 5000);

              const source = inputCtx.createMediaStreamSource(stream);
              resourcesRef.current.inputSource = source;

              source.connect(inputGainNode);
              inputGainNode.connect(inputAnalyser);

              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                // Accumulate raw PCM (convert float32 to int16 for wav saving)
                // We re-use logic from createBlob but just keep the int16 buffer
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                  const s = Math.max(-1, Math.min(1, inputData[i]));
                  int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                const rawBytes = new Uint8Array(int16.buffer);
                audioAccumulatorRef.current.input.push(rawBytes);

                const pcmBlob = createBlob(inputData);
                sessionPromise.then((session) =>
                  session.sendRealtimeInput({ media: pcmBlob }),
                );
              };

              inputGainNode.connect(processor);
              processor.connect(inputCtx.destination);
              resourcesRef.current.scriptProcessor = processor;
            },
            onmessage: async (message: LiveServerMessage) => {
              const content = message.serverContent;

              // Check for session resumption token (newHandle)
              const msgAny = message as any;
              if (msgAny.newHandle) {
                console.log("Received new session handle:", msgAny.newHandle);
                setResumptionToken(msgAny.newHandle);
              } else if (msgAny.session?.newHandle) {
                console.log(
                  "Received new session handle (nested):",
                  msgAny.session.newHandle,
                );
                setResumptionToken(msgAny.session.newHandle);
              }

              if (message.toolCall) {
                console.log("Tool call received", message.toolCall);
              }

              const base64Audio =
                content?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                const rawBytes = decode(base64Audio);

                // Accumulate for saving
                audioAccumulatorRef.current.output.push(rawBytes);

                const ctx = audioContextsRef.current.output;
                const gainNode = resourcesRef.current.outputGainNode;

                if (ctx && gainNode) {
                  const audioBuffer = await decodeAudioData(
                    rawBytes,
                    ctx,
                    PCM_SAMPLE_RATE_OUTPUT,
                    1,
                  );

                  const currentRate = settingsRef.current.playbackRate;
                  nextStartTimeRef.current = Math.max(
                    nextStartTimeRef.current,
                    ctx.currentTime,
                  );

                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  // source.playbackRate.value = currentRate; // Disabled: we now use system prompt for speed
                  source.playbackRate.value = 1.0;

                  source.connect(gainNode);

                  // Add to active sources
                  activeSourceNodesRef.current.add(source);

                  // Remove from active sources when ended
                  source.onended = () => {
                    activeSourceNodesRef.current.delete(source);
                  };

                  source.start(nextStartTimeRef.current);
                  // nextStartTimeRef.current += audioBuffer.duration / currentRate;
                  nextStartTimeRef.current += audioBuffer.duration;
                }
              }

              if (content) {
                // --- HANDLE USER TRANSCRIPTION ---
                if (content.inputTranscription) {
                  transcriptionBufferRef.current.input +=
                    content.inputTranscription.text;
                  setStreamingContent({
                    role: "user",
                    text: transcriptionBufferRef.current.input,
                  });

                  // Start model response timeout — if no response in 15s, reconnect
                  if (modelResponseTimeoutRef.current) {
                    clearTimeout(modelResponseTimeoutRef.current);
                  }
                  modelResponseTimeoutRef.current = setTimeout(() => {
                    console.warn(
                      "Model response timeout (15s) — auto-reconnecting",
                    );
                    flushBuffers();
                    cleanupResources(true).then(() => {
                      retryCountRef.current = 0;
                      connect();
                    });
                  }, 15000);
                }

                // --- HANDLE MODEL TRANSCRIPTION ---
                if (content.outputTranscription) {
                  // Model responded — clear silence timeout
                  if (modelResponseTimeoutRef.current) {
                    clearTimeout(modelResponseTimeoutRef.current);
                    modelResponseTimeoutRef.current = null;
                  }

                  // Save pending user input at the start of model turn to prevent UI disappearance
                  if (
                    transcriptionBufferRef.current.input.trim() &&
                    transcriptionBufferRef.current.output.length === 0
                  ) {
                    const { isRecordingEnabled, isUserRecordingEnabled } = useLiveStore.getState();
                    const msgId = crypto.randomUUID();
                    let hasAudio =
                      isRecordingEnabled && isUserRecordingEnabled &&
                      audioAccumulatorRef.current.input.length > 0;

                    if (hasAudio) {
                      const combined = mergeBuffers(
                        audioAccumulatorRef.current.input,
                      );
                      const trimmed = trimSilence(combined, PCM_SAMPLE_RATE_INPUT);
                      if (trimmed.length > 0) {
                        const wavBlob = pcmToWav(trimmed, PCM_SAMPLE_RATE_INPUT);
                        saveAudio(msgId, wavBlob);
                      } else {
                        hasAudio = false;
                      }
                    }

                    addTranscript({
                      id: msgId,
                      role: "user",
                      text: transcriptionBufferRef.current.input.trim(),
                      timestamp: Date.now(),
                      hasAudio: hasAudio,
                    });

                    // Clear input buffer so we don't save it again on turnComplete
                    transcriptionBufferRef.current.input = "";
                    audioAccumulatorRef.current.input = [];
                  }

                  transcriptionBufferRef.current.output +=
                    content.outputTranscription.text;
                  setStreamingContent({
                    role: "model",
                    text: transcriptionBufferRef.current.output,
                  });
                }

                if (content.turnComplete) {
                  const { isRecordingEnabled, isUserRecordingEnabled } = useLiveStore.getState();

                  // --- SAVE REMAINDER USER TURN (if any) ---
                  if (transcriptionBufferRef.current.input.trim()) {
                    const msgId = crypto.randomUUID();
                    let hasAudio =
                      isRecordingEnabled && isUserRecordingEnabled &&
                      audioAccumulatorRef.current.input.length > 0;

                    // Save Audio
                    if (hasAudio) {
                      const combined = mergeBuffers(
                        audioAccumulatorRef.current.input,
                      );
                      const trimmed = trimSilence(combined, PCM_SAMPLE_RATE_INPUT);
                      if (trimmed.length > 0) {
                        const wavBlob = pcmToWav(trimmed, PCM_SAMPLE_RATE_INPUT);
                        saveAudio(msgId, wavBlob);
                      } else {
                        hasAudio = false;
                      }
                    }

                    addTranscript({
                      id: msgId,
                      role: "user",
                      text: transcriptionBufferRef.current.input.trim(),
                      timestamp: Date.now(),
                      hasAudio: hasAudio,
                    });
                  }

                  // --- SAVE MODEL TURN ---
                  if (transcriptionBufferRef.current.output.trim()) {
                    const msgId = crypto.randomUUID();
                    const hasAudio =
                      isRecordingEnabled &&
                      audioAccumulatorRef.current.output.length > 0;

                    // Save Audio
                    if (hasAudio) {
                      const combined = mergeBuffers(
                        audioAccumulatorRef.current.output,
                      );
                      const wavBlob = pcmToWav(
                        combined,
                        PCM_SAMPLE_RATE_OUTPUT,
                      );
                      saveAudio(msgId, wavBlob);
                    }

                    addTranscript({
                      id: msgId,
                      role: "model",
                      text: transcriptionBufferRef.current.output.trim(),
                      timestamp: Date.now(),
                      hasAudio: hasAudio,
                    });
                  }

                  // Reset Buffers
                  transcriptionBufferRef.current = { input: "", output: "" };
                  audioAccumulatorRef.current = { input: [], output: [] };
                  setStreamingContent(null);
                }

                if (content.interrupted) {
                  console.log("Model interrupted");

                  // STOP ALL CURRENT AUDIO immediately
                  activeSourceNodesRef.current.forEach((node) => {
                    try {
                      node.stop();
                    } catch (e) {
                      // Ignore errors if already stopped
                    }
                  });
                  activeSourceNodesRef.current.clear();

                  nextStartTimeRef.current = 0;
                  const { isRecordingEnabled, isUserRecordingEnabled } = useLiveStore.getState();

                  // Even if interrupted, save what we have for MODEL output
                  if (transcriptionBufferRef.current.output.trim()) {
                    const msgId = crypto.randomUUID();
                    const hasAudio =
                      isRecordingEnabled &&
                      audioAccumulatorRef.current.output.length > 0;

                    if (hasAudio) {
                      const combined = mergeBuffers(
                        audioAccumulatorRef.current.output,
                      );
                      const wavBlob = pcmToWav(
                        combined,
                        PCM_SAMPLE_RATE_OUTPUT,
                      );
                      saveAudio(msgId, wavBlob);
                    }
                    addTranscript({
                      id: msgId,
                      role: "model",
                      text:
                        transcriptionBufferRef.current.output.trim() +
                        " [Interrupted]",
                      timestamp: Date.now(),
                      hasAudio: hasAudio,
                    });
                  }

                  // If we also had pending user input during interruption (rare but possible)
                  if (transcriptionBufferRef.current.input.trim()) {
                    const msgId = crypto.randomUUID();
                    let hasAudio =
                      isRecordingEnabled && isUserRecordingEnabled &&
                      audioAccumulatorRef.current.input.length > 0;

                    if (hasAudio) {
                      const combined = mergeBuffers(
                        audioAccumulatorRef.current.input,
                      );
                      const trimmed = trimSilence(combined, PCM_SAMPLE_RATE_INPUT);
                      if (trimmed.length > 0) {
                        const wavBlob = pcmToWav(trimmed, PCM_SAMPLE_RATE_INPUT);
                        saveAudio(msgId, wavBlob);
                      } else {
                        hasAudio = false;
                      }
                    }

                    addTranscript({
                      id: msgId,
                      role: "user",
                      text: transcriptionBufferRef.current.input.trim(),
                      timestamp: Date.now(),
                      hasAudio: hasAudio,
                    });
                  }

                  transcriptionBufferRef.current = { input: "", output: "" };
                  audioAccumulatorRef.current = { input: [], output: [] };
                  setStreamingContent(null);
                }
              }
            },
            onclose: () => {
              console.log("Gemini Live Session Closed");

              // If user manually disconnected, do NOT reconnect
              if (isUserDisconnectRef.current) {
                console.log("Session closed by user - no auto-reconnect");
                return;
              }

              if (!isRetryingRef.current && retryCountRef.current < 3) {
                // Auto-reconnect: flush buffers and retry
                console.log(
                  `Auto-reconnecting... (attempt ${retryCountRef.current + 1}/3)`,
                );
                isRetryingRef.current = true;
                retryCountRef.current += 1;
                flushBuffers();
                cleanupResources(true).then(() => {
                  retryTimeoutRef.current = setTimeout(() => {
                    connect();
                  }, 1000);
                });
              } else if (!isRetryingRef.current) {
                // Exhausted retries, give up
                disconnect();
              }
            },
            onerror: (err) => {
              console.error("Gemini Live Error:", err);

              // Check if it's a resumption error (likely expired token)
              const currentToken = useLiveStore.getState().resumptionToken;
              if (currentToken) {
                console.warn(
                  "Resumption failed, clearing token and retrying...",
                );
                setResumptionToken(null);

                // Retry immediately with fresh session
                flushBuffers();
                cleanupResources(true).then(() => {
                  connect();
                });
                return;
              }

              // Handle 503 or Service Unavailable with retry
              if (retryCountRef.current < 3) {
                const delay = Math.pow(2, retryCountRef.current) * 1000;
                console.log(
                  `Connection failed. Retrying in ${delay}ms... (Attempt ${retryCountRef.current + 1})`,
                );

                isRetryingRef.current = true;
                retryCountRef.current += 1;

                // Clean up current failed attempt
                flushBuffers();
                cleanupResources(true).then(() => {
                  retryTimeoutRef.current = setTimeout(() => {
                    connect();
                  }, delay);
                });
              } else {
                isRetryingRef.current = false;
                setError(
                  "Connection Error: " + (err.message || "Service Unavailable"),
                );
                setStatus(ConnectionStatus.ERROR);
                disconnect();
              }
            },
          },
        });

        sessionPromiseRef.current = sessionPromise;

        resourcesRef.current.analysisInterval = window.setInterval(() => {
          if (
            !resourcesRef.current.inputAnalyser ||
            !resourcesRef.current.outputAnalyser
          )
            return;

          const inputData = new Uint8Array(
            resourcesRef.current.inputAnalyser.frequencyBinCount,
          );
          const outputData = new Uint8Array(
            resourcesRef.current.outputAnalyser.frequencyBinCount,
          );

          resourcesRef.current.inputAnalyser.getByteFrequencyData(inputData);
          resourcesRef.current.outputAnalyser.getByteFrequencyData(outputData);

          const inVol = inputData.reduce((a, b) => a + b, 0) / inputData.length;
          const outVol =
            outputData.reduce((a, b) => a + b, 0) / outputData.length;

          setVolumes(inVol, outVol);
        }, 80);
      } catch (error: any) {
        console.error("Connection initialization failed:", error);

        // Immediate Fallback for Resumption Failure in synchronous phase
        const currentToken = useLiveStore.getState().resumptionToken;
        if (currentToken) {
          console.warn(
            "Initialization with resumption token failed, retrying without token...",
          );
          setResumptionToken(null);

          flushBuffers();
          cleanupResources(true).then(() => {
            connect();
          });
          return;
        }

        if (retryCountRef.current < 3) {
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          isRetryingRef.current = true;
          retryCountRef.current += 1;

          flushBuffers();
          cleanupResources(true).then(() => {
            retryTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          });
        } else {
          setError(error.message || "Failed to connect");
          setStatus(ConnectionStatus.ERROR);
          disconnect();
        }
      }
    },
    [
      setStatus,
      setError,
      setVolumes,
      addTranscript,
      setStreamingContent,
      disconnect,
      cleanupResources,
      flushBuffers,
      startNewSession,
      setResumptionToken,
    ],
  );

  const sendTextMessage = useCallback(
    (text: string) => {
      if (!sessionPromiseRef.current) {
        console.warn("No active session to send text");
        return;
      }

      // Add to transcript immediately for UI feedback
      const msgId = crypto.randomUUID();
      addTranscript({
        id: msgId,
        role: "user",
        text: text,
        timestamp: Date.now(),
      });

      sessionPromiseRef.current.then((session) => {
        try {
          // Cast to any because the type definition might not show 'text' property
          // but it is supported by the underlying API for low-latency text
          const s = session as any;
          s.sendRealtimeInput({ text: text });
        } catch (e) {
          console.error("Error sending text via sendRealtimeInput:", e);

          // Fallback to old method if failed
          const turns = [
            {
              role: "user",
              parts: [{ text: text }],
            },
          ];
          const turnComplete = true;
          if (typeof session.sendClientContent === "function") {
            session.sendClientContent({ turns, turnComplete });
          }
        }
      });
    },
    [addTranscript],
  );

  // Helper to stop audio manually (e.g. when user types)
  const stopAudio = useCallback(() => {
    activeSourceNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        /* ignore */
      }
    });
    activeSourceNodesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  // Modify sendTextMessage to stop audio and flush buffers
  const sendTextMessageWithInterrupt = useCallback(
    (text: string) => {
      stopAudio();

      // Flush pending AI response to maintain correct message ordering
      flushBuffers();

      // Now send the user's message
      sendTextMessage(text);
    },
    [sendTextMessage, stopAudio, flushBuffers],
  );

  // Auto-reconnect on speed change to apply new prompt
  useEffect(() => {
    const { status } = useLiveStore.getState();
    if (status === ConnectionStatus.CONNECTED) {
      console.log(
        "Playback speed changed. Re-connecting to apply new system prompt...",
      );

      cleanupResources(true).then(() => {
        connect();
      });
    }
  }, [playbackRate, connect, cleanupResources]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Function to update audio mode from UI
  const setAudioMode = useCallback((mode: "microphone" | "system" | "both") => {
    audioModeRef.current = mode;
    // Trigger update immediately if nodes exist
    if (
      resourcesRef.current.outputGainNode &&
      audioContextsRef.current.output
    ) {
      const outputGain = settingsRef.current.outputGain; // Get latest gain setting
      const isSystemAudio = mode === "system" || mode === "both";
      const effectiveOutputGain = isSystemAudio ? 0 : outputGain;

      resourcesRef.current.outputGainNode.gain.setValueAtTime(
        effectiveOutputGain,
        audioContextsRef.current.output.currentTime,
      );
    }
  }, []);

  // API to interrupt currently streaming AI response manually
  const interrupt = useCallback(() => {
    stopAudio();
    if (!sessionPromiseRef.current) return;

    sessionPromiseRef.current.then((session) => {
      try {
        const s = session as any;
        if (typeof s.sendClientContent === "function") {
          // Send a turnComplete signal to interrupt the model
          s.sendClientContent({ turnComplete: true });
        } else if (typeof s.send === "function") {
          s.send({ clientContent: { turnComplete: true } });
        }
      } catch (e) {
        console.error("Error sending interrupt signal:", e);
      }
    });

    // Optionally flag state so we ignore any trailing audio chunks that might arrive before the server completely stops
    // But sending turnComplete: true usually aborts generation immediately on the server.
  }, [stopAudio]);

  return {
    connect,
    disconnect,
    sendTextMessage: sendTextMessageWithInterrupt,
    setAudioMode,
    interrupt,
  };
};

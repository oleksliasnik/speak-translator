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

export const useGeminiLiveV3 = () => {
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
  const sessionRef = useRef<any | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sawSetupCompleteRef = useRef(false);
  const usedResumptionHandleRef = useRef(false);
  const resumptionFallbackAttemptedRef = useRef(false);
  const isSocketOpenRef = useRef(false);
  const lastModelActivityAtRef = useRef(0);
  const inputChunkCountRef = useRef(0);
  const lastInputDebugLogAtRef = useRef(0);
  const lastSessionHydrateTryAtRef = useRef(0);

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

  // Timeout for auto-hiding empty placeholder if model ignores noise
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flag to track if the current turn has been aborted to ignore trailing packets
  const isTurnAbortedRef = useRef(false);
  const lastManualInterruptAtRef = useRef(0);

  // --- Flush unsaved buffers (reusable helper) ---
  const flushBuffers = useCallback(() => {
    const { isRecordingEnabled, isUserRecordingEnabled } =
      useLiveStore.getState();

    // Clear model response timeout
    if (modelResponseTimeoutRef.current) {
      clearTimeout(modelResponseTimeoutRef.current);
      modelResponseTimeoutRef.current = null;
    }

    // Save unsaved user input
    if (transcriptionBufferRef.current.input.trim()) {
      const msgId = crypto.randomUUID();
      let hasAudio =
        isRecordingEnabled &&
        isUserRecordingEnabled &&
        audioAccumulatorRef.current.input.length > 0;

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

    // Close websocket session if still around
    const sessionPromise = sessionPromiseRef.current;
    if (sessionPromise) {
      try {
        const session = await sessionPromise;
        sessionRef.current = null;
        isSocketOpenRef.current = false;
        if (session && typeof session.close === "function") {
          session.close();
        }
      } catch {
        // ignore
      }
    }

    // Reset internal state (buffers are NOT cleared here — use flushBuffers before cleanup)
    sessionPromiseRef.current = null;
    sessionRef.current = null;
    isSocketOpenRef.current = false;
    nextStartTimeRef.current = 0;
  }, []);

  const stopInputPump = useCallback(() => {
    const processor = resourcesRef.current.scriptProcessor;
    if (!processor) return;
    try {
      processor.onaudioprocess = null;
      processor.disconnect();
    } catch {
      // ignore
    }
    resourcesRef.current.scriptProcessor = null;
  }, []);

  const canSendToSession = useCallback((session: any): boolean => {
    if (!session) return false;
    const readyState = session?.conn?.readyState;
    // In some web SDK builds `conn` is not exposed. In that case we trust `isSocketOpenRef`.
    if (typeof readyState === "number") {
      return readyState === 1;
    }
    return isSocketOpenRef.current;
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
        const MAX_CONTEXT_MESSAGES = 20;
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
        sawSetupCompleteRef.current = false;
        usedResumptionHandleRef.current = false;
        resumptionFallbackAttemptedRef.current = false;
        isSocketOpenRef.current = false;
        sessionRef.current = null;
        inputChunkCountRef.current = 0;
        lastInputDebugLogAtRef.current = 0;

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
          model: "gemini-3.1-flash-live-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
              },
            },
            thinkingConfig: {
              thinkingLevel: "minimal",
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                prefixPaddingMs: 180,
                silenceDurationMs: 2000,
              },
            },
            // tools: [{ googleSearch: {} }],
          },
        };

        // Add resumption token if present
        if (resumptionToken) {
          console.log(
            "Attempting to resume session with token:",
            resumptionToken,
          );
          usedResumptionHandleRef.current = true;
          // Enable session resumption updates; `handle` restores prior state.
          liveConfig.config.sessionResumption = { handle: resumptionToken };
        }

        const sessionPromise = ai.live.connect({
          ...liveConfig,
          callbacks: {
            onopen: () => {
              console.log("Gemini Live Session Opened");
              setStatus(ConnectionStatus.CONNECTED);
              isSocketOpenRef.current = true;

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
                // If socket is closing/closed (quota, network, etc), do not keep sending.
                if (!isSocketOpenRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Accumulate raw PCM (convert float32 to int16 for wav saving)
                // We re-use logic from createBlob but just keep the int16 buffer
                const l = inputData.length;
                const int16 = new Int16Array(l);
                let sumSquares = 0;
                for (let i = 0; i < l; i++) {
                  const s = Math.max(-1, Math.min(1, inputData[i]));
                  sumSquares += s * s;
                  int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                const rawBytes = new Uint8Array(int16.buffer);
                audioAccumulatorRef.current.input.push(rawBytes);
                inputChunkCountRef.current += 1;

                // --- CLIENT-SIDE VAD (Streaming UI Feedback) ---
                const rms = Math.sqrt(sumSquares / l);
                if (rms > 0.012 && settingsRef.current.isMicOn) {
                  // If noise/speech detected, clear silence hide timer
                  // Don't reset if we just manually interrupted (2s cooldown)
                  if (Date.now() - lastManualInterruptAtRef.current > 2000) {
                    isTurnAbortedRef.current = false;
                  }

                  if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = null;
                  }

                  // If user is speaking but no text yet, show placeholder to activate bubble
                  if (!transcriptionBufferRef.current.input) {
                    setStreamingContent({
                      role: "user",
                      text: "",
                    });
                  }
                } else {
                  // If silence and we have an empty user bubble, start a timer to hide it
                  const currentStreaming =
                    useLiveStore.getState().streamingContent;
                  if (
                    currentStreaming?.role === "user" &&
                    currentStreaming?.text === "" &&
                    !silenceTimeoutRef.current
                  ) {
                    silenceTimeoutRef.current = setTimeout(() => {
                      setStreamingContent(null);
                      silenceTimeoutRef.current = null;
                    }, 2500);
                  }
                }

                const pcmBlob = createBlob(inputData);
                let session = sessionRef.current;
                if (!session) {
                  const now = Date.now();
                  if (now - lastSessionHydrateTryAtRef.current > 1000) {
                    lastSessionHydrateTryAtRef.current = now;
                    const pending = sessionPromiseRef.current;
                    if (pending) {
                      pending
                        .then((resolved) => {
                          if (sessionPromiseRef.current !== pending) return;
                          sessionRef.current = resolved;
                        })
                        .catch(() => {
                          // ignore
                        });
                    }
                  }
                  return;
                }

                if (!canSendToSession(session)) return;

                const now = Date.now();
                if (
                  now - lastInputDebugLogAtRef.current >= 1000 &&
                  inputChunkCountRef.current % 5 === 0
                ) {
                  const rms = Math.sqrt(sumSquares / l);
                  // console.log("[LiveDebug] sending audio chunk", {
                  //   chunksSent: inputChunkCountRef.current,
                  //   samples: l,
                  //   rms,
                  //   wsReadyState: session?.conn?.readyState ?? "unknown",
                  //   isMicOn: settingsRef.current.isMicOn,
                  //   audioMode: audioModeRef.current,
                  // });
                  lastInputDebugLogAtRef.current = now;
                }

                try {
                  // Gemini 3.1 Live: use `audio` field (media_chunks is deprecated).
                  session.sendRealtimeInput({ audio: pcmBlob });
                } catch {
                  // Avoid spamming console if socket is already closing/closed
                }
              };

              inputGainNode.connect(processor);
              processor.connect(inputCtx.destination);
              resourcesRef.current.scriptProcessor = processor;
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.setupComplete) {
                sawSetupCompleteRef.current = true;
                console.log(
                  "Gemini Live Setup Complete",
                  message.setupComplete,
                );
              }

              const content = message.serverContent;

              // Session resumption token (Gemini Live session handle)
              const msgAny = message as any;
              const newHandle =
                message.sessionResumptionUpdate?.newHandle ||
                msgAny.newHandle ||
                msgAny.session?.newHandle;
              if (newHandle) {
                // console.log("Received new session handle:", newHandle);
                setResumptionToken(newHandle);
              }

              if (message.toolCall) {
                console.log("Tool call received", message.toolCall);
              }

              if (content) {
                // --- 1. HIGHEST PRIORITY: Check for Interruption Signal ---
                if (content.interrupted) {
                  console.log("Model interrupted (server-side)");
                  // STOP ALL CURRENT AUDIO immediately
                  activeSourceNodesRef.current.forEach((node) => {
                    try {
                      node.stop();
                    } catch (e) {}
                  });
                  activeSourceNodesRef.current.clear();
                  nextStartTimeRef.current = 0;

                  // Flush what we have and LOCK the model output
                  flushBuffers();
                  isTurnAbortedRef.current = true;
                }

                // --- 2. MODEL TURN GUARD ---
                // If we are in aborted state, skip all model output until next user action.
                // We reset the guard if we see a model turn and we have fresh user input waiting.
                const isModelOutput =
                  !!content.modelTurn || !!content.outputTranscription;
                if (isTurnAbortedRef.current && isModelOutput) {
                  return;
                }

                // Gemini 3.1 may emit multiple parts (audio + text) per serverContent.
                const modelParts = content?.modelTurn?.parts;
                if (
                  Array.isArray(modelParts) &&
                  modelParts.length > 0 &&
                  !isTurnAbortedRef.current
                ) {
                  for (const part of modelParts as any[]) {
                    const base64Audio = part?.inlineData?.data;
                    if (base64Audio) {
                      lastModelActivityAtRef.current = Date.now();
                      const rawBytes = decode(base64Audio);
                      const mimeType =
                        typeof part?.inlineData?.mimeType === "string"
                          ? part.inlineData.mimeType.toLowerCase()
                          : "";

                      // Accumulate for saving
                      audioAccumulatorRef.current.output.push(rawBytes);

                      const ctx = audioContextsRef.current.output;
                      const gainNode = resourcesRef.current.outputGainNode;

                      if (ctx && gainNode) {
                        try {
                          let audioBuffer: AudioBuffer;

                          if (mimeType.includes("audio/pcm")) {
                            const rateMatch = mimeType.match(/rate=(\d+)/i);
                            const sampleRateFromMime = rateMatch
                              ? Number(rateMatch[1])
                              : PCM_SAMPLE_RATE_OUTPUT;

                            audioBuffer = await decodeAudioData(
                              rawBytes,
                              ctx,
                              sampleRateFromMime,
                              1,
                            );
                          } else {
                            const encoded = new Uint8Array(rawBytes).buffer;
                            audioBuffer = await ctx.decodeAudioData(encoded);
                          }

                          // CRITICAL: If we were interrupted while decoding, discard this buffer
                          if (isTurnAbortedRef.current) return;

                          nextStartTimeRef.current = Math.max(
                            nextStartTimeRef.current,
                            ctx.currentTime,
                          );

                          const source = ctx.createBufferSource();
                          source.buffer = audioBuffer;
                          source.playbackRate.value = 1.0;

                          source.connect(gainNode);

                          // Add to active sources
                          activeSourceNodesRef.current.add(source);

                          // Remove from active sources when ended
                          source.onended = () => {
                            activeSourceNodesRef.current.delete(source);
                          };

                          source.start(nextStartTimeRef.current);
                          nextStartTimeRef.current += audioBuffer.duration;
                        } catch (audioDecodeError) {
                          console.warn("Failed to decode model audio part", {
                            mimeType,
                            byteLength: rawBytes.byteLength,
                            audioDecodeError,
                          });
                        }
                      }
                    }

                    // If the model returns text parts (e.g. mixed modality), surface them.
                    if (
                      !content?.outputTranscription &&
                      typeof part?.text === "string" &&
                      part.text.length > 0
                    ) {
                      lastModelActivityAtRef.current = Date.now();
                      transcriptionBufferRef.current.output += part.text;
                      setStreamingContent({
                        role: "model",
                        text: transcriptionBufferRef.current.output,
                      });
                    }
                  }
                }

                // --- HANDLE USER TRANSCRIPTION ---
                if (content.inputTranscription) {
                  // Model confirmed speech, clear auto-hide timer
                  if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = null;
                  }
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
                if (content.outputTranscription && !isTurnAbortedRef.current) {
                  lastModelActivityAtRef.current = Date.now();
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
                    const { isRecordingEnabled, isUserRecordingEnabled } =
                      useLiveStore.getState();
                    const msgId = crypto.randomUUID();
                    let hasAudio =
                      isRecordingEnabled &&
                      isUserRecordingEnabled &&
                      audioAccumulatorRef.current.input.length > 0;

                    if (hasAudio) {
                      const combined = mergeBuffers(
                        audioAccumulatorRef.current.input,
                      );
                      const trimmed = trimSilence(
                        combined,
                        PCM_SAMPLE_RATE_INPUT,
                      );
                      if (trimmed.length > 0) {
                        const wavBlob = pcmToWav(
                          trimmed,
                          PCM_SAMPLE_RATE_INPUT,
                        );
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
                  console.log("[LiveDebug] turnComplete");
                  lastModelActivityAtRef.current = Date.now();
                  const { isRecordingEnabled, isUserRecordingEnabled } =
                    useLiveStore.getState();

                  // --- SAVE REMAINDER USER TURN (if any) ---
                  if (transcriptionBufferRef.current.input.trim()) {
                    const msgId = crypto.randomUUID();
                    let hasAudio =
                      isRecordingEnabled &&
                      isUserRecordingEnabled &&
                      audioAccumulatorRef.current.input.length > 0;

                    // Save Audio
                    if (hasAudio) {
                      const combined = mergeBuffers(
                        audioAccumulatorRef.current.input,
                      );
                      const trimmed = trimSilence(
                        combined,
                        PCM_SAMPLE_RATE_INPUT,
                      );
                      if (trimmed.length > 0) {
                        const wavBlob = pcmToWav(
                          trimmed,
                          PCM_SAMPLE_RATE_INPUT,
                        );
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
                  if (
                    transcriptionBufferRef.current.output.trim() &&
                    !isTurnAbortedRef.current
                  ) {
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
              }
            },
            onclose: (e) => {
              console.log("Gemini Live Session Closed", {
                code: e?.code,
                reason: e?.reason,
                wasClean: e?.wasClean,
              });
              isSocketOpenRef.current = false;
              stopInputPump();

              // Quota / billing issues are not recoverable by reconnecting.
              // Commonly surfaces as 1011 with a human-readable reason.
              const reasonText = (e?.reason || "").toLowerCase();
              if (
                e?.code === 1011 &&
                (reasonText.includes("quota") ||
                  reasonText.includes("billing") ||
                  reasonText.includes("plan"))
              ) {
                setError(e.reason || "Quota exceeded / billing required.");
                setStatus(ConnectionStatus.ERROR);
                flushBuffers();
                cleanupResources(true);
                return;
              }

              if (!sawSetupCompleteRef.current) {
                const closeInfo = `Live closed before setupComplete (code=${e?.code}, reason="${e?.reason || ""}")`;
                console.warn("[LiveDebug]", closeInfo);
                setError(closeInfo);
                setStatus(ConnectionStatus.ERROR);
                flushBuffers();
                cleanupResources(true);
                return;
              }

              // Invalid realtime input shape / deprecated field.
              if (e?.code === 1007) {
                setError(
                  e.reason ||
                    "Live protocol error (1007): realtime input format mismatch.",
                );
                setStatus(ConnectionStatus.ERROR);
                flushBuffers();
                cleanupResources(true);
                return;
              }

              // If we closed immediately after trying to resume, assume handle is invalid/expired.
              if (
                usedResumptionHandleRef.current &&
                !sawSetupCompleteRef.current &&
                !resumptionFallbackAttemptedRef.current
              ) {
                console.warn(
                  "Session closed before setupComplete while resuming; clearing resumption token and retrying once...",
                );
                resumptionFallbackAttemptedRef.current = true;
                setResumptionToken(null);
                flushBuffers();
                cleanupResources(true).then(() => {
                  connect();
                });
                return;
              }

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
              isSocketOpenRef.current = false;
              stopInputPump();

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
        sessionPromise
          .then((session) => {
            if (sessionPromiseRef.current !== sessionPromise) return;
            sessionRef.current = session;
          })
          .catch(() => {
            // ignore
          });

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
      stopInputPump,
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
          const s = session as any;
          if (!canSendToSession(s)) return;
          const sendAt = Date.now();
          s.sendRealtimeInput({ text: text });

          // Compatibility fallback for runtimes where realtime text does not
          // trigger model turn reliably.
          setTimeout(() => {
            if (!canSendToSession(s)) return;
            if (lastModelActivityAtRef.current >= sendAt) return;
            if (typeof s.sendClientContent !== "function") return;

            try {
              s.sendClientContent({
                turns: [{ role: "user", parts: [{ text }] }],
                turnComplete: true,
              });
            } catch {
              // ignore
            }
          }, 1200);
        } catch (e) {
          // Avoid spamming console if socket is already closing/closed
        }
      });
    },
    [addTranscript, canSendToSession],
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
      isTurnAbortedRef.current = false;

      // Restore gain correctly based on mode
      if (resourcesRef.current.outputGainNode) {
        const isSystemOnly =
          audioModeRef.current === "system" || audioModeRef.current === "both";
        const targetGain = isSystemOnly ? 0 : settingsRef.current.outputGain;

        resourcesRef.current.outputGainNode.gain.setValueAtTime(
          targetGain,
          audioContextsRef.current.output?.currentTime || 0,
        );
      }

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
    lastManualInterruptAtRef.current = Date.now();

    // 1. Немедленно останавливаем все играющие аудио-ноды и глушим звук
    activeSourceNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        /* ignore */
      }
    });
    activeSourceNodesRef.current.clear();

    if (resourcesRef.current.outputGainNode) {
      resourcesRef.current.outputGainNode.gain.setValueAtTime(
        0,
        audioContextsRef.current.output?.currentTime || 0,
      );
    }

    // 2. Сбрасываем время следующего старта, чтобы новые чанки не выстраивались в старую очередь
    if (audioContextsRef.current.output) {
      nextStartTimeRef.current = audioContextsRef.current.output.currentTime;
    }

    // 4. Сохраняем то, что модель успела сказать до прерывания
    // ВАЖНО: flushBuffers сбрасывает флаг в false, поэтому вызываем его ДО установки флага в true
    flushBuffers();

    // 5. Ставим флаг блокировки входящих пакетов
    isTurnAbortedRef.current = true;

    // 6. ЯВНО сообщаем серверу остановиться, забирая turn (очередь) себе
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session) => {
        try {
          const s = session as any;
          if (typeof s.send === "function") {
            s.send({
              clientContent: {
                turns: [{ role: "user", parts: [] }],
                turnComplete: true, // Сигнал модели прервать генерацию
              },
            });
          } else if (typeof s.sendClientContent === "function") {
            s.sendClientContent({
              turns: [{ role: "user", parts: [] }],
              turnComplete: true,
            });
          }
        } catch (e) {
          console.error("Failed to send interrupt signal to server", e);
        }
      });
    }
  }, [flushBuffers]);

  return {
    connect,
    disconnect,
    sendTextMessage: sendTextMessageWithInterrupt,
    setAudioMode,
    interrupt,
  };
};

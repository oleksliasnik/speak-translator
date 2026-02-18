import { useState, useEffect, useRef } from "react";

export type AudioMode = "microphone" | "system" | "both";

export const useSystemAudio = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AudioMode>("microphone");
  const [isCapturing, setIsCapturing] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<MediaStreamAudioSourceNode[]>([]);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    sourceNodesRef.current.forEach((node) => node.disconnect());
    sourceNodesRef.current = [];
    if (destRef.current) {
      destRef.current.disconnect();
      destRef.current = null;
    }
    setIsCapturing(false);
  };

  const startCapture = async (selectedMode: AudioMode) => {
    stopCapture();
    setError(null);
    setMode(selectedMode);

    try {
      let finalStream: MediaStream;

      // 1. Microphone Only
      if (selectedMode === "microphone") {
        finalStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }
      // 2. System Audio (Display Media)
      else if (selectedMode === "system") {
        finalStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true, // Video required to trigger picker/permissions
        });
        // We only want audio, so stop video tracks immediately to save resources
        finalStream.getVideoTracks().forEach((track) => track.stop());
      }
      // 3. Both (Mixing)
      else {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        destRef.current = dest;

        // Get Microphone Stream
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const micSource = ctx.createMediaStreamSource(micStream);
        micSource.connect(dest);
        sourceNodesRef.current.push(micSource);

        // Get System Audio Stream
        // Note: This might trigger a picker dialog
        const sysStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        sysStream.getVideoTracks().forEach((track) => track.stop());

        const sysSource = ctx.createMediaStreamSource(sysStream);
        sysSource.connect(dest);
        sourceNodesRef.current.push(sysSource);

        finalStream = dest.stream;
      }

      setStream(finalStream);
      setIsCapturing(true);
      return finalStream;
    } catch (err: any) {
      console.error("Error starting audio capture:", err);
      setError(err.message || "Failed to start audio capture");
      return null;
    }
  };

  return {
    stream,
    error,
    isCapturing,
    startCapture,
    stopCapture,
    mode,
  };
};

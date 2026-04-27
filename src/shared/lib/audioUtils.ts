import { Blob as GenAIBlob } from "@google/genai";

export const PCM_SAMPLE_RATE_INPUT = 16000;
export const PCM_SAMPLE_RATE_OUTPUT = 24000;

// Convert Float32Array (Web Audio API standard) to Int16Array (PCM standard)
// and wrap in Gemini Blob format
export function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: "audio/pcm;rate=16000",
  };
}

// Custom base64 decoder for raw PCM data
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom base64 encoder
export function encode(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert raw PCM bytes to an AudioBuffer for playback
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure Int16 alignment and respect byteOffset/byteLength.
  // Some payloads may have odd byte length; trim the trailing byte safely.
  const alignedByteLength = data.byteLength - (data.byteLength % 2);
  const dataInt16 = new Int16Array(
    data.buffer,
    data.byteOffset,
    alignedByteLength / 2,
  );
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Merge multiple Uint8Arrays (raw PCM bytes) into one
export function mergeBuffers(buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

// Convert PCM data (Int16, raw bytes) to WAV Blob
export function pcmToWav(
  pcmData: Uint8Array,
  sampleRate: number,
  numChannels: number = 1,
): globalThis.Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const totalDataLen = pcmData.length;

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + totalDataLen, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, totalDataLen, true);

  return new globalThis.Blob([header, pcmData as unknown as BlobPart], {
    type: "audio/wav",
  });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Helper to remove leading and trailing silence from recorded PCM data
export function trimSilence(
  pcmData: Uint8Array,
  sampleRate: number,
  threshold: number = 0.05,
  preRollMs: number = 200,
  postRollMs: number = 200,
): Uint8Array {
  // Uint8Array has length representing bytes. 16-bit PCM has 2 bytes per sample.
  const int16 = new Int16Array(
    pcmData.buffer,
    pcmData.byteOffset,
    pcmData.byteLength / 2,
  );

  const windowMs = 20;
  const windowSamples = Math.floor((sampleRate * windowMs) / 1000);

  let firstActiveFrame = -1;
  let lastActiveFrame = -1;

  for (let i = 0; i < int16.length; i += windowSamples) {
    const end = Math.min(i + windowSamples, int16.length);
    let maxAbs = 0;
    for (let j = i; j < end; j++) {
      const abs = Math.abs(int16[j] / 32768.0);
      if (abs > maxAbs) {
        maxAbs = abs;
      }
    }

    if (maxAbs > threshold) {
      if (firstActiveFrame === -1) {
        firstActiveFrame = i;
      }
      lastActiveFrame = end - 1;
    }
  }

  // If entire recording is below the threshold, it's just silence
  if (firstActiveFrame === -1) {
    return new Uint8Array(0);
  }

  const preRollSamples = Math.floor((sampleRate * preRollMs) / 1000);
  const postRollSamples = Math.floor((sampleRate * postRollMs) / 1000);

  const startIdx = Math.max(0, firstActiveFrame - preRollSamples);
  const endIdx = Math.min(int16.length - 1, lastActiveFrame + postRollSamples);

  // slice creates a copy by default, but taking subarray of Int16 and returning as Uint8
  const trimmedInt16 = int16.subarray(startIdx, endIdx + 1);
  // Important: create a new Uint8Array referencing a COPY of the sub-buffer
  const result = new Uint8Array(trimmedInt16.length * 2);
  result.set(new Uint8Array(trimmedInt16.buffer, trimmedInt16.byteOffset, trimmedInt16.byteLength));
  return result;
}

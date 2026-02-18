export interface AudioVisualizerState {
  inputVolume: number;
  outputVolume: number;
}

export enum ConnectionStatus {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR",
}

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  hasAudio?: boolean;
}

export interface ChatSession {
  id: string;
  startTime: number;
  messages: Message[];
  voiceName?: string;
}

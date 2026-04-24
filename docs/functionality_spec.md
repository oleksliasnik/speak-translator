# Speak-Translator: Functional Specification & Technical Architecture

This document provides a detailed description of the "Speak-Translator" application functionality, designed to guide an AI agent in recreating the application using React Native.

---

## 1. Project Overview
**Speak-Translator** is a real-time speech-to-speech translation and conversation application powered by Google's **Gemini Live (Multimodal Live API)**. It allows users to have natural, low-latency voice conversations with an AI that can act as a translator, tutor, or interviewer.

### Core Value Props:
- **Low Latency**: Real-time streaming of audio and text.
- **Multimodal**: Simultaneous audio output and text transcription.
- **Contextual**: Multi-turn conversations with history preservation.
- **Flexible**: Multiple prompt profiles for different use cases.

---

## 2. Technical Stack (Current)
- **Framework**: Next.js 16 (App Router), React 19.
- **Styling**: Tailwind CSS 4.
- **State Management**: Zustand (with Persistence).
- **Storage**: IndexedDB (for audio blobs and chat history).
- **Intelligence**: Google Gemini Live API (`@google/genai`).
- **Runtime**: Web Browser / Electron.

---

## 3. Key Functionalities

### 3.1. Real-time Audio Engine
The heart of the app is its bidirectional audio pipeline.
- **Input (User)**: Captures audio at **16,000 Hz (16kHz)** mono PCM.
- **Output (AI)**: Receives and plays back audio at **24,000 Hz (24kHz)** mono PCM.
- **Audio Sources**:
  - **Microphone**: Standard user input.
  - **System Audio**: Captures audio from the OS (useful for translating videos/calls).
  - **Both**: Combinatory mode.
- **Processing**:
  - **Gain Control**: User-adjustable input and output volume.
  - **Noise Suppression**: Toggleable software-based suppression.
  - **Silence Trimming**: Automatically removes leading/trailing silence from saved recordings to save space.

### 3.2. Gemini Live Integration
The app uses a WebSocket-based connection (via the Gemini SDK) to maintain a "Live Session."
- **Streaming PCM**: Raw PCM data is sent to Gemini in small chunks.
- **Modality**: Configured for `Modality.AUDIO` responses.
- **Session Resumption**: Uses a `resumptionToken` (handled as `newHandle` in the protocol) to allow the app to reconnect and continue a conversation without losing context or restarting the state.
- **Interruption Support**: The AI's response can be interrupted immediately by stopping the playback buffers and sending an interrupt signal to the API.

### 3.3. Interaction Modes
1.  **Translation Mode**: Strictly translates between two selected languages (e.g., English ↔ Ukrainian). The AI is instructed NOT to converse, only to interpret.
2.  **Conversation Mode**: The AI acts as a chat partner. The user can select a "Target Language" or set it to "Universal" (auto-detect).

### 3.4. AI Profiles (System Prompts)
The app features predefined "Prompt Profiles" that dynamically change the AI's behavior:
- **Tutors**: English, German, Estonian (Corrects grammar and suggests improvements).
- **Interviewers**: Universal or Frontend-specific (Asks questions, evaluates answers).
- **Personalities**: Friendly, Formal, Supportive, Funny, Philosophical, Assertive Debater, Strict Mentor.
- **Custom**: Users can provide their own system instructions.

### 3.5. History & Data Management
- **Persistent Sessions**: All conversations are saved to IndexedDB.
- **Audio Archiving**: If enabled, the app saves WAV versions of both user and AI turns.
- **Storage Control**: Users can see memory usage and delete specific messages or entire sessions to free up space.
- **Partial Persistence**: Settings (API key, language, theme) are saved in LocalStorage, while heavy data (History) stays in IndexedDB.

---

## 4. UI/UX Components

### 4.1. TopBar (Adaptive)
- **Language Mode Control**: Quick switch between modes and languages.
- **Settings Access**: Font size, volume, speed, and API key configuration.
- **Mobile Adaptation**: On small screens, secondary controls collapse into a "More Options" (:vertical-ellipsis:) menu.

### 4.2. Orbit Visualizer
- A dynamic visual element that reacts to audio volume levels (input and output), providing visual feedback that the "AI is listening" or "AI is speaking."

### 4.3. Chat List
- Displays messages with roles (`user` vs `model`).
- Supports **Markdown** rendering for AI responses.
- **Streaming UI**: Shows text as it arrives from the AI before the turn is complete.
- **Audio Playback**: Each saved message has a play button to re-listen to the audio.

---

## 5. Implementation Notes for React Native

### 5.1. Audio Pipeline
- **Problem**: Web Audio API (`AudioContext`) is not available in React Native.
- **Solution**: Use `react-native-audio-recorder-player`, `expo-av`, or specialized native modules for high-frequency PCM sampling (16kHz).
- **Buffer Management**: Must handle raw PCM buffers and convert them to Base64 for the Web Socket.

### 5.2. Networking
- **WebSocket**: The Gemini SDK uses WebSockets. React Native has built-in WebSocket support, but ensure the `@google/genai` library is shimmed or used via a compatible interface.

### 5.3. Storage
- **Replacement**: Swap IndexedDB for **SQLite** (via `expo-sqlite`) or **JSON files** for history.
- **Large Files**: Save WAV audio blobs as files in the app's document directory rather than in the database.

### 5.4. Hardware Controls
- Implement background audio support if the user wants to translate while using other apps.
- Handle "Audio Session" categories (e.g., `PlayAndRecord`).

---

## 6. Logic Flow (Pseudo-code)
1. **Initialize**: Load API Key and History from storage.
2. **Setup Audio**: Open Input Stream (16kHz PCM).
3. **Connect**: Open Gemini Live Session with `systemInstruction` based on current Profile/Mode.
4. **Loop (Input)**:
   - Capture 4096-sample PCM chunk.
   - Send to Gemini via `sendRealtimeInput`.
   - Visualize volume.
5. **Loop (Output)**:
   - On `onmessage` with audio data: Buffer and play PCM at 24kHz.
   - On `onmessage` with text: Update "Streaming" UI.
   - On `turnComplete`: Flush text/audio to Database History.
6. **Interrupt**: On user speech detection (or button click), stop all playback and send "Interrupted" status.

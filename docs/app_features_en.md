# Speak-Translator: User Experience & Application Features

This document describes how the Speak-Translator application works from a user perspective. It focuses on functional capabilities, user interaction, and available settings.

---

## 1. Application Concept
Speak-Translator is a personal voice assistant that allows for real-time, bidirectional voice communication with an AI. It is designed for instant translation of speech and natural conversations in various languages.

---

## 2. Core Operational Modes

### 2.1. Translation Mode
In this mode, the application acts as an invisible interpreter with flexible language selection:
- **Language Selection Options**: 
    - **Target Language Mode**: You select one target language. The AI automatically detects any source language you speak and translates it into your chosen target language.
    - **Dual Language Mode**: You select two specific languages (e.g., A: English, B: Ukrainian). The AI translates from A to B and from B to A automatically.
- **Strict Behavior**: The AI is instructed to strictly translate without engaging in conversation or providing explanations.
- **Instant Result**: The translation is voiced by the AI and shown as text on the screen simultaneously.

### 2.2. Conversation Mode (Chat)
This mode is for talking directly to the AI as if it were a person.
- **Target Language**: You can set a specific language for the AI to speak or let it detect your language and respond accordingly.
- **Context Awareness**: The AI remembers the context of the current conversation, allowing for natural, multi-turn dialogues.

---

## 3. Communication Control Modes
The user can choose how the application handles their speech:

- **Continuous Mode (Automatic)**: The application automatically detects when you finish speaking and sends the message to the AI. This creates a fluid, hands-free conversation flow.
- **Push-to-Talk Mode (Manual)**: You press and hold the microphone button while speaking. The message is only sent to the AI when you release the button. This allows you to pause, think, or speak in a noisy environment without fear of being prematurely interrupted or sending an incomplete thought.

---

## 4. Audio Capture Features
The application provides unique flexibility in how it "hears" the world:

- **Microphone Mode**: Standard mode where the app listens to your voice via the device mic.
- **System Sound Mode**: The application can capture audio playing *inside* the device (e.g., from YouTube, social media, a phone call, or a video player). This allows the AI to translate what you are listening to on your phone in real-time.
- **Both (Combined)**: The AI hears both your voice and the system sound. Perfect for participating in foreign language video calls.

---

## 5. AI Customization & Instructions
The application ensures the AI follows your preferences by including all selections in its internal instructions:

- **AI Profiles (Personalities)**: Predefined behaviors like "Tutor," "Interviewer," "Funny Friend," etc.
- **Custom Prompts**: Each AI profile can have its own unique set of additional instructions provided by the user.
- **Voice & Gender**: When you select a voice, the AI is instructed to speak as that specific gender (Male, Female, or Neutral).
- **Speech Tempo**: You can specify how fast the AI should respond (Slow, Normal, Fast), and this preference is communicated to the model.
- **Languages**: The chosen source and target languages are always part of the AI's core instructions.

---

## 6. User Interface & Settings

- **Microphone Control**: A dedicated button to turn the microphone on or off.
- **Model Sound Toggle**: A button to instantly mute/unmute the AI's voice output.
- **Volume Sliders**: Independent control for microphone sensitivity and speaker volume.
- **Noise Suppression**: An optional toggle to reduce background noise during recording.
- **Visual Feedback**: Dynamic visualizer (moving orbits) showing voice activity levels.
- **Transcription**: Real-time text display of the entire conversation.
- **UI Language**: Ability to change the language of the application's interface (buttons, menus, labels).
- **Font Size Control**: Adjustable text size for comfortable reading.

---

## 7. History & Data Management

- **Conversation History**: All chats are saved locally on your device.
- **Audio Recordings**: Optional toggle to save the actual audio of the conversation, allowing you to re-listen to any message later.
- **Manual Cleanup**: Full control to delete single messages, specific audio files, or entire sessions.
- **Persistence**: All settings (API keys, gain levels, chosen profiles) are remembered between sessions.

# Повна документація: Gemini 2.5 Flash Native Audio Preview (Live API)

## 1. Специфікація моделі
- **Назва:** `gemini-2.5-flash-native-audio-preview-12-2025`
- **Призначення:** Native аудіо-модель для двосторонньої (bidirectional) комунікації в реальному часі.
- **Вхідні дані:** Аудіо, відео, текст.
- **Вихідні дані:** Аудіо, текст.
- **Ліміти токенів:** Input = 131,072 / Output = 8,192.

## 2. Особливості версії 2.5
Версія 2.5 має специфічний синтаксис для Live API, який відрізняється від новіших моделей:
- **Thinking (Роздуми):** У конфігурації `setup` використовувався параметр `thinkingBudget` (бюджет токенів на роздуми).
- **Текстові повідомлення клієнта:** Текст під час сесії відправлявся через об'єкт `client_content` (повідомлення `send_client_content`).
- **Turn coverage:** Поведінка за замовчуванням — `TURN_INCLUDES_ONLY_ACTIVITY` (відправка кадрів тільки при звуковій активності).
- **Proactive Audio / Affective Dialogue:** Експериментальні функції проактивного та емоційного діалогу підтримувалися.
- **Асинхронні функції (Async Function Calling):** Підтримувалося асинхронне виконання викликів інструментів (Tool Calling), коли клієнт міг не блокувати сесію, очікуючи `toolResponse`.

---

## 3. Підключення та робота через WebSocket

### Формат кінцевої точки (Endpoint)
`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=YOUR_API_KEY`

### Крок 1: Setup повідомлення (BidiGenerateContentSetup)
```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-12-2025",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
         "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Aoede" } }
      },
      "thinkingConfig": {
         "thinkingBudget": 1024
      }
    },
    "systemInstruction": {
      "parts": [{"text": "Ви корисний асистент."}]
    }
  }
}
```

### Крок 2: Відправка тексту від клієнта (client_content)
```json
{
  "clientContent": {
    "turns": [
      {
        "role": "user",
        "parts": [{ "text": "Привіт!" }]
      }
    ],
    "turnComplete": true
  }
}
```

### Крок 3: Відправка аудіо
Аудіо PCM (16kHz, 16-bit, little-endian, Base64):
```json
{
  "realtimeInput": {
    "mediaChunks": [
      {
        "mimeType": "audio/pcm;rate=16000",
        "data": "BASE64_PCM_DATA"
      }
    ]
  }
}
```

### Крок 4: Відповіді сервера (BidiGenerateContentServerMessage)
Сервер шле `serverContent` з `modelTurn`, де `parts` містять фрагменти аудіо або транскрипту.
```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "inlineData": {
             "mimeType": "audio/pcm;rate=16000",
             "data": "BASE64_AUDIO_RESPONSE"
          }
        }
      ]
    }
  }
}
```
А також транскрипції користувача:
```json
{
  "serverContent": {
    "inputTranscription": {
      "text": "Розпізнаний текст користувача"
    }
  }
}
```

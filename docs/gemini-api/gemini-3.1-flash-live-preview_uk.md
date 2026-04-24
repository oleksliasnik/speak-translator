# Повна документація: Gemini 3.1 Flash Live Preview (Live API)

## 1. Специфікація моделі
- **Назва:** `gemini-3.1-flash-live-preview`
- **Призначення:** Модель з ультра-низькою затримкою (low-latency) для аудіо-діалогів у реальному часі. Оптимізована для акустичних нюансів.
- **Вхідні дані:** Text, images, audio, video
- **Вихідні дані:** Text and audio
- **Ліміти токенів:** Input = 131,072 / Output = 65,536.
- **Підтримує:** Function calling, Search grounding, Thinking. **НЕ підтримує:** Batch API, Caching, Code execution.

## 2. Ключові особливості версії 3.1 (Нове API)
- **Thinking (Роздуми):** Замість `thinkingBudget` тепер використовується `thinkingLevel` (`minimal`, `low`, `medium`, `high`). За замовчуванням `minimal`.
- **Realtime Text Input:** Текстові повідомлення від клієнта тепер відправляються через `realtimeInput.text`, а не через `client_content` (який залишено тільки для завантаження історії).
- **Turn Coverage:** За замовчуванням `TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO`.
- **Синхронність:** `Proactive Audio` та `Async function calling` вимкнені. Виклики функцій суворо синхронні.
- **Мульти-части (Multi-parts):** Серверна подія `modelTurn` тепер об'єднує кілька шматків (текст + аудіо) в один масив `parts`. Обов'язково потрібно ітеруватися по всьому масиву.
- **Thought Signature:** Модель надсилає `thoughtSignature`, який потрібно передавати назад для збереження ланцюжка роздумів.

---

## 3. Підключення та робота через WebSocket

### Формат кінцевої точки (Endpoint)
`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=YOUR_API_KEY`

### Крок 1: Setup повідомлення (BidiGenerateContentSetup)
Відправляється одразу після відкриття з'єднання `onopen`.
```json
{
  "setup": {
    "model": "models/gemini-3.1-flash-live-preview",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
         "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Aoede" } }
      },
      "thinkingConfig": {
         "thinkingLevel": "minimal"
      }
    },
    "systemInstruction": {
      "parts": [{"text": "Ви корисний асистент."}]
    }
  }
}
```

### Крок 2: Відправка тексту під час сесії
Тепер використовується `realtimeInput`:
```json
{
  "realtimeInput": {
    "text": "Привіт! Яка погода?"
  }
}
```

### Крок 3: Відправка аудіо з мікрофона
Сирий PCM (16kHz, 16-bit, little-endian) закодований у Base64.
```json
{
  "realtimeInput": {
    "mediaChunks": [
      {
        "mimeType": "audio/pcm;rate=16000",
        "data": "BASE64_PCM_CHUNK"
      }
    ]
  }
}
```

### Крок 4: Обробка відповідей сервера
Сервер надсилає повідомлення `serverContent`, де в `modelTurn.parts` лежить аудіо та транскрипція.
```javascript
websocket.onmessage = (event) => {
  const response = JSON.parse(event.data);
  
  if (response.serverContent) {
    const serverContent = response.serverContent;
    
    // 1. Аудіо для відтворення
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData) {
          const audioBase64 = part.inlineData.data; 
          // Відтворення аудіо...
        }
        if (part.text) {
          console.log('Gemini text chunk:', part.text);
        }
      }
    }
    
    // 2. Транскрипція мовлення (ASR)
    if (serverContent.inputTranscription) {
      console.log('User said:', serverContent.inputTranscription.text);
    }
    if (serverContent.outputTranscription) {
      console.log('Gemini said:', serverContent.outputTranscription.text);
    }
  }
  
  // 3. Виклик інструментів
  if (response.toolCall) {
     handleToolCall(response.toolCall);
  }
};
```

### Крок 5: Відправка ToolResponse
Функції тепер повністю блокують генерацію (синхронні). Як тільки прийшов `toolCall`, потрібно надіслати відповідь:
```json
{
  "toolResponse": {
    "functionResponses": [
      {
        "name": "get_weather",
        "id": "12345",
        "response": {
          "result": "Сонячно, 25 градусів"
        }
      }
    ]
  }
}
```

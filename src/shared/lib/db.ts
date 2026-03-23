import { ChatSession, Message } from "@/shared/types";

const DB_NAME = "speak-translator-db";
const DB_VERSION = 1;
const STORE_SESSIONS = "sessions";
const STORE_AUDIO = "audio";

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO); // Key is messageId, value is Blob
      }
    };
  });
};

export const saveSession = async (session: ChatSession): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readwrite");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.put(session);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSessions = async (): Promise<ChatSession[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readonly");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by startTime desc
      const sessions = request.result as ChatSession[];
      sessions.sort((a, b) => b.startTime - a.startTime);
      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteSessionById = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORE_SESSIONS, STORE_AUDIO],
      "readwrite",
    );
    const sessionStore = transaction.objectStore(STORE_SESSIONS);
    const audioStore = transaction.objectStore(STORE_AUDIO);

    // First get the session to find audio IDs to delete
    const getReq = sessionStore.get(id);

    getReq.onsuccess = () => {
      const session = getReq.result as ChatSession;
      if (session) {
        // Delete associated audio
        session.messages.forEach((msg) => {
          if (msg.hasAudio) {
            audioStore.delete(msg.id);
          }
        });
        // Delete session
        sessionStore.delete(id);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const saveAudio = async (
  messageId: string,
  blob: Blob,
): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_AUDIO], "readwrite");
    const store = transaction.objectStore(STORE_AUDIO);
    const request = store.put(blob, messageId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAudio = async (
  messageId: string,
): Promise<Blob | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_AUDIO], "readonly");
    const store = transaction.objectStore(STORE_AUDIO);
    const request = store.get(messageId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const calculateStorageSize = async (): Promise<{
  audioSize: number;
  textSize: number;
}> => {
  const db = await initDB();
  const tx = db.transaction([STORE_SESSIONS, STORE_AUDIO], "readonly");
  const sessionStore = tx.objectStore(STORE_SESSIONS);
  const audioStore = tx.objectStore(STORE_AUDIO);

  const [sessions, audios] = await Promise.all([
    new Promise<ChatSession[]>((resolve, reject) => {
      const req = sessionStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }),
    new Promise<Blob[]>((resolve, reject) => {
      const req = audioStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }),
  ]);

  const audioSize = audios.reduce((acc, blob) => acc + blob.size, 0);
  const textSize = new TextEncoder().encode(JSON.stringify(sessions)).length;

  return { audioSize, textSize };
};

export const deleteMessageFromSession = async (
  sessionId: string,
  messageId: string,
): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SESSIONS, STORE_AUDIO], "readwrite");
    const sessionStore = tx.objectStore(STORE_SESSIONS);
    const audioStore = tx.objectStore(STORE_AUDIO);

    const getReq = sessionStore.get(sessionId);
    getReq.onsuccess = () => {
      const session = getReq.result as ChatSession;
      if (session) {
        session.messages = session.messages.filter((m) => m.id !== messageId);
        sessionStore.put(session);
        audioStore.delete(messageId);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteAudioFromMessage = async (
  sessionId: string,
  messageId: string,
): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SESSIONS, STORE_AUDIO], "readwrite");
    const sessionStore = tx.objectStore(STORE_SESSIONS);
    const audioStore = tx.objectStore(STORE_AUDIO);

    const getReq = sessionStore.get(sessionId);
    getReq.onsuccess = () => {
      const session = getReq.result as ChatSession;
      if (session) {
        const msg = session.messages.find((m) => m.id === messageId);
        if (msg) {
          msg.hasAudio = false;
          sessionStore.put(session);
          audioStore.delete(messageId);
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

import type { ChatMessage, ChatMode, MobileSettings } from "../types";

const SETTINGS_KEY = "vaidya-mobile-settings-v1";
const MODE_KEY = "vaidya-mobile-mode-v1";
const MESSAGES_KEY = "vaidya-mobile-messages-v1";
const REMOTE_SESSION_KEY = "vaidya-mobile-remote-session-v1";

const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://10.0.2.2:5500";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadSettings(): MobileSettings {
  return readJson<MobileSettings>(SETTINGS_KEY, {
    apiBaseUrl: DEFAULT_API_BASE,
    bearerToken: "",
  });
}

export function saveSettings(settings: MobileSettings): void {
  writeJson(SETTINGS_KEY, {
    apiBaseUrl: settings.apiBaseUrl.trim().replace(/\/$/, ""),
    bearerToken: settings.bearerToken.trim(),
  });
}

export function loadMode(): ChatMode {
  return readJson<ChatMode>(MODE_KEY, "auto");
}

export function saveMode(mode: ChatMode): void {
  writeJson(MODE_KEY, mode);
}

export function loadMessages(): ChatMessage[] {
  return readJson<ChatMessage[]>(MESSAGES_KEY, []);
}

export function saveMessages(messages: ChatMessage[]): void {
  writeJson(MESSAGES_KEY, messages.slice(-80));
}

export function loadRemoteSessionId(): string | null {
  return localStorage.getItem(REMOTE_SESSION_KEY);
}

export function saveRemoteSessionId(sessionId: string | null): void {
  if (sessionId) {
    localStorage.setItem(REMOTE_SESSION_KEY, sessionId);
  } else {
    localStorage.removeItem(REMOTE_SESSION_KEY);
  }
}

export function clearLocalChat(): void {
  localStorage.removeItem(MESSAGES_KEY);
  localStorage.removeItem(REMOTE_SESSION_KEY);
}

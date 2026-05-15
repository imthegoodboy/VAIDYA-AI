import { Leaf, Plus, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatInput } from "./components/ChatInput";
import { ChatMessages } from "./components/ChatMessages";
import { ModeSwitch } from "./components/ModeSwitch";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusStrip } from "./components/StatusStrip";
import { answerOffline } from "./lib/offline-rag";
import { OnlineApiError, OnlineVaidyaClient } from "./lib/online-api";
import {
  clearLocalChat,
  loadMessages,
  loadMode,
  loadRemoteSessionId,
  loadSettings,
  saveMessages,
  saveMode,
  saveRemoteSessionId,
  saveSettings,
} from "./lib/storage";
import type { ChatMessage, ChatMode, EngineResult, EngineStatus, MobileSettings } from "./types";

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toMessage(role: ChatMessage["role"], content: string, result?: EngineResult): ChatMessage {
  return {
    id: id(role),
    role,
    content,
    createdAt: new Date().toISOString(),
    engine: result?.engine,
    sources: result?.sources,
  };
}

function onlineSetupReady(settings: MobileSettings): boolean {
  return Boolean(settings.apiBaseUrl.trim() && settings.bearerToken.trim());
}

export default function App() {
  const [mode, setMode] = useState<ChatMode>(() => loadMode());
  const [settings, setSettingsState] = useState<MobileSettings>(() => loadSettings());
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages());
  const [remoteSessionId, setRemoteSessionId] = useState<string | null>(() => loadRemoteSessionId());
  const [onlineReachable, setOnlineReachable] = useState(false);
  const [status, setStatus] = useState<EngineStatus>("checking");
  const [thinking, setThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const stopRef = useRef(false);

  const onlineClient = useMemo(() => new OnlineVaidyaClient(settings), [settings]);
  const hasOnlineSetup = onlineSetupReady(settings);

  useEffect(() => {
    saveMode(mode);
  }, [mode]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    saveRemoteSessionId(remoteSessionId);
  }, [remoteSessionId]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setStatus("checking");
      const reachable = await onlineClient.health();
      if (cancelled) return;
      setOnlineReachable(reachable);
      if (mode === "offline") {
        setStatus("offline-ready");
      } else if (!hasOnlineSetup && mode === "online") {
        setStatus("needs-setup");
      } else if (reachable && hasOnlineSetup) {
        setStatus("ready");
      } else if (mode === "auto") {
        setStatus("offline-ready");
      } else {
        setStatus(reachable ? "needs-setup" : "error");
      }
    }
    void check();
    const timer = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasOnlineSetup, mode, onlineClient]);

  function persistSettings(next: MobileSettings) {
    const cleaned = {
      apiBaseUrl: next.apiBaseUrl.trim().replace(/\/$/, ""),
      bearerToken: next.bearerToken.trim(),
    };
    saveSettings(cleaned);
    setSettingsState(cleaned);
    setNotice("Settings saved.");
    setSettingsOpen(false);
  }

  function clearChat() {
    clearLocalChat();
    setMessages([]);
    setRemoteSessionId(null);
    setNotice("Local chat cleared.");
  }

  function startNewChat() {
    setMessages([]);
    setRemoteSessionId(null);
    setNotice("Started a fresh mobile chat.");
  }

  async function tryOnline(content: string): Promise<EngineResult> {
    if (!hasOnlineSetup) {
      throw new OnlineApiError("Online mode needs an API base URL and Clerk bearer token.", 401);
    }
    const result = await onlineClient.sendMessage(content, remoteSessionId);
    if (result.remoteSessionId) setRemoteSessionId(result.remoteSessionId);
    return result;
  }

  async function routeMessage(content: string): Promise<EngineResult> {
    if (mode === "offline") {
      return answerOffline(content);
    }

    if (mode === "online") {
      return tryOnline(content);
    }

    if (navigator.onLine && onlineReachable && hasOnlineSetup) {
      try {
        return await tryOnline(content);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Online request failed.";
        setNotice(`Auto switched to offline: ${message}`);
        return answerOffline(content);
      }
    }

    setNotice("Auto is using offline mode because the backend is not ready.");
    return answerOffline(content);
  }

  async function send(content: string) {
    if (!content.trim() || thinking) return;
    stopRef.current = false;
    setThinking(true);
    setNotice("");
    const userMessage = toMessage("user", content);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const result = await routeMessage(content);
      if (stopRef.current) return;
      const assistantContent = result.note ? `${result.answer}\n\n${result.note}` : result.answer;
      setMessages((prev) => [...prev, toMessage("assistant", assistantContent, result)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        toMessage("assistant", `I could not complete that request.\n\n${message}`, {
          answer: message,
          sources: [],
          engine: mode === "online" ? "online" : "offline",
        }),
      ]);
    } finally {
      setThinking(false);
    }
  }

  function stop() {
    stopRef.current = true;
    setThinking(false);
    setNotice("Response stopped.");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={19} />
          </div>
          <div>
            <h1>Vaidya AI</h1>
            <span>Android RAG</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={startNewChat} aria-label="New chat">
            <Plus size={18} />
          </button>
          <button className="icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Open settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <section className="mode-area">
        <ModeSwitch value={mode} onChange={setMode} />
        <StatusStrip
          mode={mode}
          status={status}
          onlineReachable={onlineReachable}
          hasOnlineSetup={hasOnlineSetup}
          notice={notice}
        />
      </section>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={persistSettings}
          onClearChat={clearChat}
        />
      )}

      <ChatMessages messages={messages} thinking={thinking} onSuggestion={(text) => void send(text)} />
      <ChatInput thinking={thinking} onSend={send} onStop={stop} />
    </div>
  );
}

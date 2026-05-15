import { BookOpen, Copy, Leaf, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, SourceItem } from "../types";

type Props = {
  messages: ChatMessage[];
  thinking: boolean;
  onSuggestion: (text: string) => void;
};

const SUGGESTIONS = [
  "What are the three doshas?",
  "How does turmeric help in wound healing?",
  "Tell me about Ashwagandha for stress",
  "Which herbs support cough and cold?",
];

function SourceList({ sources }: { sources: SourceItem[] }) {
  if (!sources.length) return null;
  return (
    <div className="sources">
      <div className="sources-title">
        <BookOpen size={13} />
        Sources
      </div>
      {sources.slice(0, 5).map((source, index) => {
        const rank = source.rank || index + 1;
        const title = source.title || source.book_title || source.source || "Offline source";
        return (
          <article className="source-card" key={`${rank}-${title}`}>
            <div className="source-meta">
              <strong>[{rank}] {title}</strong>
              {source.retrieval && <span>{source.retrieval}</span>}
            </div>
            {source.section_title && <p className="source-section">{source.section_title}</p>}
            {source.snippet && <p>{source.snippet.replace(/\s+/g, " ").trim()}</p>}
          </article>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="copy-button" onClick={copy} aria-label="Copy answer">
      <Copy size={12} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "message-row message-row-user" : "message-row"}>
      <div className={isUser ? "avatar user-avatar" : "avatar ai-avatar"}>
        {isUser ? "Y" : <Leaf size={15} />}
      </div>
      <div className="message-stack">
        <div className={isUser ? "bubble user-bubble" : "bubble ai-bubble"}>
          {!isUser && message.engine && <span className="engine-label">{message.engine}</span>}
          {message.content.split("\n").map((line, index) => (
            <p key={`${message.id}-${index}`}>{line || "\u00a0"}</p>
          ))}
        </div>
        {!isUser && <SourceList sources={message.sources || []} />}
        {!isUser && <CopyButton text={message.content} />}
        <span className="time-label">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Leaf size={36} />
      </div>
      <h2>How can I help you today?</h2>
      <p>Ask from the backend when online, or from the phone's offline Ayurveda pack when offline.</p>
      <div className="suggestion-grid">
        {SUGGESTIONS.map((suggestion) => (
          <button key={suggestion} onClick={() => onSuggestion(suggestion)}>
            <Sparkles size={15} />
            <span>{suggestion}</span>
          </button>
        ))}
      </div>
      <span className="empty-footnote">
        <MessageSquare size={13} />
        Same UI, switchable engines
      </span>
    </div>
  );
}

export function ChatMessages({ messages, thinking, onSuggestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  if (!messages.length && !thinking) {
    return <EmptyState onSuggestion={onSuggestion} />;
  }

  return (
    <main className="messages">
      <div className="message-list">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {thinking && (
          <div className="message-row">
            <div className="avatar ai-avatar">
              <Leaf size={15} />
            </div>
            <div className="bubble ai-bubble thinking">
              <span className="pulse-dot" />
              Vaidya is preparing an answer
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </main>
  );
}

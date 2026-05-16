"use client";

import { useRef, useEffect, useState } from "react";
import { Leaf, Sparkles, MessageSquare, BookOpen, Heart, Copy, Check, ChevronDown } from "lucide-react";
import { fetchAuthedBlob, type AgentStep, type MessageItem, type SourceItem, type UnsplashPhoto } from "@/lib/rag-api";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceItem[] | null;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  token: string;
  agentSteps?: AgentStep[];
  photosByMessageId?: Record<string, UnsplashPhoto[]>;
  onSuggestionClick: (text: string) => void;
}

export function fromApiMessage(message: MessageItem): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.created_at),
    sources: message.sources,
  };
}

const suggestions = [
  { icon: Sparkles, title: "Analyze my Dosha", description: "Discover your Ayurvedic constitution" },
  { icon: Leaf, title: "Tell me about Ashwagandha", description: "Benefits, uses, and precautions" },
  { icon: Heart, title: "Stress relief remedies", description: "Natural herbs for anxiety & calm" },
  { icon: BookOpen, title: "Panchakarma explained", description: "Ancient detox therapy overview" },
];

function TypingIndicator({ agentSteps }: { agentSteps: AgentStep[] }) {
  void agentSteps;
  return (
    <div className="flex items-start gap-3 msg-enter">
      <div className="w-8 h-8 rounded-full bg-ayur-gold/15 flex items-center justify-center flex-shrink-0">
        <Leaf className="w-4 h-4 text-ayur-gold" />
      </div>
      <div className="bg-chat-ai-bg rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-foreground/90">
          <span className="w-2 h-2 rounded-full bg-ayur-gold animate-pulse" />
          Vaidya is thinking
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ file, token }: { file: SourceItem; token: string }) {
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    if (!file.url || !token || !file.mime_type?.startsWith("image/")) return;
    fetchAuthedBlob(file.url, token)
      .then((url) => {
        objectUrl = url;
        if (!cancelled) setBlobUrl(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.url, file.mime_type, token]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-xs">
      {file.mime_type?.startsWith("image/") ? (
        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center overflow-hidden">
          {blobUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blobUrl} alt={file.filename || "Upload"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-[8px]">IMG</span>
          )}
        </div>
      ) : (
        <div className="w-10 h-10 rounded bg-ayur-gold/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-ayur-gold" />
        </div>
      )}
      <div>
        <p className="text-foreground truncate max-w-[120px]">{file.filename || "Uploaded file"}</p>
        <p className="text-muted-foreground text-[10px]">{file.status || file.mime_type?.split("/")[1]?.toUpperCase()}</p>
      </div>
    </div>
  );
}

function UnsplashStrip({ photos }: { photos: UnsplashPhoto[] }) {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
      {photos.map((photo) => (
        <a key={photo.id} href={photo.unsplash_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg bg-white/5 border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.thumb_url || photo.url} alt={photo.alt} className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="px-2 py-1 text-[10px] text-muted-foreground truncate">
            {photo.photographer ? `Photo by ${photo.photographer}` : "Unsplash"}
          </div>
        </a>
      ))}
    </div>
  );
}

function SourceReferences({ sources }: { sources: SourceItem[] }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [expandedSourceKey, setExpandedSourceKey] = useState<string | null>(null);

  if (!sources.length) return null;

  const pageLabel = (source: SourceItem) => {
    if (!source.page_start) return "";
    if (!source.page_end || source.page_end === source.page_start) return `p. ${source.page_start}`;
    return `pp. ${source.page_start}-${source.page_end}`;
  };

  const cleanSnippet = (snippet?: string) => (snippet || "").replace(/\s+/g, " ").trim();

  return (
    <div className="space-y-2 pt-1">
      <button
        type="button"
        onClick={() => {
          setSourcesOpen((open) => !open);
          setExpandedSourceKey(null);
        }}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] uppercase tracking-wide transition-colors ${
          sourcesOpen
            ? "border-ayur-gold/30 bg-ayur-gold/10 text-ayur-gold"
            : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
        }`}
        aria-expanded={sourcesOpen}
      >
        <BookOpen className="w-3 h-3" />
        Sources ({sources.length})
        <ChevronDown className={`h-3 w-3 transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
      </button>
      {sourcesOpen && (
      <div className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
        {sources.slice(0, 5).map((source, index) => {
          const title = source.title || source.book_title || source.source || "Indexed source";
          const page = pageLabel(source);
          const snippet = cleanSnippet(source.snippet);
          const sourceKey = `${source.rank || index}-${title}-${page}-${source.source || ""}`;
          const expanded = expandedSourceKey === sourceKey;
          return (
            <div key={sourceKey} className={`rounded-lg border px-3 py-2 transition-colors ${expanded ? "border-ayur-gold/30 bg-ayur-gold/[0.045]" : "border-white/10 bg-white/[0.03]"}`}>
              <button
                type="button"
                onClick={() => setExpandedSourceKey((current) => current === sourceKey ? null : sourceKey)}
                className="w-full text-left"
                aria-expanded={expanded}
                aria-label={`Toggle source ${source.rank || index + 1}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/90">
                      <span className="font-medium truncate">[{source.rank || index + 1}] {title}</span>
                      {page && <span className="text-muted-foreground">{page}</span>}
                      {source.retrieval && <span className="text-[10px] text-ayur-gold/80">{source.retrieval}</span>}
                    </div>
                    {source.section_title && source.section_title !== title && (
                      <p className="mt-1 text-[11px] text-muted-foreground truncate">{source.section_title}</p>
                    )}
                    {snippet && !expanded && (
                      <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">
                        {snippet}
                      </p>
                    )}
                  </div>
                  <ChevronDown className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180 text-ayur-gold" : ""}`} />
                </div>
              </button>
              {expanded && (
                <div className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-foreground/80">
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {source.source_type && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-muted-foreground">{source.source_type}</span>}
                    {source.book_title && source.book_title !== title && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-muted-foreground">{source.book_title}</span>}
                    {source.score !== null && source.score !== undefined && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-muted-foreground">Score {source.score.toFixed(3)}</span>}
                  </div>
                  {snippet ? (
                    <p className="whitespace-pre-wrap">{snippet}</p>
                  ) : (
                    <p className="text-muted-foreground">No snippet available for this source.</p>
                  )}
                  {source.source && source.source !== title && (
                    <p className="mt-2 break-words text-[10px] text-muted-foreground">{source.source}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Copy answer">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function MessageBubble({ message, token, photos }: { message: ChatMessage; token: string; photos?: UnsplashPhoto[] }) {
  const isUser = message.role === "user";
  const attachments = (message.sources || []).filter((source) => source.type === "attachment");
  const references = !isUser ? (message.sources || []).filter((source) => source.type !== "attachment") : [];

  return (
    <div className={`flex items-start gap-3 msg-enter ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-ayur-gold/15 flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-ayur-gold" />
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">Y</span>
        </div>
      )}

      <div className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : ""}`}>
        {attachments.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isUser ? "justify-end" : ""}`}>
            {attachments.map((file) => (
              <AttachmentPreview key={file.upload_id || file.url} file={file} token={token} />
            ))}
          </div>
        )}

        {!isUser && photos && <UnsplashStrip photos={photos} />}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-chat-user-bg rounded-tr-sm text-foreground whitespace-pre-wrap" : "bg-chat-ai-bg rounded-tl-sm text-foreground/90"}`}>
          {isUser ? message.content : <MarkdownRenderer content={message.content} />}
        </div>
        {!isUser && <SourceReferences sources={references} />}
        {!isUser && <MessageActions text={message.content} />}

        <p className={`text-[10px] text-muted-foreground/50 font-mono px-1 ${isUser ? "text-right" : ""}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isTyping, token, agentSteps = [], photosByMessageId = {}, onSuggestionClick }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass-card-strong mb-6 float-subtle">
            <Leaf className="w-10 h-10 text-ayur-gold" />
          </div>
          <h2 className="text-2xl font-display tracking-tight mb-2">How can I help you today?</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Ask about Ayurvedic herbs, doshas, remedies, uploads, or plant images.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
          {suggestions.map((s) => (
            <button key={s.title} onClick={() => onSuggestionClick(s.title)} className="group glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-all duration-300 hover:border-ayur-gold/20">
              <div className="flex items-start gap-3">
                <s.icon className="w-4 h-4 text-ayur-gold/70 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium group-hover:text-ayur-gold transition-colors">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-12 text-[10px] font-mono text-muted-foreground/40 flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          Connected to your RAG backend
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} token={token} photos={photosByMessageId[msg.id]} />
        ))}
        {isTyping && <TypingIndicator agentSteps={agentSteps} />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

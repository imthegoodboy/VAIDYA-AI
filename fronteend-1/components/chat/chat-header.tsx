"use client";

import { PanelLeftClose, PanelLeftOpen, Plus, Sprout, Volume2, VolumeX, Sparkles, MessageSquare, Mic } from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export type ChatInteractionMode = "chat" | "voice";

interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  mode: ChatInteractionMode;
  onModeChange: (mode: ChatInteractionMode) => void;
  voiceReplies: boolean;
  onToggleVoiceReplies: () => void;
}

export function ChatHeader({
  sidebarOpen,
  onToggleSidebar,
  onNewChat,
  mode,
  onModeChange,
  voiceReplies,
  onToggleVoiceReplies,
}: ChatHeaderProps) {
  const modeButtonClass = (active: boolean) =>
    `h-8 min-w-[76px] px-3 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-mono transition-all duration-200 ${
      active ? "bg-ayur-gold text-background shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/7"
    }`;

  return (
    <header className="relative z-30 flex items-center justify-between h-14 px-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200" aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
        {!sidebarOpen && (
          <button onClick={onNewChat} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200" aria-label="New chat" title="New chat">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100vw-8rem)]">
        <div className="flex items-center rounded-lg border border-ayur-gold/20 bg-white/[0.045] p-1 backdrop-blur-xl shadow-[0_0_28px_rgba(201,169,110,0.08)]">
          <button
            type="button"
            onClick={() => onModeChange("chat")}
            className={modeButtonClass(mode === "chat")}
            aria-pressed={mode === "chat"}
            aria-label="Chat mode"
            title="Chat mode"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("voice")}
            className={modeButtonClass(mode === "voice")}
            aria-pressed={mode === "voice"}
            aria-label="Voice mode"
            title="Voice mode"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mode === "voice" && (
          <button onClick={onToggleVoiceReplies} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${voiceReplies ? "bg-ayur-gold/15 text-ayur-gold" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} aria-label={voiceReplies ? "Turn voice replies off" : "Turn voice replies on"} title={voiceReplies ? "Voice replies on" : "Voice replies off"}>
            {voiceReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
        <Link href="/plants" className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
          <Sprout className="w-3.5 h-3.5" />
          Herbarium
        </Link>
        <Link href="/prakriti" className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
          <Sparkles className="w-3.5 h-3.5" />
          Prakriti
        </Link>
        <UserButton />
      </div>
    </header>
  );
}

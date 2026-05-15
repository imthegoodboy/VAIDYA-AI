"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Mic, MicOff, Sparkles, Square, Volume2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import type { ChatMessage } from "@/components/chat/chat-messages";
import VoiceParticleOrb, { type VoiceParticleMode } from "@/components/chat/voice-particle-orb";

interface VoiceModePanelProps {
  disabled?: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  latestUserMessage?: ChatMessage | null;
  latestAssistantMessage?: ChatMessage | null;
  onSend: (message: string) => Promise<void> | void;
  onStop?: () => void;
}

function getSpeechRecognition() {
  return (
    (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
  );
}

export function VoiceModePanel({
  disabled,
  isThinking,
  isSpeaking,
  latestUserMessage,
  latestAssistantMessage,
  onSend,
  onStop,
}: VoiceModePanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const shouldSubmitRef = useRef(false);

  const latestStatus = useMemo(() => {
    if (voiceError) return voiceError;
    if (isListening) return "Listening";
    if (isThinking) return "Searching knowledge";
    if (isSpeaking) return "Speaking";
    return "Voice ready";
  }, [isListening, isSpeaking, isThinking, voiceError]);

  const visualMode: VoiceParticleMode = useMemo(() => {
    if (voiceError) return "error";
    if (isListening) return "listening";
    if (isThinking) return "working";
    if (isSpeaking) return "speaking";
    return "ready";
  }, [isListening, isSpeaking, isThinking, voiceError]);

  const stopListening = useCallback((submit: boolean) => {
    shouldSubmitRef.current = submit;
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (disabled || isThinking) return;
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setVoiceError("Speech recognition is not supported in this browser.");
      return;
    }

    window.speechSynthesis?.cancel();
    const recognition = new SpeechRecognitionCtor();
    transcriptRef.current = "";
    shouldSubmitRef.current = true;
    setTranscript("");
    setVoiceError("");
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let nextTranscript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        nextTranscript += event.results[index][0].transcript;
      }
      const trimmed = nextTranscript.trim();
      transcriptRef.current = trimmed;
      setTranscript(trimmed);
    };
    recognition.onerror = () => {
      shouldSubmitRef.current = false;
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError("Voice input failed. Please try again.");
    };
    recognition.onend = () => {
      const finalTranscript = transcriptRef.current.trim();
      const shouldSubmit = shouldSubmitRef.current;
      recognitionRef.current = null;
      shouldSubmitRef.current = false;
      setIsListening(false);
      if (shouldSubmit && finalTranscript) {
        void onSend(finalTranscript);
      } else if (shouldSubmit) {
        setVoiceError("I did not catch that.");
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [disabled, isThinking, onSend]);

  const handlePrimaryAction = useCallback(() => {
    if (isThinking) {
      onStop?.();
      return;
    }
    if (isListening) {
      stopListening(true);
      return;
    }
    startListening();
  }, [isListening, isThinking, onStop, startListening, stopListening]);

  useEffect(() => {
    return () => {
      shouldSubmitRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const controlLabel = isThinking ? "Stop response" : isListening ? "Send voice message" : "Start voice input";
  const previewText = transcript || latestUserMessage?.content || "";

  return (
    <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin">
      <div className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:py-8 flex flex-col items-center justify-center gap-5">
        <div className="w-full max-w-[440px] aspect-square relative">
          <VoiceParticleOrb mode={visualMode} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="voice-core flex h-20 w-20 items-center justify-center rounded-full">
              {voiceError ? (
                <AlertCircle className="h-8 w-8 text-red-200" />
              ) : isThinking ? (
                <Loader2 className="h-8 w-8 animate-spin text-ayur-gold" />
              ) : isSpeaking ? (
                <Volume2 className="h-8 w-8 text-ayur-gold" />
              ) : (
                <Sparkles className="h-8 w-8 text-ayur-gold" />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="min-h-5 text-sm font-mono text-muted-foreground" role="status" aria-live="polite">
            {latestStatus}
          </div>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={disabled}
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isThinking
                ? "bg-red-500/20 text-red-200 hover:bg-red-500/30"
                : isListening
                  ? "bg-ayur-gold text-background mic-pulse"
                  : "bg-white/10 text-foreground hover:bg-ayur-gold/20 hover:text-ayur-gold"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={controlLabel}
            title={controlLabel}
          >
            {isThinking ? <Square className="h-5 w-5 fill-current" /> : isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
        </div>

        <div className="w-full max-w-2xl space-y-3">
          {previewText && (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">You</p>
              <p className="text-sm leading-relaxed text-foreground/90">{previewText}</p>
            </div>
          )}
          {latestAssistantMessage && (
            <div className="rounded-xl border border-ayur-gold/20 bg-ayur-gold/[0.045] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-ayur-gold/80 mb-2">Vaidya</p>
              <div className="max-h-44 overflow-y-auto pr-1 text-sm leading-relaxed text-foreground/90 scrollbar-thin">
                <MarkdownRenderer content={latestAssistantMessage.content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

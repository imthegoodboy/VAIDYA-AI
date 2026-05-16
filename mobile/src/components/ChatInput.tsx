import { Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  disabled?: boolean;
  thinking?: boolean;
  onSend: (text: string) => Promise<void> | void;
  onStop: () => void;
};

export function ChatInput({ disabled, thinking, onSend, onStop }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);

  async function submit() {
    if (thinking) {
      onStop();
      return;
    }
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text);
  }

  return (
    <footer className="chat-input-wrap">
      <div className="chat-input">
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          placeholder="Ask about herbs, doshas, remedies..."
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          disabled={disabled}
        />
        <button
          className={thinking ? "send-button stop-button" : "send-button"}
          disabled={!thinking && (!value.trim() || disabled)}
          onClick={() => void submit()}
          aria-label={thinking ? "Stop response" : "Send message"}
        >
          {thinking ? <Square size={16} fill="currentColor" /> : <Send size={16} />}
        </button>
      </div>
      <p>Offline answers are source-grounded, not personal medical advice.</p>
    </footer>
  );
}

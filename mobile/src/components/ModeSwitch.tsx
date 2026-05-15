import { Cloud, RadioTower, Smartphone } from "lucide-react";
import type { ChatMode } from "../types";

type Props = {
  value: ChatMode;
  onChange: (mode: ChatMode) => void;
};

const MODES: Array<{ value: ChatMode; label: string; icon: typeof RadioTower }> = [
  { value: "auto", label: "Auto", icon: RadioTower },
  { value: "online", label: "Online", icon: Cloud },
  { value: "offline", label: "Offline", icon: Smartphone },
];

export function ModeSwitch({ value, onChange }: Props) {
  return (
    <div className="mode-switch" role="tablist" aria-label="Chat mode">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            className={active ? "mode-button mode-button-active" : "mode-button"}
            onClick={() => onChange(mode.value)}
            aria-pressed={active}
          >
            <Icon size={14} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

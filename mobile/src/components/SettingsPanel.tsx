import { Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { MobileSettings } from "../types";

type Props = {
  settings: MobileSettings;
  onClose: () => void;
  onSave: (settings: MobileSettings) => void;
  onClearChat: () => void;
};

export function SettingsPanel({ settings, onClose, onSave, onClearChat }: Props) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  return (
    <section className="settings-panel" aria-label="Mobile settings">
      <div className="settings-head">
        <div>
          <h2>Mobile Settings</h2>
          <p>Online mode uses the same FastAPI backend as the web app.</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close settings">
          <X size={18} />
        </button>
      </div>

      <label className="field">
        <span>API base URL</span>
        <input
          value={draft.apiBaseUrl}
          onChange={(event) => setDraft((prev) => ({ ...prev, apiBaseUrl: event.target.value }))}
          placeholder="http://10.0.2.2:5500"
          inputMode="url"
        />
      </label>

      <label className="field">
        <span>Backend bearer token</span>
        <textarea
          value={draft.bearerToken}
          onChange={(event) => setDraft((prev) => ({ ...prev, bearerToken: event.target.value }))}
          placeholder="Paste a Clerk bearer token for protected backend routes"
          rows={3}
        />
      </label>

      <div className="settings-actions">
        <button className="primary-button" onClick={() => onSave(draft)}>
          <Save size={16} />
          Save
        </button>
        <button className="ghost-button danger" onClick={onClearChat}>
          <Trash2 size={16} />
          Clear chat
        </button>
      </div>
    </section>
  );
}

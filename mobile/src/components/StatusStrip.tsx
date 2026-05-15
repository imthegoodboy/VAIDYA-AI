import { AlertCircle, CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import type { ChatMode, EngineStatus } from "../types";

type Props = {
  mode: ChatMode;
  status: EngineStatus;
  onlineReachable: boolean;
  hasOnlineSetup: boolean;
  notice: string;
};

export function StatusStrip({ mode, status, onlineReachable, hasOnlineSetup, notice }: Props) {
  const icon =
    status === "checking" ? Loader2 : status === "ready" || status === "offline-ready" ? CheckCircle2 : status === "needs-setup" ? AlertCircle : CloudOff;
  const Icon = icon;
  const label =
    mode === "offline"
      ? "Offline ready"
      : status === "ready"
        ? "Backend connected"
        : status === "needs-setup"
          ? "Online setup needed"
          : onlineReachable
            ? "Backend reachable"
            : "Offline fallback ready";

  return (
    <div className="status-strip">
      <div className={`status-pill status-${status}`}>
        <Icon size={14} className={status === "checking" ? "spin" : ""} />
        <span>{label}</span>
      </div>
      <span className="status-detail">
        {notice || (hasOnlineSetup ? "Mode can switch without changing the chat screen." : "Add backend URL and token for Online mode.")}
      </span>
    </div>
  );
}

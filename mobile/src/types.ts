export type ChatMode = "auto" | "online" | "offline";

export type EngineKind = "online" | "offline";

export type EngineStatus = "checking" | "ready" | "offline-ready" | "needs-setup" | "error";

export type SourceItem = {
  rank?: number;
  source?: string;
  source_type?: string | null;
  title?: string | null;
  book_title?: string | null;
  section_title?: string | null;
  page_start?: number | string | null;
  page_end?: number | string | null;
  retrieval?: string | null;
  score?: number | null;
  snippet?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  engine?: EngineKind;
  sources?: SourceItem[];
};

export type MobileSettings = {
  apiBaseUrl: string;
  bearerToken: string;
};

export type EngineResult = {
  answer: string;
  sources: SourceItem[];
  engine: EngineKind;
  remoteSessionId?: string;
  note?: string;
};

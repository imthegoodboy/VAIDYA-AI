import type { EngineResult, MobileSettings, SourceItem } from "../types";

type CreateSessionResponse = {
  id: string;
};

type SessionChatResponse = {
  answer: string;
  sources: SourceItem[];
  assistant_message_id?: string;
};

export class OnlineApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OnlineApiError";
    this.status = status;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, "");
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!response.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? (data as { detail?: unknown }).detail
        : response.statusText;
    throw new OnlineApiError(
      typeof detail === "string" ? detail : JSON.stringify(detail),
      response.status,
    );
  }
  return data;
}

export class OnlineVaidyaClient {
  private readonly apiBaseUrl: string;
  private readonly bearerToken: string;

  constructor(settings: MobileSettings) {
    this.apiBaseUrl = normalizeBaseUrl(settings.apiBaseUrl);
    this.bearerToken = settings.bearerToken.trim();
  }

  hasSetup(): boolean {
    return Boolean(this.apiBaseUrl && this.bearerToken);
  }

  async health(): Promise<boolean> {
    if (!this.apiBaseUrl) return false;
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        headers: { Accept: "application/json" },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async authed<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new OnlineApiError("API base URL is missing.", 0);
    }
    if (!this.bearerToken) {
      throw new OnlineApiError("Bearer token is required for the protected backend routes.", 401);
    }
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.bearerToken}`,
        ...(init.headers || {}),
      },
    });
    return (await parseResponse(response)) as T;
  }

  async createSession(): Promise<string> {
    const created = await this.authed<CreateSessionResponse>("/sessions/", {
      method: "POST",
      body: JSON.stringify({ title: "Mobile chat" }),
    });
    return created.id;
  }

  async sendMessage(content: string, remoteSessionId: string | null): Promise<EngineResult> {
    const sessionId = remoteSessionId || (await this.createSession());
    const response = await this.authed<SessionChatResponse>(`/sessions/${sessionId}/chat/`, {
      method: "POST",
      body: JSON.stringify({ content, language: null, upload_ids: null }),
    });
    return {
      answer: response.answer,
      sources: response.sources || [],
      engine: "online",
      remoteSessionId: sessionId,
    };
  }
}

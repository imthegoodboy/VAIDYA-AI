import { Capacitor, registerPlugin } from "@capacitor/core";
import { OFFLINE_KNOWLEDGE, type OfflineKnowledgeChunk } from "../data/offline-knowledge";
import type { EngineResult, SourceItem } from "../types";

type OfflineHit = {
  chunk: OfflineKnowledgeChunk;
  rank: number;
  score: number;
  matchedTerms: string[];
};

type OfflineLlmPlugin = {
  generate(options: { prompt: string; maxTokens?: number; temperature?: number }): Promise<{ text: string }>;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
]);

function tokens(text: string): string[] {
  const found = text.toLowerCase().match(/[\w]+/g) || [];
  return found.filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function scoreChunk(queryTokens: string[], chunk: OfflineKnowledgeChunk): OfflineHit | null {
  const haystack = `${chunk.title} ${chunk.section || ""} ${chunk.text}`.toLowerCase();
  const matchedTerms = unique(queryTokens.filter((token) => haystack.includes(token)));
  if (!matchedTerms.length) return null;
  const titleBonus = matchedTerms.filter((token) => chunk.title.toLowerCase().includes(token)).length * 0.8;
  const sectionBonus =
    matchedTerms.filter((token) => (chunk.section || "").toLowerCase().includes(token)).length * 0.4;
  const score = matchedTerms.length + titleBonus + sectionBonus + Math.min(chunk.text.length / 800, 1);
  return {
    chunk,
    rank: 0,
    score,
    matchedTerms,
  };
}

export function retrieveOffline(question: string, limit = 6): OfflineHit[] {
  const queryTokens = unique(tokens(question));
  if (!queryTokens.length) return [];
  return OFFLINE_KNOWLEDGE.map((chunk) => scoreChunk(queryTokens, chunk))
    .filter((hit): hit is OfflineHit => Boolean(hit))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit, index) => ({ ...hit, rank: index + 1 }));
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function bestSentence(questionTokens: string[], chunk: OfflineKnowledgeChunk): string {
  const sentences = splitSentences(chunk.text);
  if (!sentences.length) return chunk.text;
  return sentences
    .map((sentence) => {
      const lower = sentence.toLowerCase();
      const overlap = questionTokens.filter((token) => lower.includes(token)).length;
      return { sentence, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)[0].sentence;
}

function needsMedicalCaution(question: string): boolean {
  const text = question.toLowerCase();
  return [
    "dose",
    "dosage",
    "medicine",
    "pregnant",
    "pregnancy",
    "child",
    "children",
    "side effect",
    "interaction",
    "safe",
    "safety",
    "blood",
    "thyroid",
  ].some((word) => text.includes(word));
}

function toSources(hits: OfflineHit[]): SourceItem[] {
  return hits.map((hit) => ({
    rank: hit.rank,
    source: hit.chunk.source,
    source_type: "offline-pack",
    title: hit.chunk.title,
    section_title: hit.chunk.section || null,
    page_start: hit.chunk.page || null,
    page_end: null,
    retrieval: "offline-bm25",
    score: Number(hit.score.toFixed(3)),
    snippet: hit.chunk.text,
  }));
}

function buildPrompt(question: string, hits: OfflineHit[]): string {
  const sources = hits
    .map((hit) => `[${hit.rank}] ${hit.chunk.title}${hit.chunk.section ? ` - ${hit.chunk.section}` : ""}\n${hit.chunk.text}`)
    .join("\n\n");
  return [
    "You are AI Vaidya running fully offline on Android.",
    "Answer only from the sources below.",
    "If the sources are too weak, say the offline sources do not contain enough matching information.",
    "Cite sources like [1] or [2].",
    "",
    `User question: ${question}`,
    "",
    "Sources:",
    sources,
  ].join("\n");
}

async function tryNativeLlm(question: string, hits: OfflineHit[]): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const OfflineLlm = registerPlugin<OfflineLlmPlugin>("OfflineLlm");
    const result = await OfflineLlm.generate({
      prompt: buildPrompt(question, hits),
      maxTokens: 420,
      temperature: 0.15,
    });
    const text = result.text.trim();
    return text || null;
  } catch {
    return null;
  }
}

function composeExtractiveAnswer(question: string, hits: OfflineHit[]): string {
  if (!hits.length || hits[0].score < 1.2) {
    return "I could not find enough matching information in the offline Ayurveda pack to answer that reliably. Try switching to Online mode when the backend is available, or ask about herbs already included in the offline pack.";
  }

  const queryTokens = unique(tokens(question));
  const lines = hits.slice(0, 4).map((hit) => {
    const sentence = bestSentence(queryTokens, hit.chunk);
    return `${sentence} [${hit.rank}]`;
  });

  const caution = needsMedicalCaution(question)
    ? "\n\nFor safety, do not treat this as personal medical advice. For dosage, pregnancy, children, medication interactions, or serious symptoms, consult a qualified clinician."
    : "";

  return `Offline answer from bundled Ayurveda sources:\n\n${lines.join("\n\n")}${caution}`;
}

export async function answerOffline(question: string): Promise<EngineResult> {
  const hits = retrieveOffline(question);
  const nativeAnswer = hits.length ? await tryNativeLlm(question, hits) : null;
  return {
    answer: nativeAnswer || composeExtractiveAnswer(question, hits),
    sources: toSources(hits),
    engine: "offline",
    note: nativeAnswer ? "Generated by native offline model." : "Generated by offline retrieval fallback.",
  };
}

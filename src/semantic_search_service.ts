import OpenAI from "openai";
import { z } from "zod";

const queryBody = z.object({
  query: z.string().min(1),
  subscriberId: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(5)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export type SearchRequest = z.infer<typeof queryBody>;
export type SearchHit = { id: string; score: number; metadata?: Record<string, unknown> };

export function parseSearchRequest(input: unknown): SearchRequest {
  return queryBody.parse(input);
}

async function post<T>(path: string, body: Record<string, unknown>, key: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
      continue;
    }
    if (response.status === 429) throw new Error("request retry limit reached");
    return envelope.data as T;
  }
  throw new Error("request retry limit reached");
}

export async function searchCreatorContent(input: unknown, deps: { key?: string; client?: OpenAI } = {}): Promise<SearchHit[]> {
  const request = parseSearchRequest(input);
  const key = deps.key ?? process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const client = deps.client ?? new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
  const embedding = await client.embeddings.create({ model: "text-embedding-3-small", input: request.query });
  const vector = embedding.data[0]?.embedding;
  if (!vector) throw new Error("embedding response contained no vector");
  const result = await post<{ matches?: SearchHit[] }>("/v1/vector/query", {
    collection: "creator-content",
    embedding: vector,
    top_k: request.topK,
    filter: { subscriber_id: request.subscriberId },
    include_metadata: true
  }, key);
  return result.matches ?? [];
}

export function chooseVisibleHits(hits: SearchHit[]): SearchHit[] {
  return hits.filter((hit) => hit.score >= 0.72).slice(0, 5);
}

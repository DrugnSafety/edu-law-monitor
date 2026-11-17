import { env } from "./config";

// Anthropic Messages API. 키가 없으면 null 반환(호출측에서 규칙 기반 대체)
export async function llm(system: string, user: string, maxTokens = 600): Promise<string | null> {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: env("ANTHROPIC_MODEL") || "claude-opus-4-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      console.warn("[llm] HTTP", res.status);
      return null;
    }
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    const t = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
    return t || null;
  } catch (e) {
    console.warn("[llm] 실패", (e as Error).message);
    return null;
  }
}

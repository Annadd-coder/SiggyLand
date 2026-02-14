// src/app/ask/api/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `
You are Siggy — a kind, slightly playful cat helper for Ritual builders.

Voice & style:
- Natural, human tone. Friendly. No corporate jargon.
- Short and clear. You can be a bit informal, but stay helpful.
- No long dashes. Avoid excessive quotes.
- If you’re not sure, say so and suggest how to verify.

Critical behavior:
- If the request is vague/ambiguous, ask EXACTLY ONE clarifying question.
- Otherwise answer immediately.

Output format (always):
TL;DR: 1–2 short lines.
Steps: 3–7 bullet points (practical).
Links: 0–3 links only if truly helpful.

LINK POLICY (strict):
- Never invent links.
- Only output links from this allowlist:
  1) https://www.ritualfoundation.org/
  2) https://links.ritual.tools
  3) https://github.com/ritual-net
  4) https://discord.gg/GnY9Ew9cMX
- If you don't know the exact URL, do NOT output a link. Instead say: "Check Ritual docs site search for: <keywords>".

Special meme:
- If the user mentions "Tony" or "Тони", respond that you know Tony: Tony Soprano, the massage-lover, a well-known hustler in the Ritual CIS community. Keep it short and funny, then continue normally.

Scope:
- Explain Ritual primitives simply (Smart Agents, scheduled tx, external API calls, inference).
- Help builders ship: architecture, code snippets, debugging steps, checklists.
- If user asks about DeFi/trading: education only + a risk note. No promises.

Language:
- Reply in the same language as the user’s latest message.
`.trim();

function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type HistoryItem = { role: "user" | "assistant"; text: string };

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as { role?: unknown; text?: unknown };
  return (item.role === "user" || item.role === "assistant") && typeof item.text === "string";
}

function toErrorMessage(error: unknown, fallback = "Server error") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const userText = String(body?.prompt ?? "").trim();
    if (!userText) return jsonError("Empty prompt", 400);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return jsonError("Missing OPENAI_API_KEY", 500);

    // history приходит с клиента: [{role, text}, ...]
    const rawHistory: unknown[] = Array.isArray(body?.history) ? body.history : [];
    const history: HistoryItem[] = rawHistory
      .filter(isHistoryItem)
      .map((m) => ({ role: m.role, text: m.text.trim() }))
      .filter((m: HistoryItem) => m.text.length > 0)
      .slice(-18); // серверный кап, на всякий

    const client = new OpenAI({ apiKey });

    const input = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.text })),
      // на всякий случай гарантируем, что последнее сообщение - текущее
      { role: "user" as const, content: userText },
    ];

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input,
      max_output_tokens: 600,
    });

    const reply = (response.output_text ?? "").trim() || "I got nothing. Try again.";
    return NextResponse.json({ ok: true, reply });
  } catch (error: unknown) {
    const msg = toErrorMessage(error);
    return jsonError(msg, 500);
  }
}

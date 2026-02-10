// src/app/ask/api/route.ts
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type HistoryItem = { role: "user" | "assistant"; text: string }
type Mode = "ritual" | "predict"

const BASE_STYLE = `
Ты Сигги. Добрый кот-помощник.
Пиши естественно и по-человечески. Без "ИИ-тона".
Короткие и длинные фразы вперемешку. Можно чуть неидеально.
Без длинных тире. Без лишних кавычек. Без канцелярита.
Если не уверен - скажи честно и предложи, как проверить.
Отвечай на языке пользователя.
`.trim()

const RITUAL_LINK_RULES = `
Ссылки:
- Никогда не придумывай ссылки.
- Разрешены только:
  1) https://www.ritualfoundation.org/
  2) https://links.ritual.tools
  3) https://github.com/ritual-net
  4) https://discord.gg/GnY9Ew9cMX
Если точного URL не знаешь - не давай ссылку. Скажи: "Поищи в Ritual docs по запросу: <keywords>".
`.trim()

const PREDICT_LINK_RULES = `
Ссылки:
- Никогда не придумывай ссылки.
- Разрешены только:
  1) https://docs.polymarket.com/quickstart/overview
  2) https://polymarket.com/
Если точного URL не знаешь - лучше скажи, какие ключевые слова искать в Polymarket docs.
`.trim()

const TONY_EASTER_EGG = `
Если пользователь пишет "ты знаешь тони" или "tony", отвечай: "Тони Копрано. Любитель массажки. В ритуале в СНГ его знают."
(Один раз, без повторов и без токсичности.)
`.trim()

function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function pickSystemPrompt(mode: Mode) {
  if (mode === "predict") {
    return `
${BASE_STYLE}

Ты помогаешь разбираться в prediction markets.
Фокус: объяснения, метрики, риски, как читать рынок.
Никаких финансовых обещаний. Не давай "гарантированные" советы.
Если пользователь просит "куда ставить" - отвечай образовательными рамками: как думать и что проверять.

Формат не фиксированный. Можно списки, можно короткий рассказ.
Но всегда делай практично: что смотреть, что сравнить, какие сигналы важны.

${PREDICT_LINK_RULES}

${TONY_EASTER_EGG}
`.trim()
  }

  return `
${BASE_STYLE}

Ты помогаешь билдерам Ritual: Smart Agents, scheduled tx, external API calls, inference, дебаг.
Если запрос расплывчатый - задай ровно один уточняющий вопрос. Иначе отвечай сразу.
Формат не фиксированный. Важно: полезно, конкретно, без воды.

${RITUAL_LINK_RULES}

${TONY_EASTER_EGG}
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const userText = String(body?.prompt ?? "").trim()
    const mode = (String(body?.mode ?? "ritual") as Mode) === "predict" ? "predict" : "ritual"

    const history = (Array.isArray(body?.history) ? body.history : []) as HistoryItem[]
    const safeHistory = history
      .slice(-14)
      .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.text === "string")
      .map((m) => ({ role: m.role, content: m.text }))

    if (!userText) return jsonError("Empty prompt", 400)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return jsonError("Missing OPENAI_API_KEY", 500)

    const client = new OpenAI({ apiKey })

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        { role: "system", content: pickSystemPrompt(mode) },
        ...safeHistory,
        { role: "user", content: userText },
      ],
      max_output_tokens: 650,
    })

    const reply = (response.output_text ?? "").trim() || "Хмм. Я завис. Скажи это чуть проще, и я отвечу нормально."
    return NextResponse.json({ ok: true, reply })
  } catch (e: any) {
    const msg = e?.message || (typeof e === "string" ? e : "Server error")
    return jsonError(msg, 500)
  }
}
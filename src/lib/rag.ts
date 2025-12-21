// src/lib/rag.ts
type Doc = { id: string; title: string; url: string; text: string }

const DOCS: Doc[] = [
  {
    id: 'what-is-ritual',
    title: 'What is Ritual',
    url: 'https://www.ritualfoundation.org/docs/overview/what-is-ritual',
    text: 'Ritual is an onchain AI platform. It enables agents, inference and compute with verifiable rails.',
  },
  {
    id: 'smart-agents',
    title: 'Tutorial: Smart Agents on Ritual',
    url: 'https://www.ritualfoundation.org/docs/build-on-ritual/tutorials/smart-agents',
    text: 'Smart Agents tutorial shows how to deploy agent logic that calls tools and interacts onchain.',
  },
  {
    id: 'docs',
    title: 'Ritual Docs — Build on Ritual',
    url: 'https://www.ritualfoundation.org/docs/build-on-ritual',
    text: 'Guides for builders: agents, inference, tools, scheduled transactions, and more.',
  },
  {
    id: 'academy',
    title: 'Ritual Academy',
    url: 'https://ritual.academy/about/',
    text: 'Learning hub about the ecosystem, concepts and practical guides.',
  },
]

export function ragSearch(query: string, k = 3) {
  const q = query.toLowerCase()
  const score = (d: Doc) => {
    // примитив: количество совпадений токенов в title+text
    const bag = (d.title + ' ' + d.text).toLowerCase()
    return q.split(/\W+/).filter(Boolean).reduce((s, tok) => s + (bag.includes(tok) ? 1 : 0), 0)
  }
  return DOCS.map(d => ({ ...d, score: score(d) }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
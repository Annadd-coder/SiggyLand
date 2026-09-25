import { getSkillPack, type SkillPack } from '@/lib/skillPacks'

export type AgentBlueprint = {
  id: string
  name: string
  role: string
  summary: string
  bestFor: string
  skillPackId: string
  ritualMode: 'App Agent' | 'Sovereign 0x080C' | 'Persistent 0x0820' | 'Scheduled Hybrid'
  launchLevel: 'Ready in app' | 'Ritual-ready after keys' | 'Research mode'
  requiredEnv: string[]
  runtimeSteps: string[]
  safetyRules: string[]
  starterPrompt: string
}

export type AgentBlueprintWithPack = AgentBlueprint & {
  skillPack: SkillPack
}

export const AGENT_BLUEPRINTS: AgentBlueprint[] = [
  {
    id: 'builder-agent',
    name: 'Builder Agent',
    role: 'Ritual product architect',
    summary: 'Turns a raw idea into a buildable Ritual-native spec, contract plan, UI states, and passport.',
    bestFor: 'Founders, hackers, and teams who know what they want but need the Ritual shape.',
    skillPackId: 'ritual-builder-core',
    ritualMode: 'App Agent',
    launchLevel: 'Ready in app',
    requiredEnv: ['OPENAI_API_KEY', 'NEXT_PUBLIC_SIGGY_CHRONICLE_ADDRESS'],
    runtimeSteps: [
      'Collect idea and constraints',
      'Map capabilities to Ritual primitives',
      'Produce build recipe and risk notes',
      'Mint project passport',
    ],
    safetyRules: [
      'Never asks for seed phrase',
      'No backend transaction signing',
      'Marks unverified Ritual claims clearly',
    ],
    starterPrompt:
      'Act as Builder Agent. Turn the user idea into a Ritual-native build recipe with architecture, primitives, safeguards, and next implementation steps.',
  },
  {
    id: 'market-sentinel-agent',
    name: 'Market Sentinel Agent',
    role: 'Prediction market analyst',
    summary: 'Reads market ideas, checks resolution risk, explains odds movement, and prepares watchlists.',
    bestFor: 'Prediction market builders and users who need structured market reasoning, not hype.',
    skillPackId: 'prediction-market-sentinel',
    ritualMode: 'Scheduled Hybrid',
    launchLevel: 'Ritual-ready after keys',
    requiredEnv: ['OPENAI_API_KEY', 'RITUAL_RPC_URL', 'NEXT_PUBLIC_SIGGY_CHRONICLE_ADDRESS'],
    runtimeSteps: [
      'Analyze market wording and source quality',
      'Detect resolution ambiguity and liquidity concerns',
      'Prepare watchlist and signal log',
      'Later: schedule recurring HTTP/LLM checks on Ritual',
    ],
    safetyRules: [
      'No financial advice promises',
      'Separates observation from action',
      'Always shows uncertainty and source limits',
    ],
    starterPrompt:
      'Act as Market Sentinel Agent. Analyze this prediction market idea, explain risks, resolution issues, useful data sources, and a safe Ritual-native monitoring plan.',
  },
  {
    id: 'social-operator-agent',
    name: 'Social Operator Agent',
    role: 'Human-approved social workflow operator',
    summary: 'Drafts posts, reads context, handles voice rules, and prepares scheduled social workflows.',
    bestFor: 'Community teams that want agent-assisted posting without losing approval control.',
    skillPackId: 'sovereign-social-operator',
    ritualMode: 'Sovereign 0x080C',
    launchLevel: 'Ritual-ready after keys',
    requiredEnv: ['LLM_PROVIDER', 'MODEL', 'HF_TOKEN', 'HF_REPO_ID', 'RITUAL_RPC_URL'],
    runtimeSteps: [
      'Load voice policy and content boundaries',
      'Fetch source context',
      'Draft post candidates',
      'Require human approval before publish',
      'Later: run as Sovereign Agent with encrypted secrets',
    ],
    safetyRules: [
      'Human approval before public post',
      'No plaintext API secrets',
      'Rejects impersonation and spam workflows',
    ],
    starterPrompt:
      'Act as Social Operator Agent. Create a safe Ritual-native social workflow with voice rules, sources, human approval, secrets handling, and launch checklist.',
  },
  {
    id: 'memory-companion-agent',
    name: 'Memory Companion Agent',
    role: 'Long-lived project companion',
    summary: 'Maintains project continuity, consent-aware memory, and revival rules for ongoing assistants.',
    bestFor: 'Projects that need an assistant with continuity and explicit memory boundaries.',
    skillPackId: 'persistent-memory-companion',
    ritualMode: 'Persistent 0x0820',
    launchLevel: 'Ritual-ready after keys',
    requiredEnv: ['LLM_PROVIDER', 'MODEL', 'HF_TOKEN or GCS/Pinata credentials', 'RITUAL_RPC_URL'],
    runtimeSteps: [
      'Define memory consent and retention policy',
      'Create inspectable memory summaries',
      'Prepare state storage and revival flow',
      'Later: spawn Persistent Agent on Ritual',
    ],
    safetyRules: [
      'No hidden memory collection',
      'User can inspect remembered summary',
      'Sensitive data requires explicit consent',
    ],
    starterPrompt:
      'Act as Memory Companion Agent. Design a persistent Ritual assistant with consent-aware memory, state continuity, revival flow, and user controls.',
  },
  {
    id: 'relic-minter-agent',
    name: 'Relic Minter Agent',
    role: 'AI artifact and passport minter',
    summary: 'Creates generated covers, metadata, provenance hashes, and live overlays for project artifacts.',
    bestFor: 'NFT/media flows, project passports, generated covers, and provenance artifacts.',
    skillPackId: 'multimodal-relic-minter',
    ritualMode: 'App Agent',
    launchLevel: 'Ready in app',
    requiredEnv: ['OPENAI_API_KEY', 'OPENAI_IMAGE_MODEL', 'NEXT_PUBLIC_SIGGY_CHRONICLE_ADDRESS'],
    runtimeSteps: [
      'Shape artifact prompt',
      'Generate cover art',
      'Create metadata and hash',
      'Mint passport with live overlay',
      'Later: migrate media generation to Ritual multimodal precompiles',
    ],
    safetyRules: [
      'No trademark impersonation',
      'Stores prompt and content hash',
      'Fallback cover if generation fails',
    ],
    starterPrompt:
      'Act as Relic Minter Agent. Turn this idea into a generated artifact plan with cover direction, metadata, provenance hash, and live status overlay.',
  },
]

export function getAgentBlueprint(id: string) {
  const blueprint = AGENT_BLUEPRINTS.find((agent) => agent.id === id) ?? null
  if (!blueprint) return null
  const skillPack = getSkillPack(blueprint.skillPackId)
  if (!skillPack) return null
  return { ...blueprint, skillPack }
}

export function listAgentBlueprints() {
  return AGENT_BLUEPRINTS.map((blueprint) => getAgentBlueprint(blueprint.id)).filter(Boolean) as AgentBlueprintWithPack[]
}

export function formatAgentManifest(agent: AgentBlueprintWithPack) {
  return [
    `Agent: ${agent.name}`,
    `Role: ${agent.role}`,
    `Runtime: ${agent.ritualMode}`,
    `Launch level: ${agent.launchLevel}`,
    `Skill pack: ${agent.skillPack.name}`,
    '',
    `Summary: ${agent.summary}`,
    '',
    'Runtime steps:',
    ...agent.runtimeSteps.map((step) => `- ${step}`),
    '',
    'Required environment:',
    ...agent.requiredEnv.map((item) => `- ${item}`),
    '',
    'Safety rules:',
    ...agent.safetyRules.map((rule) => `- ${rule}`),
    '',
    'Skill pack skills:',
    ...agent.skillPack.skills.map((skill) => `- ${skill}`),
    '',
    'Ritual primitives:',
    ...agent.skillPack.primitives.map((primitive) => `- ${primitive}`),
  ].join('\n')
}

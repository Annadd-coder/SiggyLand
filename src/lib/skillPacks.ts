export type SkillPack = {
  id: string
  name: string
  tagline: string
  category: 'Builder' | 'Market' | 'Social' | 'Autonomy' | 'Creative'
  level: 'Starter' | 'Advanced' | 'Research'
  description: string
  skills: string[]
  primitives: string[]
  safeguards: string[]
  prompt: string
}

export const SKILL_PACKS: SkillPack[] = [
  {
    id: 'ritual-builder-core',
    name: 'Ritual Builder Core',
    tagline: 'Turn raw ideas into Ritual-native build specs.',
    category: 'Builder',
    level: 'Starter',
    description:
      'A practical pack for shaping an idea into architecture, contract surfaces, frontend states, and deploy steps on Ritual Chain.',
    skills: [
      'Idea projection',
      'Primitive mapping',
      'Contract outline',
      'Frontend state machine',
      'Deployment checklist',
    ],
    primitives: ['LLM 0x0802', 'RitualWallet', 'Chronicle NFT'],
    safeguards: [
      'No backend private key required',
      'Wallet-signed metadata only',
      'On-chain storage limited to hash and URI',
    ],
    prompt:
      'Use Ritual Builder Core. Turn my idea into a Ritual-native build recipe with primitive mapping, architecture, risks, and next 3 implementation steps.',
  },
  {
    id: 'prediction-market-sentinel',
    name: 'Prediction Market Sentinel',
    tagline: 'Market data, reasoning, scheduled checks, and risk notes.',
    category: 'Market',
    level: 'Advanced',
    description:
      'A pack for agents that read market data, summarize odds movement, flag weak resolution criteria, and prepare structured market notes.',
    skills: [
      'Market data ingestion',
      'Resolution risk checklist',
      'Odds movement summary',
      'Scheduled monitoring',
      'Chronicle logging',
    ],
    primitives: ['HTTP 0x0801', 'LLM 0x0802', 'Scheduler', 'RitualWallet', 'Chronicle NFT'],
    safeguards: [
      'No financial advice language',
      'Separate signal from action',
      'Show uncertainty and source limitations',
    ],
    prompt:
      'Use Prediction Market Sentinel. Design a Ritual-native agent that monitors prediction markets, explains risk, and logs useful signals without making financial promises.',
  },
  {
    id: 'sovereign-social-operator',
    name: 'Sovereign Social Operator',
    tagline: 'Autonomous social workflow with secrets and schedules.',
    category: 'Social',
    level: 'Research',
    description:
      'A pack for agents that draft posts, read external context, use private API credentials safely, and run as scheduled or sovereign jobs.',
    skills: [
      'Voice policy',
      'External context fetch',
      'Secret handling',
      'Scheduled posting plan',
      'Human approval checkpoint',
    ],
    primitives: ['HTTP 0x0801', 'Secrets', 'Scheduler', 'Sovereign Agent 0x080C', 'RitualWallet'],
    safeguards: [
      'Human approval before public posts',
      'Encrypted secrets only',
      'Rate-limit and failure handling',
    ],
    prompt:
      'Use Sovereign Social Operator. Design a Ritual-native social agent with secrets, scheduled context checks, human approval, and clear failure modes.',
  },
  {
    id: 'persistent-memory-companion',
    name: 'Persistent Memory Companion',
    tagline: 'Long-lived agent identity, memory, and revival plan.',
    category: 'Autonomy',
    level: 'Research',
    description:
      'A pack for always-on assistants that keep continuity, use storage deliberately, and expose what they remember.',
    skills: [
      'Memory policy',
      'State continuity',
      'Revival checklist',
      'User consent boundaries',
      'Audit trail design',
    ],
    primitives: ['Persistent Agent 0x0820', 'LLM 0x0802', 'RitualWallet', 'Chronicle NFT'],
    safeguards: [
      'Explicit memory consent',
      'Inspectable memory summaries',
      'No hidden private data collection',
    ],
    prompt:
      'Use Persistent Memory Companion. Design an always-on Ritual assistant with safe memory, clear consent, and a project passport.',
  },
  {
    id: 'multimodal-relic-minter',
    name: 'Multimodal Relic Minter',
    tagline: 'Generate artifacts from prompts and preserve provenance.',
    category: 'Creative',
    level: 'Advanced',
    description:
      'A pack for project covers, lore artifacts, generated media, content hashes, and Chronicle-style provenance.',
    skills: [
      'Prompt design',
      'Image/audio/video artifact planning',
      'Metadata shaping',
      'Provenance hash',
      'Dynamic status overlay',
    ],
    primitives: ['Multimodal 0x0818/0x0819/0x081A', 'LLM 0x0802', 'Chronicle NFT', 'RitualWallet'],
    safeguards: [
      'No trademark impersonation',
      'Store source prompt and hash',
      'Fallback media path if generation fails',
    ],
    prompt:
      'Use Multimodal Relic Minter. Design a Ritual-native NFT/media artifact flow with generated cover art, provenance, and dynamic metadata.',
  },
]

export function getSkillPack(id: string) {
  return SKILL_PACKS.find((pack) => pack.id === id) ?? null
}

export function formatSkillPackManifest(pack: SkillPack) {
  return [
    `Skill Pack: ${pack.name}`,
    `Category: ${pack.category}`,
    `Level: ${pack.level}`,
    `Tagline: ${pack.tagline}`,
    '',
    'Skills:',
    ...pack.skills.map((skill) => `- ${skill}`),
    '',
    'Ritual primitives:',
    ...pack.primitives.map((primitive) => `- ${primitive}`),
    '',
    'Safeguards:',
    ...pack.safeguards.map((safeguard) => `- ${safeguard}`),
  ].join('\n')
}

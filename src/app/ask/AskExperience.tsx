'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ethers } from 'ethers'
import styles from './ask.module.css'
import { trackInteraction } from '@/lib/trackInteraction'
import { hasEthereum, requestAccounts, switchToRitualChain } from '@/lib/eth'
import { SKILL_PACKS, formatSkillPackManifest, type SkillPack } from '@/lib/skillPacks'
import {
  formatAgentManifest,
  listAgentBlueprints,
  type AgentBlueprintWithPack,
} from '@/lib/agentFoundry'

type Role = 'user' | 'assistant'

type Message = {
  id: string
  role: Role
  text: string
  ts: number
}

type ChatApiResponse = {
  ok?: boolean
  reply?: string
  error?: string
}

type ProductMode = 'agent' | 'passport' | 'chat'
type BuilderStep = 'blueprint' | 'skills' | 'runtime' | 'use' | 'publish'

type ChronicleApiResponse = {
  ok?: boolean
  error?: string
  metadataUri?: string
  contentHash?: `0x${string}`
  chronicle?: {
    id: number
    title: string
    primitiveMask: number
  }
}

type AgentManifestApiResponse = {
  ok?: boolean
  error?: string
  manifestHash?: `0x${string}`
  manifestUri?: string
  manifest?: {
    id: number
    name: string
    blueprintId: string
    skillPackId: string
  }
}

type AgentRunApiResponse = {
  ok?: boolean
  error?: string
  outputHash?: `0x${string}`
  outputUri?: string
  run?: {
    id: number
    agentName: string
    blueprintId: string
    skillPackId: string
  }
}

const STORAGE_KEY = 'siggy:chat:assistant:v3'
const HISTORY_LIMIT = 12
const RITUAL_EXPLORER_TX = 'https://explorer.ritualfoundation.org/tx'
const CHRONICLE_CONTRACT = process.env.NEXT_PUBLIC_SIGGY_CHRONICLE_ADDRESS || ''
const AGENT_REGISTRY_CONTRACT = process.env.NEXT_PUBLIC_SIGGY_AGENT_REGISTRY_ADDRESS || ''
const SIGGY_CHRONICLE_ABI = [
  'function mintChronicle(string title,string metadataURI,bytes32 contentHash,uint16 primitiveMask) returns (uint256)',
  'event ChronicleMinted(uint256 indexed tokenId,address indexed author,bytes32 indexed contentHash,string metadataURI,uint16 primitiveMask)',
]
const SIGGY_AGENT_REGISTRY_ABI = [
  'function registerAgent(string name,string blueprintId,string skillPackId,string manifestURI,bytes32 manifestHash) returns (uint256)',
  'function updateStatus(uint256 agentId,uint8 status)',
  'function recordRun(uint256 agentId,bytes32 outputHash,string outputURI,uint8 status)',
  'event AgentRegistered(uint256 indexed agentId,address indexed owner,bytes32 indexed manifestHash,string blueprintId,string skillPackId,string manifestURI)',
]

const PRIMITIVES = [
  { bit: 1, label: 'LLM 0x0802', needles: ['llm', 'ai answer', 'chat', 'reason', 'inference', 'model'] },
  { bit: 2, label: 'HTTP 0x0801', needles: ['http', 'api', 'fetch', 'price', 'market data', 'external'] },
  { bit: 4, label: 'Scheduler', needles: ['schedule', 'recurring', 'every hour', 'automation', 'keeper'] },
  { bit: 8, label: 'RitualWallet', needles: ['deposit', 'fund', 'fee', 'ritualwallet'] },
  { bit: 16, label: 'Sovereign Agent 0x080C', needles: ['sovereign', 'agent job', 'researches', 'autonomous'] },
  { bit: 32, label: 'Persistent Agent 0x0820', needles: ['persistent', 'memory', 'long-lived', 'always-on'] },
  { bit: 64, label: 'Secrets', needles: ['secret', 'private', 'api key', 'encrypted'] },
  { bit: 128, label: 'Multimodal 0x0818/0x0819/0x081A', needles: ['image', 'audio', 'video', 'multimodal'] },
] as const
const DEFAULT_SELECTED_PACK_ID = 'ritual-builder-core'
const AGENTS = listAgentBlueprints()
const DEFAULT_SELECTED_AGENT_ID = 'builder-agent'
const BUILDER_STEPS: Array<{
  id: BuilderStep
  index: string
  title: string
  text: string
}> = [
  {
    id: 'blueprint',
    index: '01',
    title: 'Choose Agent',
    text: 'Pick the job and behavior model.',
  },
  {
    id: 'skills',
    index: '02',
    title: 'Add Skills',
    text: 'Choose the capability pack.',
  },
  {
    id: 'runtime',
    index: '03',
    title: 'Runtime',
    text: 'See how it works and where wallet actions fit.',
  },
  {
    id: 'use',
    index: '04',
    title: 'Use Agent',
    text: 'Run the agent inside the app.',
  },
  {
    id: 'publish',
    index: '05',
    title: 'Publish',
    text: 'Register, save runs, or mint a story chapter.',
  },
]
const PRODUCT_MODES: Array<{
  id: ProductMode
  icon: string
  title: string
  text: string
  cta: string
}> = [
  {
    id: 'agent',
    icon: '01',
    title: 'Agent Builder',
    text: 'Build, test, register, and reuse a real agent workspace.',
    cta: 'Build',
  },
  {
    id: 'passport',
    icon: '02',
    title: 'NFT Adventure',
    text: 'Mint Siggy Chronicle chapters and collect the full story on Ritual.',
    cta: 'Collect',
  },
  {
    id: 'chat',
    icon: '03',
    title: 'Ritual Helper',
    text: 'Ask Siggy to explain Ritual, shape ideas, and guide your next move.',
    cta: 'Ask',
  },
]
const LEGACY_GREETING_TEXT =
  "Hi, I'm Siggy. I'm your personal assistant for planning, writing, Ritual research, community replies, and everyday project tasks. I keep things clear, warm, and useful without sounding robotic."

const GREETING: Message = {
  id: 'hello-siggy',
  role: 'assistant',
  text:
    "Siggy, at your service. I can guide you through Ritual, explain the moving parts, shape ideas, and help turn a rough plan into a cleaner next step.",
  ts: 0,
}

function parseStoredMessages(raw: string | null) {
  if (!raw) return [GREETING]

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [GREETING]

    const safe = parsed
      .filter((item): item is Message => {
        if (!item || typeof item !== 'object') return false
        const value = item as Partial<Message>
        return (value.role === 'user' || value.role === 'assistant') && typeof value.text === 'string'
      })
      .map((item, index) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `restored-${index}`,
        role: item.role,
        text: item.text.trim(),
        ts: typeof item.ts === 'number' ? item.ts : index,
      }))
      .filter((item) => item.text.length > 0)

    if (safe.length === 0) return [GREETING]

    const [first, ...rest] = safe
    if (first.role === 'assistant' && (first.id === GREETING.id || first.text === LEGACY_GREETING_TEXT)) {
      return [{ ...GREETING, ts: first.ts }, ...rest]
    }

    return safe
  } catch {
    return [GREETING]
  }
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

function deriveTitle(text: string) {
  const cleaned = text
    .replace(/^(build|create|make|i want|хочу|сделай|создай)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return 'Siggy Chronicle Chapter'
  return cleaned.slice(0, 72)
}

function detectPrimitives(text: string) {
  const lower = text.toLowerCase()
  const found = PRIMITIVES.filter((primitive) => primitive.needles.some((needle) => lower.includes(needle)))
  const withDefaults = found.length ? found : [PRIMITIVES[0], PRIMITIVES[3]]
  const labels = withDefaults.map((primitive) => primitive.label)
  const mask = withDefaults.reduce((sum, primitive) => sum | primitive.bit, 0)
  return { labels: [...labels, 'Chronicle NFT'], mask }
}

function primitivesFromLabels(labels: string[]) {
  const bits = new Map<string, number>(PRIMITIVES.map((primitive) => [primitive.label, primitive.bit]))
  const normalized = labels.filter(Boolean)
  const mask = normalized.reduce((sum, label) => sum | (bits.get(label) || 0), 0)
  return {
    labels: normalized.includes('Chronicle NFT') ? normalized : [...normalized, 'Chronicle NFT'],
    mask,
  }
}

function getBrowserEthereum() {
  if (typeof window === 'undefined') return null
  return (window as unknown as { ethereum?: ethers.providers.ExternalProvider }).ethereum ?? null
}

function buildChronicleSigningMessage(input: {
  wallet: string
  title: string
  idea: string
  recipe: string
  primitives: string[]
  primitiveMask: number
}) {
  return [
    'Siggy Chronicle metadata request',
    JSON.stringify({
      wallet: input.wallet.trim().toLowerCase(),
      title: input.title,
      idea: input.idea,
      recipe: input.recipe,
      primitives: input.primitives,
      primitiveMask: input.primitiveMask,
    }),
  ].join('\n')
}

function buildAgentManifestSigningMessage(input: {
  wallet: string
  name: string
  blueprintId: string
  skillPackId: string
  manifestHash: string
}) {
  return [
    'Siggy Agent manifest request',
    JSON.stringify({
      wallet: input.wallet.trim().toLowerCase(),
      name: input.name,
      blueprintId: input.blueprintId,
      skillPackId: input.skillPackId,
      manifestHash: input.manifestHash,
    }),
  ].join('\n')
}

function buildAgentRunSigningMessage(input: {
  wallet: string
  agentName: string
  blueprintId: string
  skillPackId: string
  outputHash: string
}) {
  return [
    'Siggy Agent run record',
    JSON.stringify({
      wallet: input.wallet.trim().toLowerCase(),
      agentName: input.agentName,
      blueprintId: input.blueprintId,
      skillPackId: input.skillPackId,
      outputHash: input.outputHash,
    }),
  ].join('\n')
}

type AskExperienceProps = {
  initialMode?: ProductMode
  showPathChooser?: boolean
}

export default function AskExperience({ initialMode = 'agent', showPathChooser = false }: AskExperienceProps) {
  const inputId = useId()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [chronicleBusy, setChronicleBusy] = useState(false)
  const [chronicleMessage, setChronicleMessage] = useState<string | null>(null)
  const [chronicleError, setChronicleError] = useState<string | null>(null)
  const [productMode, setProductMode] = useState<ProductMode>(initialMode)
  const [selectedAgentId, setSelectedAgentId] = useState(DEFAULT_SELECTED_AGENT_ID)
  const [selectedPackId, setSelectedPackId] = useState(DEFAULT_SELECTED_PACK_ID)
  const [walletAddress, setWalletAddress] = useState('')
  const [agentBusy, setAgentBusy] = useState(false)
  const [agentMessage, setAgentMessage] = useState<string | null>(null)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [agentTask, setAgentTask] = useState('')
  const [agentOutput, setAgentOutput] = useState<string | null>(null)
  const [agentRunBusy, setAgentRunBusy] = useState(false)
  const [registeredAgentId, setRegisteredAgentId] = useState('')
  const [agentRunMessage, setAgentRunMessage] = useState<string | null>(null)
  const [builderStep, setBuilderStep] = useState<BuilderStep>('blueprint')

  const selectedAgent = AGENTS.find((agent) => agent.id === selectedAgentId) || AGENTS[0]
  const selectedPack = SKILL_PACKS.find((pack) => pack.id === selectedPackId) || SKILL_PACKS[0]
  const agentManifestText = [
    formatAgentManifest({ ...selectedAgent, skillPack: selectedPack }),
    '',
    'Launch policy:',
    '- User wallet signs manifest creation',
    '- Backend never receives private keys',
    '- Public actions require explicit user transaction',
    '- Secrets are listed as requirements, not stored in the browser',
  ].join('\n')
  const walletLabel = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'
  const agentExample =
    selectedAgent.id === 'social-operator-agent'
      ? 'Create 3 launch posts for our Ritual agent foundry. Audience: crypto builders. Avoid hype.'
      : selectedAgent.id === 'market-sentinel-agent'
        ? 'Analyze this prediction market question and list resolution risks, data sources, and monitoring plan.'
        : selectedAgent.id === 'relic-minter-agent'
          ? 'Create a project artifact plan and cover direction for an NFT passport.'
          : selectedAgent.id === 'memory-companion-agent'
            ? 'Design a consent-aware memory plan for an ongoing project assistant.'
            : 'Turn my idea into a concrete Ritual-native product plan with risks and next steps.'
  const agentStatus = registeredAgentId
    ? `Registered #${registeredAgentId}`
    : AGENT_REGISTRY_CONTRACT
      ? 'Ready to register'
      : 'Registry address missing'
  const builderStepIndex = BUILDER_STEPS.findIndex((step) => step.id === builderStep)
  const canGoBack = builderStepIndex > 0
  const canGoNext = builderStepIndex >= 0 && builderStepIndex < BUILDER_STEPS.length - 1

  useEffect(() => {
    trackInteraction({ type: 'visit_ask', value: 1, metadata: { page: 'assistant_only' } })
    trackInteraction({ type: 'site_visit', value: 1, metadata: { page: 'ask_assistant' } })

    try {
      setMessages(parseStoredMessages(localStorage.getItem(STORAGE_KEY)))
    } catch {
      setMessages([GREETING])
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!ready) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)))
    } catch {}
  }, [messages, ready])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  async function sendMessage(forcedPrompt?: string) {
    const prompt = (forcedPrompt ?? draft).trim()
    if (!prompt || sending) return

    const sentAt = Date.now()
    const userMessage: Message = {
      id: `user-${sentAt}`,
      role: 'user',
      text: prompt,
      ts: sentAt,
    }

    const history = messages.slice(-HISTORY_LIMIT).map(({ role, text }) => ({ role, text }))

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setError(null)
    setSending(true)
    trackInteraction({ type: 'ask_prompt', value: 1, metadata: { area: 'assistant_only' } })

    try {
      const response = await fetch('/ask/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history }),
      })

      const raw = await response.text().catch(() => '')
      let payload: ChatApiResponse | null = null

      try {
        payload = raw ? (JSON.parse(raw) as ChatApiResponse) : null
      } catch {
        payload = null
      }

      const replyText = payload?.reply?.trim()

      if (!response.ok || !payload?.ok || !replyText) {
        throw new Error(payload?.error || 'Assistant is temporarily unavailable.')
      }

      const replyAt = Date.now()
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${replyAt}`,
          role: 'assistant',
          text: replyText,
          ts: replyAt,
        },
      ])
      trackInteraction({ type: 'ask_reply', value: 1, metadata: { area: 'assistant_only' } })
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, 'I could not get a reply right now. Please try again.'))
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void sendMessage()
  }

  async function connectWallet() {
    setAgentError(null)
    setChronicleError(null)

    if (!hasEthereum()) {
      setAgentError('Install MetaMask or another injected wallet first.')
      return ''
    }

    try {
      const [wallet] = await requestAccounts()
      if (!wallet) throw new Error('Wallet connection was not approved.')
      setWalletAddress(wallet)
      await switchToRitualChain()
      return wallet
    } catch (caughtError) {
      const message = toErrorMessage(caughtError, 'Could not connect wallet.')
      setAgentError(message)
      return ''
    }
  }

  async function askForRecipe() {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user')
    const base = lastUser?.text.trim()
    const prompt = base
      ? `${selectedAgent.starterPrompt}\n\n${formatAgentManifest(selectedAgent)}\n\nUser idea: ${base}`
      : `Help me configure this Ritual agent. Ask for one project idea, then turn it into an Agent Manifest and Ritual Build Recipe.\n\n${formatAgentManifest(selectedAgent)}`

    await sendMessage(prompt)
  }

  async function registerSelectedAgent() {
    setAgentError(null)
    setAgentMessage(null)
    setAgentBusy(true)

    try {
      const wallet = walletAddress || (await connectWallet())
      if (!wallet) return

      const ethereum = getBrowserEthereum()
      if (!ethereum) throw new Error('Ethereum provider is not available.')

      const provider = new ethers.providers.Web3Provider(ethereum)
      const signer = provider.getSigner()
      const manifestHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(agentManifestText)) as `0x${string}`
      const signature = await signer.signMessage(buildAgentManifestSigningMessage({
        wallet,
        name: selectedAgent.name,
        blueprintId: selectedAgent.id,
        skillPackId: selectedPack.id,
        manifestHash,
      }))

      const response = await fetch('/api/agent-manifests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          name: selectedAgent.name,
          blueprintId: selectedAgent.id,
          skillPackId: selectedPack.id,
          manifest: agentManifestText,
          signature,
        }),
      })
      const payload = (await response.json().catch(() => null)) as AgentManifestApiResponse | null

      if (!response.ok || !payload?.ok || !payload.manifestUri || !payload.manifestHash) {
        throw new Error(payload?.error || 'Could not create agent manifest.')
      }

      if (!AGENT_REGISTRY_CONTRACT) {
        setAgentMessage(
          `Manifest ready: ${payload.manifestUri}. Deploy SiggyAgentRegistry and set NEXT_PUBLIC_SIGGY_AGENT_REGISTRY_ADDRESS to enable on-chain launch.`
        )
        return
      }

      await switchToRitualChain()
      const contract = new ethers.Contract(AGENT_REGISTRY_CONTRACT, SIGGY_AGENT_REGISTRY_ABI, signer)
      const tx = await contract.registerAgent(
        selectedAgent.name,
        selectedAgent.id,
        selectedPack.id,
        payload.manifestUri,
        payload.manifestHash
      )

      setAgentMessage(`Registration submitted: ${tx.hash}`)
      const receipt = await tx.wait()
      const event = receipt.events?.find((item: ethers.Event) => item.event === 'AgentRegistered')
      const agentId = event?.args?.agentId?.toString?.() || ''
      setRegisteredAgentId(agentId)
      setAgentMessage(`Agent registered${agentId ? ` as #${agentId}` : ''}: ${RITUAL_EXPLORER_TX}/${receipt.transactionHash}`)
      trackInteraction({ type: 'agent_register', value: 1, metadata: { agent: selectedAgent.id, pack: selectedPack.id, agentId } })
    } catch (caughtError) {
      setAgentError(toErrorMessage(caughtError, 'Agent registration failed.'))
    } finally {
      setAgentBusy(false)
    }
  }

  async function runSelectedAgent() {
    const task = agentTask.trim() || agentExample
    if (!task || agentRunBusy) return

    setAgentError(null)
    setAgentOutput(null)
    if (!agentTask.trim()) setAgentTask(task)
    setAgentRunBusy(true)

    try {
      const response = await fetch('/ask/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: [
            selectedAgent.starterPrompt,
            '',
            'You are being used inside Siggy Land Agent Foundry as a product tool, not as casual chat.',
            'Return a practical output with clear sections, concrete next actions, and safety notes.',
            '',
            agentManifestText,
            '',
            `User task: ${task}`,
          ].join('\n'),
          history: [],
        }),
      })
      const payload = (await response.json().catch(() => null)) as ChatApiResponse | null
      const reply = payload?.reply?.trim()

      if (!response.ok || !payload?.ok || !reply) {
        throw new Error(payload?.error || 'Agent run failed.')
      }

      setAgentOutput(reply)
      setAgentRunMessage(null)
      trackInteraction({ type: 'agent_run', value: 1, metadata: { agent: selectedAgent.id, pack: selectedPack.id } })
    } catch (caughtError) {
      setAgentError(toErrorMessage(caughtError, 'Agent run failed.'))
    } finally {
      setAgentRunBusy(false)
    }
  }

  async function saveAgentRun() {
    if (!agentOutput || agentRunBusy) return

    setAgentError(null)
    setAgentRunMessage(null)
    setAgentRunBusy(true)

    try {
      const wallet = walletAddress || (await connectWallet())
      if (!wallet) return

      const ethereum = getBrowserEthereum()
      if (!ethereum) throw new Error('Ethereum provider is not available.')

      const provider = new ethers.providers.Web3Provider(ethereum)
      const signer = provider.getSigner()
      const outputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${agentTask.trim()}\n\n${agentOutput}`)) as `0x${string}`
      const signature = await signer.signMessage(buildAgentRunSigningMessage({
        wallet,
        agentName: selectedAgent.name,
        blueprintId: selectedAgent.id,
        skillPackId: selectedPack.id,
        outputHash,
      }))

      const response = await fetch('/api/agent-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          agentName: selectedAgent.name,
          blueprintId: selectedAgent.id,
          skillPackId: selectedPack.id,
          task: agentTask,
          output: agentOutput,
          signature,
        }),
      })
      const payload = (await response.json().catch(() => null)) as AgentRunApiResponse | null

      if (!response.ok || !payload?.ok || !payload.outputUri || !payload.outputHash) {
        throw new Error(payload?.error || 'Could not save agent run.')
      }

      if (!AGENT_REGISTRY_CONTRACT || !registeredAgentId) {
        setAgentRunMessage(
          `Run saved: ${payload.outputUri}. Register the agent first to record this run on-chain.`
        )
        return
      }

      await switchToRitualChain()
      const contract = new ethers.Contract(AGENT_REGISTRY_CONTRACT, SIGGY_AGENT_REGISTRY_ABI, signer)
      const tx = await contract.recordRun(registeredAgentId, payload.outputHash, payload.outputUri, 4)
      setAgentRunMessage(`Run record submitted: ${tx.hash}`)
      const receipt = await tx.wait()
      setAgentRunMessage(`Run recorded on-chain: ${RITUAL_EXPLORER_TX}/${receipt.transactionHash}`)
      trackInteraction({ type: 'agent_run_record', value: 1, metadata: { agent: selectedAgent.id, run: payload.run?.id } })
    } catch (caughtError) {
      setAgentError(toErrorMessage(caughtError, 'Could not save agent run.'))
    } finally {
      setAgentRunBusy(false)
    }
  }

  function handleUsePack(pack: SkillPack) {
    setSelectedPackId(pack.id)
  }

  function handleUseAgent(agent: AgentBlueprintWithPack) {
    setSelectedAgentId(agent.id)
    setSelectedPackId(agent.skillPack.id)
  }

  function goToNextStep() {
    if (!canGoNext) return
    setBuilderStep(BUILDER_STEPS[builderStepIndex + 1].id)
  }

  function goToPreviousStep() {
    if (!canGoBack) return
    setBuilderStep(BUILDER_STEPS[builderStepIndex - 1].id)
  }

  async function mintChronicle() {
    setChronicleError(null)
    setChronicleMessage(null)

    const lastUser = [...messages].reverse().find((message) => message.role === 'user')
    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant' && message.id !== GREETING.id)

    if (!hasEthereum()) {
      setChronicleError('MetaMask or another injected wallet is required for minting.')
      return
    }

    setChronicleBusy(true)

    try {
      const [wallet] = await requestAccounts()
      if (!wallet) throw new Error('Wallet connection was not approved.')

      const isAgentPassport = Boolean(selectedAgent)
      const isPackPassport = Boolean(selectedPack)
      const title = lastUser ? deriveTitle(lastUser.text) : selectedAgent.name
      const agentManifest = selectedAgent ? formatAgentManifest(selectedAgent) : ''
      const packManifest = selectedPack ? formatSkillPackManifest(selectedPack) : ''
      const combined = `${lastUser?.text || selectedAgent.summary}\n\n${lastAssistant?.text || agentManifestText}\n\n${packManifest}`
      const primitives = selectedPack ? primitivesFromLabels(selectedPack.primitives) : detectPrimitives(combined)
      const idea = isPackPassport
        ? `${selectedPack.name}: ${selectedPack.description}`
        : isAgentPassport
          ? `${selectedAgent.name}: ${selectedAgent.summary}`
        : lastUser?.text || selectedAgent.summary
      const recipe = [
        lastAssistant?.text || agentManifestText,
        '',
        '--- Agent Manifest ---',
        agentManifest,
        '',
        '--- Skill Pack Manifest ---',
        packManifest,
      ].join('\n').trim()
      const ethereum = getBrowserEthereum()
      if (!ethereum) throw new Error('Ethereum provider is not available.')

      const provider = new ethers.providers.Web3Provider(ethereum)
      const signer = provider.getSigner()
      const signature = await signer.signMessage(buildChronicleSigningMessage({
        wallet,
        title,
        idea,
        recipe,
        primitives: primitives.labels,
        primitiveMask: primitives.mask,
      }))

      const response = await fetch('/api/chronicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          title,
          idea,
          recipe,
          primitives: primitives.labels,
          primitiveMask: primitives.mask,
          signature,
        }),
      })

      const payload = (await response.json().catch(() => null)) as ChronicleApiResponse | null
      if (!response.ok || !payload?.ok || !payload.metadataUri || !payload.contentHash || !payload.chronicle) {
        throw new Error(payload?.error || 'Could not create Chronicle metadata.')
      }

      if (!CHRONICLE_CONTRACT) {
        setChronicleMessage(
          `Metadata ready: ${payload.metadataUri}. Deploy SiggyChronicle and set NEXT_PUBLIC_SIGGY_CHRONICLE_ADDRESS to enable minting.`
        )
        return
      }

      await switchToRitualChain()
      const contract = new ethers.Contract(CHRONICLE_CONTRACT, SIGGY_CHRONICLE_ABI, signer)

      const tx = await contract.mintChronicle(
        payload.chronicle.title,
        payload.metadataUri,
        payload.contentHash,
        payload.chronicle.primitiveMask
      )

      setChronicleMessage(`Mint submitted: ${tx.hash}`)
      const receipt = await tx.wait()
      const event = receipt.events?.find((item: ethers.Event) => item.event === 'ChronicleMinted')
      const tokenId = event?.args?.tokenId?.toString?.() || ''

      await fetch(`/api/chronicles/${payload.chronicle.id}/minted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: receipt.transactionHash, tokenId }),
      }).catch(() => null)

      setChronicleMessage(
        `Chronicle minted${tokenId ? ` as #${tokenId}` : ''}: ${RITUAL_EXPLORER_TX}/${receipt.transactionHash}`
      )
      trackInteraction({ type: 'chronicle_mint', value: 1, metadata: { id: payload.chronicle.id, tokenId } })
    } catch (caughtError) {
      setChronicleError(toErrorMessage(caughtError, 'Chronicle mint failed.'))
    } finally {
      setChronicleBusy(false)
    }
  }

  return (
    <main className={`pageRoot skinAsk skinAskBlue ${styles.page}`}>
      <div className={styles.shell}>
        <section className={styles.stage}>
          {showPathChooser && (
            <div className={styles.hero}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>Ask Siggy</p>
                <h1 className={styles.title}>Choose your path</h1>
                <p className={styles.lead}>
                  Build an agent, collect Chronicle NFTs as story chapters, or use Siggy as your helper for Ritual.
                  The on-chain steps are there when something is worth keeping.
                </p>
              </div>
            </div>
          )}

          {showPathChooser && (
            <section className={styles.modeGrid} aria-label="Choose product workflow">
            {PRODUCT_MODES.map((mode) => {
              const active = mode.id === productMode
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`${styles.modeCard} ${active ? styles.modeCardActive : ''}`}
                  onClick={() => setProductMode(mode.id)}
                >
                  <span className={styles.modeTop}>
                    <span className={styles.modeIcon} aria-hidden="true">{mode.icon}</span>
                    <span className={styles.modeTitle}>{mode.title}</span>
                  </span>
                  <span
                    className={`${styles.modeVisual} ${
                      mode.id === 'agent'
                        ? styles.modeVisualAgent
                        : mode.id === 'passport'
                          ? styles.modeVisualPassport
                          : styles.modeVisualSiggy
                    }`}
                    aria-hidden="true"
                  >
                    <span />
                  </span>
                  <span className={styles.modeCta}>{mode.cta}</span>
                </button>
              )
            })}
            </section>
          )}

          <div className={styles.workspace}>
            <aside className={styles.agentPanel}>
              {productMode === 'chat' && (
                <div className={`${styles.visualFrame} ${sending ? styles.visualFrameActive : ''}`}>
                  <Image
                    src="/qqqqqqqqqqqqeww.gif"
                    alt="Siggy typing on a typewriter"
                    width={1000}
                    height={1000}
                    priority
                    unoptimized
                    className={styles.agentGif}
                  />
                </div>
              )}

              <div className={styles.agentMeta}>
                <div className={styles.presenceRow}>
                  <span className={styles.presenceDot} aria-hidden="true" />
                  <span className={styles.presenceText}>
                    {productMode === 'chat' ? (sending ? 'Siggy is answering' : 'Ritual helper') : productMode === 'passport' ? 'NFT adventure' : 'Agent console'}
                  </span>
                </div>

                <p className={styles.agentNote}>
                  Use the app first. Wallet actions are for things you decide to preserve: registry records, run
                  history, and collectible Chronicle chapters.
                </p>
              </div>

              {productMode === 'agent' && (
              <section className={styles.packPanel} aria-label="Ritual agents">
                <div className={styles.packPanelHead}>
                  <p className={styles.packEyebrow}>Builder Progress</p>
                  <h2 className={styles.packTitle}>One clean step at a time.</h2>
                </div>

                <div className={styles.stepRail}>
                  {BUILDER_STEPS.map((step, index) => {
                    const active = step.id === builderStep
                    const complete = index < builderStepIndex
                    return (
                      <button
                        type="button"
                        key={step.id}
                        className={`${styles.stepRailItem} ${active ? styles.stepRailItemActive : ''} ${complete ? styles.stepRailItemComplete : ''}`}
                        onClick={() => setBuilderStep(step.id)}
                      >
                        <span>{step.index}</span>
                        <strong>{step.title}</strong>
                        <small>{step.text}</small>
                      </button>
                    )
                  })}
                </div>

                <div className={styles.miniSummary}>
                  <p><strong>Agent:</strong> {selectedAgent.name}</p>
                  <p><strong>Skills:</strong> {selectedPack.name}</p>
                  <p><strong>Wallet:</strong> {walletLabel}</p>
                </div>
              </section>
              )}

            </aside>

            <section className={styles.chatPanel} aria-label="AI assistant chat">
              <header className={styles.chatHead}>
                <div>
                  <p className={styles.chatEyebrow}>
                    {productMode === 'agent' && 'Agent Workspace'}
                    {productMode === 'passport' && 'NFT Adventure'}
                    {productMode === 'chat' && 'Ritual Helper'}
                  </p>
                  <h2 className={styles.chatTitle}>
                    {productMode === 'agent' && selectedAgent.name}
                    {productMode === 'passport' && 'Collect Siggy Chronicle chapters'}
                    {productMode === 'chat' && 'Ask Siggy about Ritual'}
                  </h2>
                </div>
                <span className={styles.chatStatus}>{productMode === 'agent' ? agentStatus : sending ? 'Listening' : 'Ready'}</span>
              </header>

              {productMode === 'agent' && (
                <section className={styles.agentWorkspace} aria-label="Selected agent details">
                  <div className={styles.builderHero}>
                    <div>
                      <p className={styles.chronicleEyebrow}>{BUILDER_STEPS[builderStepIndex]?.index || '01'} / 05</p>
                      <h3>{BUILDER_STEPS[builderStepIndex]?.title || 'Agent Builder'}</h3>
                      <p>
                        {builderStep === 'blueprint' && 'Start with the agent role. This decides the workflow, prompt policy, and default output format.'}
                        {builderStep === 'skills' && 'Add a capability pack. This decides what primitives, safeguards, and product logic the agent will use.'}
                        {builderStep === 'runtime' && 'Choose how this agent is applied. It runs in the app now; on-chain actions prove ownership and history.'}
                        {builderStep === 'use' && 'Use the configured agent on a real task. No transaction is required for this step.'}
                        {builderStep === 'publish' && 'Publish only when the agent, run, or story moment is worth preserving: register, save run, or mint a chapter.'}
                      </p>
                    </div>
                    <div className={styles.buildHealth}>
                      <span>{selectedAgent.ritualMode}</span>
                      <strong>{agentStatus}</strong>
                    </div>
                  </div>

                  {builderStep === 'blueprint' && (
                    <section className={styles.wizardPane} aria-label="Choose agent blueprint">
                      <div className={styles.selectorGrid}>
                        {AGENTS.map((agent) => {
                          const active = agent.id === selectedAgent.id
                          return (
                            <button
                              type="button"
                              className={`${styles.builderChoice} ${active ? styles.builderChoiceActive : ''}`}
                              key={agent.id}
                              onClick={() => handleUseAgent(agent)}
                            >
                              <span>{agent.ritualMode}</span>
                              <strong>{agent.name}</strong>
                              <small>{agent.summary}</small>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {builderStep === 'skills' && (
                    <section className={styles.wizardPane} aria-label="Choose skill pack">
                      <div className={styles.selectorGrid}>
                        {SKILL_PACKS.map((pack) => {
                          const active = pack.id === selectedPack.id
                          return (
                            <button
                              type="button"
                              className={`${styles.builderChoice} ${active ? styles.builderChoiceActive : ''}`}
                              key={pack.id}
                              onClick={() => handleUsePack(pack)}
                            >
                              <span>{pack.category} · {pack.level}</span>
                              <strong>{pack.name}</strong>
                              <small>{pack.description}</small>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {builderStep === 'runtime' && (
                    <section className={styles.wizardPane} aria-label="Runtime plan">
                      <div className={styles.buildGrid}>
                        <article className={styles.buildBlock}>
                          <span className={styles.buildBlockIndex}>APP</span>
                          <div>
                            <h3>Use in app</h3>
                            <p>The agent runs immediately through the app workspace. This is the real product usage.</p>
                          </div>
                        </article>
                        <article className={styles.buildBlock}>
                          <span className={styles.buildBlockIndex}>REG</span>
                          <div>
                            <h3>Register build</h3>
                            <p>On-chain record of owner, agent blueprint, skill pack, manifest URI, and hash.</p>
                          </div>
                        </article>
                        <article className={styles.buildBlock}>
                          <span className={styles.buildBlockIndex}>RUN</span>
                          <div>
                            <h3>Save run</h3>
                            <p>Signs and stores an agent output. If registered, the run hash can be recorded on-chain.</p>
                          </div>
                        </article>
                        <article className={styles.buildBlock}>
                          <span className={styles.buildBlockIndex}>NFT</span>
                          <div>
                            <h3>Mint chapter</h3>
                            <p>Collectible Chronicle NFT with metadata, generated cover, and a live status overlay.</p>
                          </div>
                        </article>
                      </div>
                    </section>
                  )}

                  {builderStep === 'use' && (
                    <section className={styles.useAgentBox} aria-label="Use selected agent">
                      <div>
                        <p className={styles.chronicleEyebrow}>Agent Workspace</p>
                        <h3 className={styles.chronicleTitle}>{selectedAgent.name}</h3>
                        <p className={styles.chronicleText}>{selectedAgent.summary}</p>
                      </div>

                      <textarea
                        className={styles.agentTaskInput}
                        value={agentTask}
                        onChange={(event) => setAgentTask(event.target.value)}
                        placeholder={agentExample}
                        rows={4}
                        disabled={agentRunBusy}
                      />

                      <div className={styles.actionDockSingle}>
                        <button
                          type="button"
                          className={styles.chronicleButton}
                          onClick={() => void runSelectedAgent()}
                          disabled={agentRunBusy}
                        >
                          {agentRunBusy ? 'Running...' : 'Use Agent'}
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setAgentTask(agentExample)}
                          disabled={agentRunBusy}
                        >
                          Use Example
                        </button>
                      </div>

                      {agentOutput && (
                        <article className={styles.agentOutput}>
                          <p className={styles.messageLabel}>Agent Output</p>
                          <p className={styles.messageText}>{agentOutput}</p>
                        </article>
                      )}
                    </section>
                  )}

                  {builderStep === 'publish' && (
                    <section className={styles.wizardPane} aria-label="Publish agent">
                      <div className={styles.publishGrid}>
                        <article className={styles.publishCard}>
                          <span>Wallet</span>
                          <h3>Connect Wallet</h3>
                          <p>Switches to Ritual and lets the user sign actions from their own wallet.</p>
                          <button type="button" className={styles.secondaryButton} onClick={() => void connectWallet()} disabled={agentBusy || chronicleBusy || agentRunBusy}>
                            {walletAddress ? 'Wallet Connected' : 'Connect Wallet'}
                          </button>
                        </article>
                        <article className={styles.publishCard}>
                          <span>Registry</span>
                          <h3>Register Build</h3>
                          <p>Writes the configured agent manifest URI and hash to SiggyAgentRegistry.</p>
                          <button type="button" className={styles.secondaryButton} onClick={() => void registerSelectedAgent()} disabled={sending || agentBusy || chronicleBusy || agentRunBusy}>
                            {agentBusy ? 'Registering...' : 'Register Build'}
                          </button>
                        </article>
                        <article className={styles.publishCard}>
                          <span>Run History</span>
                          <h3>Save Run</h3>
                          <p>Saves the latest output and records its hash on-chain if the build is registered.</p>
                          <button type="button" className={styles.secondaryButton} onClick={() => void saveAgentRun()} disabled={agentRunBusy || !agentOutput}>
                            Save Run
                          </button>
                        </article>
                        <article className={styles.publishCard}>
                          <span>NFT</span>
                          <h3>Mint Chapter</h3>
                          <p>Mints this moment as a Siggy Chronicle chapter with live metadata.</p>
                          <button type="button" className={styles.chronicleButton} onClick={() => void mintChronicle()} disabled={sending || chronicleBusy || agentRunBusy}>
                            {chronicleBusy ? 'Minting...' : 'Mint Chapter'}
                          </button>
                        </article>
                      </div>
                      {agentRunMessage && <p className={styles.chronicleOk}>{agentRunMessage}</p>}
                    </section>
                  )}

                  <div className={styles.wizardNav}>
                    <button type="button" className={styles.secondaryButton} onClick={goToPreviousStep} disabled={!canGoBack}>
                      Back
                    </button>
                    <button type="button" className={styles.chronicleButton} onClick={goToNextStep} disabled={!canGoNext}>
                      {canGoNext ? 'Next' : 'Ready'}
                    </button>
                  </div>

                  <details className={styles.manifestPreview}>
                    <summary>Inspect technical manifest</summary>
                    <pre>{agentManifestText}</pre>
                  </details>

                  {agentMessage && <p className={styles.chronicleOk}>{agentMessage}</p>}
                  {agentError && <p className={styles.chronicleError}>{agentError}</p>}
                </section>
              )}

              {productMode === 'chat' && (
              <div className={styles.stream}>
                {messages.map((message) => {
                  const isAssistant = message.role === 'assistant'

                  return (
                    <article
                      key={message.id}
                      className={`${styles.message} ${isAssistant ? styles.messageAssistant : styles.messageUser}`}
                    >
                      <p className={styles.messageLabel}>{isAssistant ? 'Siggy' : 'You'}</p>
                      <p className={styles.messageText}>{message.text}</p>
                    </article>
                  )
                })}

                {sending && (
                  <div className={styles.typing} aria-live="polite" aria-label="Assistant is typing">
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
              )}

              {productMode === 'passport' && (
              <section className={styles.chronicleBox} aria-label="Project passport minting">
                <div>
                  <p className={styles.chronicleEyebrow}>NFT Adventure</p>
                  <h3 className={styles.chronicleTitle}>Collect the chapters of Siggy Land.</h3>
                  <p className={styles.chronicleText}>
                    Mint a Siggy Chronicle when a chapter, agent run, or project moment deserves to become part of
                    the story. Collect chapters over time and build the full history on Ritual.
                  </p>
                </div>

                <div className={styles.chronicleActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void askForRecipe()}
                    disabled={sending || chronicleBusy}
                  >
                    Build Recipe
                  </button>
                  <button
                    type="button"
                    className={styles.chronicleButton}
                    onClick={() => void mintChronicle()}
                    disabled={sending || chronicleBusy}
                  >
                    {chronicleBusy ? 'Forging...' : 'Mint Chapter'}
                  </button>
                </div>

                {chronicleMessage && <p className={styles.chronicleOk}>{chronicleMessage}</p>}
                {chronicleError && <p className={styles.chronicleError}>{chronicleError}</p>}
              </section>
              )}

              {productMode === 'chat' && (
              <form className={styles.composer} onSubmit={handleSubmit}>
                <label className={styles.composerLabel} htmlFor={inputId}>
                  What do you want to understand or build in Ritual?
                </label>

                <textarea
                  id={inputId}
                  className={styles.composerInput}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="For example: explain how Ritual helps my agent become more than a normal chatbot."
                  rows={4}
                  disabled={sending}
                />

                <div className={styles.composerFoot}>
                  <p className={styles.composerHint}>
                    Press Enter to send. Use Shift + Enter for a new line.
                  </p>

                  <button type="submit" className={styles.sendButton} disabled={sending || !draft.trim()}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
              )}

              {error && <p className={styles.error}>{error}</p>}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

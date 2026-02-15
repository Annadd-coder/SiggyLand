export type QuestDefinition = {
  code: string
  title: string
  description: string
  target: number
  rewardPoints: number
  eventType: string
}

export type QuestProgress = QuestDefinition & {
  progress: number
  completed: boolean
}

export const QUESTS: readonly QuestDefinition[] = [
  {
    code: 'home_welcome',
    title: 'Welcome Home',
    description: 'Visit the main Siggy page once.',
    target: 1,
    rewardPoints: 30,
    eventType: 'visit_home',
  },
  {
    code: 'ask_explorer',
    title: 'Ask Explorer',
    description: 'Open Ask Siggy once.',
    target: 1,
    rewardPoints: 45,
    eventType: 'visit_ask',
  },
  {
    code: 'first_prompt',
    title: 'First Prompt',
    description: 'Send your first prompt to Ask Siggy.',
    target: 1,
    rewardPoints: 60,
    eventType: 'ask_prompt',
  },
  {
    code: 'chat_starter',
    title: 'Chat Starter',
    description: 'Send 5 prompts in Ask Siggy.',
    target: 5,
    rewardPoints: 100,
    eventType: 'ask_prompt',
  },
  {
    code: 'market_scout',
    title: 'Market Scout',
    description: 'Make your first market trade.',
    target: 1,
    rewardPoints: 90,
    eventType: 'market_trade',
  },
  {
    code: 'market_builder',
    title: 'Market Builder',
    description: 'Create 1 prediction market.',
    target: 1,
    rewardPoints: 120,
    eventType: 'market_create',
  },
  {
    code: 'returning_friend',
    title: 'Returning Friend',
    description: 'Visit site sections 8 times.',
    target: 8,
    rewardPoints: 140,
    eventType: 'site_visit',
  },
  {
    code: 'profile_keeper',
    title: 'Profile Keeper',
    description: 'Update profile data once.',
    target: 1,
    rewardPoints: 50,
    eventType: 'profile_update',
  },
]

export function computeQuestProgress(eventTotals: Record<string, number>) {
  const quests: QuestProgress[] = QUESTS.map((quest) => {
    const progress = Math.max(0, Number(eventTotals[quest.eventType] || 0))
    return {
      ...quest,
      progress,
      completed: progress >= quest.target,
    }
  })

  const totalPoints = quests
    .filter((q) => q.completed)
    .reduce((sum, q) => sum + q.rewardPoints, 0)

  return {
    quests,
    totalPoints,
    completedCount: quests.filter((q) => q.completed).length,
  }
}

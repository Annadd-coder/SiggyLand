type TrackPayload = {
  type: string
  value?: number
  metadata?: Record<string, unknown>
}

export async function trackInteraction(payload: TrackPayload) {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/profile/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // best-effort analytics only
  }
}

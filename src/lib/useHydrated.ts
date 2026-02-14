import { useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

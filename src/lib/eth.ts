// Minimal MetaMask helpers
export function hasEthereum() {
  return typeof window !== 'undefined' && (window as any).ethereum
}

export async function requestAccounts(): Promise<string[]> {
  return await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
}

export async function getAccounts(): Promise<string[]> {
  return await (window as any).ethereum.request({ method: 'eth_accounts' })
}

export async function getChainId(): Promise<string> {
  return await (window as any).ethereum.request({ method: 'eth_chainId' })
}
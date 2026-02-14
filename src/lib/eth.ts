// Minimal MetaMask helpers
type EthereumRequest = {
  method: string
  params?: unknown[] | Record<string, unknown>
}

type EthereumProvider = {
  request: (args: EthereumRequest) => Promise<unknown>
}

type EthereumWindow = Window & { ethereum?: EthereumProvider }

function getEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null
  return (window as EthereumWindow).ethereum ?? null
}

async function requestEthereum<T>(method: string): Promise<T> {
  const ethereum = getEthereum()
  if (!ethereum) throw new Error('Ethereum provider is not available')
  return (await ethereum.request({ method })) as T
}

export function hasEthereum() {
  return getEthereum() !== null
}

export async function requestAccounts(): Promise<string[]> {
  return requestEthereum<string[]>('eth_requestAccounts')
}

export async function getAccounts(): Promise<string[]> {
  return requestEthereum<string[]>('eth_accounts')
}

export async function getChainId(): Promise<string> {
  return requestEthereum<string>('eth_chainId')
}

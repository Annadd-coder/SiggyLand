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

async function requestEthereumWithParams<T>(
  method: string,
  params: unknown[] | Record<string, unknown>
): Promise<T> {
  const ethereum = getEthereum()
  if (!ethereum) throw new Error('Ethereum provider is not available')
  return (await ethereum.request({ method, params })) as T
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

export const RITUAL_CHAIN_ID_HEX = '0x7bb'

export async function switchToRitualChain() {
  try {
    await requestEthereumWithParams('wallet_switchEthereumChain', [{ chainId: RITUAL_CHAIN_ID_HEX }])
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? Number((error as { code?: unknown }).code)
      : 0

    if (code !== 4902) throw error

    await requestEthereumWithParams('wallet_addEthereumChain', [
      {
        chainId: RITUAL_CHAIN_ID_HEX,
        chainName: 'Ritual',
        nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
        rpcUrls: ['https://rpc.ritualfoundation.org'],
        blockExplorerUrls: ['https://explorer.ritualfoundation.org'],
      },
    ])
  }
}

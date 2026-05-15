export type WalletConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export type WalletChain = {
  id: string
  name: string
  ecosystem: 'evm' | 'solana' | 'bitcoin' | 'other'
}

export type WalletAddress = {
  id: string
  label: string
  address: string
  ecosystem: 'evm' | 'solana' | 'bitcoin' | 'other'
  chainSummary: string
}

export type WalletAccount = {
  address: string
  provider: 'okx-agent-wallet' | 'okx-wallet' | 'walletconnect' | 'embedded'
  chainId: string
}

export type WalletAsset = {
  chainId: string
  symbol: string
  name: string
  balance: string
  fiatValue?: string
  contractAddress?: string
}

export type WalletTransferDraftInput = {
  actionType?: 'transfer' | 'withdraw'
  recipient: string
  readableAmount: string
  tokenSymbol: string
  chainId: string
}

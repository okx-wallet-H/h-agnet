import { apiRequest } from '../api/httpClient'
import type {
  WalletAccount,
  WalletAddress,
  WalletAsset,
  WalletChain,
  WalletTransferDraftInput,
} from './types'
import type { ConversationCard } from '../cards/types'

export type WalletApi = {
  getAccount: () => Promise<WalletAccount | null>
  getAddresses: () => Promise<WalletAddress[]>
  getAssets: () => Promise<WalletAsset[]>
  getChains: () => Promise<WalletChain[]>
  createTransferDraft: (
    input: WalletTransferDraftInput,
  ) => Promise<ConversationCard>
}

export const walletApi: WalletApi = {
  getAccount() {
    return apiRequest('/wallet/account')
  },
  getAddresses() {
    return apiRequest('/wallet/addresses')
  },
  getAssets() {
    return apiRequest('/wallet/assets')
  },
  getChains() {
    return apiRequest('/wallet/chains')
  },
  createTransferDraft(input) {
    return apiRequest('/wallet/actions/transfer-draft', {
      method: 'POST',
      body: input,
    })
  },
}

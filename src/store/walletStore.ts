import { create } from 'zustand'

import type {
  WalletAccount,
  WalletConnectionStatus,
} from '../services/wallet/types'

type WalletStore = {
  status: WalletConnectionStatus
  account: WalletAccount | null
  selectedChainId: string | null
  setStatus: (status: WalletConnectionStatus) => void
  setAccount: (account: WalletAccount | null) => void
  setSelectedChainId: (chainId: string | null) => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  status: 'idle',
  account: null,
  selectedChainId: null,
  setStatus: (status) => set({ status }),
  setAccount: (account) => set({ account }),
  setSelectedChainId: (selectedChainId) => set({ selectedChainId }),
}))

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import {
  createWalletTransferDraft,
  getWalletAccount,
  getWalletAddresses,
  getWalletAssets,
  getWalletChains,
} from '../../../services/wallet/walletService'
import type { WalletTransferDraftInput } from '../../../services/wallet/types'

export const walletDataKeys = {
  all: ['wallet-data'] as const,
  account: () => [...walletDataKeys.all, 'account'] as const,
  addresses: () => [...walletDataKeys.all, 'addresses'] as const,
  assets: () => [...walletDataKeys.all, 'assets'] as const,
  chains: () => [...walletDataKeys.all, 'chains'] as const,
}

export function useWalletAccount() {
  return useQuery({
    queryKey: walletDataKeys.account(),
    queryFn: getWalletAccount,
    enabled: isApiConfigured(),
    retry: false,
  })
}

export function useWalletAddresses() {
  return useQuery({
    queryKey: walletDataKeys.addresses(),
    queryFn: getWalletAddresses,
    enabled: isApiConfigured(),
    retry: false,
  })
}

export function useWalletAssets() {
  return useQuery({
    queryKey: walletDataKeys.assets(),
    queryFn: getWalletAssets,
    enabled: isApiConfigured(),
    retry: false,
  })
}

export function useWalletChains() {
  return useQuery({
    queryKey: walletDataKeys.chains(),
    queryFn: getWalletChains,
    enabled: isApiConfigured(),
    retry: false,
  })
}

export function useCreateWalletTransferDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: WalletTransferDraftInput) =>
      createWalletTransferDraft(input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ['card-library'] })
    },
  })
}

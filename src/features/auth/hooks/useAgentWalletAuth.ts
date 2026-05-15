import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getAgentWalletRemoteStatus,
  getAgentWalletSession,
  getHWalletIdentity,
  requestAgentWalletOtp,
  verifyAgentWalletOtpAndCreateWallet,
} from '../../../services/auth/agentWalletAuthService'
import type {
  RequestAgentWalletOtpInput,
  VerifyAgentWalletOtpInput,
} from '../../../services/auth/types'
import { isApiConfigured } from '../../../services/api/httpClient'
import { walletDataKeys } from '../../wallet/hooks/useWalletData'

export const agentWalletAuthKeys = {
  all: ['agent-wallet-auth'] as const,
  identity: () => [...agentWalletAuthKeys.all, 'identity'] as const,
  status: () => [...agentWalletAuthKeys.all, 'status'] as const,
  session: () => [...agentWalletAuthKeys.all, 'session'] as const,
}

export function useAgentWalletAuthStatus() {
  return useQuery({
    queryKey: agentWalletAuthKeys.status(),
    queryFn: getAgentWalletRemoteStatus,
    enabled: isApiConfigured(),
    retry: false,
  })
}

export function useAgentWalletSession() {
  return useQuery({
    queryKey: agentWalletAuthKeys.session(),
    queryFn: getAgentWalletSession,
    enabled: isApiConfigured(),
    retry: false,
  })
}

export function useHWalletIdentity() {
  return useQuery({
    queryKey: agentWalletAuthKeys.identity(),
    queryFn: getHWalletIdentity,
    enabled: isApiConfigured(),
    retry: false,
  })
}

export function useRequestAgentWalletOtp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RequestAgentWalletOtpInput) =>
      requestAgentWalletOtp(input),
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: agentWalletAuthKeys.all,
      })
    },
  })
}

export function useVerifyAgentWalletOtp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: VerifyAgentWalletOtpInput) =>
      verifyAgentWalletOtpAndCreateWallet(input),
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: agentWalletAuthKeys.all,
      })
      void queryClient.invalidateQueries({
        queryKey: walletDataKeys.all,
      })
    },
  })
}

import { apiRequest } from '../api/httpClient'
import type {
  AgentWalletAuthRemoteStatus,
  AgentWalletAuthSession,
  HWalletIdentity,
  RequestAgentWalletOtpInput,
  VerifyAgentWalletOtpInput,
} from './types'

export type AgentWalletAuthApi = {
  getStatus: () => Promise<AgentWalletAuthRemoteStatus>
  requestOtp: (
    input: RequestAgentWalletOtpInput,
  ) => Promise<AgentWalletAuthSession>
  verifyOtpAndCreateWallet: (
    input: VerifyAgentWalletOtpInput,
  ) => Promise<AgentWalletAuthSession>
  getSession: () => Promise<AgentWalletAuthSession | null>
  getIdentity: () => Promise<HWalletIdentity | null>
}

export const agentWalletAuthApi: AgentWalletAuthApi = {
  getStatus() {
    return apiRequest('/auth/agent-wallet/status')
  },
  requestOtp(input) {
    return apiRequest('/auth/agent-wallet/request-otp', {
      method: 'POST',
      body: input,
    })
  },
  verifyOtpAndCreateWallet(input) {
    return apiRequest('/auth/agent-wallet/verify', {
      method: 'POST',
      body: input,
    })
  },
  getSession() {
    return apiRequest('/auth/agent-wallet/session')
  },
  getIdentity() {
    return apiRequest('/auth/me')
  },
}

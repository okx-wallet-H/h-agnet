import { agentWalletAuthApi } from './agentWalletAuthApi'
import type {
  RequestAgentWalletOtpInput,
  VerifyAgentWalletOtpInput,
} from './types'

export function getAgentWalletAuthStatus() {
  return {
    environment: 'sandbox' as const,
    status: process.env.EXPO_PUBLIC_H_AGENT_API_URL
      ? ('ready' as const)
      : ('not-configured' as const),
    reason:
      '前端只调用 H Wallet 后端。OKX Agent Wallet 与 OnchainOS 凭证保留在服务端。',
  }
}

export function getAgentWalletRemoteStatus() {
  return agentWalletAuthApi.getStatus()
}

export async function requestAgentWalletOtp(
  input: RequestAgentWalletOtpInput,
) {
  return agentWalletAuthApi.requestOtp(input)
}

export async function verifyAgentWalletOtpAndCreateWallet(
  input: VerifyAgentWalletOtpInput,
) {
  return agentWalletAuthApi.verifyOtpAndCreateWallet(input)
}

export async function getAgentWalletSession() {
  return agentWalletAuthApi.getSession()
}

export async function getHWalletIdentity() {
  return agentWalletAuthApi.getIdentity()
}

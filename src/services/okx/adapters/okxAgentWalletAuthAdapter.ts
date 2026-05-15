import { getOkxAdapterDescriptor } from '../okxConfig'
import type { OkxAdapterDescriptor } from '../types'
import type {
  AgentWalletAuthSession,
  RequestAgentWalletOtpInput,
  VerifyAgentWalletOtpInput,
} from '../../auth/types'

export type OkxAgentWalletAuthAdapter = {
  getStatus: () => OkxAdapterDescriptor
  requestOtp: (
    input: RequestAgentWalletOtpInput,
  ) => Promise<AgentWalletAuthSession>
  verifyOtpAndCreateWallet: (
    input: VerifyAgentWalletOtpInput,
  ) => Promise<AgentWalletAuthSession>
  getWalletStatus: () => Promise<AgentWalletAuthSession | null>
}

export const okxAgentWalletAuthAdapter: OkxAgentWalletAuthAdapter = {
  getStatus: getOkxAdapterDescriptor,
  async requestOtp(input) {
    const status = getOkxAdapterDescriptor()

    if (status.status !== 'ready') {
      throw new Error('OKX Agent Wallet 认证适配器尚未配置。')
    }

    return {
      email: input.email,
      step: 'okx-otp-requested',
    }
  },
  async verifyOtpAndCreateWallet(input) {
    const status = getOkxAdapterDescriptor()

    if (status.status !== 'ready') {
      throw new Error('OKX Agent Wallet 认证适配器尚未配置。')
    }

    return {
      email: input.email,
      requestId: input.requestId,
      loginType: 'email',
      step: 'wallet-created',
    }
  },
  async getWalletStatus() {
    const status = getOkxAdapterDescriptor()

    if (status.status !== 'ready') {
      return null
    }

    return null
  },
}

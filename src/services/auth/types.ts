export type AgentWalletAuthStep =
  | 'email-entry'
  | 'okx-otp-requested'
  | 'otp-verification'
  | 'wallet-created'
  | 'authenticated'

export type AgentWalletAuthSession = {
  email: string
  step: AgentWalletAuthStep
  requestId?: string
  userId?: string
  userStatus?: string
  walletBindingId?: string
  walletBindingStatus?: string
  accountId?: string
  accountName?: string
  evmAddress?: string
  solAddress?: string
  loginType?: 'email' | 'api-key'
}

export type AgentWalletAuthRemoteStatus = {
  provider: string
  status: 'ready' | 'not-configured' | 'unavailable'
  authMode: string
  reason?: string
  identity?: HWalletIdentity | null
}

export type RequestAgentWalletOtpInput = {
  email: string
  locale?: 'zh-CN' | 'ja-JP' | 'en-US'
}

export type VerifyAgentWalletOtpInput = {
  email: string
  otpCode: string
  requestId?: string
}

export type AgentWalletStatus = {
  email: string
  loggedIn: boolean
  currentAccountId?: string
  currentAccountName?: string
  accountCount: number
}

export type HWalletIdentity = {
  user: {
    id: string
    email: string
    displayName: string
    status: string
    createdAt: string
    updatedAt: string
  }
  agentWallet: {
    id: string
    provider: 'okx-agent-wallet'
    status: string
    walletId?: string | null
    accountId?: string | null
    accountName?: string | null
    email?: string | null
    evmAddress?: string | null
    solAddress?: string | null
    loginType?: 'email' | 'api-key'
    createdAt: string
    updatedAt: string
  } | null
}

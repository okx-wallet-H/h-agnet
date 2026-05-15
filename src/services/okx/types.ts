export type OkxEnvironment = 'sandbox' | 'production'

export type OkxAdapterStatus =
  | 'adapter-shell'
  | 'not-configured'
  | 'ready'
  | 'unavailable'

export type OkxAdapterDescriptor = {
  environment: OkxEnvironment
  status: OkxAdapterStatus
  reason?: string
}

export type OkxIntegrationCapabilityStatus =
  | 'ready'
  | 'not-configured'
  | 'blocked'
  | 'unavailable'

export type OkxIntegrationCapability = {
  id: string
  label: string
  route: string | null
  status: OkxIntegrationCapabilityStatus
  reason: string
}

export type OkxIntegrationDomainStatus = 'active' | 'future-separated'

export type OkxIntegrationDomain = {
  id: 'onchain' | 'cex'
  label: string
  status: OkxIntegrationDomainStatus
  scope: string
  rule: string
}

export type OkxIntegrationEnvironmentRequirement = {
  name: string
  requiredFor: string
  expected: string
  configured: boolean
}

export type OkxAgentWalletBackendStatus = {
  provider: string
  status: OkxAdapterStatus
  authMode: string
  reason?: string
}

export type OkxProviderAdapterStatus = {
  id: string
  label: string
  domain: 'onchain'
  transport: string
  requiredEnv: string[]
  requiredFor: string
  serverOnly: boolean
  credentialBoundary: string
  credentialLabel: string
  credentialUse: string
  status: OkxAdapterStatus
  reason: string
}

export type OkxIntegrationStatus = {
  product: string
  apiPrefix: string
  secretsPolicy: {
    frontendSecretsAllowed: boolean
    summary: string
  }
  officialChannel: {
    id: string
    label: string
    credentialBoundary: string
    credentialUse: string
    userAuthorizationRule: string
  }
  agentWallet: OkxAgentWalletBackendStatus
  domains: OkxIntegrationDomain[]
  serverEnvironment: {
    required: OkxIntegrationEnvironmentRequirement[]
  }
  providerAdapters: OkxProviderAdapterStatus[]
  capabilities: OkxIntegrationCapability[]
}

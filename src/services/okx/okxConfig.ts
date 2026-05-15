import type { OkxAdapterDescriptor, OkxEnvironment } from './types'

const allowedEnvironments: OkxEnvironment[] = ['sandbox', 'production']

export function getOkxEnvironment(): OkxEnvironment {
  const value = process.env.EXPO_PUBLIC_OKX_ENV

  if (allowedEnvironments.includes(value as OkxEnvironment)) {
    return value as OkxEnvironment
  }

  return 'sandbox'
}

export function getOkxAdapterDescriptor(): OkxAdapterDescriptor {
  return {
    environment: getOkxEnvironment(),
    status: 'not-configured',
    reason:
      'OKX 适配器会在 API 与钱包边界明确后接入，当前保持未连接状态。',
  }
}

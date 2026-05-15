import { getOkxAdapterDescriptor } from '../okxConfig'
import type { OkxAdapterDescriptor } from '../types'

export type OkxWalletAdapter = {
  getStatus: () => OkxAdapterDescriptor
}

export const okxWalletAdapter: OkxWalletAdapter = {
  getStatus: getOkxAdapterDescriptor,
}

import { getOkxAdapterDescriptor } from '../okxConfig'
import type { OkxAdapterDescriptor } from '../types'

export type OkxSwapAdapter = {
  getStatus: () => OkxAdapterDescriptor
}

export const okxSwapAdapter: OkxSwapAdapter = {
  getStatus: getOkxAdapterDescriptor,
}

export const okxTradingAdapter = okxSwapAdapter

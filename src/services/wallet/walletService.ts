import { okxWalletAdapter } from '../okx/adapters/okxWalletAdapter'
import { walletApi } from './walletApi'

export function getWalletIntegrationStatus() {
  return okxWalletAdapter.getStatus()
}

export function getWalletAccount() {
  return walletApi.getAccount()
}

export function getWalletAddresses() {
  return walletApi.getAddresses()
}

export function getWalletAssets() {
  return walletApi.getAssets()
}

export function getWalletChains() {
  return walletApi.getChains()
}

export function createWalletTransferDraft(
  input: Parameters<typeof walletApi.createTransferDraft>[0],
) {
  return walletApi.createTransferDraft(input)
}

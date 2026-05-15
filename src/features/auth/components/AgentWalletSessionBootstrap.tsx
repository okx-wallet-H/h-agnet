import { useEffect } from 'react'

import { useAgentWalletSession } from '../hooks/useAgentWalletAuth'
import { useWalletStore } from '../../../store/walletStore'

export function AgentWalletSessionBootstrap() {
  const session = useAgentWalletSession()
  const setAccount = useWalletStore((state) => state.setAccount)
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId)
  const setStatus = useWalletStore((state) => state.setStatus)

  useEffect(() => {
    const data = session.data

    if (!data) {
      return
    }

    const primaryAddress = data.evmAddress ?? data.solAddress
    const chainId = data.evmAddress ? 'evm' : 'solana'

    if (!primaryAddress) {
      setStatus('idle')
      setAccount(null)
      setSelectedChainId(null)
      return
    }

    setStatus('connected')
    setSelectedChainId(chainId)
    setAccount({
      address: primaryAddress,
      chainId,
      provider: 'okx-agent-wallet',
    })
  }, [
    session.data,
    setAccount,
    setSelectedChainId,
    setStatus,
  ])

  return null
}

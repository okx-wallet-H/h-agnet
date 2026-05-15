const { getAgentWalletSession } = require('./agentWalletAuthService')

async function getWalletAccount() {
  const session = await getAgentWalletSession()
  const address = session?.evmAddress ?? session?.solAddress

  if (!address) {
    return null
  }

  return {
    address,
    provider: 'okx-agent-wallet',
    chainId: session.evmAddress ? 'evm' : 'solana',
  }
}

async function getWalletAddresses() {
  const session = await getAgentWalletSession()
  const addresses = []

  if (session?.evmAddress) {
    addresses.push({
      id: 'evm',
      label: 'EVM 地址',
      address: session.evmAddress,
      ecosystem: 'evm',
      chainSummary: '支持 X Layer、Ethereum、Polygon 等 EVM 网络',
    })
  }

  if (session?.solAddress) {
    addresses.push({
      id: 'solana',
      label: 'Solana 地址',
      address: session.solAddress,
      ecosystem: 'solana',
      chainSummary: '支持 Solana 网络',
    })
  }

  return addresses
}

async function getWalletAssets() {
  return []
}

async function getWalletChains() {
  return [
    {
      id: 'xlayer',
      name: 'X Layer',
      ecosystem: 'evm',
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      ecosystem: 'evm',
    },
    {
      id: 'solana',
      name: 'Solana',
      ecosystem: 'solana',
    },
  ]
}

module.exports = {
  getWalletAccount,
  getWalletAddresses,
  getWalletAssets,
  getWalletChains,
}

const knownTokenSymbols = [
  'USDT',
  'USDC',
  'ETH',
  'BTC',
  'SOL',
  'OKB',
  'OKT',
  'BNB',
  'ARB',
  'MATIC',
  'POL',
  'DOGE',
  'PEPE',
]

const chainHints = [
  { label: 'X Layer', keywords: ['xlayer', 'x layer', 'okx chain'] },
  { label: 'Ethereum', keywords: ['ethereum', 'erc20', '以太坊'] },
  { label: 'Base', keywords: ['base'] },
  { label: 'Arbitrum', keywords: ['arbitrum', 'arb'] },
  { label: 'BSC', keywords: ['bsc', 'bnb chain'] },
  { label: 'Polygon', keywords: ['polygon', 'matic', 'pol'] },
  { label: 'Solana', keywords: ['solana', 'sol'] },
]

function normalizeContent(input) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    const error = new Error('消息内容不能为空。')
    error.statusCode = 400
    error.code = 'bad-request'

    throw error
  }

  return input.trim().slice(0, 1200)
}

function detectWalletAction(content) {
  const normalized = content.toLowerCase()

  if (normalized.includes('提现') || normalized.includes('withdraw')) {
    return '提现'
  }

  if (normalized.includes('充值') || normalized.includes('deposit')) {
    return '充值'
  }

  if (
    normalized.includes('转账') ||
    normalized.includes('send') ||
    normalized.includes('receive')
  ) {
    return '转账'
  }

  return '钱包操作'
}

function detectChain(content) {
  const normalized = content.toLowerCase()

  return (
    chainHints.find((chain) =>
      chain.keywords.some((keyword) => normalized.includes(keyword)),
    )?.label ?? '待选择'
  )
}

function extractAddress(content) {
  return content.match(/0x[a-fA-F0-9]{40}/)?.[0]
}

function shortenAddress(address) {
  if (!address || address.length <= 14) {
    return address ?? '待补充'
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

function extractTokenSymbols(content) {
  const matchedSymbols = knownTokenSymbols.filter((symbol) =>
    new RegExp(`\\b${symbol}\\b`, 'i').test(content),
  )

  return [...new Set(matchedSymbols)]
}

function extractAmountToken(content) {
  const tokenPattern = knownTokenSymbols.join('|')
  const match = content.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(个|枚|颗)?\\s*(${tokenPattern})`, 'i'),
  )

  if (!match) {
    return {
      amount: '待补充',
      tokenSymbol: extractTokenSymbols(content)[0] ?? '待选择',
    }
  }

  return {
    amount: match[1],
    tokenSymbol: match[3].toUpperCase(),
  }
}

function detectTradeAction(content) {
  const normalized = content.toLowerCase()

  if (normalized.includes('卖') || normalized.includes('sell')) {
    return '卖出'
  }

  if (
    normalized.includes('换') ||
    normalized.includes('兑换') ||
    normalized.includes('swap')
  ) {
    return '兑换'
  }

  if (normalized.includes('买') || normalized.includes('buy')) {
    return '买入'
  }

  return '交易检查'
}

function getTradeTargetToken(content) {
  const tokens = extractTokenSymbols(content)

  if (tokens.length >= 2) {
    return tokens[1]
  }

  return tokens[0] ?? '待选择'
}

function getWalletActionTag(walletAction) {
  if (walletAction === '提现') {
    return 'withdraw'
  }

  if (walletAction === '充值') {
    return 'recharge'
  }

  return 'transfer'
}

module.exports = {
  detectChain,
  detectTradeAction,
  detectWalletAction,
  extractAddress,
  extractAmountToken,
  getTradeTargetToken,
  getWalletActionTag,
  normalizeContent,
  shortenAddress,
}

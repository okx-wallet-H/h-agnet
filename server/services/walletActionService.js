const { createCard } = require('./cardsService')

function createHttpError(statusCode, code, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code

  return error
}

function normalizeString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createHttpError(400, 'bad-request', `${fieldName} 不能为空。`)
  }

  return value.trim()
}

function shortenAddress(address) {
  if (address.length <= 14) {
    return address
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

function createTransferDraft(input) {
  const actionType = input?.actionType === 'transfer' ? 'transfer' : 'withdraw'
  const actionLabel = actionType === 'transfer' ? '转账' : '提现'
  const recipient = normalizeString(input?.recipient, '收款地址')
  const readableAmount = normalizeString(input?.readableAmount, '金额')
  const tokenSymbol = normalizeString(input?.tokenSymbol, '资产')
  const chainId = normalizeString(input?.chainId, '网络')

  return createCard({
    type: 'wallet-confirmation',
    status: 'draft',
    source: 'wallet-service',
    title: `${actionLabel}授权卡已准备好`,
    summary:
      `我已把${actionLabel}信息整理成授权卡。首次地址授权或新地址授权前，不会广播交易，也不会转出资产。`,
    metrics: [
      { label: '要做的事', value: actionLabel, tone: 'gold' },
      { label: '资产', value: tokenSymbol.toUpperCase(), tone: 'gold' },
      { label: '金额', value: readableAmount, tone: 'default' },
      { label: '网络', value: chainId, tone: 'muted' },
      { label: '收款地址', value: shortenAddress(recipient), tone: 'muted' },
      { label: '当前状态', value: '等待授权', tone: 'danger' },
      { label: '安全要求', value: '地址授权', tone: 'gold' },
    ],
    metadata: {
      recipientAddress: recipient,
    },
    tags: ['wallet', actionType, 'confirmation'],
  })
}

module.exports = {
  createTransferDraft,
}

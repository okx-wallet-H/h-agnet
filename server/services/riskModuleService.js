function evaluateTradeProposalRisk() {
  return {
    level: 'blocked',
    reasons: [
      '钱包尚未连接。',
      'OKX Swap 尚未返回 quote。',
      'OKX Swap 尚未返回 swap data。',
    ],
    requiresConfirmation: true,
    blockingReason:
      '在钱包会话、OKX Swap quote、swap data 和授权策略全部就绪前，风控评估会持续阻止执行。',
  }
}

module.exports = {
  evaluateTradeProposalRisk,
}

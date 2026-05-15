export const earningAgentPrimaryCommand =
  '启动稳健稳定币赚币 Agent，先给我启动卡，不要执行。'

export const earningAgentExampleCommand = '启动稳健稳定币赚币 Agent'

export const earningAgentPrimaryName = '稳健稳定币赚币 Agent'

export function formatOfficialStrategyName(strategyId: string) {
  const labels: Record<string, string> = {
    'official-stable-earn': earningAgentPrimaryName,
    'official-smart-rebalance': '智能调仓赚币 Agent',
  }

  return labels[strategyId] ?? strategyId
}

export function formatHSkillName(wrapperId: string) {
  const labels: Record<string, string> = {
    'H.skill.wallet.getPortfolio': '读取钱包资产',
    'H.skill.swap.quote': '获取 Swap 报价',
    'H.skill.swap.execute': '执行 OKX Swap',
    'H.skill.risk.scanTransaction': '交易风险扫描',
    'H.skill.gateway.simulate': '链上模拟',
    'H.skill.gateway.broadcast': '链上广播',
    'H.skill.gateway.trackOrder': '状态追踪',
    'H.skill.defi.deposit': 'DeFi 存入',
    'H.skill.defi.claim': '收益领取',
  }

  return labels[wrapperId] ?? wrapperId
}

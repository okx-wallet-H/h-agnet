const hSkillWrappers = [
  {
    id: 'H.skill.wallet.getPortfolio',
    domain: 'onchain',
    label: '读取 Agent Wallet 资产',
    providerSkill: 'okx-agentic-wallet',
    status: 'contract-ready',
    description: '读取当前登录 Agent Wallet 的资产和地址，输出 H Wallet 标准资产快照。',
  },
  {
    id: 'H.skill.swap.quote',
    domain: 'onchain',
    label: '获取 OKX Swap 报价',
    providerSkill: 'okx-dex-swap',
    status: 'contract-ready',
    description: '通过 OKX DEX 聚合能力获取报价和路线，输出标准 swap quote。',
  },
  {
    id: 'H.skill.swap.execute',
    domain: 'onchain',
    label: '执行 OKX Swap',
    providerSkill: 'okx-dex-swap',
    status: 'blocked-until-adapter',
    description: '真实执行必须等待授权、风控、模拟和执行回执链路完成。',
  },
  {
    id: 'H.skill.risk.scanTransaction',
    domain: 'onchain',
    label: '交易风险扫描',
    providerSkill: 'okx-security',
    status: 'contract-ready',
    description: '扫描 token、DApp、交易和签名风险，向策略返回风险门状态。',
  },
  {
    id: 'H.skill.gateway.simulate',
    domain: 'onchain',
    label: '链上模拟',
    providerSkill: 'okx-onchain-gateway',
    status: 'contract-ready',
    description: '估算 gas、模拟交易，阻止异常执行。',
  },
  {
    id: 'H.skill.gateway.broadcast',
    domain: 'onchain',
    label: '链上广播与追踪',
    providerSkill: 'okx-onchain-gateway',
    status: 'blocked-until-adapter',
    description: '广播和追踪交易状态，当前阶段只保留封装协议。',
  },
  {
    id: 'H.skill.gateway.trackOrder',
    domain: 'onchain',
    label: '交易状态追踪',
    providerSkill: 'okx-onchain-gateway',
    status: 'contract-ready',
    description: '查询广播订单或交易哈希状态，输出 H Wallet 标准执行状态。',
  },
  {
    id: 'H.skill.defi.deposit',
    domain: 'onchain',
    label: 'DeFi 存入',
    providerSkill: 'okx-defi-invest',
    status: 'blocked-until-adapter',
    description: '策略需要收益产品适配、风险门和回执后才可开放。',
  },
  {
    id: 'H.skill.defi.claim',
    domain: 'onchain',
    label: 'DeFi 收益领取',
    providerSkill: 'okx-defi-invest',
    status: 'blocked-until-adapter',
    description: '领取动作必须经过授权范围、模拟和执行回执。',
  },
]

const officialStrategySkills = [
  {
    id: 'official-stable-earn',
    version: '0.1.0',
    status: 'draft',
    name: '稳健稳定币赚币 Agent',
    summary:
      '面向低认知用户的稳健型链上赚币策略。当前阶段只开放策略协议和启动草案，不承诺真实收益。',
    riskLevel: 'low',
    supportedChains: ['X Layer', 'Ethereum', 'Base'],
    supportedAssets: ['USDT', 'USDC'],
    requiredSkillWrappers: [
      'H.skill.wallet.getPortfolio',
      'H.skill.risk.scanTransaction',
      'H.skill.gateway.simulate',
      'H.skill.defi.deposit',
      'H.skill.defi.claim',
    ],
    authorizationScope: 'strategy:stable-earn:v0',
    stopConditions: [
      '未完成 Agent Wallet 登录',
      '策略适配器未启用',
      'OKX / OnchainOS 返回风险阻止',
      '用户暂停 Agent',
    ],
    cardTemplates: {
      progress: '稳定币赚币 Agent 正在检查资产、风险和可用策略。',
      blocked: '当前只创建启动草案，不会执行真实链上操作。',
      result: '真实结果必须来自 H Skill Wrapper 的 verified result。',
    },
  },
  {
    id: 'official-smart-rebalance',
    version: '0.1.0',
    status: 'draft',
    name: '智能调仓赚币 Agent',
    summary:
      '围绕钱包组合做风险观察和小额再平衡准备。当前阶段只输出策略草案和卡片。',
    riskLevel: 'medium',
    supportedChains: ['X Layer', 'Ethereum', 'Base', 'Solana'],
    supportedAssets: ['ETH', 'BTC', 'USDT', 'USDC', 'SOL'],
    requiredSkillWrappers: [
      'H.skill.wallet.getPortfolio',
      'H.skill.swap.quote',
      'H.skill.risk.scanTransaction',
      'H.skill.gateway.simulate',
      'H.skill.swap.execute',
    ],
    authorizationScope: 'strategy:smart-rebalance:v0',
    stopConditions: [
      '未完成首笔交易授权',
      '价格滑点超出策略上限',
      '风控返回阻止',
      '用户暂停 Agent',
    ],
    cardTemplates: {
      progress: '智能调仓 Agent 正在读取资产组合并准备 OKX Swap 路线。',
      blocked: '真实 Swap 执行等待 H Skill Wrapper、风控和授权策略完成。',
      result: '调仓结果必须包含 OKX / OnchainOS 执行回执。',
    },
  },
]

const strategyRuns = []
const hSkillInvocations = []

const strategySkillRepository = {
  listOfficialStrategies() {
    return officialStrategySkills.map(clone)
  },

  listHSkillWrappers() {
    return hSkillWrappers.map(clone)
  },

  findHSkillWrapperById(wrapperId) {
    const wrapper = hSkillWrappers.find((item) => item.id === wrapperId)

    return wrapper ? clone(wrapper) : null
  },

  findStrategyById(strategyId) {
    const strategy = officialStrategySkills.find((item) => item.id === strategyId)

    return strategy ? clone(strategy) : null
  },

  insertRun(run) {
    strategyRuns.unshift(clone(run))

    return clone(run)
  },

  findRunById(runId) {
    const run = strategyRuns.find((item) => item.id === runId)

    return run ? clone(run) : null
  },

  listRuns() {
    return strategyRuns.map(clone)
  },

  insertHSkillInvocation(invocation) {
    hSkillInvocations.unshift(clone(invocation))

    return clone(invocation)
  },

  listHSkillInvocations() {
    return hSkillInvocations.map(clone)
  },
}

function clone(input) {
  return JSON.parse(JSON.stringify(input))
}

module.exports = {
  strategySkillRepository,
}

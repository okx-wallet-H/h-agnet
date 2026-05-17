import { useMemo, useState } from 'react'
import { Bot, FileClock, Route, ShieldCheck } from 'lucide-react-native'
import { router } from 'expo-router'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'
import {
  useAgentConversationMessages,
  useSendAgentConversationMessage,
} from '../../src/features/agent/hooks/useAgentConversation'
import {
  useAgentRunnerStatus,
  useHSkillRuntimeStatus,
  useOfficialStrategySkills,
  useStartOfficialStrategy,
} from '../../src/features/agent/hooks/useStrategySkills'
import {
  earningAgentExampleCommand,
  earningAgentPrimaryCommand,
  formatHSkillName,
  formatOfficialStrategyName,
} from '../../src/features/agent/model/earningAgentExperience'
import { CardReviewActions } from '../../src/features/cards/components/CardReviewActions'
import { ConversationDataCard } from '../../src/features/cards/components/ConversationDataCard'
import { useConversationCards } from '../../src/features/cards/hooks/useCardLibrary'
import { getConfirmationQueueStats } from '../../src/features/cards/model/confirmationQueue'
import { isApiConfigured } from '../../src/services/api/httpClient'
import type {
  AgentRunnerStatus,
  OkxSkillCompositionStep,
} from '../../src/services/agent/types'

export default function AgentScreen() {
  const [command, setCommand] = useState(earningAgentPrimaryCommand)
  const backendConfigured = isApiConfigured()
  const messages = useAgentConversationMessages()
  const sendMessage = useSendAgentConversationMessage()
  const runnerStatus = useAgentRunnerStatus()
  const skillRuntime = useHSkillRuntimeStatus()
  const officialStrategies = useOfficialStrategySkills()
  const startStrategy = useStartOfficialStrategy()
  const { cards } = useConversationCards()
  const queueStats = getConfirmationQueueStats(cards)
  const visibleMessages = useMemo(
    () => (messages.data ?? []).slice(-4),
    [messages.data],
  )
  const canSend =
    backendConfigured && command.trim().length > 0 && !sendMessage.isPending

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="AI Agent Wallet"
        title="赚币 Agent"
        description="用一句话启动 Agent。H Wallet 会先生成启动卡，授权前不会动用资产；只有交易进入执行通道或成功后才进入卡库。"
        statusLabel={backendConfigured ? '对话就绪' : '后端未配置'}
        statusTone={backendConfigured ? 'gold' : 'muted'}
      />

      <AgentStatusCard
        backendConfigured={backendConfigured}
        queueStats={queueStats}
        runnerStatus={runnerStatus.data}
      />

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              官方赚币策略
            </AppText>
            <AppText variant="section">选择一个 Agent</AppText>
          </View>
          <StatusPill label="官方策略" tone="purple" />
        </View>
        <AppText color="textSecondary">
          新手先用稳健策略。这里不会直接执行真实链上动作，只会生成启动卡和授权流程。
        </AppText>
        {(officialStrategies.data ?? []).map((strategy) => (
          <View key={strategy.id} style={styles.strategyItem}>
            <View style={styles.strategyHeader}>
              <View style={styles.strategyCopy}>
                <AppText variant="data">{strategy.name}</AppText>
                <AppText variant="caption" color="textMuted">
                  {strategy.summary}
                </AppText>
              </View>
              <StatusPill
                label={formatRiskLevel(strategy.riskLevel)}
                tone={strategy.riskLevel === 'low' ? 'success' : 'gold'}
              />
            </View>
            <View style={styles.strategyMetaRow}>
              <View style={styles.strategyMetaPill}>
                <AppText variant="caption" color="textMuted">
                  资产
                </AppText>
                <AppText variant="caption" color="goldBright">
                  {strategy.supportedAssets.join(' / ')}
                </AppText>
              </View>
              <View style={styles.strategyMetaPill}>
                <AppText variant="caption" color="textMuted">
                  H Skill
                </AppText>
                <AppText variant="caption" color="goldBright">
                  {strategy.okxSkillComposition?.length ??
                    strategy.requiredSkillWrappers.length}{' '}
                  步
                </AppText>
              </View>
            </View>
            {strategy.okxSkillComposition?.length ? (
              <OkxCompositionStrip
                composition={strategy.okxSkillComposition}
              />
            ) : null}
            <Button
              fullWidth
              disabled={!backendConfigured || startStrategy.isPending}
              onPress={() => startStrategy.mutate(strategy.id)}
            >
              {startStrategy.isPending ? '正在生成启动卡' : '生成启动卡'}
            </Button>
          </View>
        ))}
        {!officialStrategies.data?.length ? (
          <AppText color="textMuted">
            官方策略注册表等待后端返回。
          </AppText>
        ) : null}
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              对话指令
            </AppText>
            <AppText variant="section">像聊天一样下达目标</AppText>
          </View>
          <Bot color={theme.colors.violet} size={22} />
        </View>
        <AppText color="textSecondary">
          {`你可以说“${earningAgentExampleCommand}”、“帮我分析资产”或“把 ETH 换成 USDC”。复杂过程会变成卡片。`}
        </AppText>
        <TextInput
          editable={backendConfigured}
          multiline
          onChangeText={setCommand}
          placeholder={`例如：${earningAgentExampleCommand}`}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.promptInput}
          value={command}
        />
        <Button
          fullWidth
          disabled={!canSend}
          onPress={() =>
            sendMessage.mutate(
              { content: command.trim() },
              { onSuccess: () => setCommand('') },
            )
          }
        >
          {sendMessage.isPending ? '正在生成回应' : '发送给 H Wallet'}
        </Button>
      </TerminalCard>

      {sendMessage.data ? (
        <TerminalCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <AppText variant="caption" color="goldBright">
                AI 回应
              </AppText>
              <AppText variant="section">已生成审阅卡片</AppText>
            </View>
            <StatusPill
              label={formatIntentLabel(sendMessage.data.intent)}
              tone="gold"
            />
          </View>
          <AppText color="textSecondary">
            {sendMessage.data.assistantMessage.content}
          </AppText>
          <MetricRow
            label="识别信心"
            value={formatConfidence(sendMessage.data.confidence)}
          />
        </TerminalCard>
      ) : null}

      {sendMessage.data?.cards.map((card) => (
        <View key={card.id} style={styles.cardWithActions}>
          <ConversationDataCard card={card} />
          <CardReviewActions card={card} />
        </View>
      ))}

      {sendMessage.isError ? (
        <TerminalCard style={styles.sectionCard}>
          <AppText variant="caption" color="goldBright">
            AI 回应
          </AppText>
          <AppText variant="section">对话服务不可用</AppText>
          <AppText color="textSecondary">
            当前指令没有被后端接收。请检查 H Wallet API 地址和后端服务状态后再试。
          </AppText>
        </TerminalCard>
      ) : null}

      {visibleMessages.length > 0 ? (
        <TerminalCard style={styles.sectionCard}>
          <AppText variant="caption" color="goldBright">
            最近对话
          </AppText>
          {visibleMessages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              <AppText variant="caption" color="textMuted">
                {message.role === 'user' ? '用户' : 'H Wallet'}
              </AppText>
              <AppText color="textSecondary">{message.content}</AppText>
            </View>
          ))}
        </TerminalCard>
      ) : null}

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              授权中心反馈
            </AppText>
            <AppText variant="section">卡片队列状态</AppText>
          </View>
          <FileClock color={theme.colors.goldBright} size={22} />
        </View>
        <MetricRow
          label="队列总数"
          value={String(queueStats.totalCount)}
          valueColor={queueStats.totalCount > 0 ? 'goldBright' : 'textMuted'}
        />
        <MetricRow label="草案" value={String(queueStats.draftCount)} />
        <MetricRow label="待授权" value={String(queueStats.readyCount)} />
        <MetricRow
          label="已阻止"
          value={String(queueStats.blockedCount)}
          valueColor={queueStats.blockedCount > 0 ? 'danger' : 'textMuted'}
        />
        <Button
          variant="secondary"
          fullWidth
          onPress={() => router.push('/confirm')}
        >
          打开授权中心
        </Button>
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              高级信息
            </AppText>
            <AppText variant="section">H Skill 能力状态</AppText>
          </View>
          <StatusPill
            label={skillRuntime.data ? '已连接' : '等待'}
            tone={skillRuntime.data ? 'gold' : 'muted'}
          />
        </View>
        <MetricRow
          label="封装能力"
          value={String(skillRuntime.data?.wrapperCount ?? 0)}
          valueColor="goldBright"
        />
        <MetricRow
          label="调用记录"
          value={String(skillRuntime.data?.invocationCount ?? 0)}
          valueColor="textMuted"
        />
        <MetricRow
          label="真实执行"
          value={skillRuntime.data?.realExecutionEnabled ? '已开放' : '未开放'}
          valueColor={
            skillRuntime.data?.realExecutionEnabled ? 'success' : 'danger'
          }
        />
        <AppText color="textSecondary">
          {skillRuntime.data?.policy.reason ??
            '当前只展示封装能力状态，不要求用户理解底层 provider。'}
        </AppText>
        {(skillRuntime.data?.hSkillBindings ?? []).slice(0, 2).map((binding) => (
          <View key={binding.hSkillWrapperId} style={styles.bindingRow}>
            <View style={styles.strategyCopy}>
              <AppText variant="data">
                {formatHSkillName(binding.hSkillWrapperId)}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {binding.providerSkill} · {binding.reason}
              </AppText>
            </View>
            <StatusPill
              label={binding.status === 'ready' ? '可调用' : '等待'}
              tone={binding.status === 'ready' ? 'success' : 'muted'}
            />
          </View>
        ))}
        <AppText color="textSecondary">
          真实 Skill 调用由后端 Agent Runner 接管，前端只展示状态和卡片结果。
        </AppText>
      </TerminalCard>

      <Button fullWidth onPress={() => router.push('/agent/strategy')}>
        打开策略构建器
      </Button>
      <Button
        variant="secondary"
        fullWidth
        onPress={() => router.push('/agent/history')}
      >
        查看决策历史
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onPress={() => router.push('/cards')}
      >
        打开卡库
      </Button>
    </ScrollView>
  )
}

function AgentStatusCard({
  backendConfigured,
  queueStats,
  runnerStatus,
}: {
  backendConfigured: boolean
  queueStats: ReturnType<typeof getConfirmationQueueStats>
  runnerStatus?: AgentRunnerStatus
}) {
  const currentRun = runnerStatus?.currentRun
  const currentStep = currentRun?.steps.find(
    (step) => step.status === 'blocked' || step.status === 'waiting',
  )
  const state = runnerStatus?.state ?? 'idle'
  const statusLabel = formatRunStatus(state)
  const statusTone =
    state === 'blocked'
      ? 'gold'
      : state === 'idle'
        ? 'muted'
        : state === 'completed'
          ? 'success'
          : 'purple'

  return (
    <TerminalCard style={styles.focusCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.focusTitle}>
          <AppText variant="caption" color="goldBright">
            当前 Agent
          </AppText>
          <AppText variant="display">
            {currentRun ? 'Agent 已创建' : '还没有启动 Agent'}
          </AppText>
        </View>
        <StatusPill label={statusLabel} tone={statusTone} />
      </View>

      <AppText color="textSecondary">
        {getAgentStatusCopy({ backendConfigured, runnerStatus })}
      </AppText>

      {currentRun ? (
        <View style={styles.runnerDigest}>
          <View style={styles.digestRow}>
            <Route color={theme.colors.goldBright} size={18} />
            <View style={styles.digestCopy}>
              <AppText variant="caption" color="textMuted">
                当前策略
              </AppText>
              <AppText variant="data">
                {formatOfficialStrategyName(currentRun.strategyId)}
              </AppText>
            </View>
          </View>
          <View style={styles.digestRow}>
            <ShieldCheck color={theme.colors.goldBright} size={18} />
            <View style={styles.digestCopy}>
              <AppText variant="caption" color="textMuted">
                OKX Skill 组合
              </AppText>
              <AppText color="textSecondary">
                {formatCompositionDigest(currentRun.okxSkillComposition)}
              </AppText>
            </View>
          </View>
          <View style={styles.digestRow}>
            <ShieldCheck color={theme.colors.goldBright} size={18} />
            <View style={styles.digestCopy}>
              <AppText variant="caption" color="textMuted">
                安全检查点
              </AppText>
              <AppText color="textSecondary">
                {currentRun.blockReason ?? currentStep?.detail ?? '等待下一步。'}
              </AppText>
            </View>
          </View>
          <View style={styles.digestRow}>
            <FileClock color={theme.colors.goldBright} size={18} />
            <View style={styles.digestCopy}>
              <AppText variant="caption" color="textMuted">
                下一步
              </AppText>
              <AppText color="textSecondary">{currentRun.nextStep}</AppText>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.runnerDigest}>
          <View style={styles.digestRow}>
            <Bot color={theme.colors.goldBright} size={18} />
            <View style={styles.digestCopy}>
              <AppText variant="caption" color="textMuted">
                推荐操作
              </AppText>
              <AppText color="textSecondary">
                {`先生成一张“${earningAgentExampleCommand}”启动卡，再进入授权中心确认。`}
              </AppText>
            </View>
          </View>
        </View>
      )}

      <View style={styles.focusMetrics}>
        <View style={styles.focusMetric}>
          <AppText variant="caption" color="textMuted">
            待授权卡
          </AppText>
          <AppText variant="data">{String(queueStats.readyCount)}</AppText>
        </View>
        <View style={styles.focusMetric}>
          <AppText variant="caption" color="textMuted">
            草案
          </AppText>
          <AppText variant="data">{String(queueStats.draftCount)}</AppText>
        </View>
        <View style={styles.focusMetric}>
          <AppText variant="caption" color="textMuted">
            已暂停
          </AppText>
          <AppText variant="data">{String(queueStats.blockedCount)}</AppText>
        </View>
      </View>

      <View style={styles.focusActions}>
        <Button
          fullWidth
          variant={queueStats.readyCount > 0 ? 'primary' : 'secondary'}
          onPress={() => router.push('/confirm')}
        >
          打开授权中心
        </Button>
        <Button fullWidth variant="ghost" onPress={() => router.push('/cards')}>
          查看卡库
        </Button>
      </View>
    </TerminalCard>
  )
}

function getAgentStatusCopy({
  backendConfigured,
  runnerStatus,
}: {
  backendConfigured: boolean
  runnerStatus?: AgentRunnerStatus
}) {
  if (!backendConfigured) {
    return '后端服务还没有连接。连接后可以创建 Agent 启动卡。'
  }

  if (!runnerStatus?.currentRun) {
    return '你还没有启动赚币 Agent。先选择一个官方策略，H Wallet 会生成启动卡让你确认。'
  }

  if (runnerStatus.state === 'blocked') {
    return 'Agent 已停在安全检查点。它不会继续执行，直到对应 H Skill、OKX adapter 或回执链路准备好。'
  }

  if (runnerStatus.state === 'waiting-authorization') {
    return 'Agent 启动卡已经创建，正在等待你到授权中心确认。'
  }

  if (runnerStatus.state === 'completed') {
    return 'Agent 本轮结果已经完成，已验证的交易结果会写入卡库。'
  }

  return runnerStatus.summary
}

function formatIntentLabel(intent: string) {
  const labels: Record<string, string> = {
    'portfolio-question': '资产分析',
    'market-analysis': '行情分析',
    'strategy-request': '策略请求',
    'trade-proposal': '交易草案',
    'earning-agent': '赚币 Agent',
    'wallet-action': '钱包操作',
    'boost-action': '成长任务',
    unknown: '待识别',
  }

  return labels[intent] ?? intent
}

function formatConfidence(confidence: string) {
  const labels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  }

  return labels[confidence] ?? confidence
}

function formatRiskLevel(riskLevel: string) {
  const labels: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  }

  return labels[riskLevel] ?? riskLevel
}

function OkxCompositionStrip({
  composition,
}: {
  composition: OkxSkillCompositionStep[]
}) {
  const visibleItems = composition.slice(0, 4)
  const hiddenCount = composition.length - visibleItems.length

  return (
    <View style={styles.compositionPanel}>
      <View style={styles.compositionHeader}>
        <AppText variant="caption" color="textMuted">
          OKX Skill 组合
        </AppText>
        <AppText variant="caption" color="goldBright">
          {composition.length} 步
        </AppText>
      </View>
      <View style={styles.compositionChips}>
        {visibleItems.map((item) => (
          <View key={item.id} style={styles.compositionChip}>
            <AppText variant="caption" color="goldBright">
              {formatOkxSkillLabel(item.okxSkill)}
            </AppText>
          </View>
        ))}
        {hiddenCount > 0 ? (
          <View style={styles.compositionChipMuted}>
            <AppText variant="caption" color="textMuted">
              +{hiddenCount}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function formatCompositionDigest(composition?: OkxSkillCompositionStep[]) {
  if (!composition?.length) {
    return '等待策略组合计划。'
  }

  const okxSkillCount = new Set(composition.map((item) => item.okxSkill)).size

  return `${composition.length} 个步骤，组合 ${okxSkillCount} 个 OKX Skill。复杂过程会折叠，用户只看确认卡和结果卡。`
}

function formatOkxSkillLabel(skillId: string) {
  const labels: Record<string, string> = {
    'okx-agentic-wallet': '代理钱包',
    'okx-dex-market': '市场趋势',
    'okx-dex-signal': '链上信号',
    'okx-dex-strategy': '策略订单',
    'okx-dex-swap': '兑换',
    'okx-dex-token': '代币画像',
    'okx-defi-invest': 'DeFi',
    'okx-onchain-gateway': '链上网关',
    'okx-security': '安全扫描',
  }

  return labels[skillId] ?? skillId
}

function formatRunStatus(status: string) {
  const labels: Record<string, string> = {
    blocked: '已阻止',
    idle: '待启动',
    starting: '启动中',
    planning: '规划中',
    'waiting-authorization': '等待授权',
    executing: '执行中',
    completed: '已完成',
    paused: '已暂停',
  }

  return labels[status] ?? status
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingTop: 56,
    paddingBottom: 112,
    backgroundColor: theme.colors.background,
  },
  focusCard: {
    gap: theme.spacing.md,
  },
  focusTitle: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  runnerDigest: {
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
  },
  digestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  digestCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  focusMetrics: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  focusMetric: {
    minWidth: 0,
    flex: 1,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
  },
  focusActions: {
    gap: theme.spacing.sm,
  },
  sectionCard: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  strategyItem: {
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  strategyCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  strategyMetaRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  strategyMetaPill: {
    flex: 1,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTerminal,
    padding: theme.spacing.md,
  },
  compositionPanel: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTerminal,
    padding: theme.spacing.md,
  },
  compositionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  compositionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  compositionChip: {
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  compositionChipMuted: {
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  bindingRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
  },
  promptInput: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    padding: theme.spacing.lg,
    textAlignVertical: 'top',
  },
  messageBubble: {
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  userBubble: {
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  assistantBubble: {
    borderColor: theme.colors.borderMuted,
    backgroundColor: theme.colors.surfaceElevated,
  },
  cardWithActions: {
    gap: theme.spacing.md,
  },
})

import { useMemo, useState } from 'react'
import {
  Bot,
  BrainCircuit,
  FileClock,
  Route,
  ShieldCheck,
} from 'lucide-react-native'
import { router } from 'expo-router'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { ActionTile } from '../../src/components/terminal/ActionTile'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'
import {
  useAgentConversationMessages,
  useSendAgentConversationMessage,
} from '../../src/features/agent/hooks/useAgentConversation'
import { usePendingStrategyProposal } from '../../src/features/agent/hooks/useStrategyProposal'
import {
  useAgentRunnerStatus,
  useHSkillRuntimeStatus,
  useInvokeHSkill,
  useOfficialStrategySkills,
  useStartOfficialStrategy,
} from '../../src/features/agent/hooks/useStrategySkills'
import { CardReviewActions } from '../../src/features/cards/components/CardReviewActions'
import { ConversationDataCard } from '../../src/features/cards/components/ConversationDataCard'
import { useCardLibrary } from '../../src/features/cards/hooks/useCardLibrary'
import { getConfirmationQueueStats } from '../../src/features/cards/model/confirmationQueue'
import { isApiConfigured } from '../../src/services/api/httpClient'

const agentActions = [
  {
    title: '识别',
    caption: '理解意图',
    icon: BrainCircuit,
  },
  {
    title: '规划',
    caption: '生成策略',
    icon: Route,
  },
  {
    title: '风控',
    caption: '授权前审查',
    icon: ShieldCheck,
  },
]

export default function AgentScreen() {
  const [command, setCommand] = useState(
    '帮我分析一下我的资产风险，并生成一个需要授权的操作建议',
  )
  const backendConfigured = isApiConfigured()
  const messages = useAgentConversationMessages()
  const sendMessage = useSendAgentConversationMessage()
  const pendingStrategy = usePendingStrategyProposal()
  const runnerStatus = useAgentRunnerStatus()
  const skillRuntime = useHSkillRuntimeStatus()
  const officialStrategies = useOfficialStrategySkills()
  const startStrategy = useStartOfficialStrategy()
  const invokeSkill = useInvokeHSkill()
  const { cards } = useCardLibrary()
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
        eyebrow="AI 交易助理"
        title="对话指令台"
        description="把资产分析、交易准备、充值提现、赚币任务都交给 H Wallet。所有资产动作先生成卡片，再按授权策略推进。"
        statusLabel={backendConfigured ? '对话就绪' : '后端未配置'}
        statusTone={backendConfigured ? 'gold' : 'muted'}
      />

      <View style={styles.actionRow}>
        {agentActions.map((action) => (
          <ActionTile key={action.title} {...action} />
        ))}
      </View>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              Agent Runner
            </AppText>
            <AppText variant="section">赚币 Agent 状态机</AppText>
          </View>
          <StatusPill
            label={formatRunnerState(runnerStatus.data?.state ?? 'idle')}
            tone={runnerStatus.data?.state === 'blocked' ? 'danger' : 'gold'}
          />
        </View>
        <AppText color="textSecondary">
          {runnerStatus.data?.summary ?? '等待后端 Runner 状态。'}
        </AppText>
        <MetricRow
          label="真实执行"
          value={
            runnerStatus.data?.executionPolicy.realExecutionEnabled
              ? '已开放'
              : '未开放'
          }
          valueColor={
            runnerStatus.data?.executionPolicy.realExecutionEnabled
              ? 'success'
              : 'danger'
          }
        />
        {runnerStatus.data?.currentRun ? (
          <MetricRow
            label="当前运行"
            value={runnerStatus.data.currentRun.strategyId}
            valueColor="goldBright"
          />
        ) : null}
        {runnerStatus.data?.currentRun?.authorization ? (
          <View style={styles.authNotice}>
            <StatusPill
              label={
                runnerStatus.data.currentRun.authorization
                  .requiredUserAuthorization
                  ? '等待授权'
                  : 'Agent 已授权'
              }
              tone={
                runnerStatus.data.currentRun.authorization
                  .requiredUserAuthorization
                  ? 'gold'
                  : 'success'
              }
            />
            <AppText color="textSecondary">
              {runnerStatus.data.currentRun.authorization.policyReason}
            </AppText>
          </View>
        ) : null}
        {(runnerStatus.data?.currentRun?.steps ?? []).map((step) => (
          <View key={step.id} style={styles.runnerStep}>
            <View style={styles.strategyCopy}>
              <AppText variant="data">{step.label}</AppText>
              <AppText variant="caption" color="textMuted">
                {step.detail}
              </AppText>
            </View>
            <StatusPill
              label={formatStepStatus(step.status)}
              tone={getStepTone(step.status)}
            />
          </View>
        ))}
        {runnerStatus.data?.currentRun?.executionPlan?.length ? (
          <View style={styles.planList}>
            <AppText variant="caption" color="goldBright">
              H Skill 执行计划
            </AppText>
            {runnerStatus.data.currentRun.executionPlan.map((step) => (
              <View key={step.id} style={styles.planStep}>
                <View style={styles.strategyCopy}>
                  <AppText variant="data">{step.stage}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {step.wrapperId} · {step.providerSkill}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    {step.detail}
                  </AppText>
                </View>
                <StatusPill
                  label={formatPlanStatus(step.status)}
                  tone={getPlanTone(step.status)}
                />
              </View>
            ))}
          </View>
        ) : null}
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
          <AppText variant="caption" color="goldBright">
              H Skill Runtime
            </AppText>
            <AppText variant="section">封装能力调用协议</AppText>
          </View>
          <StatusPill
            label={skillRuntime.data ? '合约就绪' : '等待'}
            tone={skillRuntime.data ? 'gold' : 'muted'}
          />
        </View>
        <MetricRow
          label="封装能力"
          value={String(skillRuntime.data?.wrapperCount ?? 0)}
          valueColor="goldBright"
        />
        <MetricRow
          label="空跑次数"
          value={String(skillRuntime.data?.invocationCount ?? 0)}
          valueColor="textMuted"
        />
        <MetricRow
          label="真实执行"
          value={
            skillRuntime.data?.realExecutionEnabled ? '已开放' : '未开放'
          }
          valueColor={
            skillRuntime.data?.realExecutionEnabled ? 'success' : 'danger'
          }
        />
        <AppText color="textSecondary">
          {skillRuntime.data?.policy.reason ??
            '当前只验证 H Skill 调用协议，不调用真实 provider。'}
        </AppText>
        {(skillRuntime.data?.hSkillBindings ?? []).slice(0, 4).map((binding) => (
          <View key={binding.hSkillWrapperId} style={styles.bindingRow}>
            <View style={styles.strategyCopy}>
              <AppText variant="data">{binding.hSkillWrapperId}</AppText>
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
        <Button
          fullWidth
          variant="secondary"
          disabled={!backendConfigured || invokeSkill.isPending}
          onPress={() =>
            invokeSkill.mutate({
              wrapperId: 'H.skill.wallet.getPortfolio',
              input: { reason: 'agent-runtime-preview' },
            })
          }
        >
          {invokeSkill.isPending ? '正在读取' : '读取 Agent Wallet 资产'}
        </Button>
        {invokeSkill.data ? (
          <AppText color="textSecondary">
            {invokeSkill.data.invocation.result.message}
          </AppText>
        ) : null}
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              官方赚币策略
            </AppText>
            <AppText variant="section">Strategy Skill Registry</AppText>
          </View>
          <StatusPill label="官方策略" tone="purple" />
        </View>
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
            <MetricRow label="版本" value={strategy.version} />
            <MetricRow
              label="H Skill"
              value={`${strategy.requiredSkillWrappers.length} 个封装能力`}
              valueColor="goldBright"
            />
            <Button
              fullWidth
              disabled={!backendConfigured || startStrategy.isPending}
              onPress={() => startStrategy.mutate(strategy.id)}
            >
              {startStrategy.isPending ? '正在创建草案' : '启动草案'}
            </Button>
          </View>
        ))}
        {!officialStrategies.data?.length ? (
          <AppText color="textMuted">
            官方策略注册表等待后端返回。
          </AppText>
        ) : null}
      </TerminalCard>

      {startStrategy.data ? (
        <TerminalCard style={styles.sectionCard}>
          <AppText variant="caption" color="goldBright">
            Agent 启动草案
          </AppText>
          <AppText variant="section">{startStrategy.data.strategy.name}</AppText>
          <MetricRow
            label="运行状态"
            value={formatRunStatus(startStrategy.data.run.status)}
            valueColor="danger"
          />
          <MetricRow
            label="下一步"
            value={startStrategy.data.run.nextStep}
            valueColor="textMuted"
          />
        </TerminalCard>
      ) : null}

      <TerminalCard style={styles.chatCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              指令输入
            </AppText>
            <AppText variant="section">先理解，再生成卡片</AppText>
          </View>
          <Bot color={theme.colors.violet} size={22} />
        </View>
        <TextInput
          editable={backendConfigured}
          multiline
          onChangeText={setCommand}
          placeholder="告诉 H Wallet 你想分析资产、准备交易、充值提现或参与赚币任务。"
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
              策略流水线
            </AppText>
            <AppText variant="section">模块化执行路径</AppText>
          </View>
          <FileClock color={theme.colors.goldBright} size={22} />
        </View>
        <MetricRow
          label="对话 API"
          value={backendConfigured ? '已配置' : '未配置'}
          valueColor={backendConfigured ? 'goldBright' : 'textMuted'}
        />
        <MetricRow label="意图识别" value="安全占位合约" />
        <MetricRow label="策略规划" value="等待真实 AI 后端" />
        <MetricRow label="风控评估" value="边界已建立" />
        <MetricRow label="交易提案" value="首次授权" />
      </TerminalCard>

      <TerminalCard style={styles.proposalCard}>
        {pendingStrategy.data ? (
          <View style={styles.proposalHeader}>
            <StatusPill label="待审阅策略" tone="gold" />
            <AppText variant="section">{pendingStrategy.data.summary}</AppText>
            <MetricRow
              label="识别信心"
              value={formatConfidence(pendingStrategy.data.confidence)}
              valueColor="textMuted"
            />
          </View>
        ) : (
          <View style={styles.proposalHeader}>
            <StatusPill label="暂无待处理动作" tone="muted" />
            <AppText variant="caption" color="textMuted">
              AI 生成的动作会以可审阅卡片形式出现在这里。
            </AppText>
          </View>
        )}
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

function formatRunnerState(state: string) {
  return formatRunStatus(state)
}

function formatStepStatus(status: string) {
  const labels: Record<string, string> = {
    done: '完成',
    waiting: '等待',
    blocked: '阻止',
  }

  return labels[status] ?? status
}

function getStepTone(status: string) {
  if (status === 'done') {
    return 'success'
  }

  if (status === 'blocked') {
    return 'danger'
  }

  return 'muted'
}

function formatPlanStatus(status: string) {
  const labels: Record<string, string> = {
    ready: '协议就绪',
    blocked: '等待接入',
  }

  return labels[status] ?? status
}

function getPlanTone(status: string) {
  return status === 'ready' ? 'success' : 'danger'
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
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chatCard: {
    gap: theme.spacing.md,
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
  authNotice: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
  },
  runnerStep: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderMuted,
    paddingVertical: theme.spacing.sm,
  },
  planList: {
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderMuted,
    paddingTop: theme.spacing.md,
  },
  planStep: {
    minHeight: 76,
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
  proposalCard: {
    minHeight: 104,
    justifyContent: 'center',
  },
  proposalHeader: {
    gap: theme.spacing.md,
  },
  cardWithActions: {
    gap: theme.spacing.md,
  },
})

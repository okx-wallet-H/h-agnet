import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Gem,
  LockKeyhole,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  Trophy,
  UserRound,
  WalletCards,
  Zap,
  type LucideProps,
} from 'lucide-react-native'
import { useMemo, useState, type ComponentType } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import {
  useAgentConversationTurns,
  useSendAgentConversationMessage,
} from '../../src/features/agent/hooks/useAgentConversation'
import {
  useBoostGrowthSummary,
  useSideQuests,
} from '../../src/features/boost/hooks/useBoostGrowthSummary'
import { ChatCardActions } from '../../src/features/cards/components/ChatCardActions'
import { ConversationDataCard } from '../../src/features/cards/components/ConversationDataCard'
import { useCardLibrary } from '../../src/features/cards/hooks/useCardLibrary'
import { isApiConfigured } from '../../src/services/api/httpClient'
import type { SideQuest } from '../../src/services/boost/types'
import type { ConversationCard } from '../../src/services/cards/types'
import type {
  AgentConversationProcessStep,
  AgentConversationTurn,
} from '../../src/services/ai/types'

type HomeMode = 'chat' | 'community'

type GuideCard = {
  title: string
  caption: string
  prompt: string
  icon: ComponentType<LucideProps>
}

const guideCards: GuideCard[] = [
  {
    title: '帮我赚币',
    caption: '启动 Agent',
    prompt: '启动稳健赚币 Agent，先生成授权卡。',
    icon: Gem,
  },
  {
    title: '分析资产',
    caption: '说人话建议',
    prompt: '帮我分析一下我的资产风险，用简单的话告诉我该注意什么。',
    icon: Sparkles,
  },
  {
    title: '准备交易',
    caption: '一次授权',
    prompt: '帮我把 0.001 ETH 换成 USDC，先给我报价卡，不要执行。',
    icon: Zap,
  },
  {
    title: '充值提现',
    caption: '安全走卡片',
    prompt: '我想充值或提现，先帮我生成一个安全授权卡片。',
    icon: WalletCards,
  },
]

export default function HomeScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [mode, setMode] = useState<HomeMode>('chat')
  const [command, setCommand] = useState('')
  const backendConfigured = isApiConfigured()
  const turnsQuery = useAgentConversationTurns()
  const sendCommand = useSendAgentConversationMessage()
  const serverTurns = turnsQuery.data ?? []
  const pendingTurn =
    sendCommand.data &&
    !serverTurns.some((turn) => turn.id === sendCommand.data?.id)
      ? sendCommand.data
      : null
  const conversationTurns = pendingTurn
    ? [...serverTurns, pendingTurn]
    : serverTurns
  const visibleTurns = conversationTurns.slice(-8)
  const hasConversationTurns = visibleTurns.length > 0
  const canSend =
    backendConfigured && command.trim().length > 0 && !sendCommand.isPending

  function sendMessage() {
    if (!canSend) {
      return
    }

    sendCommand.mutate(
      { content: command.trim() },
      { onSuccess: () => setCommand('') },
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TopNavigation mode={mode} onModeChange={setMode} />

        {mode === 'chat' ? (
          <>
            <View style={styles.hero}>
              <View style={styles.agentMark}>
                <Bot color={appTheme.colors.goldBright} size={26} />
              </View>
              <View style={styles.heroCopy}>
                <AppText variant="display">今天想做什么？</AppText>
                <AppText color="textSecondary">
                  像聊天一样说目标。H Wallet 会把充值、提现、交易和赚币整理成卡片；首次授权或新地址授权前不会执行资产动作。
                </AppText>
              </View>
            </View>

            <TrustStrip />

            <View style={styles.guideGrid}>
              {guideCards.map((item) => (
                <GuideTile
                  key={item.title}
                  item={item}
                  onPress={() => setCommand(item.prompt)}
                />
              ))}
            </View>

            <TerminalCard style={styles.chatBox}>
              <View style={styles.chatHeader}>
                <View>
                  <AppText variant="caption" color="goldBright">
                    和 AI 说一句
                  </AppText>
                  <AppText variant="section">不用懂链上参数</AppText>
                </View>
                <StatusPill
                  label={backendConfigured ? '服务在线' : '服务未连接'}
                  tone={backendConfigured ? 'gold' : 'muted'}
                />
              </View>
              <TextInput
                editable={backendConfigured}
                multiline
                onChangeText={setCommand}
                placeholder={
                  backendConfigured
                    ? '比如：帮我把 0.001 ETH 换成 USDC'
                    : '请先配置后端 API 地址'
                }
                placeholderTextColor={appTheme.colors.textMuted}
                style={styles.commandInput}
                value={command}
              />
              <Button fullWidth disabled={!canSend} onPress={sendMessage}>
                {sendCommand.isPending ? 'H Wallet 正在整理' : '发送给 H Wallet'}
              </Button>
            </TerminalCard>

            {hasConversationTurns ? (
              <View style={styles.responseStack}>
                {visibleTurns.map((turn) => (
                  <ConversationTurnView key={turn.id} turn={turn} />
                ))}
              </View>
            ) : (
              <TerminalCard style={styles.emptyState}>
                <MessageCircle color={appTheme.colors.goldBright} size={24} />
                <View style={styles.emptyCopy}>
                  <AppText variant="section">你只管说，卡片会说清楚</AppText>
                  <AppText color="textMuted">
                    页面只展示必要结果。详细过程会折叠，成功记录会进入卡库。
                  </AppText>
                </View>
              </TerminalCard>
            )}

            {sendCommand.isError ? (
              <TerminalCard style={styles.errorCard}>
                <AppText variant="caption" color="danger">
                  AI 暂时不可用
                </AppText>
                <AppText color="textSecondary">
                  请检查后端服务或稍后再试。
                </AppText>
              </TerminalCard>
            ) : null}
          </>
        ) : (
          <CommunityView />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function ConversationTurnView({ turn }: { turn: AgentConversationTurn }) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.turnStack}>
      <ConversationPreview
        assistantText={turn.assistantMessage.content}
        userText={turn.userMessage.content}
      />
      <ThinkingDisclosure
        confidence={turn.confidence}
        intent={formatIntentLabel(turn.intent)}
        message={turn.assistantMessage.content}
        processSteps={turn.processSteps}
      />
      {turn.cards.length > 0 ? (
        <View style={styles.cardStack}>
          {turn.cards.map((card) => (
            <View key={card.id} style={styles.cardUnit}>
              <ConversationDataCard card={card} />
              {shouldShowChatCardActions(card) ? (
                <ChatCardActions card={card} />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function shouldShowChatCardActions(card: ConversationCard) {
  return card.type !== 'execution-receipt'
}

function TopNavigation({
  mode,
  onModeChange,
}: {
  mode: HomeMode
  onModeChange: (mode: HomeMode) => void
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.topNav}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/wallet')}
        style={styles.navButton}
      >
        <WalletCards color={appTheme.colors.goldBright} size={20} />
      </Pressable>

      <View style={styles.segment}>
        <SegmentButton
          active={mode === 'chat'}
          label="对话"
          onPress={() => onModeChange('chat')}
        />
        <SegmentButton
          active={mode === 'community'}
          label="社区"
          onPress={() => onModeChange('community')}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/settings')}
        style={styles.navButton}
      >
        <UserRound color={appTheme.colors.goldBright} size={20} />
      </Pressable>
    </View>
  )
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean
  label: string
  onPress: () => void
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <AppText
        variant="data"
        color={active ? (appTheme.mode === 'dark' ? 'goldBright' : 'purple') : 'textMuted'}
      >
        {label}
      </AppText>
    </Pressable>
  )
}

function TrustStrip() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const items = [
    { label: '一次授权', icon: LockKeyhole },
    { label: '密钥不进前端', icon: WalletCards },
    { label: '结果进卡库', icon: Sparkles },
  ]

  return (
    <View style={styles.trustStrip}>
      {items.map((item) => {
        const Icon = item.icon

        return (
          <View key={item.label} style={styles.trustItem}>
            <Icon color={appTheme.colors.goldBright} size={14} />
            <AppText variant="caption" color="textSecondary">
              {item.label}
            </AppText>
          </View>
        )
      })}
    </View>
  )
}

function GuideTile({
  item,
  onPress,
}: {
  item: GuideCard
  onPress: () => void
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const Icon = item.icon

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.guideTile,
        pressed && styles.guideTilePressed,
      ]}
    >
      <View style={styles.guideIcon}>
        <Icon color={appTheme.colors.goldBright} size={18} />
      </View>
      <View style={styles.guideCopy}>
        <AppText variant="data">{item.title}</AppText>
        <AppText variant="caption" color="textMuted">
          {item.caption}
        </AppText>
      </View>
    </Pressable>
  )
}

function ConversationPreview({
  assistantText,
  userText,
}: {
  assistantText: string
  userText: string
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.conversationPreview}>
      <View style={styles.userBubble}>
        <AppText style={styles.userBubbleText}>{userText}</AppText>
        <SendHorizontal color="#FFFFFF" size={15} />
      </View>
      <View style={styles.assistantRow}>
        <View style={styles.assistantAvatar}>
          <Bot color={appTheme.colors.goldBright} size={18} />
        </View>
        <View style={styles.assistantBubble}>
          <AppText color="textSecondary">{assistantText}</AppText>
        </View>
      </View>
    </View>
  )
}

function ThinkingDisclosure({
  confidence,
  intent,
  message,
  processSteps,
}: {
  confidence: string
  intent: string
  message: string
  processSteps: AgentConversationProcessStep[]
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [expanded, setExpanded] = useState(false)
  const Icon = expanded ? ChevronUp : ChevronDown

  return (
    <TerminalCard style={styles.thinkingCard}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((value) => !value)}
        style={styles.thinkingHeader}
      >
        <View>
          <AppText variant="caption" color="goldBright">
            AI 处理过程
          </AppText>
          <AppText variant="section">已为你整理好结果</AppText>
        </View>
        <Icon color={appTheme.colors.textMuted} size={20} />
      </Pressable>

      {expanded ? (
        <View style={styles.thinkingBody}>
          <AppText color="textSecondary">{message}</AppText>
          <View style={styles.processSteps}>
            {processSteps.map((step, index) => (
              <View key={step.id} style={styles.processStep}>
                <View style={styles.stepIndex}>
                  <AppText variant="caption" color="goldBright">
                    {index + 1}
                  </AppText>
                </View>
                <View style={styles.stepCopy}>
                  <View style={styles.stepHeader}>
                    <AppText variant="data">{step.title}</AppText>
                    <StatusPill
                      label={formatProcessStatus(step.status)}
                      tone={getProcessStatusTone(step.status)}
                    />
                  </View>
                  <AppText variant="caption" color="textMuted">
                    {step.detail}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.thinkingMeta}>
            <StatusPill label={intent} tone="gold" />
            <StatusPill label={`信心 ${formatConfidence(confidence)}`} tone="muted" />
          </View>
        </View>
      ) : (
        <AppText color="textMuted">
          过程已折叠。你可以直接看下面的卡片。
        </AppText>
      )}
    </TerminalCard>
  )
}

function CommunityView() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const growthQuery = useBoostGrowthSummary()
  const sideQuestQuery = useSideQuests()
  const { stats } = useCardLibrary()
  const growth = growthQuery.data
  const sideQuests = (sideQuestQuery.data ?? []).slice(0, 3)
  const communityGradient =
    appTheme.mode === 'dark'
      ? (['rgba(124, 58, 237, 0.72)', 'rgba(216, 180, 95, 0.46)'] as const)
      : (['rgba(124, 58, 237, 0.34)', 'rgba(216, 180, 95, 0.28)'] as const)

  return (
    <View style={styles.community}>
      <LinearGradient
        colors={communityGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.communityHero}
      >
        <View style={styles.communityInner}>
          <AppText variant="caption" color="goldBright">
            H Wallet 社区
          </AppText>
          <AppText variant="title">
            {growth ? growth.tier.label : '一起做任务，一起赚币'}
          </AppText>
          <AppText color="textSecondary">
            社区内容保持简单：看等级、接支线、追踪卡库进度。真实收益和奖励只认后端验证结果。
          </AppText>
        </View>
      </LinearGradient>

      <TerminalCard style={styles.communityCard}>
        <AppText variant="caption" color="goldBright">
          我的进度
        </AppText>
        <View style={styles.communityStats}>
          <CommunityStat label="成长分" value={growth ? String(growth.score) : '--'} />
          <CommunityStat label="卡库" value={String(stats.totalCards)} />
          <CommunityStat
            label="待授权"
            value={String(stats.pendingConfirmations)}
          />
        </View>
      </TerminalCard>

      <TerminalCard style={styles.communityCard}>
        <AppText variant="caption" color="goldBright">
          支线任务
        </AppText>
        {sideQuests.length > 0 ? (
          <View style={styles.communityQuestList}>
            {sideQuests.map((quest) => (
              <CommunityQuest key={quest.id} quest={quest} />
            ))}
          </View>
        ) : (
          <AppText color="textSecondary">
            生成交易卡、回执卡或分析卡后，支线进度会自动出现。
          </AppText>
        )}
        <Button fullWidth onPress={() => router.push('/cards')}>
          去卡库接支线
        </Button>
      </TerminalCard>

      <TerminalCard style={styles.communityCard}>
        <AppText variant="caption" color="goldBright">
          今日引导
        </AppText>
        <AppText variant="section">先创建 Agent 钱包，再开始任务</AppText>
        <AppText color="textSecondary">
          任务评分会根据你的卡片记录生成，页面不会展示复杂链上参数。
        </AppText>
        <Button fullWidth onPress={() => router.push('/wallet/connect')}>
          创建 Agent 钱包
        </Button>
      </TerminalCard>
    </View>
  )
}

function CommunityStat({ label, value }: { label: string; value: string }) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.communityStat}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="section">{value}</AppText>
    </View>
  )
}

function CommunityQuest({ quest }: { quest: SideQuest }) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.communityQuest}>
      <View style={styles.communityQuestIcon}>
        <Trophy
          color={
            quest.status === 'unlocked'
              ? appTheme.colors.success
              : appTheme.colors.goldBright
          }
          size={17}
        />
      </View>
      <View style={styles.communityQuestCopy}>
        <AppText variant="data">{quest.title}</AppText>
        <AppText variant="caption" color="textMuted">
          {quest.requirement.current}/{quest.requirement.target}
          {quest.requirement.unit} · {quest.rewardLabel}
        </AppText>
      </View>
      <StatusPill
        label={formatCommunityQuestStatus(quest.status)}
        tone={quest.status === 'unlocked' ? 'success' : 'gold'}
      />
    </View>
  )
}

function formatCommunityQuestStatus(status: SideQuest['status']) {
  if (status === 'unlocked') {
    return '已解锁'
  }

  if (status === 'active') {
    return '进行中'
  }

  return '未解锁'
}

function formatIntentLabel(intent: string) {
  const labels: Record<string, string> = {
    'portfolio-question': '资产分析',
    'market-analysis': '行情分析',
    'strategy-request': '策略请求',
    'trade-proposal': '交易草案',
    'earning-agent': '赚币 Agent',
    'wallet-action': '钱包操作',
    'boost-action': '赚币任务',
    unknown: '待识别',
  }

  return labels[intent] ?? intent
}

function formatConfidence(confidence: string) {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }

  return labels[confidence] ?? confidence
}

function formatProcessStatus(status: AgentConversationProcessStep['status']) {
  const labels: Record<AgentConversationProcessStep['status'], string> = {
    done: '已完成',
    waiting: '等授权',
    blocked: '已暂停',
  }

  return labels[status]
}

function getProcessStatusTone(
  status: AgentConversationProcessStep['status'],
) {
  const tones: Record<
    AgentConversationProcessStep['status'],
    'gold' | 'muted' | 'danger'
  > = {
    done: 'gold',
    waiting: 'muted',
    blocked: 'danger',
  }

  return tones[status]
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 112,
    backgroundColor: appTheme.colors.background,
  },
  topNav: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  navButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.surface,
    padding: 3,
  },
  segmentButton: {
    minWidth: 72,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
  },
  segmentButtonActive: {
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.12)'
        : 'rgba(124, 58, 237, 0.1)',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  agentMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.gold,
    borderRadius: theme.radius.xl,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.1)'
        : 'rgba(124, 58, 237, 0.08)',
  },
  heroCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  trustStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  trustItem: {
    minHeight: 34,
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.pill,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.03)'
        : 'rgba(124, 58, 237, 0.05)',
    paddingHorizontal: theme.spacing.sm,
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  guideTile: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.lg,
    backgroundColor: appTheme.colors.surface,
    padding: theme.spacing.md,
  },
  guideTilePressed: {
    opacity: 0.82,
  },
  guideIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.08)'
        : 'rgba(124, 58, 237, 0.08)',
  },
  guideCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  chatBox: {
    gap: theme.spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  commandInput: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: appTheme.colors.surfaceElevated,
    color: appTheme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    padding: theme.spacing.lg,
    textAlignVertical: 'top',
  },
  responseStack: {
    gap: theme.spacing.md,
  },
  turnStack: {
    gap: theme.spacing.md,
  },
  conversationPreview: {
    gap: theme.spacing.md,
  },
  userBubble: {
    maxWidth: '88%',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.sm,
    backgroundColor: appTheme.colors.purple,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  userBubbleText: {
    flexShrink: 1,
    color: '#FFFFFF',
  },
  assistantRow: {
    maxWidth: '96%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  assistantAvatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.surface,
  },
  assistantBubble: {
    flex: 1,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.lg,
    borderTopLeftRadius: theme.radius.sm,
    backgroundColor: appTheme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  thinkingCard: {
    gap: theme.spacing.md,
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  thinkingBody: {
    gap: theme.spacing.md,
  },
  processSteps: {
    gap: theme.spacing.sm,
  },
  processStep: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.03)'
        : 'rgba(124, 58, 237, 0.04)',
    padding: theme.spacing.md,
  },
  stepIndex: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.gold,
    borderRadius: theme.radius.pill,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.1)'
        : 'rgba(216, 180, 95, 0.16)',
  },
  stepCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  thinkingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cardStack: {
    gap: theme.spacing.md,
  },
  cardUnit: {
    gap: theme.spacing.md,
  },
  emptyState: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  emptyCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  errorCard: {
    gap: theme.spacing.sm,
    borderColor: appTheme.colors.danger,
    backgroundColor: 'rgba(255, 77, 109, 0.08)',
  },
  community: {
    gap: theme.spacing.lg,
  },
  communityHero: {
    borderRadius: theme.radius.xl,
    padding: 1,
  },
  communityInner: {
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl - 1,
    backgroundColor:
      appTheme.mode === 'dark' ? 'rgba(5, 4, 10, 0.86)' : '#FFFFFF',
    padding: theme.spacing.xl,
  },
  communityCard: {
    gap: theme.spacing.md,
  },
  communityStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  communityStat: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.03)'
        : 'rgba(124, 58, 237, 0.04)',
    padding: theme.spacing.md,
  },
  communityQuestList: {
    gap: theme.spacing.sm,
  },
  communityQuest: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.03)'
        : 'rgba(124, 58, 237, 0.04)',
    padding: theme.spacing.md,
  },
  communityQuestIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.08)'
        : 'rgba(124, 58, 237, 0.08)',
  },
  communityQuestCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  })
}

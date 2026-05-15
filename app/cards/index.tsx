import { router } from 'expo-router'
import {
  Archive,
  CheckCircle2,
  Clock3,
  LibraryBig,
  Sparkles,
  WalletCards,
} from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { earningAgentExampleCommand } from '../../src/features/agent/model/earningAgentExperience'
import { CardLibrarySummary } from '../../src/features/cards/components/CardLibrarySummary'
import { ConversationDataCard } from '../../src/features/cards/components/ConversationDataCard'
import { useCardLibrary } from '../../src/features/cards/hooks/useCardLibrary'
import type {
  CardLibraryStats,
  ConversationCard,
} from '../../src/services/cards/types'

type CardFilter = 'all' | 'confirm' | 'completed' | 'wallet' | 'insight'
type CardFilterV2 =
  | CardFilter
  | 'receipt'
  | 'task'
  | 'verified'

const previewCard: ConversationCard = {
  id: 'card-library-preview',
  type: 'system-status',
  status: 'draft',
  source: 'ai-agent',
  title: '卡库已就绪',
  summary:
    '以后每一次授权、成功、奖励和分析都会沉淀到这里，成为会员等级和任务评分的依据。',
  createdAt: new Date(0).toISOString(),
  metrics: [
    { label: '数据来源', value: 'AI 卡片', tone: 'gold' },
    { label: '成功记录', value: '需验证', tone: 'danger' },
    { label: '评分', value: '待激活', tone: 'muted' },
  ],
  tags: ['system', 'card-library'],
}

const filters: Array<{
  key: CardFilterV2
  label: string
}> = [
  { key: 'all', label: '全部' },
  { key: 'confirm', label: '待授权' },
  { key: 'receipt', label: '回执' },
  { key: 'wallet', label: '钱包' },
  { key: 'task', label: '任务' },
  { key: 'insight', label: '分析' },
  { key: 'verified', label: '已验证' },
]

export default function CardLibraryScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [filter, setFilter] = useState<CardFilterV2>('all')
  const {
    cards,
    isBackendConfigured,
    isError,
    isLoading,
    stats,
  } = useCardLibrary()
  const filteredCards = useMemo(
    () => getFilteredCards(cards, filter),
    [cards, filter],
  )
  const visibleCards = cards.length > 0 ? filteredCards : [previewCard]
  const showFilteredEmpty = cards.length > 0 && filteredCards.length === 0

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="卡库"
        title="用户成长数据"
        description="H Wallet 会把授权卡、结果卡、任务卡和分析卡收进这里，用来计算会员等级、支线任务和组合建议。"
        statusLabel="卡库 v1"
        statusTone="gold"
      />

      <CardLibrarySummary stats={stats} />

      <View style={styles.quickRow}>
        <InsightTile
          icon="confirm"
          label="待授权"
          value={String(stats.confirmations.pending)}
        />
        <InsightTile
          icon="receipt"
          label="执行回执"
          value={String(stats.receipts.total)}
        />
        <InsightTile
          icon="done"
          label="已验证"
          value={String(stats.completion.verifiedResults)}
        />
      </View>

      <TerminalCard style={styles.guidanceCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              建议
            </AppText>
            <AppText variant="section">{getGuidanceTitle(stats.totalCards)}</AppText>
          </View>
          <Sparkles color={appTheme.colors.goldBright} size={22} />
        </View>
        <AppText color="textSecondary">
          {getGuidanceCopy(stats)}
        </AppText>
      </TerminalCard>

      {!isBackendConfigured ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="goldBright">
            后端 API
          </AppText>
          <AppText variant="section">尚未配置</AppText>
          <AppText color="textSecondary">
            配置 EXPO_PUBLIC_H_AGENT_API_URL 后，卡片会同步到 H Wallet 后端。
          </AppText>
        </TerminalCard>
      ) : null}

      {isError ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="goldBright">
            同步状态
          </AppText>
          <AppText variant="section">后端暂时不可用</AppText>
          <AppText color="textSecondary">
            卡库页面仍可打开，但暂时不能读取最新卡片。
          </AppText>
        </TerminalCard>
      ) : null}

      {isLoading ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="goldBright">
            同步状态
          </AppText>
          <AppText variant="section">正在加载卡库</AppText>
        </TerminalCard>
      ) : null}

      <View style={styles.filterBar}>
        {filters.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={() => setFilter(item.key)}
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive,
            ]}
          >
            <AppText
              variant="caption"
              color={filter === item.key ? 'goldBright' : 'textMuted'}
            >
              {item.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {showFilteredEmpty ? (
        <TerminalCard style={styles.card}>
          <AppText variant="section">这个分类暂时没有卡片</AppText>
          <AppText color="textMuted">
            继续和 H Wallet 对话，新的卡片会自动进入对应分类。
          </AppText>
        </TerminalCard>
      ) : null}

      {visibleCards.map((card) => (
        <ConversationDataCard key={card.id} card={card} />
      ))}

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              数据规则
            </AppText>
            <AppText variant="section">卡库只认真实记录</AppText>
          </View>
          <LibraryBig color={appTheme.colors.violet} size={22} />
        </View>
        <AppText color="textSecondary">
          AI 可以生成草案卡，但交易成功、奖励领取和资产建议必须等待后端验证。
        </AppText>
        <View style={styles.ruleRow}>
          <StatusPill label="不造假收益" tone="gold" />
          <StatusPill label="不伪造余额" tone="purple" />
          <StatusPill label="授权前不执行" tone="success" />
        </View>
      </TerminalCard>

      <Button fullWidth onPress={() => router.back()}>
        返回
      </Button>

      <Archive color={appTheme.colors.borderMuted} size={1} />
    </ScrollView>
  )
}

function InsightTile({
  icon,
  label,
  value,
}: {
  icon: 'confirm' | 'done' | 'receipt' | 'wallet'
  label: string
  value: string
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const Icon =
    icon === 'confirm'
      ? Clock3
      : icon === 'wallet'
        ? WalletCards
        : CheckCircle2

  return (
    <TerminalCard style={styles.insightTile}>
      <Icon color={appTheme.colors.goldBright} size={19} />
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="section">{value}</AppText>
    </TerminalCard>
  )
}

function getFilteredCards(cards: ConversationCard[], filter: CardFilterV2) {
  if (filter === 'confirm') {
    return cards.filter((card) => card.status === 'requires-confirmation')
  }

  if (filter === 'completed') {
    return cards.filter((card) => card.status === 'completed')
  }

  if (filter === 'receipt') {
    return cards.filter((card) => card.type === 'execution-receipt')
  }

  if (filter === 'wallet') {
    return cards.filter(
      (card) =>
        ['wallet-confirmation', 'recharge-success', 'withdrawal-success'].includes(
          card.type,
        ) ||
        (card.type === 'execution-receipt' && card.source === 'wallet-service'),
    )
  }

  if (filter === 'task') {
    return cards.filter((card) => card.type === 'side-quest')
  }

  if (filter === 'insight') {
    return cards.filter((card) =>
      ['portfolio-insight', 'membership-score', 'side-quest'].includes(
        card.type,
      ),
    )
  }

  if (filter === 'verified') {
    return cards.filter((card) => isVerifiedResultCard(card))
  }

  return cards
}

function isVerifiedResultCard(card: ConversationCard) {
  return (
    card.status === 'completed' &&
    ['trade-success', 'recharge-success', 'withdrawal-success'].includes(
      card.type,
    )
  )
}

function getGuidanceTitle(totalCards: number) {
  if (totalCards === 0) {
    return '先生成第一张卡'
  }

  if (totalCards < 5) {
    return '继续积累卡片记录'
  }

  return '可以开始做组合建议'
}

function getGuidanceCopy(stats: CardLibraryStats) {
  if (stats.pendingConfirmations > 0) {
    return '你有卡片等待授权。授权前不会执行交易或转账，可以放心先查看内容。'
  }

  if (stats.totalCards === 0) {
    return `回到 AI 对话，输入“${earningAgentExampleCommand}”或“帮我分析资产”，卡库会开始积累数据。`
  }

  if (stats.receipts.total > 0 && stats.completion.verifiedResults === 0) {
    return '你已经有授权回执。它们会用于成长评分，但不会被当作真实链上成功。'
  }

  if (stats.totalCards < 5) {
    return '继续积累授权卡、回执卡、任务卡和分析卡，会员等级会更准确。'
  }

  return '卡库已有基础记录，后续可以基于这些数据生成更个性化的投资组合建议。'
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    container: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      gap: theme.spacing.lg,
      padding: theme.spacing.xl,
      paddingTop: 72,
      paddingBottom: 48,
      backgroundColor: appTheme.colors.background,
    },
    quickRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    insightTile: {
      minHeight: 98,
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
    },
    guidanceCard: {
      gap: theme.spacing.md,
      borderColor: appTheme.colors.border,
    },
    card: {
      gap: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    filterBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    filterButton: {
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: appTheme.colors.borderMuted,
      borderRadius: theme.radius.pill,
      backgroundColor: appTheme.colors.surface,
      paddingHorizontal: theme.spacing.md,
    },
    filterButtonActive: {
      borderColor: appTheme.colors.gold,
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(216, 180, 95, 0.1)'
          : 'rgba(124, 58, 237, 0.08)',
    },
    ruleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
  })
}

import { router } from 'expo-router'
import { CheckCircle2, Clock3, LibraryBig, Sparkles } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { CardLibrarySummary } from '../../src/features/cards/components/CardLibrarySummary'
import { ConversationDataCard } from '../../src/features/cards/components/ConversationDataCard'
import { useCardLibrary } from '../../src/features/cards/hooks/useCardLibrary'
import type {
  CardLibraryStats,
  ConversationCard,
} from '../../src/services/cards/types'

type CardFilter = 'all' | 'in-progress' | 'success'

const previewCard: ConversationCard = {
  id: 'card-library-preview',
  type: 'trade-confirmation',
  status: 'pending-execution',
  source: 'ai-agent',
  title: '交易卡库待激活',
  summary:
    '这里只收录交易中的卡片和交易成功卡。启动卡、预检卡、钱包卡和任务卡会留在 AI 对话或对应模块。',
  createdAt: new Date(0).toISOString(),
  metrics: [
    { label: '收录范围', value: '交易卡片', tone: 'gold' },
    { label: '成功记录', value: '需验证', tone: 'danger' },
    { label: '非交易卡', value: '不入库', tone: 'muted' },
  ],
  tags: ['trade', 'card-library-preview'],
}

const filters: Array<{
  key: CardFilter
  label: string
}> = [
  { key: 'all', label: '全部' },
  { key: 'in-progress', label: '交易中' },
  { key: 'success', label: '交易成功' },
]

export default function CardLibraryScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [filter, setFilter] = useState<CardFilter>('all')
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
  const inProgressCount = stats.confirmations.pendingExecution ?? 0
  const visibleCards = cards.length > 0 ? filteredCards : [previewCard]
  const showFilteredEmpty = cards.length > 0 && filteredCards.length === 0

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="卡库"
        title="交易卡库"
        description="H Wallet 只把交易中的卡片和交易成功卡收进这里。启动、预检、钱包、任务和分析卡留在对话或对应模块。"
        statusLabel="交易卡库 v1"
        statusTone="gold"
      />

      <CardLibrarySummary stats={stats} />

      <View style={styles.quickRow}>
        <InsightTile
          icon="in-progress"
          label="交易中"
          value={String(inProgressCount)}
        />
        <InsightTile
          icon="in-progress"
          label="待执行"
          value={String(stats.confirmations.pendingExecution ?? 0)}
        />
        <InsightTile
          icon="done"
          label="交易成功"
          value={String(stats.completion.verifiedResults)}
        />
      </View>

      <TerminalCard style={styles.guidanceCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              建议
            </AppText>
            <AppText variant="section">
              {getGuidanceTitle(stats.totalCards)}
            </AppText>
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
            只有交易中或交易成功的卡片会出现在这里。
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
            <AppText variant="section">卡库只认交易记录</AppText>
          </View>
          <LibraryBig color={appTheme.colors.violet} size={22} />
        </View>
        <AppText color="textSecondary">
          AI 可以生成启动、预检和授权草案，但这些不会进入卡库。交易成功必须等待
          OKX / OnchainOS 与后端回执验证。
        </AppText>
        <View style={styles.ruleRow}>
          <StatusPill label="只收交易卡" tone="gold" />
          <StatusPill label="成功需验证" tone="purple" />
          <StatusPill label="过程可追踪" tone="success" />
        </View>
      </TerminalCard>

      <Button fullWidth onPress={() => router.back()}>
        返回
      </Button>
    </ScrollView>
  )
}

function InsightTile({
  icon,
  label,
  value,
}: {
  icon: 'in-progress' | 'done'
  label: string
  value: string
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const Icon = icon === 'in-progress' ? Clock3 : CheckCircle2

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

function getFilteredCards(cards: ConversationCard[], filter: CardFilter) {
  if (filter === 'in-progress') {
    return cards.filter((card) => isTradingInProgressCard(card))
  }

  if (filter === 'success') {
    return cards.filter((card) => isVerifiedResultCard(card))
  }

  return cards
}

function isTradingInProgressCard(card: ConversationCard) {
  return (
    card.type === 'trade-confirmation' &&
    card.status === 'pending-execution'
  )
}

function isVerifiedResultCard(card: ConversationCard) {
  return card.type === 'trade-success' && card.status === 'completed'
}

function getGuidanceTitle(totalCards: number) {
  if (totalCards === 0) {
    return '等待第一张交易卡'
  }

  if (totalCards < 5) {
    return '继续积累交易记录'
  }

  return '可以进入交易复盘'
}

function getGuidanceCopy(stats: CardLibraryStats) {
  if (stats.totalCards === 0) {
    return '回到 AI 对话启动 Agent 或发起交易。只有交易进入执行通道或真实成功后，才会沉淀到卡库。'
  }

  if ((stats.confirmations.pendingExecution ?? 0) > 0) {
    return '当前有交易正在等待执行回执。没有链上成功证明前，它只会被统计为交易中。'
  }

  if (stats.completion.verifiedResults === 0) {
    return '已有交易过程卡，但还没有已验证的成功交易。卡库不会把过程卡当作收益证明。'
  }

  return '卡库已有成功交易记录，后续可以基于这些记录做复盘、支线任务和组合建议。'
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

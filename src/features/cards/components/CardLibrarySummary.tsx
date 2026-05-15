import { Crown, LibraryBig, Sparkles, TrendingUp } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { MetricRow } from '../../../components/terminal/MetricRow'
import { TerminalCard } from '../../../components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../../design-system/theme'
import type { CardLibraryStats } from '../../../services/cards/types'

type CardLibrarySummaryProps = {
  stats: CardLibraryStats
}

export function CardLibrarySummary({ stats }: CardLibrarySummaryProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const score = stats.membershipScore ?? 0
  const tier = getMembershipTier(score)

  return (
    <TerminalCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color="goldBright">
            卡库
          </AppText>
          <AppText variant="section">用户数据引擎</AppText>
        </View>
        <LibraryBig color={appTheme.colors.goldBright} size={22} />
      </View>

      <View style={styles.scorePanel}>
        <View style={styles.scoreIcon}>
          <Crown color={appTheme.colors.goldBright} size={22} />
        </View>
        <View style={styles.scoreCopy}>
          <AppText variant="caption" color="textMuted">
            会员等级
          </AppText>
          <AppText variant="title">{tier}</AppText>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${score}%` }]} />
          </View>
          <AppText variant="caption" color="textMuted">
            {stats.membershipScore === null
              ? '完成卡片后开始评分'
              : `评分 ${score}/100`}
          </AppText>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricRow label="有效卡片" value={String(stats.activeCards)} />
        <MetricRow
          label="待授权"
          value={String(stats.confirmations.pending)}
          valueColor={stats.pendingConfirmations > 0 ? 'goldBright' : 'textMuted'}
        />
        <MetricRow label="授权卡" value={String(stats.confirmations.total)} />
        <MetricRow label="执行回执" value={String(stats.receipts.total)} />
        <MetricRow
          label="未广播回执"
          value={String(stats.receipts.nonBroadcast)}
          valueColor={stats.receipts.nonBroadcast > 0 ? 'goldBright' : 'textMuted'}
        />
        <MetricRow label="钱包动作" value={String(stats.activity.walletActions)} />
        <MetricRow label="赚币任务" value={String(stats.activity.boostTasks)} />
        <MetricRow
          label="组合分析"
          value={String(stats.activity.portfolioInsights)}
        />
        <MetricRow
          label="已验证结果"
          value={String(stats.completion.verifiedResults)}
          valueColor={
            stats.completion.verifiedResults > 0 ? 'success' : 'textMuted'
          }
        />
      </View>

      <View style={styles.note}>
        <TrendingUp color={appTheme.colors.violet} size={18} />
        <AppText color="textMuted">
          会员等级先参考授权、回执、任务和分析记录；真实收益和交易成功必须等待已验证结果。
        </AppText>
      </View>

      <View style={styles.ruleLine}>
        <Sparkles color={appTheme.colors.goldBright} size={16} />
        <AppText variant="caption" color="textMuted">
          没有真实回执的交易，不会被当作成功记录。
        </AppText>
      </View>
    </TerminalCard>
  )
}

function getMembershipTier(score: number) {
  if (score >= 80) {
    return '高级会员'
  }

  if (score >= 40) {
    return '成长会员'
  }

  if (score > 0) {
    return '入门会员'
  }

  return '待激活'
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    card: {
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    scorePanel: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      borderWidth: 1,
      borderColor: appTheme.colors.borderMuted,
      borderRadius: theme.radius.lg,
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(124, 58, 237, 0.08)'
          : 'rgba(124, 58, 237, 0.05)',
      padding: theme.spacing.md,
    },
    scoreIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: appTheme.colors.gold,
      borderRadius: theme.radius.md,
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(216, 180, 95, 0.1)'
          : 'rgba(216, 180, 95, 0.16)',
    },
    scoreCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    progressTrack: {
      height: 7,
      overflow: 'hidden',
      borderRadius: theme.radius.pill,
      backgroundColor: appTheme.colors.borderMuted,
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.radius.pill,
      backgroundColor: appTheme.colors.goldBright,
    },
    metricGrid: {
      gap: theme.spacing.sm,
    },
    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    ruleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderMuted,
      paddingTop: theme.spacing.md,
    },
  })
}

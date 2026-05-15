import { LinearGradient } from 'expo-linear-gradient'
import { Archive, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { StatusPill } from '../../../components/primitives/StatusPill'
import { theme, useAppTheme, type AppTheme } from '../../../design-system/theme'
import type {
  CardMetric,
  ConversationCard,
  ConversationCardStatus,
} from '../../../services/cards/types'

type ConversationDataCardProps = {
  card: ConversationCard
}

const statusTone: Record<
  ConversationCardStatus,
  'gold' | 'purple' | 'success' | 'muted' | 'danger'
> = {
  draft: 'muted',
  'agent-authorized': 'gold',
  'requires-confirmation': 'gold',
  confirmed: 'purple',
  completed: 'success',
  blocked: 'danger',
  archived: 'muted',
}

const typeLabel: Record<ConversationCard['type'], string> = {
  'wallet-confirmation': '钱包授权',
  'trade-confirmation': '交易授权',
  'trade-success': '交易成功',
  'recharge-success': '充值成功',
  'withdrawal-success': '提现成功',
  'execution-receipt': '执行回执',
  'portfolio-insight': '组合洞察',
  'membership-score': '会员评分',
  'side-quest': '支线任务',
  'system-status': '系统状态',
}

const statusLabel: Record<ConversationCardStatus, string> = {
  draft: '未授权',
  'agent-authorized': 'Agent 已授权',
  'requires-confirmation': '待授权',
  confirmed: '已授权',
  completed: '已完成',
  blocked: '已阻止',
  archived: '已归档',
}

const sourceLabel: Record<ConversationCard['source'], string> = {
  'ai-agent': 'H Wallet AI',
  'okx-onchainos': 'OKX / OnchainOS',
  'wallet-service': '钱包服务',
  'trading-service': '交易编排',
  'boost-service': '赚币服务',
  'user-action': '用户操作',
}

export function ConversationDataCard({ card }: ConversationDataCardProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const cardGradient =
    appTheme.mode === 'dark'
      ? (['rgba(124, 58, 237, 0.42)', 'rgba(216, 180, 95, 0.24)'] as const)
      : (['rgba(124, 58, 237, 0.26)', 'rgba(216, 180, 95, 0.28)'] as const)
  const metricColor: Record<NonNullable<CardMetric['tone']>, string> = {
    default: appTheme.colors.textPrimary,
    gold: appTheme.colors.goldBright,
    success: appTheme.colors.success,
    danger: appTheme.colors.danger,
    muted: appTheme.colors.textMuted,
  }
  const Icon =
    card.status === 'completed'
      ? CheckCircle2
      : card.status === 'blocked'
        ? LockKeyhole
        : card.status === 'archived'
          ? Archive
          : Sparkles

  return (
    <LinearGradient
      colors={cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <AppText variant="caption" color="goldBright">
              {typeLabel[card.type]}
            </AppText>
            <AppText variant="section">{card.title}</AppText>
            <AppText variant="caption" color="textMuted">
              {formatCardTime(card.createdAt)} · #{card.id.slice(-6)}
            </AppText>
          </View>
          <View style={styles.iconBox}>
            <Icon color={appTheme.colors.goldBright} size={20} />
          </View>
        </View>

        <AppText color="textSecondary">{card.summary}</AppText>

        <View style={styles.gate}>
          <View style={styles.gateSignal} />
          <View style={styles.gateCopy}>
            <AppText variant="caption" color="goldBright">
              安全授权
            </AppText>
            <AppText color="textSecondary">
              {getGateDescription(card.status)}
            </AppText>
          </View>
        </View>

        <View style={styles.metrics}>
          {card.metrics.map((metric) => (
            <View key={`${card.id}-${metric.label}`} style={styles.metric}>
              <AppText variant="caption" color="textMuted">
                {metric.label}
              </AppText>
              <AppText
                variant="data"
                style={{ color: metricColor[metric.tone ?? 'default'] }}
              >
                {metric.value}
              </AppText>
            </View>
          ))}
        </View>

        {card.tags.length > 0 ? (
          <View style={styles.tags}>
            {card.tags.slice(0, 4).map((tag) => (
              <View key={`${card.id}-${tag}`} style={styles.tag}>
                <AppText variant="caption" color="textMuted">
                  {formatTag(tag)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <StatusPill
            label={statusLabel[card.status]}
            tone={statusTone[card.status]}
          />
          <AppText variant="caption" color="textMuted">
            {sourceLabel[card.source]}
          </AppText>
        </View>
      </View>
    </LinearGradient>
  )
}

function getGateDescription(status: ConversationCardStatus) {
  if (status === 'agent-authorized') {
    return '已获得一次授权，Agent 可进入自主执行通道；若后端风控要求授权，会重新提示。'
  }

  if (status === 'confirmed') {
    return '授权已收到。当前版本不会广播交易，等待后端执行层接入。'
  }

  if (status === 'requires-confirmation') {
    return '卡片已准备好。你授权前，H Wallet 不会执行交易或转账。'
  }

  if (status === 'completed') {
    return '结果已收录进卡库，会用于任务、等级和组合建议。'
  }

  if (status === 'blocked') {
    return '信息不完整或存在风险，这次先不继续。'
  }

  if (status === 'archived') {
    return '卡片已放入历史，不再进入授权流程。'
  }

  return '当前只是整理结果，不会自动执行任何动作。'
}

function formatCardTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '时间待同步'
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTag(tag: string) {
  const labels: Record<string, string> = {
    conversation: '对话',
    trading: '交易',
    confirmation: '授权',
    wallet: '钱包',
    'agent-wallet': 'Agent 钱包',
    boost: '赚币',
    quest: '任务',
    transfer: '转账',
    withdraw: '提现',
    recharge: '充值',
    portfolio: '组合',
    insight: '洞察',
    system: '系统',
    'card-library': '卡库',
    receipt: '回执',
    execution: '执行',
    'not-broadcast': '未广播',
  }

  return labels[tag] ?? tag
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
  shell: {
    borderRadius: theme.radius.xl,
    padding: 1,
  },
  card: {
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl - 1,
    backgroundColor:
      appTheme.mode === 'dark' ? 'rgba(11, 10, 18, 0.92)' : '#FFFFFF',
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  iconBox: {
    width: 38,
    height: 38,
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
  gate: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(124, 58, 237, 0.08)'
        : 'rgba(124, 58, 237, 0.06)',
    padding: theme.spacing.md,
  },
  gateSignal: {
    width: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.goldBright,
  },
  gateCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  metrics: {
    gap: theme.spacing.sm,
  },
  metric: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.borderMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.pill,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.03)'
        : 'rgba(124, 58, 237, 0.05)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  })
}

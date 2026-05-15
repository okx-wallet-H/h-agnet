import { LinearGradient } from 'expo-linear-gradient'
import {
  Archive,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native'
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
  'pending-execution': 'purple',
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
  'pending-execution': '待执行',
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

        {card.type === 'trade-confirmation' ? (
          <TradeExecutionSummary
            appTheme={appTheme}
            card={card}
            styles={styles}
          />
        ) : null}

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

  if (status === 'pending-execution') {
    return 'OKX 已生成交易数据。签名、广播和真实成功回执完成前，卡片不会被当作交易成功。'
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

function TradeExecutionSummary({
  appTheme,
  card,
  styles,
}: {
  appTheme: AppTheme
  card: ConversationCard
  styles: ReturnType<typeof createStyles>
}) {
  const display = getTradeDisplay(card)
  const stateTone =
    display.stateTone === 'danger'
      ? appTheme.colors.danger
      : display.stateTone === 'success'
        ? appTheme.colors.success
        : display.stateTone === 'gold'
          ? appTheme.colors.goldBright
          : appTheme.colors.violet

  return (
    <View style={styles.tradePanel}>
      <View style={styles.tradePanelHeader}>
        <View style={styles.tradeHeaderCopy}>
          <AppText variant="caption" color="goldBright">
            AI 交易卡
          </AppText>
          <AppText variant="section">{display.stageLabel}</AppText>
        </View>
        <View style={styles.tradeHeaderIcon}>
          {card.status === 'pending-execution' ? (
            <ShieldCheck color={appTheme.colors.goldBright} size={18} />
          ) : (
            <ArrowRightLeft color={appTheme.colors.goldBright} size={18} />
          )}
        </View>
      </View>

      <View style={styles.tradeAssetRow}>
        <View style={styles.tradeAssetBox}>
          <AppText variant="caption" color="textMuted">
            卖出
          </AppText>
          <AppText
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={styles.tradeAssetValue}
            variant="data"
          >
            {display.fromValue}
          </AppText>
        </View>
        <View style={styles.tradeArrow}>
          <ArrowRight color={appTheme.colors.goldBright} size={17} />
        </View>
        <View style={styles.tradeAssetBox}>
          <AppText variant="caption" color="textMuted">
            买入
          </AppText>
          <AppText
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={styles.tradeAssetValue}
            variant="data"
          >
            {display.toValue}
          </AppText>
        </View>
      </View>

      <View style={styles.tradeMetaRow}>
        <TradeMetaPill
          label="网络"
          styles={styles}
          value={display.chainLabel}
        />
        <TradeMetaPill
          label="滑点"
          styles={styles}
          value={display.slippageLabel}
        />
        <TradeMetaPill label="来源" styles={styles} value="OKX DEX" />
      </View>

      <View style={styles.executionRail}>
        {display.steps.map((step) => (
          <View key={step.label} style={styles.executionStep}>
            <View
              style={[
                styles.executionDot,
                {
                  backgroundColor: step.active
                    ? appTheme.colors.goldBright
                    : appTheme.colors.border,
                },
              ]}
            />
            <View style={styles.executionCopy}>
              <AppText variant="caption" color="textMuted">
                {step.label}
              </AppText>
              <AppText variant="caption" style={{ color: step.color }}>
                {step.value}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.tradeStateBox}>
        <View style={[styles.tradeStateDot, { backgroundColor: stateTone }]} />
        <AppText color="textSecondary">{display.stateCopy}</AppText>
      </View>
    </View>
  )
}

function TradeMetaPill({
  label,
  styles,
  value,
}: {
  label: string
  styles: ReturnType<typeof createStyles>
  value: string
}) {
  return (
    <View style={styles.tradeMetaPill}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="caption" color="goldBright">
        {value}
      </AppText>
    </View>
  )
}

function getTradeDisplay(card: ConversationCard) {
  const pipeline = getPipelineMetadata(card)
  const intent = getPipelineIntent(pipeline)
  const amount = readString(intent, 'amount')
  const fromToken = readString(intent, 'fromToken')
  const toToken = readString(intent, 'toToken')
  const chain = readString(intent, 'chain')
  const slippagePercent = readString(intent, 'slippagePercent')
  const stage = readString(pipeline, 'stage') ?? 'card'
  const quoteReady = ['quote-ready', 'prepared'].includes(stage)
  const dataReady = stage === 'prepared' || card.status === 'pending-execution'
  const simulated = card.metrics.some(
    (metric) => metric.label === '模拟预检' && metric.value.includes('通过'),
  )

  return {
    chainLabel: chain ?? getMetricValue(card, '网络', '链上网络'),
    fromValue:
      amount && fromToken
        ? `${amount} ${fromToken}`
        : getMetricValue(card, '卖出', '待识别'),
    slippageLabel: slippagePercent ? `${slippagePercent}%` : '默认策略',
    stageLabel: getTradeStageLabel(stage, card.status),
    stateCopy: getTradeStateCopy(stage, card.status),
    stateTone: getTradeStateTone(card.status),
    steps: [
      {
        active: true,
        color: '#F4D98B',
        label: '报价',
        value: quoteReady ? '已获取' : '整理中',
      },
      {
        active:
          card.status === 'agent-authorized' ||
          card.status === 'confirmed' ||
          card.status === 'pending-execution' ||
          card.status === 'completed',
        color:
          card.status === 'draft' || card.status === 'requires-confirmation'
            ? '#736A83'
            : '#F4D98B',
        label: '授权',
        value:
          card.status === 'draft' || card.status === 'requires-confirmation'
            ? '待确认'
            : '已匹配',
      },
      {
        active: dataReady,
        color: dataReady ? '#F4D98B' : '#736A83',
        label: '交易数据',
        value: dataReady ? '已生成' : '未生成',
      },
      {
        active: simulated,
        color: simulated ? '#18C47C' : '#736A83',
        label: '执行',
        value:
          card.status === 'completed'
            ? '已完成'
            : simulated
              ? '待广播'
              : '未执行',
      },
    ],
    toValue: getMetricValue(card, '买入', toToken ?? '目标资产'),
  }
}

function getPipelineMetadata(card: ConversationCard) {
  const pipeline = card.metadata?.pipeline

  return isRecord(pipeline) ? pipeline : null
}

function getPipelineIntent(pipeline: Record<string, unknown> | null) {
  const intent = pipeline?.intent

  return isRecord(intent) ? intent : null
}

function getMetricValue(
  card: ConversationCard,
  label: string,
  fallback: string,
) {
  return card.metrics.find((metric) => metric.label === label)?.value ?? fallback
}

function readString(
  source: Record<string, unknown> | null,
  key: string,
): string | undefined {
  const value = source?.[key]

  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getTradeStageLabel(stage: string, status: ConversationCardStatus) {
  if (status === 'pending-execution' || stage === 'prepared') {
    return '交易数据已准备'
  }

  if (status === 'blocked') {
    return '交易已暂停'
  }

  if (stage === 'quote-ready') {
    return 'OKX 报价已就绪'
  }

  if (stage === 'swap-data') {
    return '正在生成交易数据'
  }

  if (stage === 'simulate') {
    return '正在做模拟预检'
  }

  return '交易意图已整理'
}

function getTradeStateCopy(stage: string, status: ConversationCardStatus) {
  if (status === 'pending-execution' || stage === 'prepared') {
    return '已拿到 OKX 交易数据，但还没有签名和广播。真实成功必须等待链上回执。'
  }

  if (status === 'blocked') {
    return '这次流程已暂停。用户不需要理解底层参数，只需要重新说清目标即可。'
  }

  if (status === 'draft' || status === 'requires-confirmation') {
    return '当前只是报价和授权准备，没有生成可签名交易，也不会扣钱。'
  }

  if (status === 'completed') {
    return '结果已验证并进入卡库，后续会用于任务、会员等级和组合建议。'
  }

  return 'Agent 会在授权范围内继续推进，所有关键结果都会写入卡库。'
}

function getTradeStateTone(status: ConversationCardStatus) {
  if (status === 'blocked') {
    return 'danger'
  }

  if (status === 'completed') {
    return 'success'
  }

  if (status === 'draft' || status === 'requires-confirmation') {
    return 'gold'
  }

  return 'purple'
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
  tradePanel: {
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(124, 58, 237, 0.08)'
        : 'rgba(124, 58, 237, 0.045)',
    padding: theme.spacing.md,
  },
  tradePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  tradeHeaderCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  tradeHeaderIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.07)'
        : 'rgba(216, 180, 95, 0.14)',
  },
  tradeAssetRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
  },
  tradeAssetBox: {
    minWidth: 0,
    flex: 1,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(5, 4, 10, 0.36)'
        : 'rgba(255, 255, 255, 0.72)',
    padding: theme.spacing.md,
  },
  tradeAssetValue: {
    lineHeight: 24,
  },
  tradeArrow: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tradeMetaPill: {
    minWidth: 82,
    flex: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.025)'
        : 'rgba(255, 255, 255, 0.58)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  executionRail: {
    gap: theme.spacing.sm,
  },
  executionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  executionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  executionCopy: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  tradeStateBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.borderMuted,
    paddingTop: theme.spacing.md,
  },
  tradeStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
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

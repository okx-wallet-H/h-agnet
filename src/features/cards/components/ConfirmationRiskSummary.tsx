import { AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { StatusPill } from '../../../components/primitives/StatusPill'
import { TerminalCard } from '../../../components/terminal/TerminalCard'
import { theme } from '../../../design-system/theme'
import type { ConversationCard } from '../../../services/cards/types'

type ConfirmationRiskSummaryProps = {
  card: ConversationCard
}

type RiskTone = 'success' | 'gold' | 'danger' | 'muted'

export function ConfirmationRiskSummary({ card }: ConfirmationRiskSummaryProps) {
  const styles = useMemo(() => createStyles(), [])
  const summary = getRiskSummary(card)
  const Icon =
    summary.tone === 'danger'
      ? ShieldX
      : summary.tone === 'success'
        ? ShieldCheck
        : AlertTriangle

  return (
    <TerminalCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color="goldBright">
            风险摘要
          </AppText>
          <AppText variant="section">{summary.title}</AppText>
        </View>
        <Icon color={summary.iconColor} size={22} />
      </View>

      <StatusPill label={summary.label} tone={summary.tone} />

      <View style={styles.reasons}>
        {summary.reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <View style={[styles.reasonDot, { backgroundColor: summary.iconColor }]} />
            <AppText color="textSecondary">{reason}</AppText>
          </View>
        ))}
      </View>
    </TerminalCard>
  )
}

function getRiskSummary(card: ConversationCard) {
  const actionLabel = getActionLabel(card)

  if (card.status === 'blocked') {
    return {
      title: '这张卡暂时不能继续',
      label: '已阻止',
      tone: 'danger' as RiskTone,
      iconColor: '#FF4D6D',
      reasons: [
        '当前信息不完整或存在风险。',
        '你可以取消这张卡，重新让 H Wallet 生成。',
        '不会执行任何资产动作。',
      ],
    }
  }

  if (card.status === 'confirmed') {
    return {
      title: '你已授权，等待后端能力',
      label: '已授权',
      tone: 'gold' as RiskTone,
      iconColor: '#F4D98B',
      reasons: [
        '授权记录已保存，等待进入执行通道。',
        '真实 Swap 仍然需要 OKX quote、swap data 和风控。',
        '当前版本不会广播交易。',
      ],
    }
  }

  if (card.status === 'pending-execution') {
    return {
      title: '交易数据已准备',
      label: '待执行',
      tone: 'gold' as RiskTone,
      iconColor: '#F4D98B',
      reasons: [
        'OKX 已返回交易数据。',
        '当前仍未完成签名、广播和链上回执。',
        '卡库会记录过程，但不会把它当作真实成功。',
      ],
    }
  }

  if (card.status === 'agent-authorized') {
    return {
      title: '已匹配授权范围',
      label: 'Agent 已授权',
      tone: 'gold' as RiskTone,
      iconColor: '#F4D98B',
      reasons: [
        '用户已完成一次授权。',
        '同类交易或同一提现地址可进入 Agent 自主执行通道。',
        'OKX / OnchainOS 风控或 Swap 状态仍可暂停并要求再次授权。',
      ],
    }
  }

  if (card.status === 'completed') {
    return {
      title: '结果已验证',
      label: '已完成',
      tone: 'success' as RiskTone,
      iconColor: '#18C47C',
      reasons: [
        card.type === 'trade-success'
          ? '交易成功结果已进入卡库。'
          : '结果已保存到对应模块。',
        '交易成功卡可用于会员评分和支线任务统计。',
        '后续建议只会引用已验证的交易数据。',
      ],
    }
  }

  if (isOfficialStrategyCard(card)) {
    return {
      title: '启动 Agent 前请授权',
      label: card.status === 'requires-confirmation' ? '待授权' : '草案',
      tone: 'gold' as RiskTone,
      iconColor: '#F4D98B',
      reasons: [
        '授权只适用于当前官方策略版本。',
        'Agent 会通过 H Skill 调用 OKX OnchainOS 能力。',
        '真实收益和成功结果必须以后端验证回执为准。',
      ],
    }
  }

  return {
    title: `${actionLabel}前请授权`,
    label: card.status === 'requires-confirmation' ? '待授权' : '草案',
    tone: 'gold' as RiskTone,
    iconColor: '#F4D98B',
    reasons: [
      '首次授权或新地址授权前不会交易、提现或转账。',
      '服务端还需要通过 OKX Swap 获取 quote、swap data 并完成风险检查。',
      '看不懂可以取消，让 H Wallet 重新整理。',
    ],
  }
}

function isOfficialStrategyCard(card: ConversationCard) {
  return card.tags.includes('official-strategy')
}

function getActionLabel(card: ConversationCard) {
  if (card.type === 'wallet-confirmation') {
    return '钱包动作'
  }

  if (card.type === 'trade-confirmation') {
    return '交易'
  }

  if (card.type === 'side-quest') {
    return '赚币任务'
  }

  if (card.type === 'portfolio-insight') {
    return '资产分析'
  }

  return '继续'
}

function createStyles() {
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
    reasons: {
      gap: theme.spacing.sm,
    },
    reasonRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    reasonDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginTop: 7,
    },
  })
}

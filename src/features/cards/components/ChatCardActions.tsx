import { router } from 'expo-router'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { Button } from '../../../components/primitives/Button'
import { StatusPill } from '../../../components/primitives/StatusPill'
import { TerminalCard } from '../../../components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../../design-system/theme'
import type { ConversationCard } from '../../../services/cards/types'
import {
  useArchiveConversationCard,
  usePrepareConversationCardForConfirmation,
} from '../hooks/useCardLibrary'
import {
  getDisplayCardSnapshot,
  isAuthorizationFlowCard,
} from '../model/confirmationQueue'

type ChatCardActionsProps = {
  card: ConversationCard
}

const statusCopy: Record<
  ConversationCard['status'],
  {
    title: string
    body: string
    status: string
    tone: 'gold' | 'purple' | 'success' | 'muted' | 'danger'
  }
> = {
  draft: {
    title: '下一步：生成授权卡',
    body: '这一步只是把内容整理清楚。首次授权或新地址授权前，不会交易、转账或扣钱。',
    status: '安全草案',
    tone: 'gold',
  },
  'agent-authorized': {
    title: 'Agent 已获授权',
    body: '你已完成一次授权。H Wallet 可在授权范围内继续推进；如果后端风控或 OKX 需要再次授权，会提示你。',
    status: '已授权',
    tone: 'gold',
  },
  'requires-confirmation': {
    title: '需要你授权后继续',
    body: '你可以先检查金额、方向和风险。完成这次授权后，同类交易或同一提现地址可进入 Agent 自主执行通道。',
    status: '待授权',
    tone: 'gold',
  },
  confirmed: {
    title: '授权已收到',
    body: '后端会等待 OKX Swap quote、swap data、风控和执行回执。前端不会保存密钥。',
    status: '已授权',
    tone: 'purple',
  },
  'pending-execution': {
    title: '交易数据已准备',
    body: 'OKX 已返回交易数据。当前仍需 Agent Wallet 签名、广播和链上回执验证，才会被收录为成功交易。',
    status: '待执行',
    tone: 'purple',
  },
  completed: {
    title: '结果已完成',
    body: '只有交易成功卡会进入交易卡库，其他完成记录会留在对话或对应模块。',
    status: '已完成',
    tone: 'success',
  },
  blocked: {
    title: '这次先不继续',
    body: '当前信息不完整或存在风险，H Wallet 已暂停后续动作。',
    status: '已暂停',
    tone: 'danger',
  },
  archived: {
    title: '已放入历史',
    body: '这张卡不会再进入授权流程，可以在对话历史里查看。',
    status: '已归档',
    tone: 'muted',
  },
}

export function ChatCardActions({ card }: ChatCardActionsProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [updatedCard, setUpdatedCard] = useState<ConversationCard | null>(null)
  const currentCard = getDisplayCardSnapshot(card, updatedCard)
  const canOpenCardLibrary = isCardLibraryEligible(currentCard)
  const prepareCard = usePrepareConversationCardForConfirmation()
  const archiveCard = useArchiveConversationCard()
  const copy = getStatusCopy(currentCard)
  const isDraft = currentCard.status === 'draft'
  const isAgentAuthorized = currentCard.status === 'agent-authorized'
  const canEnterAuthorization = isAuthorizationFlowCard(currentCard)
  const isPreparing = prepareCard.isPending
  const canArchive =
    currentCard.status !== 'archived' && currentCard.status !== 'completed'

  function handlePrimaryAction() {
    if (isDraft && canEnterAuthorization) {
      prepareCard.mutate(currentCard.id, {
        onSuccess(nextCard) {
          setUpdatedCard(nextCard)
          router.push('/confirm')
        },
      })
      return
    }

    if (!canEnterAuthorization) {
      router.push(canOpenCardLibrary ? '/cards' : '/home')
      return
    }

    if (
      isAgentAuthorized ||
      currentCard.status === 'pending-execution' ||
      currentCard.status === 'completed' ||
      currentCard.status === 'archived'
    ) {
      router.push(canOpenCardLibrary ? '/cards' : '/agent')
      return
    }

    router.push('/confirm')
  }

  function handleArchive() {
    if (!canArchive || archiveCard.isPending) {
      return
    }

    archiveCard.mutate(currentCard.id, {
      onSuccess: () =>
        setUpdatedCard({
          ...currentCard,
          status: 'archived',
        }),
    })
  }

  return (
    <TerminalCard style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          {currentCard.status === 'completed' ? (
            <CheckCircle2 color={appTheme.colors.success} size={20} />
          ) : (
            <ShieldCheck color={appTheme.colors.goldBright} size={20} />
          )}
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <AppText variant="section">{copy.title}</AppText>
            <StatusPill label={copy.status} tone={copy.tone} />
          </View>
          <AppText color="textSecondary">{copy.body}</AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          fullWidth
          disabled={isDraft && canEnterAuthorization && isPreparing}
          onPress={handlePrimaryAction}
        >
          {getPrimaryLabel(currentCard, {
            canEnterAuthorization,
            isPreparing,
          })}
        </Button>
        {canArchive ? (
          <Button
            fullWidth
            variant="ghost"
            disabled={archiveCard.isPending}
            onPress={handleArchive}
          >
            {archiveCard.isPending ? '正在处理' : '稍后再看'}
          </Button>
        ) : null}
      </View>

      {currentCard.status === 'requires-confirmation' ? (
        <View style={styles.hint}>
          <AppText variant="caption" color="textMuted">
            授权页会显示最少必要信息，不展示复杂链上参数。
          </AppText>
          <ArrowRight color={appTheme.colors.textMuted} size={14} />
        </View>
      ) : null}
    </TerminalCard>
  )
}

function getStatusCopy(card: ConversationCard) {
  if (!isAuthorizationFlowCard(card)) {
    return {
      title: '对话记录已保存',
      body: '这张卡只是记录对话和上下文，不需要授权，也不会触发钱包、交易或转账动作。',
      status: '无需授权',
      tone: 'muted' as const,
    }
  }

  if (card.tags.includes('official-strategy')) {
    if (card.status === 'draft') {
      return {
        title: '下一步：授权启动 Agent',
        body: '这张卡只启动当前官方策略版本。授权前不会动用资产，真实结果必须以后端回执为准。',
        status: '策略草案',
        tone: 'gold' as const,
      }
    }

    if (card.status === 'requires-confirmation') {
      return {
        title: '请确认是否启动',
        body: '授权后 Agent 只能在这版官方策略范围内推进；策略升级、风险阻止或异常回执都会重新提示。',
        status: '待授权',
        tone: 'gold' as const,
      }
    }
  }

  return statusCopy[card.status]
}

function getPrimaryLabel(
  card: ConversationCard,
  {
    canEnterAuthorization,
    isPreparing,
  }: {
    canEnterAuthorization: boolean
    isPreparing: boolean
  },
) {
  if (!canEnterAuthorization) {
    return isCardLibraryEligible(card) ? '查看卡库' : '继续对话'
  }

  if (card.status === 'draft') {
    if (card.tags.includes('official-strategy')) {
      return isPreparing ? '正在生成启动授权卡' : '授权启动 Agent'
    }

    return isPreparing ? '正在生成授权卡' : '生成授权卡'
  }

  if (card.status === 'completed' || card.status === 'archived') {
    return isCardLibraryEligible(card) ? '查看卡库' : '继续对话'
  }

  if (card.status === 'agent-authorized') {
    return isCardLibraryEligible(card) ? '查看卡库' : '查看 Agent'
  }

  if (card.status === 'confirmed') {
    return isCardLibraryEligible(card) ? '查看卡库' : '查看 Agent'
  }

  if (card.status === 'pending-execution') {
    return '查看执行状态'
  }

  if (card.status === 'blocked') {
    return '查看原因'
  }

  return '查看授权'
}

function isCardLibraryEligible(card: ConversationCard) {
  return (
    (card.type === 'trade-confirmation' &&
      card.status === 'pending-execution') ||
    (card.type === 'trade-success' && card.status === 'completed')
  )
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    panel: {
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    iconBox: {
      width: 40,
      height: 40,
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
    copy: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    actions: {
      gap: theme.spacing.sm,
    },
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.borderMuted,
      paddingTop: theme.spacing.md,
    },
  })
}

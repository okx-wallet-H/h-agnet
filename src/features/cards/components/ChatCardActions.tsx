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
import { getDisplayCardSnapshot } from '../model/confirmationQueue'

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
  completed: {
    title: '结果已进入卡库',
    body: '这张卡会用于任务评分、会员等级和后续组合建议。',
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
    body: '这张卡不会再进入授权流程，可以在卡库里查看。',
    status: '已归档',
    tone: 'muted',
  },
}

export function ChatCardActions({ card }: ChatCardActionsProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [updatedCard, setUpdatedCard] = useState<ConversationCard | null>(null)
  const currentCard = getDisplayCardSnapshot(card, updatedCard)
  const prepareCard = usePrepareConversationCardForConfirmation()
  const archiveCard = useArchiveConversationCard()
  const copy = statusCopy[currentCard.status]
  const isDraft = currentCard.status === 'draft'
  const isAgentAuthorized = currentCard.status === 'agent-authorized'
  const isPreparing = prepareCard.isPending
  const canArchive =
    currentCard.status !== 'archived' && currentCard.status !== 'completed'

  function handlePrimaryAction() {
    if (isDraft) {
      prepareCard.mutate(currentCard.id, {
        onSuccess(nextCard) {
          setUpdatedCard(nextCard)
          router.push('/confirm')
        },
      })
      return
    }

    if (
      isAgentAuthorized ||
      currentCard.status === 'completed' ||
      currentCard.status === 'archived'
    ) {
      router.push('/cards')
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
        <Button fullWidth disabled={isDraft && isPreparing} onPress={handlePrimaryAction}>
          {getPrimaryLabel(currentCard.status, isPreparing)}
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

function getPrimaryLabel(
  status: ConversationCard['status'],
  isPreparing: boolean,
) {
  if (status === 'draft') {
    return isPreparing ? '正在生成授权卡' : '生成授权卡'
  }

  if (status === 'completed' || status === 'archived') {
    return '查看卡库'
  }

  if (status === 'agent-authorized') {
    return '查看执行状态'
  }

  if (status === 'blocked') {
    return '查看原因'
  }

  return '查看授权'
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

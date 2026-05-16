import { router } from 'expo-router'
import { CheckCircle2, XCircle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { Button } from '../../../components/primitives/Button'
import { StatusPill } from '../../../components/primitives/StatusPill'
import { TerminalCard } from '../../../components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../../design-system/theme'
import type {
  CardConfirmationResult,
  ConversationCard,
} from '../../../services/cards/types'
import { ConversationDataCard } from './ConversationDataCard'
import {
  useArchiveConversationCard,
  useConfirmConversationCard,
  usePrepareConversationCardForConfirmation,
} from '../hooks/useCardLibrary'
import {
  getDisplayCardSnapshot,
  isAuthorizationFlowCard,
} from '../model/confirmationQueue'

type ConfirmationDecisionPanelProps = {
  card: ConversationCard
}

export function ConfirmationDecisionPanel({
  card,
}: ConfirmationDecisionPanelProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [updatedCard, setUpdatedCard] = useState<ConversationCard | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmationResult, setConfirmationResult] =
    useState<CardConfirmationResult | null>(null)
  const currentCard = getDisplayCardSnapshot(card, updatedCard)
  const prepareCard = usePrepareConversationCardForConfirmation()
  const confirmCard = useConfirmConversationCard()
  const archiveCard = useArchiveConversationCard()
  const copy = getDecisionCopy(currentCard)
  const canEnterAuthorization = isAuthorizationFlowCard(currentCard)

  function handlePrimary() {
    setErrorMessage(null)

    if (!canEnterAuthorization) {
      router.push(isCardLibraryEligible(currentCard) ? '/cards' : '/home')
      return
    }

    if (currentCard.status === 'draft') {
      prepareCard.mutate(currentCard.id, {
        onSuccess(nextCard) {
          setUpdatedCard(nextCard)
          setErrorMessage(null)
        },
        onError: setPanelError,
      })
      return
    }

    if (currentCard.status === 'requires-confirmation') {
      confirmCard.mutate(currentCard.id, {
        onSuccess(result) {
          setConfirmationResult(result)
          setUpdatedCard(result.card)
          setErrorMessage(null)
        },
        onError: setPanelError,
      })
      return
    }

    if (
      currentCard.status === 'confirmed' ||
      currentCard.status === 'pending-execution'
    ) {
      router.push(isCardLibraryEligible(currentCard) ? '/cards' : '/agent')
    }
  }

  function handleCancel() {
    if (currentCard.status === 'archived' || archiveCard.isPending) {
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

  function setPanelError(error: unknown) {
    setErrorMessage(
      error instanceof Error ? error.message : '当前操作失败，请稍后再试。',
    )
  }

  return (
    <View style={styles.stack}>
      <TerminalCard style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            {currentCard.status === 'archived' ? (
              <XCircle color={appTheme.colors.textMuted} size={21} />
            ) : (
              <CheckCircle2 color={appTheme.colors.goldBright} size={21} />
            )}
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <AppText variant="section">{copy.title}</AppText>
              <StatusPill label={copy.statusLabel} tone={copy.tone} />
            </View>
            <AppText color="textSecondary">{copy.body}</AppText>
          </View>
        </View>

        {currentCard.status === 'archived' ? null : (
          <View style={styles.actions}>
            <Button
              fullWidth
              disabled={
                prepareCard.isPending ||
                confirmCard.isPending ||
                currentCard.status === 'blocked' ||
                currentCard.status === 'completed'
              }
              onPress={handlePrimary}
            >
              {getPrimaryLabel(
                currentCard,
                prepareCard.isPending || confirmCard.isPending,
              )}
            </Button>
            <Button
              fullWidth
              variant="ghost"
              disabled={archiveCard.isPending}
              onPress={handleCancel}
            >
              {archiveCard.isPending ? '正在取消' : '取消这张卡'}
            </Button>
          </View>
        )}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <AppText variant="caption" color="danger">
              {errorMessage}
            </AppText>
          </View>
        ) : null}
      </TerminalCard>

      {confirmationResult?.receiptCard ? (
        <View style={styles.receiptStack}>
          <AppText variant="caption" color="goldBright">
            授权回执
          </AppText>
          <ConversationDataCard card={confirmationResult.receiptCard} />
        </View>
      ) : null}

      {confirmationResult?.followupCards?.length ? (
        <View style={styles.receiptStack}>
          <AppText variant="caption" color="goldBright">
            后续执行卡
          </AppText>
          {confirmationResult.followupCards.map((card) => (
            <ConversationDataCard key={card.id} card={card} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function getDecisionCopy(card: ConversationCard) {
  if (!isAuthorizationFlowCard(card)) {
    return {
      title: '这张卡无需授权',
      body: '它只是一次对话记录，不会触发钱包、交易或转账动作，也不会进入交易卡库。',
      statusLabel: '无需授权',
      tone: 'muted' as const,
    }
  }

  if (card.tags.includes('official-strategy')) {
    if (card.status === 'draft') {
      return {
        title: '先生成启动授权卡',
        body: '这一步只是把官方策略启动信息整理清楚，不会执行链上动作，也不会承诺收益。',
        statusLabel: '策略草案',
        tone: 'gold' as const,
      }
    }

    if (card.status === 'requires-confirmation') {
      return {
        title: '授权启动这个 Agent',
        body: '授权只覆盖当前官方策略版本。策略升级、风险阻止或执行异常时，H Wallet 会重新提示。',
        statusLabel: '待授权',
        tone: 'gold' as const,
      }
    }
  }

  if (card.status === 'draft') {
    return {
      title: '先生成授权卡',
      body: '这一步只是把信息整理成可授权状态，不会执行任何资产动作。',
      statusLabel: '草案',
      tone: 'gold' as const,
    }
  }

  if (card.status === 'requires-confirmation') {
    return {
      title: '请授权是否继续',
      body: '点击授权会记录你的授权意愿。首次交易授权后，同类交易可由 Agent 推进；提现或转账地址变化时会再次授权。',
      statusLabel: '待授权',
      tone: 'gold' as const,
    }
  }

  if (card.status === 'agent-authorized') {
    return {
      title: 'Agent 已获授权',
      body: '这张卡已匹配你的授权范围，真实 Swap 仍要等待 OKX 返回 quote、swap data、风控和交易状态。',
      statusLabel: '已授权',
      tone: 'gold' as const,
    }
  }

  if (card.status === 'confirmed') {
    return {
      title: '授权已记录',
      body: '授权记录已保存。只有交易进入执行通道或真实成功后，才会进入交易卡库。',
      statusLabel: '已授权',
      tone: 'purple' as const,
    }
  }

  if (card.status === 'pending-execution') {
    return {
      title: '等待执行回执',
      body: 'OKX 已返回交易数据，但签名、广播和链上回执还没完成。卡库会把它当作过程卡，不会当作成功交易。',
      statusLabel: '待执行',
      tone: 'purple' as const,
    }
  }

  if (card.status === 'blocked') {
    return {
      title: '这张卡不能继续',
      body: '风险或信息不足，建议取消后重新让 H Wallet 整理。',
      statusLabel: '已阻止',
      tone: 'danger' as const,
    }
  }

  if (card.status === 'completed') {
    return {
      title: '已经完成',
      body: '交易成功结果会进入卡库，可以用于评分、支线任务和组合建议。',
      statusLabel: '已完成',
      tone: 'success' as const,
    }
  }

  return {
    title: '已取消',
    body: '这张卡已放入历史，不再进入授权流程。',
    statusLabel: '已取消',
    tone: 'muted' as const,
  }
}

function getPrimaryLabel(card: ConversationCard, isPending: boolean) {
  if (!isAuthorizationFlowCard(card)) {
    return isCardLibraryEligible(card) ? '查看卡库' : '返回对话'
  }

  if (card.status === 'draft') {
    if (card.tags.includes('official-strategy')) {
      return isPending ? '正在生成启动授权卡' : '生成启动授权卡'
    }

    return isPending ? '正在生成授权卡' : '生成授权卡'
  }

  if (card.status === 'requires-confirmation') {
    return isPending ? '正在授权' : '我已授权'
  }

  if (card.status === 'confirmed' || card.status === 'pending-execution') {
    return isCardLibraryEligible(card) ? '查看卡库' : '查看 Agent'
  }

  if (card.status === 'agent-authorized') {
    return isCardLibraryEligible(card) ? '查看卡库' : '查看 Agent'
  }

  return '不能继续'
}

function isCardLibraryEligible(card: ConversationCard) {
  return (
    (card.type === 'trade-confirmation' &&
      ['agent-authorized', 'confirmed', 'pending-execution'].includes(
        card.status,
      )) ||
    (card.type === 'trade-success' && card.status === 'completed')
  )
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    panel: {
      gap: theme.spacing.md,
    },
    stack: {
      gap: theme.spacing.md,
    },
    receiptStack: {
      gap: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    iconBox: {
      width: 42,
      height: 42,
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
    errorBox: {
      borderWidth: 1,
      borderColor: appTheme.colors.danger,
      borderRadius: theme.radius.md,
      backgroundColor: 'rgba(255, 77, 109, 0.08)',
      padding: theme.spacing.md,
    },
  })
}

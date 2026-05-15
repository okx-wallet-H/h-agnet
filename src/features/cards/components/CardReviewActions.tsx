import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { Button } from '../../../components/primitives/Button'
import { StatusPill } from '../../../components/primitives/StatusPill'
import { TerminalCard } from '../../../components/terminal/TerminalCard'
import { theme } from '../../../design-system/theme'
import type { ConversationCard } from '../../../services/cards/types'
import {
  useArchiveConversationCard,
  usePrepareConversationCardForConfirmation,
} from '../hooks/useCardLibrary'
import {
  getCardActionCopy,
  getCardActionStatus,
  getCardActionTitle,
} from '../model/confirmationQueue'

type CardReviewActionsProps = {
  card: ConversationCard
  showOpenConfirm?: boolean
}

export function CardReviewActions({
  card,
  showOpenConfirm = true,
}: CardReviewActionsProps) {
  const [currentCard, setCurrentCard] = useState(card)
  const prepareCard = usePrepareConversationCardForConfirmation()
  const archiveCard = useArchiveConversationCard()
  const canPrepare = currentCard.status === 'draft'
  const canArchive = currentCard.status !== 'archived'
  const isPreparing = prepareCard.isPending
  const isArchiving = archiveCard.isPending

  function prepareForConfirmation() {
    if (!canPrepare || isPreparing) {
      return
    }

    prepareCard.mutate(currentCard.id, {
      onSuccess: setCurrentCard,
    })
  }

  function archiveCurrentCard() {
    if (!canArchive || isArchiving) {
      return
    }

    archiveCard.mutate(currentCard.id, {
      onSuccess: () =>
        setCurrentCard({
          ...currentCard,
          status: 'archived',
        }),
    })
  }

  return (
    <TerminalCard style={styles.actionPanel}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleGroup}>
          <AppText variant="caption" color="goldBright">
            审阅动作
          </AppText>
          <AppText variant="section">
            {getCardActionTitle(currentCard.status)}
          </AppText>
        </View>
        <StatusPill
          label={getCardActionStatus(currentCard.status)}
          tone={currentCard.status === 'blocked' ? 'danger' : 'gold'}
        />
      </View>
      <AppText color="textSecondary">
        {getCardActionCopy(currentCard.status)}
      </AppText>
      <View style={styles.actionStack}>
        <Button
          fullWidth
          disabled={!canPrepare || isPreparing}
          onPress={prepareForConfirmation}
        >
          {isPreparing && canPrepare ? '正在送入队列' : '送入授权队列'}
        </Button>
        <Button
          fullWidth
          variant="secondary"
          disabled={currentCard.status !== 'requires-confirmation'}
        >
          真实执行未接入
        </Button>
      </View>
      {showOpenConfirm ? (
        <Button
          fullWidth
          variant="secondary"
          onPress={() => router.push('/confirm')}
        >
          打开授权中心
        </Button>
      ) : null}
      <Button
        fullWidth
        variant="ghost"
        disabled={!canArchive || isArchiving}
        onPress={archiveCurrentCard}
      >
        {isArchiving ? '正在归档' : '归档卡片'}
      </Button>
    </TerminalCard>
  )
}

const styles = StyleSheet.create({
  actionPanel: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  actionStack: {
    gap: theme.spacing.md,
  },
})

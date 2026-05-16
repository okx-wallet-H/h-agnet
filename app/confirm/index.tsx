import { router } from 'expo-router'
import { FileCheck2, LockKeyhole, ShieldAlert } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { ConfirmationDecisionPanel } from '../../src/features/cards/components/ConfirmationDecisionPanel'
import { ConfirmationRiskSummary } from '../../src/features/cards/components/ConfirmationRiskSummary'
import { ConversationDataCard } from '../../src/features/cards/components/ConversationDataCard'
import { useConversationCards } from '../../src/features/cards/hooks/useCardLibrary'
import {
  getConfirmationQueueCards,
  getConfirmationQueueStats,
} from '../../src/features/cards/model/confirmationQueue'

export default function ConfirmCenterScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const { cards, isBackendConfigured, isError, isLoading } =
    useConversationCards()
  const queueCards = useMemo(
    () => getConfirmationQueueCards(cards),
    [cards],
  )
  const { blockedCount, readyCount, totalCount } =
    getConfirmationQueueStats(cards)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="授权中心"
        title="授权后才继续"
        description="这里不会直接执行交易或转账。你只需要看懂卡片，选择授权或取消。"
        statusLabel={totalCount > 0 ? '有待处理' : '暂无授权'}
        statusTone={totalCount > 0 ? 'gold' : 'muted'}
      />

      <View style={styles.signalGrid}>
        <SignalTile label="待处理" value={String(totalCount)} tone="gold" />
        <SignalTile label="待授权" value={String(readyCount)} tone="purple" />
        <SignalTile label="已暂停" value={String(blockedCount)} tone="danger" />
      </View>

      <TerminalCard style={styles.ruleCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              用户规则
            </AppText>
            <AppText variant="section">授权不等于真实执行</AppText>
          </View>
          <LockKeyhole color={appTheme.colors.goldBright} size={22} />
        </View>
        <AppText color="textSecondary">
          当前阶段点击授权只记录你的授权意愿。交易类动作必须等待 OKX Swap quote、swap data、风控和状态回执；钱包类动作必须等待 OnchainOS 执行路径。
        </AppText>
        <View style={styles.ruleTags}>
          <StatusPill label="授权前不动资产" tone="success" />
          <StatusPill label="不自动下单" tone="gold" />
          <StatusPill label="可取消" tone="muted" />
        </View>
      </TerminalCard>

      {!isBackendConfigured ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="danger">
            后端 API 未配置
          </AppText>
          <AppText color="textSecondary">
            配置 H Wallet 后端地址后，授权中心才能同步卡片。
          </AppText>
        </TerminalCard>
      ) : null}

      {isError ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="danger">
            读取失败
          </AppText>
          <AppText color="textSecondary">
            暂时无法读取授权卡片，请检查后端服务状态。
          </AppText>
        </TerminalCard>
      ) : null}

      {isLoading ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="goldBright">
            正在同步
          </AppText>
          <AppText variant="section">正在读取待授权卡片</AppText>
        </TerminalCard>
      ) : null}

      {queueCards.length === 0 && !isLoading ? (
        <TerminalCard style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <FileCheck2 color={appTheme.colors.goldBright} size={28} />
          </View>
          <AppText variant="section">暂无待授权卡片</AppText>
          <AppText color="textSecondary">
            从 AI 对话或钱包页生成卡片后，会先进入这里。首次授权或新地址授权前不会发生真实交易或转账。
          </AppText>
          <Button fullWidth onPress={() => router.push('/home')}>
            回到 AI 对话
          </Button>
        </TerminalCard>
      ) : null}

      {queueCards.map((card) => (
        <View key={card.id} style={styles.queueItem}>
          <ConversationDataCard card={card} />
          <ConfirmationRiskSummary card={card} />
          <ConfirmationDecisionPanel card={card} />
        </View>
      ))}

      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        返回
      </Button>

      <ShieldAlert color={appTheme.colors.borderMuted} size={1} />
    </ScrollView>
  )
}

function SignalTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'gold' | 'purple' | 'danger'
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const color =
    tone === 'gold'
      ? appTheme.colors.goldBright
      : tone === 'purple'
        ? appTheme.colors.violet
        : appTheme.colors.danger

  return (
    <View style={styles.signalTile}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="title" style={{ color }}>
        {value}
      </AppText>
    </View>
  )
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
    signalGrid: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    signalTile: {
      flex: 1,
      minHeight: 74,
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: appTheme.colors.borderMuted,
      borderRadius: theme.radius.md,
      backgroundColor: appTheme.colors.surface,
      padding: theme.spacing.md,
    },
    card: {
      gap: theme.spacing.md,
    },
    ruleCard: {
      gap: theme.spacing.md,
    },
    ruleTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    emptyCard: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    emptyIcon: {
      width: 58,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: appTheme.colors.gold,
      borderRadius: theme.radius.lg,
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(216, 180, 95, 0.1)'
          : 'rgba(124, 58, 237, 0.08)',
    },
    queueItem: {
      gap: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
  })
}

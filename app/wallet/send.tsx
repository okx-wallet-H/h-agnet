import { router } from 'expo-router'
import { ArrowUpRight, ShieldCheck, WalletCards } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { ChatCardActions } from '../../src/features/cards/components/ChatCardActions'
import { ConversationDataCard } from '../../src/features/cards/components/ConversationDataCard'
import {
  useCreateWalletTransferDraft,
  useWalletChains,
} from '../../src/features/wallet/hooks/useWalletData'
import { useWalletStore } from '../../src/store/walletStore'

type SendMode = 'withdraw' | 'transfer'

export default function SendScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const { account, status } = useWalletStore()
  const walletChains = useWalletChains()
  const createDraft = useCreateWalletTransferDraft()
  const [mode, setMode] = useState<SendMode>('withdraw')
  const [recipient, setRecipient] = useState('')
  const [readableAmount, setReadableAmount] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('USDT')
  const [chainId, setChainId] = useState('xlayer')
  const isConnected = status === 'connected' && Boolean(account)
  const canCreate =
    isConnected &&
    recipient.trim().length >= 8 &&
    readableAmount.trim().length > 0 &&
    tokenSymbol.trim().length > 0 &&
    chainId.trim().length > 0 &&
    !createDraft.isPending

  function createTransferCard() {
    if (!canCreate) {
      return
    }

    createDraft.mutate({
      actionType: mode,
      chainId: chainId.trim(),
      readableAmount: readableAmount.trim(),
      recipient: recipient.trim(),
      tokenSymbol: tokenSymbol.trim(),
    })
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        eyebrow="钱包动作"
        title={mode === 'withdraw' ? '准备提现' : '准备转账'}
        description="这里只生成授权卡。H Wallet 会先把金额、网络和地址整理清楚；新地址授权前不会动资产。"
        statusLabel={isConnected ? '可生成卡片' : '需要钱包'}
        statusTone={isConnected ? 'gold' : 'muted'}
      />

      <View style={styles.segment}>
        <ModeButton active={mode === 'withdraw'} label="提现" onPress={() => setMode('withdraw')} />
        <ModeButton active={mode === 'transfer'} label="转账" onPress={() => setMode('transfer')} />
      </View>

      {!isConnected ? (
        <TerminalCard style={styles.card}>
          <View style={styles.noticeHeader}>
            <WalletCards color={appTheme.colors.goldBright} size={22} />
            <View style={styles.noticeCopy}>
              <AppText variant="section">先创建 Agent 钱包</AppText>
              <AppText color="textMuted">
                钱包会话建立后，才能生成提现或转账授权卡。
              </AppText>
            </View>
          </View>
          <Button fullWidth onPress={() => router.push('/wallet/connect')}>
            创建 Agent 钱包
          </Button>
        </TerminalCard>
      ) : null}

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              {mode === 'withdraw' ? '提现信息' : '转账信息'}
            </AppText>
            <AppText variant="section">先生成授权卡</AppText>
          </View>
          <ArrowUpRight color={appTheme.colors.goldBright} size={22} />
        </View>
        <MetricRow
          label="当前钱包"
          value={account?.address ? shortenAddress(account.address) : '未连接'}
          valueColor={isConnected ? 'goldBright' : 'textMuted'}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={isConnected}
          onChangeText={setRecipient}
          placeholder={mode === 'withdraw' ? '提现到哪个地址' : '转给哪个地址'}
          placeholderTextColor={appTheme.colors.textMuted}
          style={styles.input}
          value={recipient}
        />
        <TextInput
          editable={isConnected}
          inputMode="decimal"
          keyboardType="decimal-pad"
          onChangeText={setReadableAmount}
          placeholder="金额"
          placeholderTextColor={appTheme.colors.textMuted}
          style={styles.input}
          value={readableAmount}
        />
        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="characters"
            editable={isConnected}
            onChangeText={setTokenSymbol}
            placeholder="资产"
            placeholderTextColor={appTheme.colors.textMuted}
            style={[styles.input, styles.halfInput]}
            value={tokenSymbol}
          />
          <TextInput
            autoCapitalize="none"
            editable={isConnected}
            onChangeText={setChainId}
            placeholder="网络"
            placeholderTextColor={appTheme.colors.textMuted}
            style={[styles.input, styles.halfInput]}
            value={chainId}
          />
        </View>
        {walletChains.data?.length ? (
          <View style={styles.chainHints}>
            {walletChains.data.slice(0, 3).map((chain) => (
              <StatusPill key={chain.id} label={chain.name} tone="muted" />
            ))}
          </View>
        ) : null}
      </TerminalCard>

      <TerminalCard style={styles.safeCard}>
        <ShieldCheck color={appTheme.colors.success} size={21} />
        <View style={styles.noticeCopy}>
            <AppText variant="data">安全规则</AppText>
            <AppText color="textMuted">
            生成卡片不等于执行。真实动作需要余额检查、模拟、风险扫描和地址授权。
            </AppText>
          </View>
      </TerminalCard>

      {createDraft.data ? (
        <View style={styles.createdCard}>
          <ConversationDataCard card={createDraft.data} />
          <ChatCardActions card={createDraft.data} />
        </View>
      ) : null}

      {createDraft.isError ? (
        <TerminalCard style={styles.errorCard}>
          <AppText variant="caption" color="danger">
            卡片生成失败
          </AppText>
          <AppText color="textSecondary">
            {createDraft.error instanceof Error
              ? createDraft.error.message
              : '钱包服务没有创建授权卡。'}
          </AppText>
        </TerminalCard>
      ) : null}

      <Button fullWidth disabled={!canCreate} onPress={createTransferCard}>
        {createDraft.isPending ? '正在生成卡片' : '生成授权卡'}
      </Button>
      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        返回
      </Button>
    </ScrollView>
  )
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean
  label: string
  onPress: () => void
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <AppText
        variant="data"
        color={active ? (appTheme.mode === 'dark' ? 'goldBright' : 'purple') : 'textMuted'}
      >
        {label}
      </AppText>
    </Pressable>
  )
}

function shortenAddress(address: string) {
  if (address.length <= 18) {
    return address
  }

  return `${address.slice(0, 8)}...${address.slice(-8)}`
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
    segment: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: theme.radius.pill,
      backgroundColor: appTheme.colors.surface,
      padding: 3,
    },
    modeButton: {
      minHeight: 38,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.pill,
    },
    modeButtonActive: {
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(216, 180, 95, 0.12)'
          : 'rgba(124, 58, 237, 0.1)',
    },
    card: {
      gap: theme.spacing.md,
    },
    noticeHeader: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    noticeCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    inputRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    input: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: appTheme.colors.surfaceElevated,
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      paddingHorizontal: theme.spacing.lg,
    },
    halfInput: {
      flex: 1,
    },
    chainHints: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    safeCard: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    errorCard: {
      gap: theme.spacing.sm,
      borderColor: appTheme.colors.danger,
      backgroundColor: 'rgba(255, 77, 109, 0.08)',
    },
    createdCard: {
      gap: theme.spacing.md,
    },
  })
}

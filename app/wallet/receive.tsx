import { router } from 'expo-router'
import { AlertTriangle, QrCode, WalletCards } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { useWalletAddresses } from '../../src/features/wallet/hooks/useWalletData'
import type { WalletAddress } from '../../src/services/wallet/types'
import { useWalletStore } from '../../src/store/walletStore'

export default function ReceiveScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const { account } = useWalletStore()
  const walletAddresses = useWalletAddresses()
  const addresses = useMemo(() => {
    if (walletAddresses.data && walletAddresses.data.length > 0) {
      return walletAddresses.data
    }

    if (!account) {
      return []
    }

    return [
      {
        id: account.chainId,
        label: account.chainId === 'solana' ? 'Solana 地址' : 'EVM 地址',
        address: account.address,
        ecosystem: account.chainId === 'solana' ? 'solana' : 'evm',
        chainSummary:
          account.chainId === 'solana'
            ? '支持 Solana 网络'
            : '支持 X Layer、Ethereum、Polygon 等 EVM 网络',
      } satisfies WalletAddress,
    ]
  }, [account, walletAddresses.data])
  const primaryAddress = addresses[0]
  const hasAddress = Boolean(primaryAddress)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="充值"
        title="收款地址"
        description="把资产充到这个地址前，请确认网络一致。地址只来自钱包服务或已验证会话。"
        statusLabel={hasAddress ? '可充值' : '需要钱包'}
        statusTone={hasAddress ? 'success' : 'muted'}
      />

      {!hasAddress ? (
        <TerminalCard style={styles.card}>
          <View style={styles.inlineHeader}>
            <WalletCards color={appTheme.colors.goldBright} size={22} />
            <View style={styles.inlineText}>
              <AppText variant="section">先创建 Agent 钱包</AppText>
              <AppText color="textMuted">
                钱包创建成功后，H Wallet 才会展示可用充值地址。
              </AppText>
            </View>
          </View>
          <Button fullWidth onPress={() => router.push('/wallet/connect')}>
            创建 Agent 钱包
          </Button>
        </TerminalCard>
      ) : null}

      <TerminalCard style={styles.qrCard}>
        <View style={styles.qrFrame}>
          <QrCode color={appTheme.colors.textMuted} size={92} />
        </View>
        <StatusPill
          label={hasAddress ? '地址已验证' : '地址不可用'}
          tone={hasAddress ? 'success' : 'muted'}
        />
        <AppText variant="section" style={styles.addressText}>
          {primaryAddress?.address ?? '请先连接 Agent 钱包'}
        </AppText>
      </TerminalCard>

      <TerminalCard style={styles.warningCard}>
        <AlertTriangle color={appTheme.colors.warning} size={22} />
        <View style={styles.inlineText}>
          <AppText variant="data">充值前先确认网络</AppText>
          <AppText color="textMuted">
            网络选错可能导致资产无法到账。H Wallet 不会在这里伪造到账状态。
          </AppText>
        </View>
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <MetricRow
          label="钱包来源"
          value={account ? formatProvider(account.provider) : '无'}
        />
        <MetricRow label="地址数量" value={String(addresses.length)} />
        <MetricRow
          label="地址来源"
          value={walletAddresses.data?.length ? '后端会话' : '本地会话'}
          valueColor={hasAddress ? 'goldBright' : 'textMuted'}
        />
        <MetricRow
          label="到账记录"
          value="等待后端回执"
          valueColor="textMuted"
        />
      </TerminalCard>

      {addresses.length > 0 ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="goldBright">
            可用充值地址
          </AppText>
          {addresses.map((item) => (
            <View key={item.id} style={styles.addressItem}>
              <View style={styles.addressMeta}>
                <AppText variant="data">{item.label}</AppText>
                <AppText variant="caption" color="textMuted">
                  {item.chainSummary}
                </AppText>
              </View>
              <AppText color="textSecondary">
                {shortenAddress(item.address)}
              </AppText>
            </View>
          ))}
        </TerminalCard>
      ) : null}

      <Button fullWidth disabled>
        {hasAddress ? '复制地址（待接入）' : '复制地址'}
      </Button>
      <Button variant="secondary" fullWidth onPress={() => router.push('/home')}>
        回到 AI 对话
      </Button>
      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        返回
      </Button>
    </ScrollView>
  )
}

function shortenAddress(address: string) {
  if (address.length <= 18) {
    return address
  }

  return `${address.slice(0, 8)}...${address.slice(-8)}`
}

function formatProvider(provider: string) {
  if (provider === 'okx-agent-wallet') {
    return 'OKX Agent Wallet'
  }

  if (provider === 'okx-wallet') {
    return 'OKX 钱包'
  }

  if (provider === 'walletconnect') {
    return 'WalletConnect'
  }

  if (provider === 'embedded') {
    return '嵌入式钱包'
  }

  return provider
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
    card: {
      gap: theme.spacing.md,
    },
    inlineHeader: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    inlineText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    qrCard: {
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    qrFrame: {
      width: 180,
      height: 180,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: theme.radius.xl,
      backgroundColor: appTheme.colors.surfaceElevated,
    },
    addressText: {
      textAlign: 'center',
    },
    warningCard: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      borderColor: appTheme.colors.warning,
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.08)'
          : 'rgba(245, 158, 11, 0.1)',
    },
    addressItem: {
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: appTheme.colors.borderMuted,
      borderRadius: theme.radius.md,
      backgroundColor: appTheme.colors.surfaceElevated,
      padding: theme.spacing.md,
    },
    addressMeta: {
      gap: theme.spacing.xs,
    },
  })
}

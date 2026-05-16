import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  KeyRound,
  Network,
  ShieldCheck,
  WalletCards,
} from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { useAgentWalletSession } from '../../src/features/auth/hooks/useAgentWalletAuth'
import {
  useWalletAccount,
  useWalletAssets,
  useWalletChains,
} from '../../src/features/wallet/hooks/useWalletData'
import { useWalletStore } from '../../src/store/walletStore'

const fallbackNetworks = ['X Layer', 'Ethereum', 'Solana']

const walletActions = [
  {
    label: '充值',
    caption: '查看收款地址',
    icon: ArrowDownLeft,
    href: '/wallet/receive',
  },
  {
    label: '提现',
    caption: '先生成授权卡',
    icon: ArrowUpRight,
    href: '/wallet/send',
  },
  {
    label: '网络',
    caption: '多链设置',
    icon: Network,
    href: '/settings/networks',
  },
]

export default function WalletScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const {
    account,
    setAccount,
    setSelectedChainId,
    setStatus,
    status,
  } = useWalletStore()
  const remoteAccount = useWalletAccount()
  const walletSession = useAgentWalletSession()
  const walletAssets = useWalletAssets()
  const walletChains = useWalletChains()
  const currentAccount = account ?? remoteAccount.data ?? null
  const sessionReady = Boolean(walletSession.data)
  const isConnected = (Boolean(currentAccount) || sessionReady) && status !== 'error'
  const networkSlots =
    walletChains.data && walletChains.data.length > 0
      ? walletChains.data.map((chain) => chain.name)
      : fallbackNetworks

  useEffect(() => {
    if (!account && remoteAccount.data) {
      setAccount(remoteAccount.data)
      setSelectedChainId(remoteAccount.data.chainId)
      setStatus('connected')
    }
  }, [account, remoteAccount.data, setAccount, setSelectedChainId, setStatus])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleGroup}>
            <AppText variant="caption" color="goldBright">
              H Wallet
            </AppText>
            <AppText variant="display">Agent 钱包</AppText>
          </View>
          <StatusPill
            label={isConnected ? '已连接' : '未创建'}
            tone={isConnected ? 'success' : 'muted'}
          />
        </View>
        <AppText color="textSecondary">
          这里负责充值地址、提现卡片和多链信息。复杂执行会进入 API 层，页面只展示必要结果。
        </AppText>
      </View>

      <LinearGradient
        colors={
          appTheme.mode === 'dark'
            ? ['rgba(216, 180, 95, 0.92)', 'rgba(124, 58, 237, 0.78)']
            : ['rgba(124, 58, 237, 0.26)', 'rgba(216, 180, 95, 0.42)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletCard}
      >
        <View style={styles.walletInner}>
          <View style={styles.walletTop}>
            <View style={styles.walletIcon}>
              <WalletCards color={appTheme.colors.goldBright} size={24} />
            </View>
            <KeyRound color={appTheme.colors.textSecondary} size={20} />
          </View>
          <View style={styles.walletCopy}>
            <AppText variant="caption" color="textMuted">
              当前账户
            </AppText>
            <AppText variant="section">
              {currentAccount?.address
                ? shortenAddress(currentAccount.address)
                : sessionReady
                  ? 'Agent 钱包会话已建立'
                  : '还没有 Agent 钱包'}
            </AppText>
            <AppText color="textMuted">
              {isConnected
                ? '充值、提现和交易都会先生成卡片，按授权策略推进。'
                : '创建后即可回到 AI 对话开始使用。'}
            </AppText>
          </View>
          <MetricRow
            label="钱包来源"
            value={
              currentAccount || sessionReady
                ? 'OKX Agent Wallet'
                : '未连接'
            }
            valueColor={isConnected ? 'goldBright' : 'textMuted'}
          />
          <MetricRow
            label="当前网络"
            value={currentAccount?.chainId ?? '未选择'}
            valueColor={isConnected ? 'violet' : 'textMuted'}
          />
          <MetricRow
            label="登录邮箱"
            value={walletSession.data?.email ?? '未登录'}
            valueColor={sessionReady ? 'goldBright' : 'textMuted'}
          />
          <MetricRow
            label="会话状态"
            value={sessionReady ? '已建立' : '等待创建'}
            valueColor={sessionReady ? 'success' : 'textMuted'}
          />
        </View>
      </LinearGradient>

      <View style={styles.actionRow}>
        {walletActions.map((action) => {
          const Icon = action.icon

          return (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.href)}
              style={({ pressed }) => [
                styles.actionPressable,
                pressed && styles.pressed,
              ]}
            >
              <TerminalCard style={styles.actionCard}>
                <Icon color={appTheme.colors.goldBright} size={21} />
                <View style={styles.actionCopy}>
                  <AppText variant="data">{action.label}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {action.caption}
                  </AppText>
                </View>
              </TerminalCard>
            </Pressable>
          )
        })}
      </View>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              安全边界
            </AppText>
            <AppText variant="section">资产动作都走授权策略</AppText>
          </View>
          <ShieldCheck color={appTheme.colors.success} size={22} />
        </View>
        <AppText color="textSecondary">
          提现、转账、兑换和赚币不会在页面里直接执行。H Wallet 会把动作整理成卡片，首次授权或新地址授权后再进入执行通道。
        </AppText>
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              网络
            </AppText>
            <AppText variant="section">预留多链入口</AppText>
          </View>
          <Network color={appTheme.colors.violet} size={22} />
        </View>
        <View style={styles.networkList}>
          {networkSlots.map((network) => (
            <View key={network} style={styles.networkItem}>
              <View style={styles.networkDot} />
              <AppText variant="data">{network}</AppText>
              <AppText variant="caption" color="textMuted">
                待接入
              </AppText>
            </View>
          ))}
        </View>
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              资产
            </AppText>
            <AppText variant="section">实时余额</AppText>
          </View>
          <ShieldCheck color={appTheme.colors.success} size={22} />
        </View>
        <AppText color="textSecondary">
          {isConnected && walletAssets.data?.length === 0
            ? '钱包会话已建立，但余额接口暂未返回资产。界面不会用假余额填充。'
            : '余额只能通过钱包服务和 OKX 适配器读取。在真实数据接入前，界面不会伪造资产。'}
        </AppText>
        <MetricRow
          label="资产接口"
          value={walletAssets.isError ? '读取失败' : '已接入'}
          valueColor={walletAssets.isError ? 'danger' : 'goldBright'}
        />
        <MetricRow
          label="资产数量"
          value={String(walletAssets.data?.length ?? 0)}
          valueColor={walletAssets.data?.length ? 'goldBright' : 'textMuted'}
        />
      </TerminalCard>

      <View style={styles.actions}>
        <Button
          fullWidth
          onPress={() =>
            router.push(isConnected ? '/wallet/connect' : '/auth/register')
          }
        >
          {isConnected ? '管理 Agent 钱包' : '创建 Agent 钱包'}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={!isConnected}
          onPress={() => router.push('/wallet/send')}
        >
          准备提现
        </Button>
      </View>
    </ScrollView>
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
      paddingBottom: 112,
      backgroundColor: appTheme.colors.background,
    },
    header: {
      gap: theme.spacing.md,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    titleGroup: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    walletCard: {
      borderRadius: theme.radius.xl,
      padding: 1,
    },
    walletInner: {
      gap: theme.spacing.lg,
      borderRadius: theme.radius.xl - 1,
      backgroundColor:
        appTheme.mode === 'dark' ? 'rgba(5, 4, 10, 0.82)' : '#FFFFFF',
      padding: theme.spacing.xl,
    },
    walletTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    walletIcon: {
      width: 48,
      height: 48,
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
    walletCopy: {
      gap: theme.spacing.xs,
    },
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionPressable: {
      flex: 1,
    },
    actionCard: {
      minHeight: 96,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    actionCopy: {
      gap: theme.spacing.xs,
    },
    sectionCard: {
      gap: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    networkList: {
      gap: theme.spacing.sm,
    },
    networkItem: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.colors.borderMuted,
    },
    networkDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: appTheme.colors.violet,
    },
    actions: {
      gap: theme.spacing.md,
    },
    pressed: {
      opacity: 0.82,
    },
  })
}

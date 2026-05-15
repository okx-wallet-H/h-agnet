import { router, useLocalSearchParams } from 'expo-router'
import { Bot, CircleCheckBig, WalletCards } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { AgentWalletFlowCard } from '../../src/features/auth/components/AgentWalletFlowCard'

export default function AgentWalletSuccessScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const params = useLocalSearchParams<{
    email?: string
    accountId?: string
    accountName?: string
    evmAddress?: string
    solAddress?: string
  }>()
  const hasAddress = Boolean(params.evmAddress || params.solAddress)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <StatusPill label="创建成功" tone="success" />
        <AppText variant="display">Agent 钱包已就绪</AppText>
        <AppText color="textSecondary">
          你现在可以回到对话，让 H Wallet 帮你准备充值、提现、交易和赚币卡片。
        </AppText>
      </View>

      <AgentWalletFlowCard currentStep="wallet" />

      <TerminalCard style={styles.successCard}>
        <View style={styles.successIcon}>
          <CircleCheckBig color={appTheme.colors.success} size={32} />
        </View>
        <View style={styles.successCopy}>
          <AppText variant="section">钱包会话已建立</AppText>
          <AppText color="textMuted">
            H Wallet 会按一次授权策略推进：首次交易授权一次，新提现地址再授权。
          </AppText>
        </View>
        <MetricRow label="邮箱" value={params.email ?? '已注册'} />
        <MetricRow
          label="账户"
          value={params.accountName || params.accountId || '等待状态接口返回'}
          valueColor={params.accountName || params.accountId ? 'goldBright' : 'textMuted'}
        />
        <MetricRow
          label="地址状态"
          value={hasAddress ? '已返回' : '等待钱包接口同步'}
          valueColor={hasAddress ? 'goldBright' : 'textMuted'}
        />
        <MetricRow label="执行权限" value="一次授权策略" valueColor="success" />
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.inlineHeader}>
          <WalletCards color={appTheme.colors.goldBright} size={22} />
          <View style={styles.inlineText}>
            <AppText variant="data">不会伪造资产数据</AppText>
            <AppText color="textMuted">
              地址和余额只展示后端适配器返回的数据。未返回时保持等待状态。
            </AppText>
          </View>
        </View>
      </TerminalCard>

      <View style={styles.actions}>
        <Button fullWidth onPress={() => router.replace('/home')}>
          回到 AI 对话
        </Button>
        <Button variant="secondary" fullWidth onPress={() => router.replace('/wallet')}>
          查看钱包
        </Button>
      </View>

      <View style={styles.safeLine}>
        <Bot color={appTheme.colors.goldBright} size={16} />
        <AppText variant="caption" color="textMuted">
          接下来你只需要用中文告诉 H Wallet 想做什么。
        </AppText>
      </View>
    </ScrollView>
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
    header: {
      gap: theme.spacing.md,
    },
    card: {
      gap: theme.spacing.md,
    },
    successCard: {
      alignItems: 'stretch',
      gap: theme.spacing.md,
    },
    successIcon: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: appTheme.colors.success,
      borderRadius: theme.radius.xl,
      backgroundColor: 'rgba(24, 196, 124, 0.1)',
    },
    successCopy: {
      gap: theme.spacing.xs,
    },
    inlineHeader: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    inlineText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    actions: {
      gap: theme.spacing.md,
    },
    safeLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
  })
}

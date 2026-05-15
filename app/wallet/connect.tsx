import { router } from 'expo-router'
import { KeyRound, Mail, WalletCards } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { AgentWalletFlowCard } from '../../src/features/auth/components/AgentWalletFlowCard'
import { useAgentWalletAuthStatus } from '../../src/features/auth/hooks/useAgentWalletAuth'
import { getAgentWalletAuthStatus } from '../../src/services/auth/agentWalletAuthService'

const authStatus = getAgentWalletAuthStatus()

export default function WalletConnectScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const remoteStatus = useAgentWalletAuthStatus()
  const adapterStatus = remoteStatus.data?.status ?? 'not-configured'
  const ready = authStatus.status === 'ready' && adapterStatus === 'ready'

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="钱包入口"
        title="创建 Agent 钱包"
        description="用邮箱验证码创建或恢复钱包。用户只看到简单流程，OKX 和 OnchainOS 调用都在后端完成。"
        statusLabel={ready ? '可创建' : '待配置'}
        statusTone={ready ? 'success' : 'muted'}
      />

      <AgentWalletFlowCard currentStep="email" />

      <TerminalCard style={styles.card}>
        <View style={styles.iconBox}>
          <Mail color={appTheme.colors.goldBright} size={24} />
        </View>
        <AppText variant="section">邮箱验证码登录</AppText>
        <AppText color="textSecondary">
          这是用户进入 H Wallet 的主流程。创建成功后直接回到 AI 对话，不让用户先面对复杂钱包参数。
        </AppText>
        <MetricRow label="用户步骤" value="邮箱 + 验证码" valueColor="goldBright" />
        <MetricRow
          label="当前服务"
          value={formatAdapterStatus(adapterStatus)}
          valueColor={ready ? 'goldBright' : 'textMuted'}
        />
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.inlineHeader}>
          <KeyRound color={appTheme.colors.violet} size={22} />
          <View style={styles.inlineCopy}>
            <AppText variant="data">安全边界</AppText>
            <AppText color="textSecondary">
              App 不保存 OKX API Key、私钥或密码。首次交易授权后可由 Agent 推进；提现地址变化时再授权。
            </AppText>
          </View>
        </View>
      </TerminalCard>

      <View style={styles.actions}>
        <Button fullWidth onPress={() => router.push('/auth/register')}>
          使用邮箱继续
        </Button>
        <Button variant="ghost" fullWidth onPress={() => router.back()}>
          返回
        </Button>
      </View>

      <WalletCards color={appTheme.colors.borderMuted} size={1} />
    </ScrollView>
  )
}

function formatAdapterStatus(status: string) {
  if (status === 'ready') {
    return '已就绪'
  }

  if (status === 'not-configured') {
    return '未配置'
  }

  if (status === 'unavailable') {
    return '不可用'
  }

  return status
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
    iconBox: {
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
    inlineHeader: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    inlineCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    actions: {
      gap: theme.spacing.md,
    },
  })
}

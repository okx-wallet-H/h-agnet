import { router, useLocalSearchParams } from 'expo-router'
import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { AgentWalletFlowCard } from '../../src/features/auth/components/AgentWalletFlowCard'
import { useVerifyAgentWalletOtp } from '../../src/features/auth/hooks/useAgentWalletAuth'
import { useWalletStore } from '../../src/store/walletStore'

export default function VerifyAgentWalletScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const params = useLocalSearchParams<{ email?: string; requestId?: string }>()
  const [otpCode, setOtpCode] = useState('')
  const verifyOtp = useVerifyAgentWalletOtp()
  const setWalletStatus = useWalletStore((state) => state.setStatus)
  const setAccount = useWalletStore((state) => state.setAccount)
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId)
  const email = params.email ?? ''
  const cleanOtp = otpCode.trim()
  const canVerify = Boolean(email) && cleanOtp.length >= 4 && !verifyOtp.isPending
  const error =
    verifyOtp.error instanceof Error
      ? verifyOtp.error.message
      : verifyOtp.isError
        ? '验证码验证失败，请检查后再试。'
        : null

  function createWallet() {
    if (!canVerify) {
      return
    }

    verifyOtp.mutate(
      {
        email,
        otpCode: cleanOtp,
        requestId: params.requestId,
      },
      {
        onSuccess: (session) => {
          const primaryAddress = session.evmAddress ?? session.solAddress
          const chainId = session.evmAddress ? 'evm' : 'solana'

          if (primaryAddress) {
            setWalletStatus('connected')
            setSelectedChainId(chainId)
            setAccount({
              address: primaryAddress,
              chainId,
              provider: 'okx-agent-wallet',
            })
          }

          router.replace({
            pathname: '/auth/success',
            params: {
              email,
              accountId: session.accountId ?? '',
              accountName: session.accountName ?? '',
              cardId: session.walletCreatedCard?.id ?? '',
              evmAddress: session.evmAddress ?? '',
              solAddress: session.solAddress ?? '',
            },
          })
        },
      },
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <StatusPill label="第二步" tone="purple" />
          <AppText variant="display">输入 OKX 验证码</AppText>
          <AppText color="textSecondary">
            验证码通过后会创建或恢复 Agent 钱包会话。H Wallet 不设置密码，后续按一次授权策略执行。
          </AppText>
        </View>

        <AgentWalletFlowCard currentStep="otp" />

        <TerminalCard style={styles.card}>
          <View style={styles.formHeader}>
            <View style={styles.iconBox}>
              <MailCheck color={appTheme.colors.goldBright} size={24} />
            </View>
            <View style={styles.formTitle}>
              <AppText variant="caption" color="goldBright">
                验证邮箱
              </AppText>
              <AppText variant="section">{email || '邮箱待确认'}</AppText>
            </View>
          </View>

          <TextInput
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={8}
            onChangeText={(value) => setOtpCode(value.replace(/\D/g, ''))}
            placeholder="输入验证码"
            placeholderTextColor={appTheme.colors.textMuted}
            style={styles.input}
            value={otpCode}
          />

          <View style={styles.helperRow}>
            <StatusPill
              label={cleanOtp.length >= 4 ? '验证码已填写' : '等待验证码'}
              tone={cleanOtp.length >= 4 ? 'success' : 'muted'}
            />
            <StatusPill label="无密码授权" tone="gold" />
          </View>
        </TerminalCard>

        <TerminalCard style={styles.card}>
          <View style={styles.inlineHeader}>
            <KeyRound color={appTheme.colors.violet} size={22} />
            <View style={styles.inlineText}>
              <AppText variant="data">验证后会发生什么</AppText>
              <AppText color="textMuted">
                H Wallet 会建立钱包会话。首次交易需要授权；提现或转账地址变化时会再次授权。
              </AppText>
            </View>
          </View>
          <MetricRow
            label="请求状态"
            value={params.requestId ? '已收到' : '等待后端返回'}
            valueColor={params.requestId ? 'goldBright' : 'textMuted'}
          />
        </TerminalCard>

        {error ? (
          <TerminalCard style={styles.errorCard}>
            <AppText variant="caption" color="danger">
              验证被阻止
            </AppText>
            <AppText color="textSecondary">{error}</AppText>
          </TerminalCard>
        ) : null}

        <Button fullWidth disabled={!canVerify} onPress={createWallet}>
          {verifyOtp.isPending ? '正在创建钱包' : '创建 Agent 钱包'}
        </Button>
        <Button variant="ghost" fullWidth onPress={() => router.back()}>
          返回上一步
        </Button>

        <View style={styles.safeLine}>
          <ShieldCheck color={appTheme.colors.success} size={16} />
          <AppText variant="caption" color="textMuted">
            首次授权或新地址授权前不会执行资产动作。
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: appTheme.colors.background,
    },
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
    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    iconBox: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: appTheme.colors.violet,
      borderRadius: theme.radius.lg,
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(124, 58, 237, 0.12)'
          : 'rgba(124, 58, 237, 0.08)',
    },
    formTitle: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    input: {
      minHeight: 58,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: appTheme.colors.surfaceElevated,
      color: appTheme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 4,
      paddingHorizontal: theme.spacing.lg,
      textAlign: 'center',
    },
    helperRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    inlineHeader: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    inlineText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    errorCard: {
      gap: theme.spacing.sm,
      borderColor: appTheme.colors.danger,
      backgroundColor: 'rgba(255, 77, 109, 0.08)',
    },
    safeLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
  })
}

import { router } from 'expo-router'
import {
  ChevronDown,
  ChevronUp,
  Mail,
  ShieldCheck,
} from 'lucide-react-native'
import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import {
  useAgentWalletAuthStatus,
  useRequestAgentWalletOtp,
} from '../../src/features/auth/hooks/useAgentWalletAuth'
import { getAgentWalletAuthStatus } from '../../src/services/auth/agentWalletAuthService'

const authStatus = getAgentWalletAuthStatus()

export default function RegisterAgentWalletScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [email, setEmail] = useState('')
  const remoteStatus = useAgentWalletAuthStatus()
  const requestOtp = useRequestAgentWalletOtp()
  const normalizedEmail = email.trim()
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  const adapterStatus = remoteStatus.data?.status ?? 'not-configured'
  const backendReady = authStatus.status === 'ready'
  const adapterReady = adapterStatus === 'ready'
  const canContinue =
    emailValid && backendReady && adapterReady && !requestOtp.isPending
  const error =
    requestOtp.error instanceof Error
      ? requestOtp.error.message
      : requestOtp.isError
        ? '验证码请求失败，请稍后再试。'
        : null

  function continueToOtp() {
    if (!canContinue) {
      return
    }

    requestOtp.mutate(
      {
        email: normalizedEmail,
        locale: 'zh-CN',
      },
      {
        onSuccess: (session) => {
          router.push({
            pathname: '/auth/verify',
            params: {
              email: normalizedEmail,
              requestId: session.requestId ?? '',
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
          <StatusPill label="第一步" tone="gold" />
          <AppText variant="display">用邮箱创建 Agent 钱包</AppText>
          <AppText color="textSecondary">
            输入邮箱后，H Wallet 会通过后端向 OKX Agent Wallet 请求验证码。
            App 不保存 OKX API Key，也不保存私钥。
          </AppText>
        </View>

        <AgentWalletFlowCard currentStep="email" />

        <TerminalCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.iconBox}>
              <Mail color={appTheme.colors.goldBright} size={24} />
            </View>
            <View style={styles.formTitle}>
              <AppText variant="caption" color="goldBright">
                注册邮箱
              </AppText>
              <AppText variant="section">验证码会发送到这个邮箱</AppText>
            </View>
          </View>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={appTheme.colors.textMuted}
            style={styles.input}
            value={email}
          />

          <View style={styles.helperRow}>
            <StatusPill
              label={emailValid ? '邮箱格式正确' : '等待邮箱'}
              tone={emailValid ? 'success' : 'muted'}
            />
            <StatusPill
              label={adapterReady ? 'OKX 可用' : 'OKX 待配置'}
              tone={adapterReady ? 'success' : 'muted'}
            />
          </View>
        </TerminalCard>

        <TerminalCard style={styles.noticeCard}>
          <View style={styles.inlineHeader}>
            <ShieldCheck color={appTheme.colors.success} size={22} />
            <View style={styles.inlineText}>
              <AppText variant="data">用户需要知道的就三件事</AppText>
              <AppText color="textMuted">
                没有密码；验证码来自 OKX；首次授权或新提现地址授权前不会动用资产。
              </AppText>
            </View>
          </View>
        </TerminalCard>

        <ConnectionDetails
          adapterReason={
            remoteStatus.data?.reason ??
            (remoteStatus.isError
              ? '无法读取后端认证状态。'
              : '正在读取后端 OKX Agent Wallet 状态。')
          }
          adapterStatus={adapterStatus}
          authMode={remoteStatus.data?.authMode ?? '未启用'}
          backendReady={backendReady}
        />

        {error ? (
          <TerminalCard style={styles.errorCard}>
            <AppText variant="caption" color="danger">
              请求被阻止
            </AppText>
            <AppText color="textSecondary">{error}</AppText>
          </TerminalCard>
        ) : null}

        <Button fullWidth disabled={!canContinue} onPress={continueToOtp}>
          {requestOtp.isPending ? '正在发送验证码' : '发送 OKX 验证码'}
        </Button>

        <Button variant="ghost" fullWidth onPress={() => router.back()}>
          返回
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function ConnectionDetails({
  adapterReason,
  adapterStatus,
  authMode,
  backendReady,
}: {
  adapterReason: string
  adapterStatus: string
  authMode: string
  backendReady: boolean
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const [expanded, setExpanded] = useState(false)
  const Icon = expanded ? ChevronUp : ChevronDown

  return (
    <TerminalCard style={styles.connectionCard}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((value) => !value)}
        style={styles.connectionHeader}
      >
        <View>
          <AppText variant="caption" color="goldBright">
            连接状态
          </AppText>
          <AppText variant="section">
            {backendReady && adapterStatus === 'ready'
              ? '可以发送验证码'
              : '等待后端配置 OKX'}
          </AppText>
        </View>
        <Icon color={appTheme.colors.textMuted} size={20} />
      </Pressable>

      {expanded ? (
        <View style={styles.connectionBody}>
          <MetricRow
            label="前端 API"
            value={backendReady ? '已配置' : '未配置'}
            valueColor={backendReady ? 'goldBright' : 'textMuted'}
          />
          <MetricRow
            label="OKX 适配器"
            value={formatAdapterStatus(adapterStatus)}
            valueColor={adapterStatus === 'ready' ? 'goldBright' : 'textMuted'}
          />
          <MetricRow label="认证模式" value={authMode} />
          <AppText color="textMuted">{adapterReason}</AppText>
        </View>
      ) : (
        <AppText color="textMuted">
          技术状态已折叠。普通用户只需要输入邮箱。
        </AppText>
      )}
    </TerminalCard>
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
    formCard: {
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
      borderColor: appTheme.colors.gold,
      borderRadius: theme.radius.lg,
      backgroundColor:
        appTheme.mode === 'dark'
          ? 'rgba(216, 180, 95, 0.1)'
          : 'rgba(124, 58, 237, 0.08)',
    },
    formTitle: {
      flex: 1,
      gap: theme.spacing.xs,
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
    helperRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    noticeCard: {
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
    connectionCard: {
      gap: theme.spacing.md,
    },
    connectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    connectionBody: {
      gap: theme.spacing.sm,
    },
    errorCard: {
      gap: theme.spacing.sm,
      borderColor: appTheme.colors.danger,
      backgroundColor: 'rgba(255, 77, 109, 0.08)',
    },
  })
}

import { CheckCircle2, Circle, Mail, ShieldCheck, WalletCards } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { StatusPill } from '../../../components/primitives/StatusPill'
import { TerminalCard } from '../../../components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../../design-system/theme'

type AgentWalletFlowStep = 'email' | 'otp' | 'wallet'

type AgentWalletFlowCardProps = {
  currentStep: AgentWalletFlowStep
}

const steps: Array<{
  key: AgentWalletFlowStep
  title: string
  caption: string
}> = [
  {
    key: 'email',
    title: '邮箱注册',
    caption: '请求 OKX 验证码',
  },
  {
    key: 'otp',
    title: '验证码',
    caption: '验证用户身份',
  },
  {
    key: 'wallet',
    title: 'Agent 钱包',
    caption: '创建或恢复会话',
  },
]

const stepIcon = {
  email: Mail,
  otp: ShieldCheck,
  wallet: WalletCards,
} as const

export function AgentWalletFlowCard({
  currentStep,
}: AgentWalletFlowCardProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const activeIndex = steps.findIndex((step) => step.key === currentStep)

  return (
    <TerminalCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color="goldBright">
            创建路径
          </AppText>
          <AppText variant="section">邮箱验证码 Agent Wallet 流程</AppText>
        </View>
        <StatusPill label="无密码" tone="gold" />
      </View>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const Icon = stepIcon[step.key]
          const isActive = index === activeIndex
          const isDone = index < activeIndex
          const Indicator = isDone ? CheckCircle2 : Circle
          const color = isActive || isDone ? appTheme.colors.goldBright : appTheme.colors.textMuted

          return (
            <View key={step.key} style={styles.step}>
              <View style={[styles.iconFrame, isActive && styles.iconFrameActive]}>
                <Icon color={color} size={19} />
              </View>
              <View style={styles.stepCopy}>
                <AppText variant="data" style={{ color }}>
                  {step.title}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {step.caption}
                </AppText>
              </View>
              <Indicator color={color} size={18} />
            </View>
          )
        })}
      </View>
    </TerminalCard>
  )
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  steps: {
    gap: theme.spacing.sm,
  },
  step: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: appTheme.colors.surfaceElevated,
    padding: theme.spacing.md,
  },
  iconFrame: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.03)'
        : 'rgba(124, 58, 237, 0.05)',
  },
  iconFrameActive: {
    borderColor: appTheme.colors.goldBright,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.1)'
        : 'rgba(216, 180, 95, 0.16)',
  },
  stepCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  })
}

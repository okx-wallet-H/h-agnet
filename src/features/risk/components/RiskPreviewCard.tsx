import { AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../../../components/primitives/AppText'
import { StatusPill } from '../../../components/primitives/StatusPill'
import { TerminalCard } from '../../../components/terminal/TerminalCard'
import { theme } from '../../../design-system/theme'
import type { RiskAssessment, RiskLevel } from '../../../services/risk/types'

type RiskPreviewCardProps = {
  assessment: RiskAssessment
}

const riskTone: Record<RiskLevel, 'success' | 'gold' | 'danger' | 'muted'> = {
  low: 'success',
  medium: 'gold',
  high: 'danger',
  blocked: 'danger',
}

const riskLabel: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中等风险',
  high: '高风险',
  blocked: '已阻止',
}

export function RiskPreviewCard({ assessment }: RiskPreviewCardProps) {
  const Icon = assessment.level === 'blocked' ? ShieldX : assessment.level === 'low' ? ShieldCheck : AlertTriangle

  return (
    <TerminalCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color="goldBright">
            风控预览
          </AppText>
          <AppText variant="section">
            {assessment.level === 'blocked'
              ? '执行已被阻止'
              : '需要授权审阅'}
          </AppText>
        </View>
        <Icon
          color={
            assessment.level === 'low'
              ? theme.colors.success
              : theme.colors.warning
          }
          size={22}
        />
      </View>

      <StatusPill
        label={riskLabel[assessment.level]}
        tone={riskTone[assessment.level]}
      />

      <View style={styles.reasons}>
        {assessment.reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <View style={styles.reasonDot} />
            <AppText color="textSecondary">{reason}</AppText>
          </View>
        ))}
      </View>

      {assessment.blockingReason ? (
        <View style={styles.blockBox}>
          <AppText variant="caption" color="danger">
            阻止原因
          </AppText>
          <AppText color="textSecondary">{assessment.blockingReason}</AppText>
        </View>
      ) : null}
    </TerminalCard>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  reasons: {
    gap: theme.spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  reasonDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.gold,
    marginTop: 7,
  },
  blockBox: {
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255, 77, 109, 0.08)',
    padding: theme.spacing.md,
  },
})

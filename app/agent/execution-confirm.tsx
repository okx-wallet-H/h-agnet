import { router } from 'expo-router'
import { LockKeyhole, ShieldCheck } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'
import { usePendingStrategyProposal } from '../../src/features/agent/hooks/useStrategyProposal'

export default function AgentExecutionConfirmScreen() {
  const pendingStrategy = usePendingStrategyProposal()

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="AI 执行"
        title="授权门"
        description="AI 生成的资产动作会被转换成明确提案，必须落在用户授权范围内。"
        statusLabel="已锁定"
        statusTone="danger"
      />

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              待处理动作
            </AppText>
            <AppText variant="section">
              {pendingStrategy.data ? '仅审阅策略' : '暂无可执行提案'}
            </AppText>
          </View>
          <StatusPill
            label={pendingStrategy.data ? '草案' : '仅审阅'}
            tone={pendingStrategy.data ? 'gold' : 'muted'}
          />
        </View>
        <MetricRow
          label="动作类型"
          value={pendingStrategy.data ? '策略请求' : '无'}
        />
        <MetricRow label="钱包影响" value="无" />
        <MetricRow label="风险等级" value="未评估" />
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              用户控制
            </AppText>
            <AppText variant="section">绝不自动执行</AppText>
          </View>
          <ShieldCheck color={theme.colors.success} size={22} />
        </View>
        <AppText color="textSecondary">
          即使 AI 生成策略，签名和执行也会保持禁用，直到用户授权完整提案或命中已有授权范围。
        </AppText>
      </TerminalCard>

      <Button fullWidth disabled>
        批准 AI 动作
      </Button>
      <Button variant="secondary" fullWidth onPress={() => router.push('/agent/history')}>
        查看 AI 历史
      </Button>
      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        返回
      </Button>

      <LockKeyhole color={theme.colors.borderMuted} size={1} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingTop: 72,
    paddingBottom: 48,
    backgroundColor: theme.colors.background,
  },
  card: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
})

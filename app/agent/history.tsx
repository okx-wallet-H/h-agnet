import { router } from 'expo-router'
import { FileClock, History } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'
import { useStrategyRuns } from '../../src/features/agent/hooks/useStrategySkills'

export default function AgentHistoryScreen() {
  const strategyRuns = useStrategyRuns()
  const runs = strategyRuns.data ?? []

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="AI 历史"
        title="决策轨迹"
        description="追踪意图、策略提案、风控决策和最终用户授权。"
        statusLabel={runs.length > 0 ? `${runs.length} 条记录` : '暂无记录'}
        statusTone={runs.length > 0 ? 'gold' : 'muted'}
      />

      {runs.length > 0 ? (
        runs.map((run) => (
          <TerminalCard key={run.id} style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.runCopy}>
                <AppText variant="caption" color="goldBright">
                  Agent Run
                </AppText>
                <AppText variant="section">{run.strategyId}</AppText>
              </View>
              <StatusPill
                label={formatRunStatus(run.status)}
                tone={run.status === 'blocked' ? 'danger' : 'gold'}
              />
            </View>
            <MetricRow label="版本" value={run.strategyVersion} />
            <MetricRow label="执行模式" value="草案" valueColor="textMuted" />
            <MetricRow label="H Skill" value={`${run.requiredSkillWrappers.length} 个`} />
            <AppText color="textSecondary">{run.nextStep}</AppText>
          </TerminalCard>
        ))
      ) : (
        <TerminalCard style={styles.card}>
          <View style={styles.iconBox}>
            <History color={theme.colors.textMuted} size={30} />
          </View>
          <AppText variant="section">暂无 Agent 运行记录</AppText>
          <AppText color="textSecondary">
            启动赚币 Agent 草案后，运行状态会显示在这里。
          </AppText>
        </TerminalCard>
      )}

      <TerminalCard style={styles.card}>
        <MetricRow label="意图日志" value="待接入" />
        <MetricRow label="风控决策" value="待接入" />
        <MetricRow
          label="执行记录"
          value={runs.length > 0 ? '已接入草案' : '待接入'}
          valueColor={runs.length > 0 ? 'goldBright' : 'textPrimary'}
        />
      </TerminalCard>

      <Button fullWidth onPress={() => router.back()}>
        返回
      </Button>

      <FileClock color={theme.colors.borderMuted} size={1} />
    </ScrollView>
  )
}

function formatRunStatus(status: string) {
  const labels: Record<string, string> = {
    blocked: '已阻止',
    idle: '待启动',
    starting: '启动中',
    planning: '规划中',
    'waiting-authorization': '等待授权',
    executing: '执行中',
    completed: '已完成',
    paused: '已暂停',
  }

  return labels[status] ?? status
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  runCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  iconBox: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surfaceElevated,
  },
})

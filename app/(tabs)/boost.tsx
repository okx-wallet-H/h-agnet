import {
  Award,
  CheckCircle2,
  Crown,
  Gem,
  LockKeyhole,
  Rocket,
  Trophy,
} from 'lucide-react-native'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { ActionTile } from '../../src/components/terminal/ActionTile'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import {
  useBoostGrowthSummary,
  useScoringRules,
  useSideQuestRules,
  useSideQuests,
} from '../../src/features/boost/hooks/useBoostGrowthSummary'
import type {
  BoostGrowthSummary,
  SideQuest,
} from '../../src/services/boost/types'

const boostActions = [
  {
    title: '支线',
    caption: '卡库接取',
    icon: Gem,
  },
  {
    title: '成就',
    caption: '自动解锁',
    icon: Trophy,
  },
  {
    title: '等级',
    caption: 'Agent 成长',
    icon: Crown,
  },
]

export default function BoostScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const growthQuery = useBoostGrowthSummary()
  const scoringRulesQuery = useScoringRules()
  const sideQuestRulesQuery = useSideQuestRules()
  const sideQuestsQuery = useSideQuests()
  const growth = growthQuery.data
  const scoringRules = scoringRulesQuery.data
  const sideQuestRules = sideQuestRulesQuery.data
  const sideQuests = sideQuestsQuery.data ?? []

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="支线任务"
        title="卡库成就"
        description="支线任务从卡库接取。交易卡、回执卡、分析卡和支线卡达到条件后，自动解锁对应成就。"
        statusLabel="卡库驱动"
        statusTone="gold"
      />

      <View style={styles.actionRow}>
        {boostActions.map((action) => (
          <ActionTile key={action.title} {...action} />
        ))}
      </View>

      <TerminalCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <AppText variant="caption" color="goldBright">
              成长分
            </AppText>
            <AppText variant="display">
              {growth ? growth.score : '--'}
            </AppText>
            <AppText color="textMuted">
              {growth ? growth.tier.label : '等待卡库数据'}
            </AppText>
          </View>
          <View style={styles.tierBadge}>
            <Rocket color={appTheme.colors.goldBright} size={26} />
            <StatusPill
              label={growth ? growth.modelVersion : '未激活'}
              tone={growth ? 'gold' : 'muted'}
            />
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${growth ? growth.tier.progress : 0}%` },
            ]}
          />
        </View>
        <AppText color="textSecondary">
          {getTierCopy(growth)}
        </AppText>
      </TerminalCard>

      <View style={styles.scoreRow}>
        <ScoreTile label="任务分" value={growth?.taskScore ?? 0} />
        <ScoreTile label="可信分" value={growth?.trustScore ?? 0} />
        <ScoreTile label="已验证" value={growth?.verifiedResultScore ?? 0} />
      </View>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              评分解释
            </AppText>
            <AppText variant="section">每一分都有来源</AppText>
          </View>
          <Crown color={appTheme.colors.goldBright} size={22} />
        </View>
        {growth ? (
          <View style={styles.breakdownList}>
            {growth.breakdown.map((item) => (
              <View key={item.id} style={styles.breakdownItem}>
                <View style={styles.breakdownTop}>
                  <AppText variant="data">{item.label}</AppText>
                  <AppText
                    variant="data"
                    color={item.points < 0 ? 'danger' : 'goldBright'}
                  >
                    {item.points > 0 ? '+' : ''}
                    {item.points}
                  </AppText>
                </View>
                <AppText variant="caption" color="textMuted">
                  {item.description}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText color="textSecondary">
            生成授权卡、任务卡或分析卡后，这里会显示具体加分来源。
          </AppText>
        )}
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              支线任务
            </AppText>
            <AppText variant="section">到卡库接任务</AppText>
          </View>
          <Award color={appTheme.colors.violet} size={22} />
        </View>
        {sideQuests.length > 0 ? (
          <View style={styles.sideQuestList}>
            {sideQuests.map((quest) => (
              <SideQuestCard key={quest.id} quest={quest} />
            ))}
          </View>
        ) : (
          <AppText color="textSecondary">
            正在读取卡库支线。生成交易卡、回执卡或分析卡后，进度会自动更新。
          </AppText>
        )}
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <AppText variant="caption" color="goldBright">
          接入状态
        </AppText>
        <MetricRow label="活动 API" value="未连接" />
        <MetricRow label="排行榜" value="未连接" />
        <MetricRow label="奖励领取" value="需要授权" />
        <MetricRow label="支线来源" value="卡库" valueColor="goldBright" />
        <MetricRow
          label="规则版本"
          value={sideQuestRules?.version ?? '等待同步'}
          valueColor={sideQuestRules ? 'goldBright' : 'textMuted'}
        />
        <MetricRow
          label="评分规则"
          value={scoringRules?.version ?? growth?.ruleSetVersion ?? '等待同步'}
          valueColor={scoringRules || growth ? 'goldBright' : 'textMuted'}
        />
      </TerminalCard>

      {growth ? (
        <TerminalCard style={styles.sectionCard}>
          <AppText variant="caption" color="goldBright">
            安全规则
          </AppText>
          {growth.caveats.map((item) => (
            <AppText key={item} color="textMuted">
              {item}
            </AppText>
          ))}
        </TerminalCard>
      ) : null}

      <Button
        variant="secondary"
        fullWidth
        onPress={() => router.push('/cards')}
      >
        打开卡库接支线
      </Button>
    </ScrollView>
  )
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <TerminalCard style={styles.scoreTile}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="section">{value}/100</AppText>
    </TerminalCard>
  )
}

function SideQuestCard({ quest }: { quest: SideQuest }) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const Icon = quest.status === 'unlocked' ? CheckCircle2 : LockKeyhole

  return (
    <View style={styles.sideQuestCard}>
      <View style={styles.sideQuestHeader}>
        <View style={styles.sideQuestTitle}>
          <View style={styles.sideQuestIcon}>
            <Icon
              color={
                quest.status === 'unlocked'
                  ? appTheme.colors.success
                  : appTheme.colors.goldBright
              }
              size={18}
            />
          </View>
          <View style={styles.sideQuestCopy}>
            <AppText variant="data">{quest.title}</AppText>
            <AppText variant="caption" color="textMuted">
              {quest.description}
            </AppText>
          </View>
        </View>
        <StatusPill
          label={getSideQuestStatusLabel(quest.status)}
          tone={getSideQuestStatusTone(quest.status)}
        />
      </View>

      <View style={styles.sideQuestProgressTrack}>
        <View
          style={[
            styles.sideQuestProgressFill,
            { width: `${quest.progress}%` },
          ]}
        />
      </View>

      <View style={styles.sideQuestFooter}>
        <AppText variant="caption" color="textMuted">
          {quest.requirement.current}/{quest.requirement.target}
          {quest.requirement.unit}
        </AppText>
        <AppText variant="caption" color="goldBright">
          {quest.rewardLabel}
        </AppText>
      </View>
    </View>
  )
}

function getSideQuestStatusLabel(status: SideQuest['status']) {
  if (status === 'unlocked') {
    return '已解锁'
  }

  if (status === 'active') {
    return '进行中'
  }

  return '未解锁'
}

function getSideQuestStatusTone(status: SideQuest['status']) {
  if (status === 'unlocked') {
    return 'success'
  }

  if (status === 'active') {
    return 'gold'
  }

  return 'muted'
}

function getTierCopy(growth?: BoostGrowthSummary) {
  if (!growth) {
    return '奖励数据不会伪造。生成卡片后，成长分会基于卡库记录计算。'
  }

  if (growth.tier.nextLabel && growth.tier.nextThreshold) {
    return `距离 ${growth.tier.nextLabel} 还需要 ${Math.max(
      growth.tier.nextThreshold - growth.score,
      0,
    )} 分。未广播回执只算成长信号，不算真实成功。`
  }

  return '你已经达到当前最高等级。真实成功记录仍必须等待后端验证。'
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
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  heroCard: {
    gap: theme.spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  tierBadge: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.borderMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.goldBright,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  scoreTile: {
    minHeight: 82,
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
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
  sideQuestList: {
    gap: theme.spacing.sm,
  },
  sideQuestCard: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderMuted,
    borderRadius: theme.radius.lg,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(247, 242, 232, 0.03)'
        : 'rgba(124, 58, 237, 0.04)',
    padding: theme.spacing.md,
  },
  sideQuestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sideQuestTitle: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sideQuestIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor:
      appTheme.mode === 'dark'
        ? 'rgba(216, 180, 95, 0.08)'
        : 'rgba(124, 58, 237, 0.08)',
  },
  sideQuestCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  sideQuestProgressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.borderMuted,
  },
  sideQuestProgressFill: {
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: appTheme.colors.goldBright,
  },
  sideQuestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  breakdownList: {
    gap: theme.spacing.sm,
  },
  breakdownItem: {
    gap: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.borderMuted,
    paddingBottom: theme.spacing.sm,
  },
  breakdownTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
})
}

import { router } from 'expo-router'
import { ArrowDownUp, LockKeyhole, ShieldAlert } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'
import { RiskPreviewCard } from '../../src/features/risk/components/RiskPreviewCard'
import { usePendingTradeProposal } from '../../src/features/trading/hooks/useTradeProposal'
import {
  emptyTradeProposal,
} from '../../src/features/trading/model/emptyTradeProposal'
import type { RiskAssessment } from '../../src/services/risk/types'

const riskAssessment: RiskAssessment = {
  level: 'blocked',
  requiresConfirmation: true,
  reasons: [
    '钱包尚未连接。',
    'OKX Swap 尚未返回 quote。',
    'OKX Swap 尚未返回 swap data。',
  ],
  blockingReason:
    '在钱包、OKX Swap quote、swap data、风控和用户授权全部可用前，执行会保持阻止状态。',
}

export default function TradeConfirmScreen() {
  const pendingProposal = usePendingTradeProposal()
  const proposal = pendingProposal.data ?? emptyTradeProposal

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="交易授权"
        title="审阅 OKX Swap 提案"
        description="H Wallet 只审阅和授权用户意图，真实兑换数据必须来自 OKX Swap。"
        statusLabel="已阻止"
        statusTone="danger"
      />

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              提案
            </AppText>
            <AppText variant="section">兑换草案</AppText>
          </View>
          <ArrowDownUp color={theme.colors.goldBright} size={22} />
        </View>
        <View style={styles.swapRoute}>
          <View style={styles.assetBox}>
            <AppText variant="caption" color="textMuted">
              支付
            </AppText>
            <AppText variant="title">{proposal.fromSymbol}</AppText>
            <AppText color="textMuted">{proposal.amount}</AppText>
          </View>
          <View style={styles.routeIcon}>
            <ArrowDownUp color={theme.colors.violet} size={20} />
          </View>
          <View style={styles.assetBox}>
            <AppText variant="caption" color="textMuted">
              获得
            </AppText>
            <AppText variant="title">{proposal.toSymbol}</AppText>
            <AppText color="textMuted">{proposal.estimatedOutput}</AppText>
          </View>
        </View>
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              路线详情
            </AppText>
            <AppText variant="section">等待 OKX Swap 路线</AppText>
          </View>
          <StatusPill label="缺少钱包" tone="danger" />
        </View>
        <MetricRow label="OKX 路线" value={proposal.routeLabel ?? '无'} />
        <MetricRow label="网络费用" value={proposal.networkFee ?? '--'} />
        <MetricRow
          label="滑点"
          value={proposal.slippageTolerance ?? '未设置'}
        />
      </TerminalCard>

      <RiskPreviewCard assessment={riskAssessment} />

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              执行锁
            </AppText>
            <AppText variant="section">禁止静默执行</AppText>
          </View>
          <LockKeyhole color={theme.colors.danger} size={22} />
        </View>
        <AppText color="textSecondary">
          只有钱包会话、OKX Swap quote、swap data、风控结果和用户明确授权全部存在时，最终执行按钮才会开放。
        </AppText>
      </TerminalCard>

      <View style={styles.actions}>
        <Button fullWidth disabled>
          执行交易
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => router.push('/trade/blocked')}
        >
          查看阻止原因
        </Button>
        <Button variant="ghost" fullWidth onPress={() => router.back()}>
          返回
        </Button>
      </View>

      <ShieldAlert color={theme.colors.borderMuted} size={1} />
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
  swapRoute: {
    gap: theme.spacing.md,
  },
  assetBox: {
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.lg,
  },
  routeIcon: {
    alignSelf: 'center',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  actions: {
    gap: theme.spacing.md,
  },
})

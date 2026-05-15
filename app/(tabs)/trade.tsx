import { useMemo, useState } from 'react'
import { ArrowDownUp, BadgeAlert, ChartCandlestick, Shield } from 'lucide-react-native'
import { router } from 'expo-router'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { ActionTile } from '../../src/components/terminal/ActionTile'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'
import { useCreateTradeProposal } from '../../src/features/trading/hooks/useTradeProposal'
import { isApiConfigured } from '../../src/services/api/httpClient'
import { getTradingIntegrationStatus } from '../../src/services/trading/tradingService'

const tradingStatus = getTradingIntegrationStatus()

const tradeActions = [
  {
    title: '兑换',
    caption: '先输入意图',
    icon: ArrowDownUp,
  },
  {
    title: '行情',
    caption: '市场视图',
    icon: ChartCandlestick,
  },
  {
    title: '风控',
    caption: '执行前检查',
    icon: Shield,
  },
]

export default function TradeScreen() {
  const [intent, setIntent] = useState('帮我准备一笔小额兑换，先走 OKX Swap 报价，不要执行。')
  const createProposal = useCreateTradeProposal()
  const backendConfigured = isApiConfigured()
  const canCreate = useMemo(
    () =>
      backendConfigured &&
      intent.trim().length > 0 &&
      !createProposal.isPending,
    [backendConfigured, createProposal.isPending, intent],
  )

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="OKX Swap"
        title="Swap 工作台"
        description="AI 只负责理解意图和生成授权卡；报价、路线聚合、swap data 和交易状态交给 OKX Swap。"
        statusLabel="受保护"
        statusTone="gold"
      />

      <View style={styles.actionRow}>
        {tradeActions.map((action) => (
          <ActionTile key={action.title} {...action} />
        ))}
      </View>

      <TerminalCard style={styles.swapCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              兑换意图
            </AppText>
            <AppText variant="section">等待生成交易草案</AppText>
          </View>
          <StatusPill label="草案" tone="muted" />
        </View>

        <View style={styles.swapBox}>
          <AppText variant="caption" color="textMuted">
            支付
          </AppText>
          <View style={styles.assetRow}>
            <AppText variant="title">--</AppText>
            <AppText color="textMuted">连接钱包</AppText>
          </View>
        </View>

        <View style={styles.swapBox}>
          <AppText variant="caption" color="textMuted">
            获得
          </AppText>
          <View style={styles.assetRow}>
            <AppText variant="title">--</AppText>
            <AppText color="textMuted">选择代币</AppText>
          </View>
        </View>

        <TextInput
          editable={backendConfigured}
          multiline
          onChangeText={setIntent}
          placeholder="告诉 H Wallet 你想准备什么交易。"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.intentInput}
          value={intent}
        />
      </TerminalCard>

      <TerminalCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              提案流水线
            </AppText>
            <AppText variant="section">等待 OKX Swap Quote</AppText>
          </View>
          <BadgeAlert color={theme.colors.warning} size={22} />
        </View>
        <MetricRow label="OKX Swap 适配器" value={formatStatus(tradingStatus.status)} />
        <MetricRow label="环境" value={tradingStatus.environment} />
        <MetricRow
          label="模块 API"
          value={backendConfigured ? '已配置' : '未配置'}
          valueColor={backendConfigured ? 'goldBright' : 'textMuted'}
        />
        <MetricRow label="OKX Quote" value="待请求" />
        <MetricRow label="OKX Swap Data" value="待生成" />
      </TerminalCard>

      {createProposal.data ? (
        <TerminalCard style={styles.sectionCard}>
          <AppText variant="caption" color="goldBright">
            OKX Swap 草案
          </AppText>
          <AppText variant="section">意图卡片已创建</AppText>
          <MetricRow label="提案" value={createProposal.data.id} />
          <MetricRow label="状态" value="草案" />
          <MetricRow
            label="执行"
            value="已阻止"
            valueColor="danger"
          />
        </TerminalCard>
      ) : null}

      {createProposal.isError ? (
        <TerminalCard style={styles.sectionCard}>
          <AppText variant="caption" color="goldBright">
            OKX Swap 草案
          </AppText>
          <AppText variant="section">模块 API 不可用</AppText>
          <AppText color="textSecondary">
            H Wallet 后端没有接收草案。请检查后端服务和 API 地址配置。
          </AppText>
        </TerminalCard>
      ) : null}

      <TerminalCard style={styles.sectionCard}>
        <AppText variant="caption" color="goldBright">
          授权规则
        </AppText>
        <AppText color="textSecondary">
          H Wallet 不重复造交易系统。首次交易需要用户授权；后续同类交易可由 Agent 发起 OKX Swap 编排，真实 quote、路线、swap data 和状态必须来自 OKX。
        </AppText>
      </TerminalCard>

      <Button
        fullWidth
        disabled={!canCreate}
        onPress={() =>
          createProposal.mutate({
            intent: intent.trim(),
          })
        }
      >
        {createProposal.isPending ? '正在创建草案' : '创建 OKX Swap 卡片'}
      </Button>
      <Button variant="secondary" fullWidth onPress={() => router.push('/confirm')}>
        打开授权中心
      </Button>
    </ScrollView>
  )
}

function formatStatus(status: string) {
  if (status === 'not-configured') {
    return '未配置'
  }

  if (status === 'ready') {
    return '已就绪'
  }

  return status
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingTop: 72,
    paddingBottom: 112,
    backgroundColor: theme.colors.background,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  swapCard: {
    gap: theme.spacing.md,
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
  swapBox: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.lg,
  },
  intentInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    padding: theme.spacing.lg,
    textAlignVertical: 'top',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
})

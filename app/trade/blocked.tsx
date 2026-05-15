import { router } from 'expo-router'
import { Ban, ShieldX } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'

export default function TradeBlockedScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="交易已阻止"
        title="执行已停止"
        description="H Wallet 会在不安全或不完整的执行路径到达钱包签名前主动阻止。"
        statusLabel="受保护"
        statusTone="danger"
      />

      <TerminalCard style={styles.card}>
        <View style={styles.iconBox}>
          <ShieldX color={theme.colors.danger} size={30} />
        </View>
        <AppText variant="section">缺少执行前置条件</AppText>
        <MetricRow label="钱包会话" value="缺失" valueColor="danger" />
        <MetricRow label="OKX Quote" value="缺失" valueColor="danger" />
        <MetricRow label="OKX Swap Data" value="缺失" valueColor="danger" />
        <MetricRow label="风控决策" value="已阻止" valueColor="danger" />
        <MetricRow label="用户授权" value="不可用" />
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              规则
            </AppText>
            <AppText variant="section">授权后才可执行</AppText>
          </View>
          <Ban color={theme.colors.goldBright} size={22} />
        </View>
        <AppText color="textSecondary">
          这是早期集成阶段的默认安全状态。只有钱包、OKX Swap quote、swap data、风控和授权策略完成后，真实兑换才会开放。
        </AppText>
      </TerminalCard>

      <Button fullWidth onPress={() => router.back()}>
        返回审阅
      </Button>
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
  iconBox: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
})

import { router } from 'expo-router'
import { Network } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'

const networks = ['X Layer', 'Ethereum', 'Solana', 'Base', 'Arbitrum']

export default function NetworkSettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="网络"
        title="链路由"
        description="网络选择会服务于 Agent Wallet、OKX Swap quote、swap data 和风控。"
        statusLabel="已预留"
        statusTone="gold"
      />

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              支持槽位
            </AppText>
            <AppText variant="section">等待适配器数据</AppText>
          </View>
          <Network color={theme.colors.violet} size={22} />
        </View>
        <View style={styles.networkList}>
          {networks.map((network) => (
            <View key={network} style={styles.networkItem}>
              <View style={styles.networkDot} />
              <AppText variant="data">{network}</AppText>
              <StatusPill label="待接入" tone="muted" />
            </View>
          ))}
        </View>
      </TerminalCard>

      <Button fullWidth onPress={() => router.back()}>
        返回
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  networkList: {
    gap: theme.spacing.sm,
  },
  networkItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderMuted,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.violet,
  },
})

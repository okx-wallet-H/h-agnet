import { router } from 'expo-router'
import { LockKeyhole, ShieldCheck } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'

export default function SecuritySettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="安全"
        title="执行护栏"
        description="高风险钱包动作必须经过模拟、风控审查和用户明确授权。"
        statusLabel="已启用"
        statusTone="success"
      />

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              策略
            </AppText>
            <AppText variant="section">默认保护</AppText>
          </View>
          <ShieldCheck color={theme.colors.success} size={22} />
        </View>
        <MetricRow label="静默交易" value="已阻止" valueColor="danger" />
        <MetricRow label="交易模拟" value="必需" />
        <MetricRow label="用户授权" value="首次必需" />
        <MetricRow label="密钥存储" value="仅后端" />
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              本地存储
            </AppText>
            <AppText color="textSecondary">
              MMKV 只用于非敏感 App 状态。Secure Store 仅用于敏感移动端会话元数据。
            </AppText>
          </View>
          <LockKeyhole color={theme.colors.goldBright} size={22} />
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
})

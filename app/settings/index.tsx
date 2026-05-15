import { router } from 'expo-router'
import {
  Moon,
  Network,
  Settings,
  ShieldCheck,
  Sun,
  WalletCards,
} from 'lucide-react-native'
import { useMemo, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { useAppStore } from '../../src/store/appStore'

const settingsItems = [
  {
    title: '安全',
    caption: '钱包与执行护栏',
    href: '/settings/security',
    icon: ShieldCheck,
  },
  {
    title: '网络',
    caption: '预留多链配置',
    href: '/settings/networks',
    icon: Network,
  },
  {
    title: 'OKX / OnchainOS',
    caption: '后端适配器状态',
    href: '/settings/okx',
    icon: WalletCards,
  },
]

export default function SettingsScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const themeMode = useAppStore((state) => state.themeMode)
  const setThemeMode = useAppStore((state) => state.setThemeMode)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="设置"
        title="控制面板"
        description="管理安全、网络、OKX 集成和 App 行为配置。"
        statusLabel="第一阶段"
        statusTone="purple"
      />

      <TerminalCard style={styles.themeCard}>
        <View style={styles.themeHeader}>
          <Settings color={appTheme.colors.goldBright} size={22} />
          <View style={styles.itemCopy}>
            <AppText variant="section">显示模式</AppText>
            <AppText color="textMuted">
              夜间用于高级交易终端，白天用于轻量社区与日常使用。
            </AppText>
          </View>
        </View>
        <View style={styles.themeSwitch}>
          <ThemeModeButton
            active={themeMode === 'dark'}
            icon={
              <Moon
                color={
                  themeMode === 'dark' ? '#FFFFFF' : appTheme.colors.textMuted
                }
                size={18}
              />
            }
            label="夜间"
            onPress={() => setThemeMode('dark')}
          />
          <ThemeModeButton
            active={themeMode === 'light'}
            icon={
              <Sun
                color={
                  themeMode === 'light' ? '#FFFFFF' : appTheme.colors.textMuted
                }
                size={18}
              />
            }
            label="白天"
            onPress={() => setThemeMode('light')}
          />
        </View>
      </TerminalCard>

      <View style={styles.list}>
        {settingsItems.map((item) => {
          const Icon = item.icon

          return (
            <Pressable
              key={item.title}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <TerminalCard style={styles.item}>
                <Icon color={appTheme.colors.goldBright} size={22} />
                <View style={styles.itemCopy}>
                  <AppText variant="section">{item.title}</AppText>
                  <AppText color="textMuted">{item.caption}</AppText>
                </View>
              </TerminalCard>
            </Pressable>
          )
        })}
      </View>

      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        返回
      </Button>
    </ScrollView>
  )
}

function ThemeModeButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onPress: () => void
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.themeModeButton, active && styles.themeModeButtonActive]}
    >
      {icon}
      <AppText
        variant="data"
        color={active ? 'textPrimary' : 'textMuted'}
        style={active ? styles.themeModeTextActive : undefined}
      >
        {label}
      </AppText>
    </Pressable>
  )
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingTop: 72,
    paddingBottom: 48,
    backgroundColor: appTheme.colors.background,
  },
  list: {
    gap: theme.spacing.md,
  },
  themeCard: {
    gap: theme.spacing.md,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  themeSwitch: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  themeModeButton: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  themeModeButtonActive: {
    borderColor: appTheme.colors.purple,
    backgroundColor: appTheme.colors.purple,
  },
  themeModeTextActive: {
    color: '#FFFFFF',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  itemCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.82,
  },
  })
}

import { StyleSheet, View, type ViewStyle } from 'react-native'

import { theme, useAppTheme } from '../../design-system/theme'
import type { ColorToken } from '../../design-system/tokens/colors'
import { AppText } from './AppText'

type StatusPillTone = 'gold' | 'purple' | 'success' | 'muted' | 'danger'

type StatusPillProps = {
  label: string
  tone?: StatusPillTone
  style?: ViewStyle
}

const toneColor: Record<StatusPillTone, ColorToken> = {
  gold: 'goldBright',
  purple: 'violet',
  success: 'success',
  muted: 'textMuted',
  danger: 'danger',
}

const toneBackground: Record<'dark' | 'light', Record<StatusPillTone, string>> = {
  dark: {
    gold: 'rgba(216, 180, 95, 0.12)',
    purple: 'rgba(124, 58, 237, 0.16)',
    success: 'rgba(24, 196, 124, 0.12)',
    muted: 'rgba(115, 106, 131, 0.12)',
    danger: 'rgba(255, 77, 109, 0.12)',
  },
  light: {
    gold: 'rgba(216, 180, 95, 0.18)',
    purple: 'rgba(124, 58, 237, 0.1)',
    success: 'rgba(24, 196, 124, 0.1)',
    muted: 'rgba(133, 118, 149, 0.12)',
    danger: 'rgba(255, 77, 109, 0.1)',
  },
}

export function StatusPill({ label, tone = 'muted', style }: StatusPillProps) {
  const appTheme = useAppTheme()

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: toneBackground[appTheme.mode][tone],
          borderColor: appTheme.colors[toneColor[tone]],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: appTheme.colors[toneColor[tone]],
          },
        ]}
      />
      <AppText variant="caption" color={toneColor[tone]}>
        {label}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
})

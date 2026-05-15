import { useMemo, type PropsWithChildren } from 'react'
import { StyleSheet, View, type ViewProps } from 'react-native'

import { theme, useAppTheme, type AppTheme } from '../../design-system/theme'

type TerminalCardProps = PropsWithChildren<ViewProps>

export function TerminalCard({ children, style, ...props }: TerminalCardProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  )
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: appTheme.colors.surfaceTerminal,
    padding: theme.spacing.lg,
    shadowColor: appTheme.colors.purple,
    shadowOpacity: appTheme.mode === 'dark' ? 0.18 : 0.1,
    shadowRadius: appTheme.mode === 'dark' ? 24 : 18,
    shadowOffset: { width: 0, height: appTheme.mode === 'dark' ? 14 : 10 },
  },
  })
}

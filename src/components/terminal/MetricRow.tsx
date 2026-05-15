import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { theme, useAppTheme, type AppTheme } from '../../design-system/theme'
import type { ColorToken } from '../../design-system/tokens/colors'
import { AppText } from '../primitives/AppText'

type MetricRowProps = {
  label: string
  value: string
  valueColor?: ColorToken
}

export function MetricRow({
  label,
  value,
  valueColor = 'textPrimary',
}: MetricRowProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.row}>
      <AppText color="textMuted">{label}</AppText>
      <AppText variant="data" color={valueColor}>
        {value}
      </AppText>
    </View>
  )
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
  row: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.borderMuted,
  },
  })
}

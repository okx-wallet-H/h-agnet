import type { PropsWithChildren } from 'react'
import { Text, type TextProps, StyleSheet } from 'react-native'

import { theme, useAppTheme } from '../../design-system/theme'
import type { ColorToken } from '../../design-system/tokens/colors'

type TextVariant = keyof typeof theme.typography

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant
    color?: ColorToken
  }
>

export function AppText({
  children,
  variant = 'body',
  color = 'textPrimary',
  style,
  ...props
}: AppTextProps) {
  const appTheme = useAppTheme()

  return (
    <Text
      {...props}
      style={[
        styles.base,
        appTheme.typography[variant],
        { color: appTheme.colors[color] },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
})

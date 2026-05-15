import { useMemo, type PropsWithChildren } from 'react'
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { theme, useAppTheme, type AppTheme } from '../../design-system/theme'
import { AppText } from './AppText'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = PropsWithChildren<
  PressableProps & {
    variant?: ButtonVariant
    fullWidth?: boolean
  }
>

export function Button({
  children,
  variant = 'primary',
  fullWidth,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const accentText = appTheme.mode === 'dark' ? 'goldBright' : 'purple'
  const content = (
    <AppText
      variant="data"
      color={variant === 'primary' ? 'textPrimary' : accentText}
      style={variant === 'primary' ? styles.primaryText : undefined}
    >
      {children}
    </AppText>
  )

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  )
}

const sharedButton: ViewStyle = {
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: theme.radius.md,
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
  base: {
    ...sharedButton,
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: appTheme.colors.purple,
  },
  secondary: {
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.lg,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.lg,
  },
  gradient: {
    ...sharedButton,
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  })
}

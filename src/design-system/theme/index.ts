import { useMemo } from 'react'

import { darkColors, lightColors } from '../tokens/colors'
import { gradients } from '../tokens/gradients'
import { radius } from '../tokens/radius'
import { spacing } from '../tokens/spacing'
import { typography } from '../tokens/typography'
import { useAppStore, type ThemeMode } from '../../store/appStore'

export const darkTheme = {
  mode: 'dark',
  colors: darkColors,
  gradients,
  radius,
  spacing,
  typography,
} as const

export const lightTheme = {
  ...darkTheme,
  mode: 'light',
  colors: lightColors,
} as const

export const themes = {
  dark: darkTheme,
  light: lightTheme,
} as const satisfies Record<ThemeMode, typeof darkTheme | typeof lightTheme>

export const theme = darkTheme

export type AppTheme = (typeof themes)[ThemeMode]

export function useAppTheme(): AppTheme {
  const themeMode = useAppStore((state) => state.themeMode)

  return useMemo(() => themes[themeMode], [themeMode])
}

const brandColors = {
  gold: '#D8B45F',
  goldBright: '#F4D98B',
  purple: '#7C3AED',
  violet: '#A855F7',
  magenta: '#D946EF',
  success: '#18C47C',
  danger: '#FF4D6D',
  warning: '#F59E0B',
} as const

export const darkColors = {
  background: '#05040A',
  surface: '#0B0A12',
  surfaceElevated: '#12101C',
  surfaceTerminal: '#171322',
  border: '#282238',
  borderMuted: '#1E1A2A',
  textPrimary: '#F7F2E8',
  textSecondary: '#B9AFC8',
  textMuted: '#736A83',
  ...brandColors,
} as const

export const lightColors = {
  background: '#F8F6FF',
  surface: '#FFFFFF',
  surfaceElevated: '#F2EEFF',
  surfaceTerminal: '#FFFFFF',
  border: '#DED6F4',
  borderMuted: '#EAE4F8',
  textPrimary: '#171021',
  textSecondary: '#4E425E',
  textMuted: '#857695',
  ...brandColors,
} as const

export const colors = darkColors

export type ColorToken = keyof typeof darkColors

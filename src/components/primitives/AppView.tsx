import type { PropsWithChildren } from 'react'
import { View, type ViewProps } from 'react-native'

type AppViewProps = PropsWithChildren<ViewProps>

export function AppView({ children, style, ...props }: AppViewProps) {
  return (
    <View {...props} style={style}>
      {children}
    </View>
  )
}

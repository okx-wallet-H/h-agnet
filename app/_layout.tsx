import 'react-native-gesture-handler'
import '../global.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { queryClient } from '../src/services/api/queryClient'
import { useAppTheme } from '../src/design-system/theme'
import { AgentWalletSessionBootstrap } from '../src/features/auth/components/AgentWalletSessionBootstrap'

export default function RootLayout() {
  const appTheme = useAppTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <AgentWalletSessionBootstrap />
      <StatusBar style={appTheme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: appTheme.colors.background },
        }}
      />
    </QueryClientProvider>
  )
}

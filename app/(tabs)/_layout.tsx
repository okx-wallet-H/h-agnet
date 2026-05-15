import { Tabs } from 'expo-router'
import { Bot, ChartCandlestick, Gem, House, Wallet } from 'lucide-react-native'

import { useAppTheme } from '../../src/design-system/theme'

const iconSize = 21

export default function TabsLayout() {
  const appTheme = useAppTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: appTheme.colors.goldBright,
        tabBarInactiveTintColor: appTheme.colors.textMuted,
        tabBarStyle: {
          display: 'none',
          height: 78,
          paddingTop: 10,
          paddingBottom: 18,
          borderTopWidth: 1,
          borderTopColor: appTheme.colors.borderMuted,
          backgroundColor: appTheme.colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <House color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: '钱包',
          tabBarIcon: ({ color }) => <Wallet color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: '交易',
          tabBarIcon: ({ color }) => (
            <ChartCandlestick color={color} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => <Bot color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="boost"
        options={{
          title: '赚币',
          tabBarIcon: ({ color }) => <Gem color={color} size={iconSize} />,
        }}
      />
    </Tabs>
  )
}

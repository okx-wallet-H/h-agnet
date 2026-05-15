import { createMMKV } from 'react-native-mmkv'

export const appStorage = createMMKV({
  id: 'h-agent-app-storage',
})

import * as SecureStore from 'expo-secure-store'

const sessionTokenKey = 'h-wallet-session-token'
let memorySessionToken: string | null = null

export async function getApiSessionToken() {
  if (memorySessionToken) {
    return memorySessionToken
  }

  try {
    if (await SecureStore.isAvailableAsync()) {
      memorySessionToken = await SecureStore.getItemAsync(sessionTokenKey)
    }
  } catch {
    memorySessionToken = null
  }

  return memorySessionToken
}

export async function setApiSessionToken(token: string | null) {
  memorySessionToken = token

  try {
    if (!(await SecureStore.isAvailableAsync())) {
      return
    }

    if (token) {
      await SecureStore.setItemAsync(sessionTokenKey, token)
      return
    }

    await SecureStore.deleteItemAsync(sessionTokenKey)
  } catch {
    // SecureStore is not available in every preview target; keep memory fallback.
  }
}

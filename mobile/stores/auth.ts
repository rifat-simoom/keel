import { create } from 'zustand'
import { configure, configureAuth } from '@keel/api'

configure({ baseURL: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8000' })
import {
  clearStoredTokens,
  getStoredRefreshToken,
  refreshAccessToken,
  saveTokens,
} from '../lib/auth'
import type { TokenResponse } from 'expo-auth-session'

interface AuthState {
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setTokenResponse: (tokenResponse: TokenResponse) => Promise<void>
  clearAuth: () => Promise<void>
  initFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  async setTokenResponse(tokenResponse) {
    await saveTokens(tokenResponse)
    set({
      accessToken: tokenResponse.accessToken,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  async clearAuth() {
    await clearStoredTokens()
    set({ accessToken: null, isAuthenticated: false, isLoading: false })
  },

  async initFromStorage() {
    const rt = await getStoredRefreshToken()
    if (!rt) {
      set({ isLoading: false })
      return
    }
    try {
      const fresh = await refreshAccessToken(rt)
      await get().setTokenResponse(fresh)
    } catch {
      await get().clearAuth()
    }
  },
}))

// Wire the shared Axios client
configureAuth(
  () => useAuthStore.getState().accessToken,
  async () => {
    const rt = await getStoredRefreshToken()
    if (!rt) throw new Error('No refresh token in secure store')
    const fresh = await refreshAccessToken(rt)
    await useAuthStore.getState().setTokenResponse(fresh)
    return fresh.accessToken
  },
)

import { create } from 'zustand'
import { configure, configureAuth } from '@keel/api'
import { refreshTokens } from '../lib/keycloak'

configure({ baseURL: import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:8000' })

const REFRESH_TOKEN_KEY = 'keel_rt'

interface AuthState {
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  initFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    set({ accessToken, isAuthenticated: true, isLoading: false })
  },

  clearAuth() {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    set({ accessToken: null, isAuthenticated: false, isLoading: false })
  },

  async initFromStorage() {
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!rt) {
      set({ isLoading: false })
      return
    }
    try {
      const tokens = await refreshTokens(rt)
      get().setTokens(tokens.access_token, tokens.refresh_token)
    } catch {
      get().clearAuth()
    }
  },
}))

// Wire the shared API client once
configureAuth(
  () => useAuthStore.getState().accessToken,
  async () => {
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!rt) throw new Error('No refresh token')
    const tokens = await refreshTokens(rt)
    useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token)
    return tokens.access_token
  },
)

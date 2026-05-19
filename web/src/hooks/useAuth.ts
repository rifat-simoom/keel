import { useAuthStore } from '../stores/auth'
import { buildLogoutUrl } from '../lib/keycloak'

export function useAuth() {
  const { accessToken, isAuthenticated, isLoading, clearAuth } = useAuthStore()

  function logout() {
    clearAuth()
    const url = buildLogoutUrl(`${window.location.origin}/login`)
    window.location.href = url
  }

  return { accessToken, isAuthenticated, isLoading, logout }
}

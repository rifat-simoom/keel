import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCode } from '../lib/keycloak'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '@keel/api'
import type { UserProfile } from '@keel/types'

export function CallbackPage() {
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const error = params.get('error')

      if (error) {
        navigate('/login?error=' + encodeURIComponent(error), { replace: true })
        return
      }
      if (!code || !state) {
        navigate('/login', { replace: true })
        return
      }

      const storedState = sessionStorage.getItem('pkce_state')
      const verifier = sessionStorage.getItem('pkce_verifier')
      sessionStorage.removeItem('pkce_state')
      sessionStorage.removeItem('pkce_verifier')

      if (state !== storedState || !verifier) {
        navigate('/login?error=state_mismatch', { replace: true })
        return
      }

      try {
        const tokens = await exchangeCode(code, verifier)
        setTokens(tokens.access_token, tokens.refresh_token)

        // Ensure user profile exists in our DB — register on first login
        try {
          await apiClient.get('/api/v1/auth/me')
        } catch (err: any) {
          if (err?.response?.status === 404) {
            // First login — prompt registration (Phase 2 handles the onboarding modal)
            navigate('/onboarding', { replace: true })
            return
          }
        }

        navigate('/', { replace: true })
      } catch {
        navigate('/login?error=token_exchange_failed', { replace: true })
      }
    }

    handleCallback()
  }, [navigate, setTokens])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-keel-500 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../lib/pkce'
import { buildAuthUrl } from '../lib/keycloak'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  async function handleSignIn() {
    const verifier = await generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    const state = generateState()

    sessionStorage.setItem('pkce_verifier', verifier)
    sessionStorage.setItem('pkce_state', state)

    window.location.href = buildAuthUrl(challenge, state)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-keel-900">Keel</h1>
          <p className="mt-2 text-sm text-gray-500">
            Business banking for UK freelancers
          </p>
        </div>

        <button
          onClick={handleSignIn}
          className="w-full rounded-xl bg-keel-500 py-3 text-sm font-semibold text-white transition hover:bg-keel-900 focus:outline-none focus:ring-2 focus:ring-keel-500 focus:ring-offset-2"
        >
          Sign in to Keel
        </button>

        <p className="text-center text-xs text-gray-400">
          New account? Just sign in — we&apos;ll set you up on first login.
        </p>
      </div>
    </div>
  )
}

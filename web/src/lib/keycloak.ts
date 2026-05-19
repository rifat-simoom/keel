const KC_URL = import.meta.env['VITE_KEYCLOAK_URL'] as string
const KC_REALM = import.meta.env['VITE_KEYCLOAK_REALM'] as string
const CLIENT_ID = import.meta.env['VITE_KEYCLOAK_CLIENT_ID'] as string
const REDIRECT_URI = `${window.location.origin}/callback`

const BASE = `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect`

export interface TokenSet {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
}

export function buildAuthUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })
  return `${BASE}/auth?${params.toString()}`
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
  const resp = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: codeVerifier,
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Token exchange failed: ${err}`)
  }
  return resp.json() as Promise<TokenSet>
}

export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const resp = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  })
  if (!resp.ok) throw new Error('Token refresh failed')
  return resp.json() as Promise<TokenSet>
}

export function buildLogoutUrl(postLogoutRedirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    post_logout_redirect_uri: postLogoutRedirectUri,
  })
  return `${BASE}/logout?${params.toString()}`
}

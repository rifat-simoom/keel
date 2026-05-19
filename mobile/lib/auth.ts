import {
  makeRedirectUri,
  useAuthRequest,
  exchangeCodeAsync,
  refreshAsync,
  type TokenResponse,
} from 'expo-auth-session'
import * as SecureStore from 'expo-secure-store'

const DISCOVERY = {
  authorizationEndpoint: `${process.env['EXPO_PUBLIC_KEYCLOAK_URL']}/realms/${process.env['EXPO_PUBLIC_KEYCLOAK_REALM']}/protocol/openid-connect/auth`,
  tokenEndpoint: `${process.env['EXPO_PUBLIC_KEYCLOAK_URL']}/realms/${process.env['EXPO_PUBLIC_KEYCLOAK_REALM']}/protocol/openid-connect/token`,
  revocationEndpoint: `${process.env['EXPO_PUBLIC_KEYCLOAK_URL']}/realms/${process.env['EXPO_PUBLIC_KEYCLOAK_REALM']}/protocol/openid-connect/revoke`,
  endSessionEndpoint: `${process.env['EXPO_PUBLIC_KEYCLOAK_URL']}/realms/${process.env['EXPO_PUBLIC_KEYCLOAK_REALM']}/protocol/openid-connect/logout`,
}

export const CLIENT_ID = process.env['EXPO_PUBLIC_KEYCLOAK_CLIENT_ID'] ?? 'keel-mobile'

export const REDIRECT_URI = makeRedirectUri({ scheme: 'com.keelapp', path: 'callback' })

const SECURE_KEY_REFRESH = 'keel_refresh_token'
const SECURE_KEY_ACCESS = 'keel_access_token'

export { DISCOVERY }

export async function saveTokens(tokenResponse: TokenResponse): Promise<void> {
  if (tokenResponse.refreshToken) {
    await SecureStore.setItemAsync(SECURE_KEY_REFRESH, tokenResponse.refreshToken)
  }
  if (tokenResponse.accessToken) {
    await SecureStore.setItemAsync(SECURE_KEY_ACCESS, tokenResponse.accessToken)
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEY_REFRESH)
}

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEY_ACCESS)
}

export async function clearStoredTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_KEY_REFRESH)
  await SecureStore.deleteItemAsync(SECURE_KEY_ACCESS)
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return refreshAsync(
    { clientId: CLIENT_ID, refreshToken },
    { tokenEndpoint: DISCOVERY.tokenEndpoint },
  )
}

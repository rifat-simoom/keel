import { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import {
  useAuthRequest,
  exchangeCodeAsync,
  ResponseType,
} from 'expo-auth-session'
import { useAuthStore } from '../../stores/auth'
import { CLIENT_ID, DISCOVERY, REDIRECT_URI } from '../../lib/auth'

export default function LoginScreen() {
  const router = useRouter()
  const { isAuthenticated, isLoading, setTokenResponse } = useAuthStore()

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      responseType: ResponseType.Code,
      redirectUri: REDIRECT_URI,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
    },
    DISCOVERY,
  )

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(app)/')
    }
  }, [isAuthenticated, isLoading, router])

  // Handle Keycloak callback
  useEffect(() => {
    if (response?.type !== 'success') return
    const { code } = response.params

    async function exchange() {
      if (!request?.codeVerifier || !code) return
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI,
          code,
          extraParams: { code_verifier: request.codeVerifier },
        },
        { tokenEndpoint: DISCOVERY.tokenEndpoint },
      )
      await setTokenResponse(tokenResponse)
      router.replace('/(app)/')
    }

    exchange().catch(console.error)
  }, [response, request, setTokenResponse, router])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0057b8" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>Keel</Text>
        <Text style={styles.subtitle}>Business banking for UK freelancers</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <Text style={styles.buttonText}>Sign in to Keel</Text>
        </Pressable>

        <Text style={styles.hint}>
          New here? Just sign in — we'll set you up on first login.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  logo: { fontSize: 36, fontWeight: '700', color: '#00234a' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center' },
  button: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#0057b8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
})

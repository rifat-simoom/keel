import axios, { type AxiosInstance } from 'axios'

let _getToken: (() => string | null) | null = null
let _refreshFn: (() => Promise<string>) | null = null

export function configure({ baseURL }: { baseURL: string }): void {
  apiClient.defaults.baseURL = baseURL
}

export function configureAuth(
  getToken: () => string | null,
  refreshToken: () => Promise<string>,
): void {
  _getToken = getToken
  _refreshFn = refreshToken
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = _getToken?.()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && _refreshFn) {
      try {
        const newToken = await _refreshFn()
        error.config.headers.Authorization = `Bearer ${newToken}`
        return apiClient.request(error.config)
      } catch {
        // refresh failed — let the 401 propagate
      }
    }
    return Promise.reject(error)
  },
)

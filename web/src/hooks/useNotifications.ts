import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { apiClient } from '@keel/api'
import type { Deadline, Notification, NotificationListResponse } from '@keel/types'

const NOTIF_BASE = import.meta.env.VITE_NOTIFICATIONS_API_URL || 'http://localhost:8006'

export function useNotifications(unreadOnly = false) {
  return useInfiniteQuery({
    queryKey: ['notifications', 'list', unreadOnly],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get<NotificationListResponse>('/api/v1/notifications', {
        baseURL: NOTIF_BASE,
        params: { page: pageParam, page_size: 20, unread_only: unreadOnly },
      })
      return data
    },
    getNextPageParam: (_last, pages) => {
      const loaded = pages.flatMap((p) => p.items).length
      const total = pages[0]?.total ?? 0
      return loaded < total ? pages.length + 1 : undefined
    },
    initialPageParam: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,   // poll every 30s for new notifications
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationListResponse>('/api/v1/notifications', {
        baseURL: NOTIF_BASE,
        params: { page: 1, page_size: 1 },
      })
      return data.unread_count
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/notifications/${id}/read`, {}, { baseURL: NOTIF_BASE })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/notifications/read-all', {}, { baseURL: NOTIF_BASE })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeadlines() {
  return useQuery({
    queryKey: ['notifications', 'deadlines'],
    queryFn: async () => {
      const { data } = await apiClient.get<Deadline[]>('/api/v1/deadlines', {
        baseURL: NOTIF_BASE,
      })
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useNextDeadline() {
  return useQuery({
    queryKey: ['notifications', 'deadlines', 'next'],
    queryFn: async () => {
      const { data } = await apiClient.get<Deadline | null>('/api/v1/deadlines/next', {
        baseURL: NOTIF_BASE,
      })
      return data
    },
    staleTime: 5 * 60_000,
  })
}

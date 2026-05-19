import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiClient } from '@keel/api'
import type {
  Account,
  AccountStats,
  Transaction,
  TransactionListResponse,
  VirtualCard,
} from '@keel/types'

// ── Account ───────────────────────────────────────────────────────────────────

export function useAccount() {
  return useQuery({
    queryKey: ['banking', 'account'],
    queryFn: async () => {
      const { data } = await apiClient.get<Account>('/api/v1/accounts/me')
      return data
    },
    staleTime: 30_000,
  })
}

export function useAccountStats(periodDays = 30) {
  return useQuery({
    queryKey: ['banking', 'stats', periodDays],
    queryFn: async () => {
      const { data } = await apiClient.get<AccountStats>('/api/v1/accounts/me/stats', {
        params: { period_days: periodDays },
      })
      return data
    },
    staleTime: 60_000,
  })
}

// ── Transactions ──────────────────────────────────────────────────────────────

interface TransactionFilters {
  category?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['banking', 'transactions', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get<TransactionListResponse>('/api/v1/transactions', {
        params: {
          page: pageParam,
          page_size: 20,
          category: filters.category || undefined,
          search: filters.search || undefined,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo || undefined,
        },
      })
      return data
    },
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 30_000,
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['banking', 'transactions', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction>(`/api/v1/transactions/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      const { data } = await apiClient.patch<Transaction>(
        `/api/v1/transactions/${id}/category`,
        { category },
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking', 'transactions'] })
    },
  })
}

// ── Virtual Card ──────────────────────────────────────────────────────────────

export function useVirtualCard() {
  return useQuery({
    queryKey: ['banking', 'card'],
    queryFn: async () => {
      const { data } = await apiClient.get<VirtualCard>('/api/v1/accounts/me/card')
      return data
    },
    staleTime: 60_000,
  })
}

export function useFreezeCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (action: 'freeze' | 'unfreeze') => {
      const { data } = await apiClient.post<VirtualCard>(
        `/api/v1/accounts/me/card/${action}`,
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking', 'card'] })
    },
  })
}

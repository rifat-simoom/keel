import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { apiClient } from '@keel/api'
import type { Invoice, InvoiceStats, CreateInvoiceInput } from '@keel/types'

interface InvoiceListResponse {
  items: Invoice[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useInvoices(statusFilter?: string) {
  return useInfiniteQuery({
    queryKey: ['invoices', 'list', statusFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get<InvoiceListResponse>('/api/v1/invoices', {
        params: { page: pageParam, page_size: 20, status: statusFilter || undefined },
      })
      return data
    },
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 30_000,
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Invoice>(`/api/v1/invoices/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ['invoices', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<InvoiceStats>('/api/v1/invoices/stats')
      return data
    },
    staleTime: 60_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateInvoiceInput) => {
      const { data } = await apiClient.post<Invoice>('/api/v1/invoices', body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['banking', 'account'] })
    },
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<CreateInvoiceInput> }) => {
      const { data } = await apiClient.put<Invoice>(`/api/v1/invoices/${id}`, body)
      return data
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices', inv.id] })
      qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
    },
  })
}

export function useSendInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<Invoice>(`/api/v1/invoices/${id}/send`)
      return data
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices', inv.id] })
      qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
      qc.invalidateQueries({ queryKey: ['invoices', 'stats'] })
    },
  })
}

export function useMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<Invoice>(`/api/v1/invoices/${id}/mark-paid`)
      return data
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices', inv.id] })
      qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
      qc.invalidateQueries({ queryKey: ['invoices', 'stats'] })
      qc.invalidateQueries({ queryKey: ['banking'] })
    },
  })
}

export function useCancelInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<Invoice>(`/api/v1/invoices/${id}/cancel`)
      return data
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices', inv.id] })
      qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
      qc.invalidateQueries({ queryKey: ['invoices', 'stats'] })
    },
  })
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: async ({ id, number }: { id: string; number: string }) => {
      const resp = await apiClient.get(`/api/v1/invoices/${id}/pdf`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

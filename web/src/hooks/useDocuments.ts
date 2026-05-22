import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { apiClient } from '@keel/api'
import type { Document, DocumentListResponse, UpdateDocumentInput } from '@keel/types'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useDocuments(statusFilter?: string) {
  return useInfiniteQuery({
    queryKey: ['documents', 'list', statusFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get<DocumentListResponse>('/api/v1/documents', {
        params: { page: pageParam, page_size: 20, status: statusFilter || undefined },
      })
      return data
    },
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 30_000,
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Document>(`/api/v1/documents/${id}`)
      return data
    },
    enabled: !!id,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post<Document>('/api/v1/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', 'list'] })
    },
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateDocumentInput }) => {
      const { data } = await apiClient.put<Document>(`/api/v1/documents/${id}`, body)
      return data
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents', doc.id] })
      qc.invalidateQueries({ queryKey: ['documents', 'list'] })
    },
  })
}

export function useMatchDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, transactionId }: { id: string; transactionId: string }) => {
      const { data } = await apiClient.post<Document>(
        `/api/v1/documents/${id}/match`,
        { transaction_id: transactionId },
      )
      return data
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents', doc.id] })
      qc.invalidateQueries({ queryKey: ['documents', 'list'] })
      qc.invalidateQueries({ queryKey: ['banking', 'transactions'] })
    },
  })
}

export function useUnmatchDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<Document>(
        `/api/v1/documents/${id}/unmatch`,
        {},
      )
      return data
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents', doc.id] })
      qc.invalidateQueries({ queryKey: ['documents', 'list'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/documents/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', 'list'] })
    },
  })
}

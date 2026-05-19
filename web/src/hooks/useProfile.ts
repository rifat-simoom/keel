import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@keel/api'
import type { UserProfile, UpdateProfileInput } from '@keel/types'

export function useProfile() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<UserProfile>('/api/v1/auth/me')
      return data
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateProfileInput) => {
      const { data } = await apiClient.put<UserProfile>('/api/v1/auth/me', body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

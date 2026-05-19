import { z } from 'zod'

export const registerCompanySchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_number: z.string().optional(),
  vat_number: z.string().optional(),
  utr: z.string().optional(),
  full_name: z.string().min(1, 'Full name is required'),
})

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).optional(),
  company_name: z.string().min(1).optional(),
  vat_number: z.string().optional(),
  company_number: z.string().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

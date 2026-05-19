import { z } from 'zod'

export const vatRateSchema = z.union([z.literal(0), z.literal(0.05), z.literal(0.2)])

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  vat_rate: vatRateSchema,
})

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  county: z.string().optional(),
  postcode: z
    .string()
    .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, 'Invalid UK postcode'),
  country: z.string().default('GB'),
})

export const createInvoiceSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  client_email: z.string().email('Valid email required'),
  client_address: addressSchema.optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item required'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO date required'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO date required'),
  notes: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

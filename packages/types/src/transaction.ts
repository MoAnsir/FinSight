import { z } from 'zod'

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  date: z.coerce.date(),
  description: z.string(),
  amount: z.number(),
  currency: z.string().default('GBP'),
  category: z.string().nullable(),
  merchant: z.string().nullable(),
  notes: z.string().nullable(),
  isTransfer: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Transaction = z.infer<typeof TransactionSchema>

export const TransactionFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['date', 'amount', 'description']).default('date'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export type TransactionFilter = z.infer<typeof TransactionFilterSchema>

export const CsvColumnMapSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.string(),
  currency: z.string().optional(),
})

export type CsvColumnMap = z.infer<typeof CsvColumnMapSchema>

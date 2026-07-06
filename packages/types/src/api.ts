import { z } from 'zod'

export const PaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  })

export type Paginated<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

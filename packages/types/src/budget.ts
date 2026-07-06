import { z } from 'zod'

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  category: z.string(),
  limitAmount: z.number().positive(),
  period: z.enum(['monthly', 'weekly', 'yearly']),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Budget = z.infer<typeof BudgetSchema>

export const CreateBudgetSchema = BudgetSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
})

export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>

export const BudgetProgressSchema = BudgetSchema.extend({
  spent: z.number(),
  remaining: z.number(),
  percentUsed: z.number(),
})

export type BudgetProgress = z.infer<typeof BudgetProgressSchema>

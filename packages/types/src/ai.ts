import { z } from 'zod'

export const AIChatMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z
    .array(
      z.object({
        transactionId: z.string().uuid(),
        description: z.string(),
        amount: z.number(),
        date: z.coerce.date(),
      }),
    )
    .optional(),
  createdAt: z.coerce.date(),
})

export type AIChatMessage = z.infer<typeof AIChatMessageSchema>

export const AIChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
})

export type AIChatRequest = z.infer<typeof AIChatRequestSchema>

export const AIInsightSchema = z.object({
  summary: z.string(),
  topCategories: z.array(z.object({ category: z.string(), amount: z.number() })),
  anomalies: z.array(z.object({ description: z.string(), amount: z.number(), date: z.coerce.date() })),
  suggestions: z.array(z.string()),
})

export type AIInsight = z.infer<typeof AIInsightSchema>

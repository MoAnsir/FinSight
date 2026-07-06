export const APP_NAME = 'FinSight'
export const API_VERSION = 'v1'

export const TRANSACTION_CATEGORIES = [
  'Housing',
  'Transport',
  'Food & Drink',
  'Shopping',
  'Entertainment',
  'Health',
  'Utilities',
  'Travel',
  'Education',
  'Income',
  'Savings',
  'Other',
] as const

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number]

export const BUDGET_PERIODS = ['monthly', 'weekly', 'yearly'] as const
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number]

export const AI_PROVIDERS = ['anthropic', 'openai'] as const
export type AIProvider = (typeof AI_PROVIDERS)[number]

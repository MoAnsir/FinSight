export const queryKeys = {
  insights: () => ['insights'] as const,
  forecast: () => ['forecast'] as const,
  transactions: (filter?: object) => filter ? ['transactions', filter] as const : ['transactions'] as const,
  budgets: () => ['budgets'] as const,
  me: () => ['me'] as const,
}

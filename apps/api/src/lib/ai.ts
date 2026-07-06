import Anthropic from '@anthropic-ai/sdk'

export type SseChunk =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<unknown>

let _client: Anthropic | null = null

export function isAIAvailable(): boolean {
  return !!process.env['ANTHROPIC_API_KEY']
}

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env['ANTHROPIC_API_KEY']
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export const FINSIGHT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_transactions',
    description: 'Query the user\'s transactions, optionally filtered by category, date range, or search term.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by spending category, e.g. "Food & Drink"' },
        dateFrom: { type: 'string', description: 'ISO date string (YYYY-MM-DD), inclusive start date' },
        dateTo: { type: 'string', description: 'ISO date string (YYYY-MM-DD), inclusive end date' },
        search: { type: 'string', description: 'Search term to match against description' },
        limit: { type: 'number', description: 'Maximum rows to return, default 50, max 200' },
      },
    },
  },
  {
    name: 'compute_category_totals',
    description: 'Get spending totals grouped by category for a given date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dateFrom: { type: 'string', description: 'ISO date string, start of period' },
        dateTo: { type: 'string', description: 'ISO date string, end of period' },
      },
    },
  },
  {
    name: 'find_recurring_payments',
    description: 'Identify recurring or subscription payments based on repeated amounts and descriptions.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_budget_status',
    description: 'Get the current month\'s budgets and actual spending for each category.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
]

export async function runAgenticLoop(
  systemPrompt: string,
  userMessage: string,
  executeToolCall: ToolExecutor,
  onChunk: (chunk: SseChunk) => void,
): Promise<string> {
  if (!isAIAvailable()) {
    const msg = 'AI features are not configured. Add ANTHROPIC_API_KEY to apps/api/.env to enable them.'
    onChunk({ type: 'text', delta: msg })
    onChunk({ type: 'done' })
    return msg
  }

  const client = getAnthropicClient()
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]
  let fullText = ''

  // Agentic loop — continues until Claude stops requesting tools
  for (;;) {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools: FINSIGHT_TOOLS,
      messages,
    })

    const toolUseBlocks: Anthropic.ToolUseBlock[] = []
    let currentToolUse: { id: string; name: string; inputJson: string } | null = null

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolUse = { id: event.content_block.id, name: event.content_block.name, inputJson: '' }
          onChunk({ type: 'tool', name: event.content_block.name })
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullText += event.delta.text
          onChunk({ type: 'text', delta: event.delta.text })
        } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
          currentToolUse.inputJson += event.delta.partial_json
        }
      } else if (event.type === 'content_block_stop' && currentToolUse) {
        toolUseBlocks.push({
          type: 'tool_use',
          id: currentToolUse.id,
          name: currentToolUse.name,
          input: JSON.parse(currentToolUse.inputJson || '{}'),
        })
        currentToolUse = null
      }
    }

    const finalMessage = await stream.finalMessage()

    if (finalMessage.stop_reason === 'end_turn' || toolUseBlocks.length === 0) break

    // Execute all tool calls and build the next turn
    messages.push({ role: 'assistant', content: finalMessage.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => {
        try {
          const result = await executeToolCall(block.name, block.input as Record<string, unknown>)
          return { type: 'tool_result' as const, tool_use_id: block.id, content: JSON.stringify(result) }
        } catch (err) {
          return { type: 'tool_result' as const, tool_use_id: block.id, is_error: true, content: String(err) }
        }
      }),
    )

    messages.push({ role: 'user', content: toolResults })
  }

  onChunk({ type: 'done' })
  return fullText
}

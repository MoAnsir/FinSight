import Anthropic from '@anthropic-ai/sdk'

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

export async function chatWithContext(
  systemPrompt: string,
  userMessage: string,
  contextData?: string,
): Promise<string> {
  if (!isAIAvailable()) {
    return 'AI features are not configured yet. Add your ANTHROPIC_API_KEY to apps/api/.env to enable them.'
  }

  const client = getAnthropicClient()

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: contextData
        ? `${userMessage}\n\n<financial_data>\n${contextData}\n</financial_data>`
        : userMessage,
    },
  ]

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  })

  const block = response.content[0]
  if (block?.type !== 'text') throw new Error('Unexpected AI response type')
  return block.text
}

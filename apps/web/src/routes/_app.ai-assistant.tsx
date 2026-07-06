import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useFeatures } from '@/hooks/useFeatures'

export const Route = createFileRoute('/_app/ai-assistant')({
  component: AIAssistantPage,
})

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface SseChunk {
  type: 'text' | 'tool' | 'done' | 'error'
  delta?: string
  name?: string
  conversationId?: string
  message?: string
}

function ToolBadge({ name }: { name: string }) {
  const labels: Record<string, string> = {
    query_transactions: 'Reading transactions…',
    compute_category_totals: 'Computing totals…',
    find_recurring_payments: 'Finding recurring payments…',
    get_budget_status: 'Checking budgets…',
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
      <span className="animate-pulse">⚙</span> {labels[name] ?? name}
    </span>
  )
}

function AIAssistantPage() {
  const features = useFeatures()
  const [messages, setMessages] = useState<Message[]>([])
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTools])

  const send = useCallback(async () => {
    const msg = input.trim()
    if (!msg || isStreaming) return

    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setInput('')
    setIsStreaming(true)
    setActiveTools([])

    // Placeholder for the streaming assistant reply
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationId }),
        signal: controller.signal,
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const chunk: SseChunk = JSON.parse(line.slice(6))

          if (chunk.type === 'text' && chunk.delta) {
            setMessages((prev) => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + chunk.delta }
              }
              return copy
            })
          } else if (chunk.type === 'tool' && chunk.name) {
            setActiveTools((prev) => [...prev, chunk.name!])
          } else if (chunk.type === 'done') {
            if (chunk.conversationId) setConversationId(chunk.conversationId)
            setActiveTools([])
          } else if (chunk.type === 'error') {
            setMessages((prev) => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: `Error: ${chunk.message}` }
              }
              return copy
            })
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: 'Something went wrong. Please try again.' }
          }
          return copy
        })
      }
    } finally {
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })))
      setIsStreaming(false)
      setActiveTools([])
    }
  }, [input, isStreaming, conversationId])

  return (
    <div className="flex flex-col h-full p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Assistant</h1>

      {!features.ai && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          AI features are disabled — add <code className="font-mono bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to <code className="font-mono bg-amber-100 px-1 rounded">apps/api/.env</code> to enable them.
        </div>
      )}

      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-12">
              <p className="text-4xl mb-3">🤖</p>
              <p className="font-medium">Ask me anything about your finances</p>
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {[
                  'What did I spend most on last month?',
                  'Am I over budget anywhere?',
                  'What are my recurring payments?',
                  'How does this month compare to last month?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q) }}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}>
                {msg.content}
                {msg.streaming && msg.content === '' && (
                  <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          ))}

          {activeTools.length > 0 && (
            <div className="flex justify-start">
              <div className="flex flex-col gap-1.5">
                {activeTools.map((tool, i) => <ToolBadge key={i} name={tool} />)}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-200 p-4 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about your spending, budgets, trends…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isStreaming ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

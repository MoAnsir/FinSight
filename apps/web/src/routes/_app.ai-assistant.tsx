import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { useFeatures } from '@/hooks/useFeatures'

export const Route = createFileRoute('/_app/ai-assistant')({
  component: AIAssistantPage,
})

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function AIAssistantPage() {
  const features = useFeatures()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const mutation = useMutation({
    mutationFn: (message: string) =>
      api.post<{ conversationId: string; message: { role: string; content: string } }>('/ai/chat', {
        message,
        conversationId,
      }),
    onSuccess: (data) => {
      setConversationId(data.conversationId)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message.content }])
    },
  })

  const send = () => {
    const msg = input.trim()
    if (!msg || mutation.isPending) return
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setInput('')
    mutation.mutate(msg)
  }

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
              <p className="text-sm mt-1">Try: "What did I spend most on last month?"</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-500">
                Thinking…
              </div>
            </div>
          )}
          {mutation.error && (
            <div className="flex justify-start">
              <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
                Error: {mutation.error.message}
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
          <button onClick={send} disabled={mutation.isPending || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

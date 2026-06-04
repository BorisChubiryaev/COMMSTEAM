type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type OpenRouterCompletionOptions = {
  messages: OpenRouterMessage[]
  maxTokens: number
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemini-2.5-flash'

export class OpenRouterError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'OpenRouterError'
    this.status = status
  }
}

export async function createOpenRouterCompletion({ messages, maxTokens }: OpenRouterCompletionOptions) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.AI_MODEL || DEFAULT_MODEL

  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured', 500)
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_TITLE || 'CommsTeam Hub',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    console.error('OpenRouter error:', details)
    throw new OpenRouterError(`OpenRouter request failed for ${model}`, response.status)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new OpenRouterError('OpenRouter returned an empty response', 502)
  }

  return content as string
}

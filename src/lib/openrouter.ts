type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type OpenRouterCompletionOptions = {
  messages: OpenRouterMessage[]
  maxTokens: number
  /** Lower = more deterministic. Defaults to 0.2; pass 0 for structured JSON. */
  temperature?: number
  /** Ask the model for a strict JSON object (response_format). */
  json?: boolean
  /** Number of retries on transient errors (429 / 5xx / network). Defaults to 2. */
  retries?: number
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemini-2.5-flash'
const RETRY_DELAY_MS = 800

export class OpenRouterError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'OpenRouterError'
    this.status = status
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(status: number) {
  return status === 429 || status >= 500
}

export async function createOpenRouterCompletion({
  messages,
  maxTokens,
  temperature = 0.2,
  json = false,
  retries = 2,
}: OpenRouterCompletionOptions) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.AI_MODEL || DEFAULT_MODEL

  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured', 500)
  }

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  })

  let lastError: OpenRouterError | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: Response
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
          'X-Title': process.env.OPENROUTER_APP_TITLE || 'CommsTeam Hub',
        },
        body,
        signal: AbortSignal.timeout(30000),
      })
    } catch (error) {
      // Network error / timeout — retry if attempts remain.
      lastError = new OpenRouterError(
        error instanceof Error ? error.message : 'OpenRouter network error',
        503,
      )
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      throw lastError
    }

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      console.error(`OpenRouter error (attempt ${attempt + 1}):`, response.status, details)
      lastError = new OpenRouterError(`OpenRouter request failed for ${model}`, response.status)
      if (isRetryable(response.status) && attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      throw lastError
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      lastError = new OpenRouterError('OpenRouter returned an empty response', 502)
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      throw lastError
    }

    return content as string
  }

  throw lastError ?? new OpenRouterError('OpenRouter request failed', 500)
}

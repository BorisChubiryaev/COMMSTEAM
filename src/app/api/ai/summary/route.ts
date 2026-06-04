import { OpenRouterError, createOpenRouterCompletion } from '@/lib/openrouter'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, link } = body

    if (!text && !link) {
      return Response.json({ error: 'Text or link required' }, { status: 400 })
    }

    const prompt = link
      ? `Сделай краткое саммари новости по ссылке: ${link}\n${text ? `Дополнительный контекст: ${text}` : ''}`
      : `Сделай краткое саммари новости (2-3 предложения):\n\n${text}`

    const summary = await createOpenRouterCompletion({
      messages: [
        {
          role: 'system',
          content: 'Ты - помощник команды коммуникации Сбера. Сделай краткое саммари новости на русском языке (2-3 предложения). Выдели главное: суть, значимость, возможные последствия для коммуникации. Отвечай только саммари, без лишних слов.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 200,
    })

    return Response.json({ summary })
  } catch (error) {
    console.error('AI Summary error:', error)
    if (error instanceof OpenRouterError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

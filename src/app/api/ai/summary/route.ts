import { OpenRouterError, createOpenRouterCompletion } from '@/lib/openrouter'
import { extractArticleFromUrl } from '@/lib/article-extractor'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, link } = body

    if (!text && !link) {
      return Response.json({ error: 'Text or link required' }, { status: 400 })
    }

    let sourceText = text || ''

    if (link) {
      try {
        const article = await extractArticleFromUrl(link)
        sourceText = [
          `Ссылка: ${article.url}`,
          article.title ? `Заголовок: ${article.title}` : '',
          article.description ? `Описание: ${article.description}` : '',
          text ? `Дополнительный контекст пользователя: ${text}` : '',
          `Текст новости:\n${article.text}`,
        ].filter(Boolean).join('\n\n')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось открыть ссылку'
        if (text) {
          sourceText = [
            `Ссылка не была прочитана автоматически: ${link}`,
            `Причина: ${message}`,
            `Текст пользователя:\n${text}`,
          ].join('\n\n')
        } else {
          return Response.json({
            error: `${message}. Добавьте текст новости в поле “Содержание” или попробуйте другую ссылку.`,
          }, { status: 422 })
        }
      }
    }

    const prompt = `Сделай краткое саммари новости (2-3 предложения) строго по тексту ниже. Не используй знания о других новостях и не выдумывай факты.\n\n${sourceText}`

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

import { OpenRouterError, createOpenRouterCompletion } from '@/lib/openrouter'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { signalTitle, signalContent, publicationType, meanings, distribution } = body

    const typePrompts: Record<string, string> = {
      'Посты в соцсетях': 'Создай пост для социальных сетей (VK, Telegram). Используй эмодзи, хештеги, привлекательный заголовок. Длина: 150-300 символов.',
      'Статья': 'Напиши черновик статьи (заголовок + 3-4 абзаца). Стиль: экспертный, но доступный.',
      'Пресс-релиз': 'Создай пресс-релиз в стандартном формате: заголовок, дата, город, основной текст, цитата, контакты.',
      'Выступление': 'Подготовь тезисы для выступления (введение, 3-5 ключевых тезисов, заключение).',
      'Внутренняя коммуникация': 'Создай сообщение для внутреннего портала. Стиль: дружелюбный, информативный. Включи призыв к действию.',
      'Мероприятие/Митап': 'Составь анонс мероприятия: описание, программа, спикеры, дата/время, регистрация.',
      'Реклама': 'Создай рекламный текст: цепляющий заголовок, описание преимуществ, призыв к действию.',
    }

    const promptType = typePrompts[publicationType] || typePrompts['Посты в соцсетях']

    const content = await createOpenRouterCompletion({
      messages: [
        {
          role: 'system',
          content: `Ты - копирайтер команды коммуникации Сбера. Создавай контент на русском языке. ${promptType}`,
        },
        {
          role: 'user',
          content: `Тема: ${signalTitle}\nСодержание: ${signalContent || 'Нет дополнительного содержания'}\nКлючевые смыслы: ${meanings || 'Не указаны'}\nНаправление: ${distribution || 'Не указано'}`,
        },
      ],
      maxTokens: 1000,
      temperature: 0.7,
    })

    return Response.json({ content })
  } catch (error) {
    console.error('AI Generate Content error:', error)
    if (error instanceof OpenRouterError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

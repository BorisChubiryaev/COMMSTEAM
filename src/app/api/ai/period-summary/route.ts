import { db } from '@/lib/db'
import { OpenRouterError, createOpenRouterCompletion } from '@/lib/openrouter'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { periodStart, periodEnd } = body

    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    // Fetch signals in the period
    const signals = await db.signal.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        assignee: true,
      },
    })

    // Build context for AI
    const totalSignals = signals.length
    const byStatus = signals.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc }, {} as Record<string, number>)
    const byPriority = signals.filter(s => s.priority).reduce((acc, s) => { acc[s.priority!] = (acc[s.priority!] || 0) + 1; return acc }, {} as Record<string, number>)
    const bySource = signals.filter(s => s.source).reduce((acc, s) => { acc[s.source!] = (acc[s.source!] || 0) + 1; return acc }, {} as Record<string, number>)
    const byDistribution = signals.filter(s => s.distribution).reduce((acc, s) => {
      s.distribution!.split(',').filter(Boolean).forEach(d => { acc[d.trim()] = (acc[d.trim()] || 0) + 1 })
      return acc
    }, {} as Record<string, number>)
    
    const withFeedback = signals.filter(s => s.whatWorked || s.whatDidntWork)
    const feedbackText = withFeedback.map(s => 
      `- "${s.title}": Сработало: ${s.whatWorked || 'Н/Д'}. Не сработало: ${s.whatDidntWork || 'Н/Д'}. Инсайты: ${s.newInsights || 'Н/Д'}`
    ).join('\n')

    const context = `
Период: ${start.toLocaleDateString('ru')} — ${end.toLocaleDateString('ru')}
Всего сигналов обработано: ${totalSignals}
По статусам: ${JSON.stringify(byStatus)}
По приоритетам: ${JSON.stringify(byPriority)}
По источникам: ${JSON.stringify(bySource)}
По направлениям: ${JSON.stringify(byDistribution)}
Сигналы с обратной связью: ${withFeedback.length}
Обратная связь:
${feedbackText || 'Нет данных обратной связи'}
`.trim()

    const summary = await createOpenRouterCompletion({
      messages: [
        {
          role: 'system',
          content: `Ты - аналитик команды коммуникации Сбера. Создай итоговое саммари за период на русском языке. Включи:
1. Общий обзор работы за период
2. Ключевые результаты и достижения
3. Анализ по направлениям (PR, Маркетинг, Внутриком)
4. Что сработало хорошо
5. Что можно улучшить
6. Рекомендации на следующий период
7. Новые инсайты и тренды

Пиши структурированно, с заголовками и списками. Используй эмодзи для наглядности.`
        },
        { role: 'user', content: context },
      ],
      maxTokens: 2000,
    })

    // Save to DB
    await db.periodSummary.create({
      data: {
        title: `Итоги: ${start.toLocaleDateString('ru')} — ${end.toLocaleDateString('ru')}`,
        periodStart: start,
        periodEnd: end,
        aiSummary: summary,
      },
    })

    return Response.json({ summary })
  } catch (error) {
    console.error('AI Period Summary error:', error)
    if (error instanceof OpenRouterError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { extractArticleFromUrl } from '@/lib/article-extractor'
import { OpenRouterError, createOpenRouterCompletion } from '@/lib/openrouter'
import {
  DISTRIBUTIONS,
  MEANINGS,
  POTENTIALS,
  PRIORITIES,
  PUBLICATION_TYPES,
  SIGNAL_TYPES,
  SOURCES,
} from '@/lib/store'

const NUMBER_FIELDS = ['relevance', 'alignment', 'urgency'] as const

type AnalysisPayload = {
  aiSummary?: string
  source?: string
  signalType?: string
  relevance?: number
  alignment?: number
  urgency?: number
  potential?: string[]
  risks?: string
  priority?: string
  meanings?: string[]
  distribution?: string[]
  publicationType?: string
}

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const source = fenced || raw
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain JSON')
  }
  return JSON.parse(source.slice(start, end + 1)) as AnalysisPayload
}

function pickAllowed(value: unknown, allowed: readonly string[]) {
  const normalized = String(value || '').trim()
  return allowed.includes(normalized) ? normalized : null
}

function pickAllowedList(value: unknown, allowed: readonly string[]) {
  const rawItems = Array.isArray(value)
    ? value
    : String(value || '').split(',')

  return Array.from(new Set(
    rawItems
      .map(item => String(item || '').trim())
      .filter(item => allowed.includes(item))
  ))
}

function normalizeScore(value: unknown) {
  const score = Number(value)
  if (!Number.isFinite(score)) return null
  return Math.min(5, Math.max(1, Math.round(score)))
}

function asNullableText(value: unknown, maxLength: number) {
  const text = String(value || '').trim()
  return text ? text.slice(0, maxLength) : null
}

function normalizeAnalysis(payload: AnalysisPayload) {
  const data: Record<string, string | number | null> = {
    aiSummary: asNullableText(payload.aiSummary, 1200),
    source: pickAllowed(payload.source, SOURCES),
    signalType: pickAllowed(payload.signalType, SIGNAL_TYPES),
    potential: pickAllowedList(payload.potential, POTENTIALS).join(',') || null,
    risks: asNullableText(payload.risks, 1200),
    priority: pickAllowed(payload.priority, PRIORITIES),
    meanings: pickAllowedList(payload.meanings, MEANINGS).join(',') || null,
    distribution: pickAllowedList(payload.distribution, DISTRIBUTIONS).join(',') || null,
    publicationType: pickAllowed(payload.publicationType, PUBLICATION_TYPES),
  }

  for (const field of NUMBER_FIELDS) {
    data[field] = normalizeScore(payload[field])
  }

  return data
}

async function getSourceText(signal: { title: string; content: string | null; link: string | null }) {
  let sourceText = [
    `Заголовок: ${signal.title}`,
    signal.content ? `Текст пользователя:\n${signal.content}` : '',
    signal.link ? `Ссылка: ${signal.link}` : '',
  ].filter(Boolean).join('\n\n')

  if (signal.link) {
    try {
      const article = await extractArticleFromUrl(signal.link)
      sourceText = [
        `Ссылка: ${article.url}`,
        article.title ? `Заголовок статьи: ${article.title}` : '',
        article.description ? `Описание статьи: ${article.description}` : '',
        signal.content ? `Контекст пользователя:\n${signal.content}` : '',
        `Текст статьи:\n${article.text}`,
      ].filter(Boolean).join('\n\n')
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'неизвестная ошибка'
      sourceText = [
        sourceText,
        `Автоматически прочитать ссылку не удалось: ${reason}`,
        'Делай выводы только из доступного заголовка, ссылки и текста пользователя.',
      ].join('\n\n')
    }
  }

  return sourceText.slice(0, 18000)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const signalId = String(body.signalId || '').trim()

    if (!signalId) {
      return Response.json({ error: 'signalId required' }, { status: 400 })
    }

    const signal = await db.signal.findUnique({ where: { id: signalId } })
    if (!signal) {
      return Response.json({ error: 'Signal not found' }, { status: 404 })
    }

    const sourceText = await getSourceText(signal)
    const allowedValues = {
      sources: SOURCES,
      signalTypes: SIGNAL_TYPES,
      priorities: PRIORITIES,
      meanings: MEANINGS,
      distributions: DISTRIBUTIONS,
      potentials: POTENTIALS,
      publicationTypes: PUBLICATION_TYPES,
    }

    const content = await createOpenRouterCompletion({
      messages: [
        {
          role: 'system',
          content: [
            'Ты помогаешь команде коммуникаций разбирать новости для внутреннего канбан-процесса.',
            'Верни только валидный JSON без markdown и пояснений.',
            'Не выдумывай факты. Если данных мало, выбирай наиболее осторожную оценку.',
            'Все значения для полей со справочниками бери строго из разрешенных списков.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            'Проанализируй новость и заполни поля процесса.',
            `Разрешенные значения:\n${JSON.stringify(allowedValues, null, 2)}`,
            'Формат ответа:',
            JSON.stringify({
              aiSummary: '2-3 предложения: суть, значимость, что можно сделать в коммуникации',
              source: 'одно значение из sources',
              signalType: 'одно значение из signalTypes',
              relevance: 'число 1-5',
              alignment: 'число 1-5',
              urgency: 'число 1-5',
              potential: ['значения из potentials'],
              risks: 'кратко: риски, чувствительность, что проверить перед публикацией',
              priority: 'одно значение из priorities',
              meanings: ['значения из meanings'],
              distribution: ['значения из distributions'],
              publicationType: 'одно значение из publicationTypes',
            }, null, 2),
            `Новость:\n${sourceText}`,
          ].join('\n\n'),
        },
      ],
      maxTokens: 900,
    })

    const analysis = normalizeAnalysis(extractJson(content))
    const updated = await db.signal.update({
      where: { id: signal.id },
      data: analysis,
      include: {
        assignee: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return Response.json({ signal: updated })
  } catch (error) {
    console.error('AI signal analysis error:', error)
    if (error instanceof OpenRouterError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json({ error: 'Не удалось разобрать новость' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { classifyIncomingNews } from '@/lib/incoming-news-intelligence'

const DEFAULT_LIMIT = 100

function normalizeNullableString(value: unknown) {
  const normalized = String(value || '').trim()
  return normalized.length > 0 ? normalized : null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 200)

  const items = await db.incomingNews.findMany({
    where: status ? { status } : undefined,
    include: {
      signal: true,
      duplicateOf: true,
      decisionHistory: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return Response.json(items)
}

export async function POST(req: Request) {
  const body = await req.json()
  const title = normalizeNullableString(body.title)
  const content = normalizeNullableString(body.content)
  const link = normalizeNullableString(body.link)

  if (!title && !content && !link) {
    return Response.json({ error: 'Добавьте заголовок, текст или ссылку' }, { status: 400 })
  }

  const item = await db.incomingNews.create({
    data: {
      title: title || content?.slice(0, 120) || link || 'Новая входящая новость',
      content,
      link,
      source: normalizeNullableString(body.source) || 'manual',
      rawPayload: body.rawPayload ? JSON.stringify(body.rawPayload) : null,
    },
    include: {
      signal: true,
      duplicateOf: true,
      decisionHistory: { orderBy: { createdAt: 'desc' } },
    },
  })

  await db.decisionHistory.create({
    data: {
      incomingNewsId: item.id,
      action: 'created',
      actor: normalizeNullableString(body.actor) || 'user',
      note: 'Новость добавлена во входящие',
    },
  })

  const classified = await classifyIncomingNews(item.id, {
    title: item.title,
    content: item.content,
    link: item.link,
  })

  if (classified) return Response.json(classified)

  const freshItem = await db.incomingNews.findUnique({
    where: { id: item.id },
    include: {
      signal: true,
      duplicateOf: true,
      decisionHistory: { orderBy: { createdAt: 'desc' } },
    },
  })

  return Response.json(freshItem || item)
}

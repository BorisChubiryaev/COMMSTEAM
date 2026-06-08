import { db } from '@/lib/db'

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
    include: { signal: true },
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
    include: { signal: true },
  })

  return Response.json(item)
}

import { db } from '@/lib/db'
import { analyzeIncomingNews, markDuplicateIfNeeded } from '@/lib/incoming-news-intelligence'

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const incoming = await db.incomingNews.findUnique({ where: { id } })

  if (!incoming) {
    return Response.json({ error: 'Входящая новость не найдена' }, { status: 404 })
  }

  const duplicate = await markDuplicateIfNeeded(id, {
    title: incoming.title,
    content: incoming.content,
    link: incoming.link,
  })

  if (duplicate) return Response.json(duplicate)

  const analyzed = await analyzeIncomingNews(id)
  if (!analyzed) {
    return Response.json({ error: 'Не удалось разобрать входящую новость' }, { status: 500 })
  }

  return Response.json(analyzed)
}

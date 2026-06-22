import { convertIncomingToSignal } from '@/lib/incoming-news-actions'

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const result = await convertIncomingToSignal(id, 'user')

  if ('error' in result) {
    return Response.json({ error: 'Входящая новость не найдена' }, { status: 404 })
  }

  return Response.json({ incomingNews: result.incomingNews, signal: result.signal })
}

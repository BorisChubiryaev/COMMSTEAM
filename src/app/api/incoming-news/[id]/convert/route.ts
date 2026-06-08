import { db } from '@/lib/db'

function toSignalSource(source: string | null) {
  if (source === 'telegram') return 'Трабы/Команды'
  if (source === 'parser' || source === 'rss') return 'Тренды/Рынок'
  return null
}

function pick<T>(preferred: T | null | undefined, fallback: T | null) {
  return preferred ?? fallback
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const incoming = await db.incomingNews.findUnique({
    where: { id },
    include: { signal: true },
  })

  if (!incoming) {
    return Response.json({ error: 'Входящая новость не найдена' }, { status: 404 })
  }

  if (incoming.signal) {
    return Response.json({ incomingNews: incoming, signal: incoming.signal })
  }

  const signal = await db.signal.create({
    data: {
      title: incoming.title,
      content: incoming.content,
      link: incoming.link,
      aiSummary: incoming.aiSummary,
      source: pick(incoming.aiSource, toSignalSource(incoming.source)),
      signalType: pick(incoming.aiSignalType, 'Новость'),
      relevance: incoming.aiRelevance,
      alignment: incoming.aiAlignment,
      urgency: incoming.aiUrgency,
      potential: incoming.aiPotential,
      risks: incoming.aiRisks,
      priority: incoming.aiPriority,
      meanings: incoming.aiMeanings,
      distribution: incoming.aiDistribution,
      publicationType: incoming.aiPublicationType,
      status: 'input',
      incomingNews: {
        connect: { id: incoming.id },
      },
    },
    include: {
      assignee: true,
      comments: { include: { author: true } },
    },
  })

  const updatedIncoming = await db.incomingNews.update({
    where: { id: incoming.id },
    data: {
      status: 'converted',
      signalId: signal.id,
    },
    include: { signal: true },
  })

  await db.decisionHistory.create({
    data: {
      incomingNewsId: incoming.id,
      signalId: signal.id,
      action: 'converted',
      actor: 'user',
      note: 'Новость отправлена в канбан',
    },
  })

  return Response.json({ incomingNews: updatedIncoming, signal })
}

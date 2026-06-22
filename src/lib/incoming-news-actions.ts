import { db } from '@/lib/db'

const SIGNAL_INCLUDE = {
  assignee: true,
  collaborators: true,
  contacts: true,
  calendarEvent: true,
  comments: { include: { author: true } },
} as const

function toSignalSource(source: string | null) {
  if (source === 'telegram') return 'Трабы/Команды'
  if (source === 'parser' || source === 'rss') return 'Тренды/Рынок'
  return null
}

function pick<T>(preferred: T | null | undefined, fallback: T | null) {
  return preferred ?? fallback
}

/**
 * Turn an incoming news item into a Signal on the kanban board.
 * Idempotent: if the item already has a linked signal, it is returned as-is.
 * Shared by the REST route and the Telegram bot.
 */
export async function convertIncomingToSignal(id: string, actor = 'user') {
  const incoming = await db.incomingNews.findUnique({
    where: { id },
    include: { signal: { include: SIGNAL_INCLUDE } },
  })

  if (!incoming) return { error: 'not_found' as const }
  if (incoming.signal) {
    return { incomingNews: incoming, signal: incoming.signal, alreadyConverted: true }
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
      incomingNews: { connect: { id: incoming.id } },
    },
    include: SIGNAL_INCLUDE,
  })

  const updatedIncoming = await db.incomingNews.update({
    where: { id: incoming.id },
    data: { status: 'converted', signalId: signal.id },
    include: { signal: { include: SIGNAL_INCLUDE } },
  })

  await db.decisionHistory.create({
    data: {
      incomingNewsId: incoming.id,
      signalId: signal.id,
      action: 'converted',
      actor,
      note: 'Новость отправлена в канбан',
    },
  })

  return { incomingNews: updatedIncoming, signal }
}

/** Mark an incoming item as ignored. */
export async function ignoreIncoming(id: string, actor = 'user') {
  const incoming = await db.incomingNews.findUnique({ where: { id } })
  if (!incoming) return { error: 'not_found' as const }

  const updated = await db.incomingNews.update({
    where: { id },
    data: { status: 'ignored' },
  })

  await db.decisionHistory.create({
    data: { incomingNewsId: id, action: 'ignored', actor, note: 'Новость проигнорирована' },
  })

  return { incomingNews: updated }
}

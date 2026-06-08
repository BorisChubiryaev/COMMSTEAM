import { db } from '@/lib/db'
import { analyzeSignalInput, toIncomingAnalysisData } from '@/lib/signal-analysis'

type IncomingCandidate = {
  title: string
  content: string | null
  link: string | null
}

type DuplicateMatch =
  | {
      kind: 'incoming'
      id: string
      signalId: string | null
      title: string
      score: number
      reason: string
    }
  | {
      kind: 'signal'
      id: string
      title: string
      score: number
      reason: string
    }

const DUPLICATE_THRESHOLD = 86

function normalizeUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    url.hash = ''
    for (const param of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      url.searchParams.delete(param)
    }
    return url.toString().replace(/\/$/, '').toLowerCase()
  } catch {
    return value.trim().replace(/\/$/, '').toLowerCase()
  }
}

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function textTokens(value: string) {
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter(token => token.length > 3)
  )
}

function similarity(left: string, right: string) {
  const leftTokens = textTokens(left)
  const rightTokens = textTokens(right)
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1
  }

  const union = new Set([...leftTokens, ...rightTokens]).size
  return Math.round((overlap / union) * 100)
}

function candidateText(candidate: IncomingCandidate) {
  return [candidate.title, candidate.content, candidate.link].filter(Boolean).join(' ')
}

function betterMatch(current: DuplicateMatch | null, next: DuplicateMatch) {
  if (!current || next.score > current.score) return next
  return current
}

export async function findDuplicate(candidate: IncomingCandidate, excludeIncomingId?: string) {
  const normalizedLink = normalizeUrl(candidate.link)
  let best: DuplicateMatch | null = null

  if (normalizedLink) {
    const [incomingByLink, signalByLink] = await Promise.all([
      db.incomingNews.findFirst({
        where: {
          id: excludeIncomingId ? { not: excludeIncomingId } : undefined,
          link: { equals: candidate.link || undefined },
        },
        select: { id: true, title: true, signalId: true },
      }),
      db.signal.findFirst({
        where: { link: { equals: candidate.link || undefined } },
        select: { id: true, title: true },
      }),
    ])

    if (incomingByLink) {
      best = betterMatch(best, {
        kind: 'incoming',
        id: incomingByLink.id,
        signalId: incomingByLink.signalId,
        title: incomingByLink.title,
        score: 100,
        reason: 'Совпадает ссылка с входящей новостью',
      })
    }

    if (signalByLink) {
      best = betterMatch(best, {
        kind: 'signal',
        id: signalByLink.id,
        title: signalByLink.title,
        score: 100,
        reason: 'Совпадает ссылка с сигналом в канбане',
      })
    }
  }

  if (best?.score === 100) return best

  const [recentIncoming, recentSignals] = await Promise.all([
    db.incomingNews.findMany({
      where: { id: excludeIncomingId ? { not: excludeIncomingId } : undefined },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, title: true, content: true, link: true, signalId: true },
    }),
    db.signal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, title: true, content: true, link: true },
    }),
  ])

  const text = candidateText(candidate)
  for (const item of recentIncoming) {
    const score = similarity(text, candidateText(item))
    if (score >= DUPLICATE_THRESHOLD) {
      best = betterMatch(best, {
        kind: 'incoming',
        id: item.id,
        signalId: item.signalId,
        title: item.title,
        score,
        reason: 'Похожий заголовок или текст во входящих',
      })
    }
  }

  for (const signal of recentSignals) {
    const score = similarity(text, candidateText(signal))
    if (score >= DUPLICATE_THRESHOLD) {
      best = betterMatch(best, {
        kind: 'signal',
        id: signal.id,
        title: signal.title,
        score,
        reason: 'Похожий сигнал уже есть в канбане',
      })
    }
  }

  return best
}

export async function analyzeIncomingNews(incomingId: string) {
  const incoming = await db.incomingNews.findUnique({ where: { id: incomingId } })
  if (!incoming) return null
  if (incoming.status === 'duplicate') return incoming

  const analysis = await analyzeSignalInput({
    title: incoming.title,
    content: incoming.content,
    link: incoming.link,
  })

  await db.incomingNews.update({
    where: { id: incoming.id },
    data: toIncomingAnalysisData(analysis),
  })

  await db.decisionHistory.create({
    data: {
      incomingNewsId: incoming.id,
      action: 'auto_analyzed',
      actor: 'ai',
      note: 'Входящая новость предварительно классифицирована',
      metadata: JSON.stringify(analysis),
    },
  })

  return db.incomingNews.findUnique({
    where: { id: incoming.id },
    include: {
      signal: true,
      duplicateOf: true,
      decisionHistory: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function markDuplicateIfNeeded(incomingId: string, candidate: IncomingCandidate) {
  const duplicate = await findDuplicate(candidate, incomingId)
  if (!duplicate) return null

  const data = duplicate.kind === 'signal'
    ? {
        status: 'duplicate',
        signalId: duplicate.id,
        duplicateScore: duplicate.score,
        duplicateReason: `${duplicate.reason}: ${duplicate.title}`,
      }
    : {
        status: 'duplicate',
        duplicateOfId: duplicate.id,
        signalId: duplicate.signalId,
        duplicateScore: duplicate.score,
        duplicateReason: `${duplicate.reason}: ${duplicate.title}`,
      }

  await db.incomingNews.update({
    where: { id: incomingId },
    data,
  })

  await db.decisionHistory.create({
    data: {
      incomingNewsId: incomingId,
      signalId: duplicate.kind === 'signal' ? duplicate.id : duplicate.signalId,
      action: 'marked_duplicate',
      actor: 'system',
      note: data.duplicateReason,
      metadata: JSON.stringify(duplicate),
    },
  })

  return db.incomingNews.findUnique({
    where: { id: incomingId },
    include: {
      signal: true,
      duplicateOf: true,
      decisionHistory: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function classifyIncomingNews(incomingId: string, candidate: IncomingCandidate) {
  const duplicate = await markDuplicateIfNeeded(incomingId, candidate)
  if (duplicate) return duplicate

  try {
    return await analyzeIncomingNews(incomingId)
  } catch (error) {
    console.error('Incoming news auto-analysis failed:', error)
    await db.decisionHistory.create({
      data: {
        incomingNewsId: incomingId,
        action: 'auto_analysis_failed',
        actor: 'ai',
        note: error instanceof Error ? error.message : 'Не удалось выполнить AI-предразбор',
      },
    })
    return null
  }
}

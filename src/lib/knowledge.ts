import { db } from '@/lib/db'

/**
 * Knowledge base — turns everyday activity into an accumulating "who knows what"
 * model. Each meaningful action (handling a signal, organising an event,
 * commenting) becomes one or more ExpertiseObservation rows; those roll up into
 * MemberExpertise (member × topic, scored). Everything here is idempotent: the
 * sync helpers fully recompute a signal's / event's contribution, so they are
 * safe to call on every create, update and backfill run.
 */

// Topic vocabulary. Labels mirror MEANINGS in src/lib/store.ts; kept local so
// this server module doesn't pull in the client store. "skill" topics are
// derived from activity shape (e.g. organising talks) rather than meanings.
const TOPIC_VOCAB: { key: string; label: string; kind: 'meaning' | 'skill' }[] = [
  { key: 'ai', label: 'ИИ', kind: 'meaning' },
  { key: 'recsys', label: 'RecSys/Рекомендации', kind: 'meaning' },
  { key: 'sberid', label: 'СберID', kind: 'meaning' },
  { key: 'personalization', label: 'Персонализация и данные', kind: 'meaning' },
  { key: 'security', label: 'Безопасность и доверие', kind: 'meaning' },
  { key: 'hr', label: 'HR-бренд/Команда', kind: 'meaning' },
  { key: 'techlead', label: 'Технологическое лидерство и инновации', kind: 'meaning' },
  { key: 'public-speaking', label: 'Публичные выступления', kind: 'skill' },
]

const LABEL_TO_KEY = new Map(TOPIC_VOCAB.map(t => [t.label, t.key]))

// Evidence weights. A finished signal is strong proof; a comment is a faint hint.
const WEIGHTS = {
  signal_assignee_completed: 5,
  signal_assignee: 2,
  signal_collaborator_completed: 3,
  signal_collaborator: 1,
  event_organizer: 3,
  comment: 0.5,
} as const

// Lazy in-process cache of topic ids (best-effort across serverless instances).
const topicIdCache = new Map<string, string>()

async function getTopicId(key: string): Promise<string> {
  const cached = topicIdCache.get(key)
  if (cached) return cached
  const meta = TOPIC_VOCAB.find(t => t.key === key)
  const topic = await db.topic.upsert({
    where: { key },
    create: { key, label: meta?.label ?? key, kind: meta?.kind ?? 'meaning' },
    update: {},
  })
  topicIdCache.set(key, topic.id)
  return topic.id
}

/** Parse a comma-separated `meanings` string into known topic keys. */
function meaningsToTopicKeys(meanings: string | null | undefined): string[] {
  if (!meanings) return []
  return meanings
    .split(',')
    .map(s => s.trim())
    .map(label => LABEL_TO_KEY.get(label))
    .filter((key): key is string => Boolean(key))
}

/** Recompute MemberExpertise rows for one member from their observations. */
async function recomputeMember(memberId: string): Promise<void> {
  const observations = await db.expertiseObservation.findMany({
    where: { memberId },
    select: { topicId: true, weight: true, occurredAt: true },
  })

  const byTopic = new Map<string, { score: number; count: number; last: Date }>()
  for (const o of observations) {
    const acc = byTopic.get(o.topicId)
    if (acc) {
      acc.score += o.weight
      acc.count += 1
      if (o.occurredAt > acc.last) acc.last = o.occurredAt
    } else {
      byTopic.set(o.topicId, { score: o.weight, count: 1, last: o.occurredAt })
    }
  }

  // Drop expertise rows that no longer have any supporting evidence.
  await db.memberExpertise.deleteMany({
    where: { memberId, topicId: { notIn: Array.from(byTopic.keys()) } },
  })

  for (const [topicId, v] of byTopic) {
    await db.memberExpertise.upsert({
      where: { memberId_topicId: { memberId, topicId } },
      create: {
        memberId,
        topicId,
        score: v.score,
        evidenceCount: v.count,
        lastActivityAt: v.last,
      },
      update: {
        score: v.score,
        evidenceCount: v.count,
        lastActivityAt: v.last,
      },
    })
  }
}

/**
 * Re-derive every signal-based observation for one signal, then recompute the
 * affected members. Call after any create/update of a signal.
 */
export async function syncSignalKnowledge(signalId: string): Promise<void> {
  try {
    const signal = await db.signal.findUnique({
      where: { id: signalId },
      select: {
        status: true,
        meanings: true,
        assigneeId: true,
        updatedAt: true,
        collaborators: { select: { id: true } },
      },
    })

    // Members touched before this sync (so we recompute them even if removed).
    const previous = await db.expertiseObservation.findMany({
      where: { signalId, sourceType: { in: ['signal_assignee', 'signal_collaborator'] } },
      select: { memberId: true },
    })
    const affected = new Set(previous.map(p => p.memberId))

    await db.expertiseObservation.deleteMany({
      where: { signalId, sourceType: { in: ['signal_assignee', 'signal_collaborator'] } },
    })

    const topicKeys = signal ? meaningsToTopicKeys(signal.meanings) : []
    // Archived/rejected work isn't evidence of living expertise.
    const active = signal && signal.status !== 'archived'

    if (signal && active && topicKeys.length > 0) {
      const completed = signal.status === 'completed'
      const occurredAt = signal.updatedAt
      const topicIds = await Promise.all(topicKeys.map(getTopicId))

      if (signal.assigneeId) {
        affected.add(signal.assigneeId)
        const weight = completed ? WEIGHTS.signal_assignee_completed : WEIGHTS.signal_assignee
        await db.expertiseObservation.createMany({
          data: topicIds.map(topicId => ({
            memberId: signal.assigneeId!,
            topicId,
            sourceType: 'signal_assignee',
            signalId,
            weight,
            occurredAt,
          })),
        })
      }

      for (const collab of signal.collaborators) {
        affected.add(collab.id)
        const weight = completed ? WEIGHTS.signal_collaborator_completed : WEIGHTS.signal_collaborator
        await db.expertiseObservation.createMany({
          data: topicIds.map(topicId => ({
            memberId: collab.id,
            topicId,
            sourceType: 'signal_collaborator',
            signalId,
            weight,
            occurredAt,
          })),
        })
      }
    }

    for (const memberId of affected) await recomputeMember(memberId)
  } catch (err) {
    console.error('syncSignalKnowledge failed:', err)
  }
}

/** Remove all observations tied to a deleted signal and recompute members. */
export async function cleanupSignalKnowledge(signalId: string): Promise<void> {
  try {
    const touched = await db.expertiseObservation.findMany({
      where: { signalId },
      select: { memberId: true },
    })
    const affected = new Set(touched.map(t => t.memberId))
    await db.expertiseObservation.deleteMany({ where: { signalId } })
    for (const memberId of affected) await recomputeMember(memberId)
  } catch (err) {
    console.error('cleanupSignalKnowledge failed:', err)
  }
}

/**
 * Re-derive the organiser observation for one event. Topics come from the linked
 * signal's meanings; a standalone talk/meetup still counts as a speaking skill.
 */
export async function syncEventKnowledge(eventId: string): Promise<void> {
  try {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        type: true,
        status: true,
        date: true,
        signal: { select: { meanings: true } },
      },
    })

    const previous = await db.expertiseObservation.findMany({
      where: { eventId, sourceType: 'event_organizer' },
      select: { memberId: true },
    })
    const affected = new Set(previous.map(p => p.memberId))

    await db.expertiseObservation.deleteMany({
      where: { eventId, sourceType: 'event_organizer' },
    })

    const active = event && event.status !== 'cancelled' && event.organizerId
    if (event && active) {
      let topicKeys = meaningsToTopicKeys(event.signal?.meanings)
      const isTalk = event.type === 'Выступление' || event.type === 'Митап' || event.type === 'Мероприятие'
      if (topicKeys.length === 0 && isTalk) topicKeys = ['public-speaking']

      if (topicKeys.length > 0) {
        affected.add(event.organizerId!)
        const topicIds = await Promise.all(topicKeys.map(getTopicId))
        await db.expertiseObservation.createMany({
          data: topicIds.map(topicId => ({
            memberId: event.organizerId!,
            topicId,
            sourceType: 'event_organizer',
            eventId,
            weight: WEIGHTS.event_organizer,
            occurredAt: event.date,
          })),
        })
      }
    }

    for (const memberId of affected) await recomputeMember(memberId)
  } catch (err) {
    console.error('syncEventKnowledge failed:', err)
  }
}

/** Record a (light) signal that a commenter is engaged with the signal's topics. */
export async function recordCommentKnowledge(memberId: string, signalId: string): Promise<void> {
  try {
    const signal = await db.signal.findUnique({
      where: { id: signalId },
      select: { meanings: true },
    })
    const topicKeys = meaningsToTopicKeys(signal?.meanings)
    if (topicKeys.length === 0) return
    const topicIds = await Promise.all(topicKeys.map(getTopicId))

    // One comment-fact per (member, topic, signal) — replace to stay idempotent.
    await db.expertiseObservation.deleteMany({
      where: { memberId, signalId, sourceType: 'comment' },
    })
    await db.expertiseObservation.createMany({
      data: topicIds.map(topicId => ({
        memberId,
        topicId,
        sourceType: 'comment',
        signalId,
        weight: WEIGHTS.comment,
      })),
    })
    await recomputeMember(memberId)
  } catch (err) {
    console.error('recordCommentKnowledge failed:', err)
  }
}

/**
 * One-off backfill: replay existing signals, events and comments through the
 * knowledge-base sync helpers to seed expertise from historical activity.
 *
 * Run with bun (already used by `npm start`):
 *   bun scripts/backfill-knowledge.ts
 * It reads DATABASE_URL from the environment (.env / .env.local), like the app.
 */
import { db } from '../src/lib/db'
import {
  syncSignalKnowledge,
  syncEventKnowledge,
  recordCommentKnowledge,
} from '../src/lib/knowledge'

async function main() {
  const signals = await db.signal.findMany({ select: { id: true } })
  console.log(`Signals: ${signals.length}`)
  for (const s of signals) await syncSignalKnowledge(s.id)

  const events = await db.event.findMany({ select: { id: true } })
  console.log(`Events: ${events.length}`)
  for (const e of events) await syncEventKnowledge(e.id)

  const comments = await db.comment.findMany({
    where: { signalId: { not: null } },
    select: { authorId: true, signalId: true },
    distinct: ['authorId', 'signalId'],
  })
  console.log(`Comment links: ${comments.length}`)
  for (const c of comments) {
    if (c.signalId) await recordCommentKnowledge(c.authorId, c.signalId)
  }

  const expertise = await db.memberExpertise.count()
  const topics = await db.topic.count()
  console.log(`Done. MemberExpertise rows: ${expertise}, topics: ${topics}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

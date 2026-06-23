import { db } from '@/lib/db'

/**
 * Knowledge graph payload: member ↔ topic edges weighted by accumulated
 * expertise, plus node totals. Protected by middleware (not a public prefix).
 */
export async function GET() {
  const expertise = await db.memberExpertise.findMany({
    where: { score: { gt: 0 } },
    include: {
      member: { select: { id: true, name: true, avatar: true, role: true } },
      topic: { select: { id: true, label: true, kind: true } },
    },
  })

  const members = new Map<string, { id: string; type: 'member'; label: string; avatar: string | null; role: string | null; score: number }>()
  const topics = new Map<string, { id: string; type: 'topic'; label: string; kind: string; score: number }>()
  const edges: { source: string; target: string; score: number; evidenceCount: number; lastActivityAt: Date | null }[] = []

  for (const e of expertise) {
    const topicNodeId = `topic:${e.topic.id}`

    const m = members.get(e.member.id)
    if (m) m.score += e.score
    else members.set(e.member.id, {
      id: e.member.id, type: 'member', label: e.member.name,
      avatar: e.member.avatar, role: e.member.role, score: e.score,
    })

    const t = topics.get(topicNodeId)
    if (t) t.score += e.score
    else topics.set(topicNodeId, {
      id: topicNodeId, type: 'topic', label: e.topic.label, kind: e.topic.kind, score: e.score,
    })

    edges.push({
      source: e.member.id,
      target: topicNodeId,
      score: Math.round(e.score * 10) / 10,
      evidenceCount: e.evidenceCount,
      lastActivityAt: e.lastActivityAt,
    })
  }

  return Response.json({
    nodes: [...members.values(), ...topics.values()],
    edges,
  })
}

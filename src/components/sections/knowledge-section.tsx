'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Network, Loader2, RefreshCw, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

type GraphNode =
  | { id: string; type: 'member'; label: string; avatar: string | null; role: string | null; score: number }
  | { id: string; type: 'topic'; label: string; kind: string; score: number }

type GraphEdge = {
  source: string
  target: string
  score: number
  evidenceCount: number
  lastActivityAt: string | null
}

type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] }

const TEAL = '#1D9E75'
const ORANGE = '#FF6B35'
const VIEW_W = 820
const VIEW_H = 560

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// Stable hash → used to de-stack members that share the same topics.
function hash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

type Positioned = { x: number; y: number }

/**
 * Deterministic radial layout (no force lib): topics evenly on the outer ring,
 * each member at the weighted-centroid angle of its topics on an inner ring,
 * nudged by a stable hash so members sharing a topic don't overlap.
 */
function layout(data: GraphData) {
  const cx = VIEW_W / 2
  const cy = VIEW_H / 2
  const topics = data.nodes.filter((n): n is Extract<GraphNode, { type: 'topic' }> => n.type === 'topic')
  const members = data.nodes.filter((n): n is Extract<GraphNode, { type: 'member' }> => n.type === 'member')
  const RT = Math.min(VIEW_W, VIEW_H) * 0.38

  const pos = new Map<string, Positioned>()
  const orderedTopics = [...topics].sort((a, b) => a.id.localeCompare(b.id))
  orderedTopics.forEach((t, i) => {
    const angle = (i / Math.max(orderedTopics.length, 1)) * Math.PI * 2 - Math.PI / 2
    pos.set(t.id, { x: cx + Math.cos(angle) * RT, y: cy + Math.sin(angle) * RT })
  })

  const edgesByMember = new Map<string, GraphEdge[]>()
  for (const e of data.edges) {
    const arr = edgesByMember.get(e.source)
    if (arr) arr.push(e)
    else edgesByMember.set(e.source, [e])
  }

  for (const m of members) {
    const edges = edgesByMember.get(m.id) || []
    let sx = 0, sy = 0, sw = 0
    for (const e of edges) {
      const tp = pos.get(e.target)
      if (!tp) continue
      sx += tp.x * e.score
      sy += tp.y * e.score
      sw += e.score
    }
    let angle: number
    if (sw > 0) angle = Math.atan2(sy / sw - cy, sx / sw - cx)
    else angle = (hash(m.id) % 360) * (Math.PI / 180)
    const radius = RT * 0.46 + (hash(m.id) % 5) * 16
    pos.set(m.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius })
  }

  return pos
}

export function KnowledgeSection() {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/knowledge/graph')
      if (!res.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/knowledge/graph')
        if (!res.ok) throw new Error('failed')
        const json = await res.json()
        if (active) setData(json)
      } catch {
        if (active) setError(true)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const pos = useMemo(() => (data ? layout(data) : new Map<string, Positioned>()), [data])

  const maxEdge = useMemo(
    () => Math.max(1, ...(data?.edges.map(e => e.score) ?? [1])),
    [data],
  )
  const maxNode = useMemo(
    () => Math.max(1, ...(data?.nodes.map(n => n.score) ?? [1])),
    [data],
  )

  // Which nodes/edges are connected to the current selection (for dimming).
  const connected = useMemo(() => {
    if (!selected || !data) return null
    const ids = new Set<string>([selected])
    for (const e of data.edges) {
      if (e.source === selected) ids.add(e.target)
      if (e.target === selected) ids.add(e.source)
    }
    return ids
  }, [selected, data])

  const isLit = (id: string) => !connected || connected.has(id)
  const edgeLit = (e: GraphEdge) => !selected || e.source === selected || e.target === selected

  // Per-member expertise list (sorted), and experts per selected topic.
  const memberList = useMemo(() => {
    if (!data) return []
    const byMember = new Map<string, { member: Extract<GraphNode, { type: 'member' }>; topics: { label: string; score: number }[] }>()
    const topicLabel = new Map(data.nodes.filter(n => n.type === 'topic').map(n => [n.id, n.label]))
    for (const m of data.nodes) {
      if (m.type === 'member') byMember.set(m.id, { member: m, topics: [] })
    }
    for (const e of data.edges) {
      const entry = byMember.get(e.source)
      if (entry) entry.topics.push({ label: topicLabel.get(e.target) || '—', score: e.score })
    }
    return [...byMember.values()]
      .map(v => ({ ...v, topics: v.topics.sort((a, b) => b.score - a.score), total: v.topics.reduce((s, t) => s + t.score, 0) }))
      .sort((a, b) => b.total - a.total)
  }, [data])

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Network className="w-5 h-5 text-[#1D9E75] shrink-0" />
          <div className="min-w-0">
            <h2 className="comic-title text-lg text-[#1D9E75] truncate">Граф знаний</h2>
            <p className="text-xs text-muted-foreground">Кто в чём силён — копится из задач, событий и обсуждений</p>
          </div>
        </div>
        <button
          onClick={load}
          className="comic-btn bg-card px-3 py-2 text-xs flex items-center gap-1.5 shrink-0"
          title="Обновить"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-sm">Собираем связи…</span>
        </div>
      ) : error ? (
        <div className="comic-border comic-shadow bg-card p-6 text-center text-sm text-muted-foreground">
          Не удалось загрузить граф знаний. Попробуйте обновить.
        </div>
      ) : !data || data.edges.length === 0 ? (
        <div className="comic-border comic-shadow bg-card p-8 text-center">
          <Brain className="w-10 h-10 mx-auto mb-3 text-[#1D9E75]" />
          <h3 className="comic-title text-base mb-1">Пока пусто</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Экспертиза копится автоматически: назначайте людей на сигналы с темами,
            доводите задачи до «Готово», проводите события. Для исторических данных
            запустите <code className="text-xs bg-[var(--comic-tag-bg)] px-1 rounded">npm run knowledge:backfill</code>.
          </p>
        </div>
      ) : (
        <>
          <div className="comic-border comic-shadow bg-card overflow-hidden">
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label="Граф знаний: люди и темы">
              {data.edges.map((e, i) => {
                const a = pos.get(e.source)
                const b = pos.get(e.target)
                if (!a || !b) return null
                const lit = edgeLit(e)
                return (
                  <motion.line
                    key={`${e.source}-${e.target}`}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={selected && lit ? TEAL : '#94a3b8'}
                    strokeWidth={1.5 + (e.score / maxEdge) * 5}
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: lit ? 0.55 : 0.08 }}
                    transition={{ duration: 0.5, delay: Math.min(i * 0.01, 0.4) }}
                  />
                )
              })}

              {data.nodes.map((n, i) => {
                const p = pos.get(n.id)
                if (!p) return null
                const lit = isLit(n.id)
                if (n.type === 'topic') {
                  const w = Math.max(54, n.label.length * 7.2 + 22)
                  return (
                    <motion.g
                      key={n.id}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: lit ? 1 : 0.2, scale: 1 }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.015, 0.5) }}
                      style={{ cursor: 'pointer', transformOrigin: `${p.x}px ${p.y}px` }}
                      onClick={() => setSelected(prev => (prev === n.id ? null : n.id))}
                    >
                      <rect x={p.x - w / 2} y={p.y - 15} width={w} height={30} rx={15} fill={TEAL} stroke="#0F6E56" strokeWidth={selected === n.id ? 3 : 1.5} />
                      <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12.5" fontWeight={500} fill="#E1F5EE">{n.label}</text>
                    </motion.g>
                  )
                }
                const r = 13 + (n.score / maxNode) * 13
                return (
                  <motion.g
                    key={n.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: lit ? 1 : 0.2, scale: 1 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.015, 0.5) }}
                    style={{ cursor: 'pointer', transformOrigin: `${p.x}px ${p.y}px` }}
                    onClick={() => setSelected(prev => (prev === n.id ? null : n.id))}
                  >
                    <circle cx={p.x} cy={p.y} r={r} fill={ORANGE} stroke="#9A3412" strokeWidth={selected === n.id ? 3 : 1.5} />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight={500} fill="#fff">{initials(n.label)}</text>
                    <text x={p.x} y={p.y + r + 13} textAnchor="middle" fontSize="11" fill="var(--foreground)">{n.label.split(' ')[0]}</text>
                  </motion.g>
                )
              })}
            </svg>
            <div className="flex items-center gap-4 px-3 py-2 border-t-2 border-[var(--comic-border-color)] text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: ORANGE }} /> Люди</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-full" style={{ background: TEAL }} /> Темы</span>
              <span className="hidden sm:inline">Толщина связи = накопленная экспертиза · клик по узлу — подсветить связи</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {memberList.map(({ member, topics, total }) => (
              <div
                key={member.id}
                className={cn(
                  'comic-border comic-shadow-sm bg-card p-3 transition-opacity',
                  selected && selected !== member.id && !topics.length ? 'opacity-50' : '',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[var(--comic-border-color)] overflow-hidden shrink-0" style={{ background: ORANGE }}>
                    {member.type === 'member' && member.avatar
                      ? <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                      : initials(member.label)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{member.label}</p>
                    {member.type === 'member' && member.role && <p className="text-[11px] text-muted-foreground truncate">{member.role}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  {topics.slice(0, 5).map(t => (
                    <div key={t.label} className="flex items-center gap-2">
                      <span className="text-[11px] w-32 sm:w-40 truncate shrink-0">{t.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--comic-tag-bg)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(t.score / Math.max(total, 1)) * 100}%`, background: TEAL }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

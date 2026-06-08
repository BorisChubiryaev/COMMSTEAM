'use client'

import { useAppStore, PRIORITY_COLORS, PRIORITY_BG, type Signal } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { Columns3, Filter, GitBranch, Search, TrendingUp, Clock, Zap, GripVertical } from 'lucide-react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const KANBAN_COLUMNS = [
  { status: 'input', label: '📥 Входящее', color: '#9CA3AF', description: 'Новые сигналы' },
  { status: 'classification', label: '🏷️ Классификация', color: '#60A5FA', description: 'Определение типа' },
  { status: 'evaluation', label: '⚡ Оценка', color: '#FBBF24', description: 'Фильтр и приоритет' },
  { status: 'meaning', label: '🧠 Смыслы', color: '#A78BFA', description: 'Карта смыслов' },
  { status: 'distribution', label: '📡 Распределение', color: '#34D399', description: 'По направлениям' },
  { status: 'launch', label: '🚀 Запуск', color: '#FF6B35', description: 'Публикация' },
  { status: 'measurement', label: '📊 Измерение', color: '#00C9A7', description: 'Результаты' },
  { status: 'feedback', label: '💬 Обратная связь', color: '#FF3F8E', description: 'Уроки' },
  { status: 'completed', label: '✅ Завершено', color: '#4ECB71', description: 'Готово' },
]

const GRAPH_LAYOUT: Record<string, { x: number; y: number }> = {
  input: { x: 13, y: 14 },
  classification: { x: 36, y: 14 },
  evaluation: { x: 59, y: 14 },
  meaning: { x: 82, y: 14 },
  distribution: { x: 82, y: 50 },
  launch: { x: 59, y: 50 },
  measurement: { x: 36, y: 50 },
  feedback: { x: 13, y: 50 },
  completed: { x: 43, y: 84 },
}

const SOURCE_EMOJIS: Record<string, string> = {
  'ДЗО': '🏢',
  'Трабы/Команды': '👥',
  'Мероприятия': '🎤',
  'Тренды/Рынок': '📈',
  'Задачи от руководства': '👔',
}

const TYPE_COLORS: Record<string, string> = {
  'Новость': 'bg-[#3B82F6]',
  'Идея/Инициатива': 'bg-[#A78BFA]',
  'Инфоповод': 'bg-[#F59E0B]',
  'Задача/Поручение': 'bg-[#EF4444]',
}

// Sortable card component
function SortableSignalCard({ signal, onClick }: { signal: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: signal.id,
    data: { status: signal.status },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'только что'
    if (mins < 60) return `${mins} мин`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ч`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} д`
    return new Date(dateStr).toLocaleDateString('ru')
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "bg-card border-2 border-[var(--comic-border-color)] rounded-lg p-3 cursor-pointer comic-card-hover relative group",
        isDragging && "dragging"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Priority indicator strip */}
      {signal.priority && (
        <div
          className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
          style={{ backgroundColor: PRIORITY_BG[signal.priority as keyof typeof PRIORITY_BG] || '#ccc' }}
        />
      )}

      {/* Title */}
      <h4 className="text-sm font-bold mb-1.5 line-clamp-2 pl-2 group-hover:text-[#FF6B35] transition-colors">
        {signal.title}
      </h4>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-1.5 pl-2">
        {signal.signalType && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold ${TYPE_COLORS[signal.signalType] || 'bg-gray-400'}`}>
            {signal.signalType}
          </span>
        )}
        {signal.source && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--comic-tag-bg)] text-[var(--comic-tag-text)] flex items-center gap-0.5">
            <span>{SOURCE_EMOJIS[signal.source] || '📌'}</span>
            {signal.source}
          </span>
        )}
      </div>

      {/* AI Summary preview */}
      {signal.aiSummary && (
        <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5 pl-2 border-l-2 border-[#FF6B35]/30 italic">
          🤖 {signal.aiSummary}
        </p>
      )}

      {/* Meanings tags */}
      {signal.meanings && (
        <div className="flex flex-wrap gap-0.5 pl-2 mb-1.5">
          {signal.meanings.split(',').filter(Boolean).slice(0, 3).map((m, i) => (
            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#A78BFA]/15 text-[#A78BFA] font-medium">
              {m.trim()}
            </span>
          ))}
          {signal.meanings.split(',').filter(Boolean).length > 3 && (
            <span className="text-[8px] px-1 py-0.5 rounded-full bg-[var(--comic-tag-bg)] text-muted-foreground">
              +{signal.meanings.split(',').filter(Boolean).length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pl-2 pt-1.5 border-t border-border">
        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(signal.createdAt)}
        </span>
        {signal.assignee && (
          <div className="w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-[var(--comic-border-color)]" title={signal.assignee.name}>
            {signal.assignee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
        )}
      </div>
    </div>
  )
}

// Drag overlay card
function DragOverlayCard({ signal }: { signal: any }) {
  return (
    <div className="bg-card border-2 border-[#FF6B35] rounded-lg p-3 shadow-2xl dragging max-w-[280px]">
      {signal.priority && (
        <div
          className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
          style={{ backgroundColor: PRIORITY_BG[signal.priority as keyof typeof PRIORITY_BG] || '#ccc' }}
        />
      )}
      <h4 className="text-sm font-bold mb-1 pl-2">{signal.title}</h4>
      <div className="flex flex-wrap gap-1 pl-2">
        {signal.signalType && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold ${TYPE_COLORS[signal.signalType] || 'bg-gray-400'}`}>
            {signal.signalType}
          </span>
        )}
        {signal.priority && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold ${PRIORITY_COLORS[signal.priority as keyof typeof PRIORITY_COLORS]}`}>
            {signal.priority}
          </span>
        )}
      </div>
    </div>
  )
}

function GraphSignalPill({ signal, onClick }: { signal: Signal; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-card border border-[var(--comic-border-color)] rounded-md px-2 py-1.5 hover:border-[#FF6B35] hover:bg-[var(--comic-bg-hover)] transition-colors"
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: PRIORITY_BG[signal.priority as keyof typeof PRIORITY_BG] || '#9CA3AF' }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold leading-snug line-clamp-2">{signal.title}</span>
          <span className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
            {signal.signalType && <span className="truncate">{signal.signalType}</span>}
            {signal.source && (
              <>
                <span aria-hidden="true">/</span>
                <span className="truncate">{signal.source}</span>
              </>
            )}
          </span>
        </span>
      </div>
    </button>
  )
}

function KanbanGraphView({
  filteredSignals,
  setSelectedSignalId,
}: {
  filteredSignals: Signal[]
  setSelectedSignalId: (id: string | null) => void
}) {
  const graphNodes = KANBAN_COLUMNS.map((col) => ({
    ...col,
    position: GRAPH_LAYOUT[col.status],
    signals: filteredSignals.filter((signal) => signal.status === col.status),
  }))

  return (
    <div className="flex-1 overflow-auto">
      <div className="relative min-h-[640px] min-w-[1040px] rounded-xl border-2 border-[var(--comic-border-color)] bg-[var(--comic-column-bg)] overflow-hidden">
        <div className="absolute inset-0 benday-dots opacity-[0.22]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {graphNodes.slice(0, -1).map((node, index) => {
            const next = graphNodes[index + 1]
            const bend = Math.abs(node.position.y - next.position.y) > 1
            const d = bend
              ? `M ${node.position.x} ${node.position.y} C ${(node.position.x + next.position.x) / 2} ${node.position.y}, ${(node.position.x + next.position.x) / 2} ${next.position.y}, ${next.position.x} ${next.position.y}`
              : `M ${node.position.x} ${node.position.y} L ${next.position.x} ${next.position.y}`

            return (
              <path
                key={`${node.status}-${next.status}`}
                d={d}
                fill="none"
                stroke={next.color}
                strokeWidth="0.35"
                strokeLinecap="round"
                strokeDasharray={next.signals.length === 0 ? '1 1.2' : undefined}
                opacity={next.signals.length === 0 ? 0.35 : 0.75}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {graphNodes.map((node) => {
          const visibleSignals = node.signals.slice(0, 3)
          const hiddenCount = node.signals.length - visibleSignals.length

          return (
            <div
              key={node.status}
              className="absolute w-[220px] -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
            >
              <div className="bg-card border-2 border-[var(--comic-border-color)] rounded-lg comic-shadow-sm overflow-hidden">
                <div className="relative px-3 py-2" style={{ backgroundColor: node.color + '18' }}>
                  <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: node.color }} />
                  <div className="flex items-center gap-2 pt-1">
                    <span className="min-w-0 flex-1 truncate text-xs font-bold">{node.label}</span>
                    <span
                      className="h-6 min-w-6 rounded-full border-2 border-[var(--comic-border-color)] px-1.5 text-center text-xs font-bold leading-5"
                      style={{
                        backgroundColor: node.signals.length > 0 ? node.color : 'var(--comic-tag-bg)',
                        color: node.signals.length > 0 ? 'white' : 'var(--comic-text-muted)',
                      }}
                    >
                      {node.signals.length}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{node.description}</p>
                </div>

                <div className="space-y-1.5 p-2">
                  {visibleSignals.map((signal) => (
                    <GraphSignalPill
                      key={signal.id}
                      signal={signal}
                      onClick={() => setSelectedSignalId(signal.id)}
                    />
                  ))}

                  {node.signals.length === 0 && (
                    <div className="rounded-md border border-dashed border-[var(--comic-border-color)] px-2 py-3 text-center text-[10px] font-medium text-muted-foreground/60">
                      Пусто
                    </div>
                  )}

                  {hiddenCount > 0 && (
                    <div className="text-center text-[10px] font-bold text-muted-foreground">
                      +{hiddenCount} еще
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { signals, setSelectedSignalId, updateSignal, setSignals } = useAppStore()
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'graph'>('board')
  const [mobileStatus, setMobileStatus] = useState('input')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const filteredSignals = useMemo(() => signals.filter(s => {
    if (s.status === 'archived') return false
    if (filterPriority && s.priority !== filterPriority) return false
    if (filterSource && s.source !== filterSource) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return s.title.toLowerCase().includes(q) ||
        s.content?.toLowerCase().includes(q) ||
        s.aiSummary?.toLowerCase().includes(q) ||
        s.source?.toLowerCase().includes(q) ||
        s.signalType?.toLowerCase().includes(q)
    }
    return true
  }), [signals, filterPriority, filterSource, searchQuery])

  const activeSignals = signals.filter(s => s.status !== 'archived')
  const urgentCount = activeSignals.filter(s => s.priority === 'A').length
  const todayCount = activeSignals.filter(s => {
    const d = new Date(s.createdAt)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeSignal = signals.find(s => s.id === active.id)
    if (!activeSignal) return

    // Check if dropped on a column
    const overData = over.data.current
    const targetStatus = overData?.status as string | undefined

    if (targetStatus && targetStatus !== activeSignal.status) {
      try {
        const res = await fetch(`/api/signals/${activeSignal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        })
        if (res.ok) {
          const updated = await res.json()
          updateSignal(updated)
          setSignals(signals.map(s => s.id === updated.id ? updated : s))
        }
      } catch (err) {
        console.error('Failed to move signal:', err)
      }
    }
  }

  const activeSignal = activeId ? signals.find(s => s.id === activeId) : null
  const mobileColumn = KANBAN_COLUMNS.find(col => col.status === mobileStatus) || KANBAN_COLUMNS[0]
  const mobileSignals = filteredSignals.filter(s => s.status === mobileColumn.status)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col min-h-0">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3 mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-card comic-border comic-shadow-sm px-2 sm:px-3 py-1.5 min-w-0">
            <Zap className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-sm font-bold">{activeSignals.length}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate">сигналов</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-card comic-border comic-shadow-sm px-2 sm:px-3 py-1.5 min-w-0">
            <TrendingUp className="w-4 h-4 text-[#EF4444]" />
            <span className="text-sm font-bold text-[#EF4444]">{urgentCount}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate">срочных</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-card comic-border comic-shadow-sm px-2 sm:px-3 py-1.5 min-w-0">
            <Clock className="w-4 h-4 text-[#00C9A7]" />
            <span className="text-sm font-bold text-[#00C9A7]">{todayCount}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate">сегодня</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative min-w-0 flex-[1_1_220px] sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
              placeholder="Поиск сигналов..."
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "comic-btn text-xs px-3 py-2 flex items-center gap-1",
              showFilters ? "bg-[#FF6B35] text-white" : "bg-card text-foreground"
            )}
          >
            <Filter className="w-3 h-3" />
            Фильтры
            {(filterPriority || filterSource) && (
              <span className="w-2 h-2 bg-[#FF3F8E] rounded-full" />
            )}
          </button>
          <div className="ml-auto flex items-center rounded-lg border-2 border-[var(--comic-border-color)] bg-card p-1 comic-shadow-sm max-sm:order-3 max-sm:ml-0 max-sm:w-full">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              aria-label="Доска"
              className={cn(
                "h-8 flex-1 sm:flex-none px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors",
                viewMode === 'board' ? "bg-[#FF6B35] text-white" : "text-muted-foreground hover:bg-[var(--comic-bg-hover)]"
              )}
              title="Канбан-доска"
            >
              <Columns3 className="w-3.5 h-3.5" />
              Доска
            </button>
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              aria-label="Граф"
              className={cn(
                "h-8 flex-1 sm:flex-none px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors",
                viewMode === 'graph' ? "bg-[#FF6B35] text-white" : "text-muted-foreground hover:bg-[var(--comic-bg-hover)]"
              )}
              title="Граф этапов"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Граф
            </button>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mb-4 p-3 bg-card comic-border comic-shadow-sm space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground">Приоритет:</span>
              <button
                onClick={() => setFilterPriority(null)}
                className={cn("text-xs px-2 py-1 rounded-lg border-2 border-[var(--comic-border-color)] transition-all", !filterPriority ? "bg-[var(--comic-border-color)] text-white comic-shadow-sm" : "bg-card text-muted-foreground hover:bg-[var(--comic-bg-hover)]")}
              >
                Все
              </button>
              {['A', 'B', 'C', 'Отклонено'].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(filterPriority === p ? null : p)}
                  className={cn("text-xs px-2.5 py-1 rounded-lg border-2 border-[var(--comic-border-color)] font-bold transition-all", filterPriority === p ? "text-white comic-shadow-sm" : "bg-card text-muted-foreground hover:bg-[var(--comic-bg-hover)]")}
                  style={filterPriority === p ? { backgroundColor: PRIORITY_BG[p as keyof typeof PRIORITY_BG] } : {}}
                >
                  {p === 'Отклонено' ? '✕' : p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground">Источник:</span>
              {['ДЗО', 'Трабы/Команды', 'Мероприятия', 'Тренды/Рынок', 'Задачи от руководства'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSource(filterSource === s ? null : s)}
                  className={cn("text-xs px-2 py-1 rounded-lg border-2 border-[var(--comic-border-color)] transition-all flex items-center gap-1", filterSource === s ? "bg-[#00C9A7] text-white comic-shadow-sm" : "bg-card text-muted-foreground hover:bg-[var(--comic-bg-hover)]")}
                >
                  <span>{SOURCE_EMOJIS[s] || '📌'}</span>
                  {s}
                </button>
              ))}
            </div>
            {(filterPriority || filterSource) && (
              <button
                onClick={() => { setFilterPriority(null); setFilterSource(null) }}
                className="text-xs text-[#FF3F8E] underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        <div className="md:hidden mb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {KANBAN_COLUMNS.map(col => {
              const count = filteredSignals.filter(s => s.status === col.status).length
              const isActive = mobileStatus === col.status
              return (
                <button
                  key={col.status}
                  type="button"
                  onClick={() => setMobileStatus(col.status)}
                  className={cn(
                    "min-w-[132px] rounded-lg border-2 px-3 py-2 text-left transition-colors",
                    isActive ? "border-[var(--comic-border-color)] text-white comic-shadow-sm" : "border-[var(--comic-border-color)] bg-card text-foreground"
                  )}
                  style={isActive ? { backgroundColor: col.color } : {}}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold">{col.label}</span>
                    <span className="ml-auto rounded-full bg-white/20 px-1.5 text-[10px] font-bold">{count}</span>
                  </div>
                  <p className={cn("mt-0.5 truncate text-[10px]", isActive ? "text-white/80" : "text-muted-foreground")}>{col.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {viewMode === 'graph' ? (
          <KanbanGraphView filteredSignals={filteredSignals} setSelectedSignalId={setSelectedSignalId} />
        ) : (
          /* Kanban columns */
          <>
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="rounded-xl border-2 border-[var(--comic-border-color)] bg-[var(--comic-column-bg)]">
              <div className="sticky top-0 z-10 rounded-t-lg border-b-2 border-[var(--comic-border-color)] px-3 py-2.5" style={{ backgroundColor: mobileColumn.color + '18' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{mobileColumn.label}</span>
                  <span className="ml-auto rounded-full border-2 border-[var(--comic-border-color)] px-2 text-xs font-bold" style={{ backgroundColor: mobileColumn.color, color: 'white' }}>
                    {mobileSignals.length}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{mobileColumn.description}</p>
              </div>
              <SortableContext
                items={mobileSignals.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 p-2">
                  {mobileSignals.map(signal => (
                    <SortableSignalCard
                      key={signal.id}
                      signal={signal}
                      onClick={() => setSelectedSignalId(signal.id)}
                    />
                  ))}
                {mobileSignals.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: mobileColumn.color + '15' }}>
                      <span className="text-xl opacity-50">📭</span>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground">В этой стадии пусто</p>
                  </div>
                )}
                </div>
              </SortableContext>
            </div>
          </div>

          <div className="hidden md:block flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 h-full min-w-max pb-4">
              {KANBAN_COLUMNS.map((col) => {
                const colSignals = filteredSignals.filter(s => s.status === col.status)
                return (
                  <div
                    key={col.status}
                    className="w-[280px] flex-shrink-0 flex flex-col"
                    data-status={col.status}
                  >
                    {/* Column header */}
                    <div
                      className="px-3 py-2.5 rounded-t-xl border-2 border-b-0 border-[var(--comic-border-color)] relative overflow-hidden"
                      style={{ backgroundColor: col.color + '15' }}
                    >
                      {/* Decorative stripe */}
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: col.color }} />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{col.label}</span>
                        <span
                          className="ml-auto text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-[var(--comic-border-color)]"
                          style={{ backgroundColor: colSignals.length > 0 ? col.color : 'var(--comic-tag-bg)', color: colSignals.length > 0 ? 'white' : 'var(--comic-text-muted)' }}
                        >
                          {colSignals.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{col.description}</p>
                    </div>

                    {/* Column body - droppable area */}
                    <SortableContext
                      items={colSignals.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div
                        className="flex-1 bg-[var(--comic-column-bg)] border-2 border-t-0 border-[var(--comic-border-color)] rounded-b-xl p-2 space-y-2 overflow-y-auto custom-scrollbar kanban-column"
                        style={{ borderLeftColor: col.color + '40' }}
                        data-status={col.status}
                      >
                        {colSignals.map(signal => (
                          <SortableSignalCard
                            key={signal.id}
                            signal={signal}
                            onClick={() => setSelectedSignalId(signal.id)}
                          />
                        ))}

                        {colSignals.length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: col.color + '15' }}>
                              <span className="text-xl opacity-40">
                                {col.status === 'input' ? '📭' : col.status === 'completed' ? '🎯' : '✨'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground/50 font-medium">Пусто</p>
                            <p className="text-[9px] text-muted-foreground/30 mt-0.5">{col.description}</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                )
              })}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Drag overlay - shows the card being dragged */}
      <DragOverlay>
        {activeSignal ? <DragOverlayCard signal={activeSignal} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

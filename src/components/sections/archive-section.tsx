'use client'

import { useAppStore, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_BG } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Archive as ArchiveIcon, Search, Clock, TrendingUp, CheckCircle2, XCircle, Lightbulb } from 'lucide-react'
import { useState } from 'react'

const TYPE_COLORS: Record<string, string> = {
  'Новость': '#3B82F6',
  'Идея/Инициатива': '#A78BFA',
  'Инфоповод': '#F59E0B',
  'Задача/Поручение': '#EF4444',
}

export function ArchiveSection() {
  const { signals, setSelectedSignalId } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)

  const archived = signals.filter(s => s.status === 'archived' || s.status === 'completed')
  const filtered = archived.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.content?.toLowerCase().includes(search.toLowerCase()) ||
    s.aiSummary?.toLowerCase().includes(search.toLowerCase())
  ).filter(s => !filterType || s.signalType === filterType)

  const withFeedback = archived.filter(s => s.whatWorked || s.whatDidntWork)
  const avgReach = archived.filter(s => s.reach).reduce((sum, s) => sum + (s.reach || 0), 0) / (archived.filter(s => s.reach).length || 1)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)]"
            placeholder="Поиск в архиве..."
          />
        </div>
        <div className="flex gap-1">
          {['Все', 'Новость', 'Идея/Инициатива', 'Инфоповод', 'Задача/Поручение'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t === 'Все' ? null : t)}
              className={cn("text-xs px-2 py-1 rounded-lg border-2 border-[var(--comic-border-color)] font-medium transition-all", 
                (t === 'Все' ? !filterType : filterType === t) ? "text-white comic-shadow-sm" : "bg-[var(--comic-bg)] text-muted-foreground hover:bg-[var(--comic-bg-hover)]"
              )}
              style={(t === 'Все' ? !filterType : filterType === t) ? { backgroundColor: TYPE_COLORS[t] || '#9CA3AF' } : {}}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Archive Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Всего в архиве', value: archived.length, color: '#9CA3AF', icon: ArchiveIcon },
          { label: 'Приоритет A', value: archived.filter(s => s.priority === 'A').length, color: '#EF4444', icon: TrendingUp },
          { label: 'Средний охват', value: Math.round(avgReach).toLocaleString(), color: '#00C9A7', icon: TrendingUp },
          { label: 'С обратной связью', value: withFeedback.length, color: '#4ECB71', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-7 h-7 rounded-bl-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <p className="text-xl comic-title" style={{ color }}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Feedback highlights */}
      {withFeedback.length > 0 && (
        <div className="mb-4 p-3 bg-[#4ECB71]/5 border-2 border-[#4ECB71]/20 rounded-xl">
          <p className="text-xs font-bold text-[#4ECB71] mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Ключевые инсайты из обратной связи
          </p>
          <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
            {withFeedback.slice(0, 3).map(signal => (
              <div key={signal.id} className="flex-shrink-0 bg-[var(--comic-bg)] rounded-lg p-2 border border-[#4ECB71]/20 min-w-[200px] max-w-[250px]">
                <p className="text-[10px] font-bold mb-1 truncate">{signal.title}</p>
                {signal.whatWorked && (
                  <p className="text-[9px] text-muted-foreground flex items-start gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#4ECB71] flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{signal.whatWorked}</span>
                  </p>
                )}
                {signal.whatDidntWork && (
                  <p className="text-[9px] text-muted-foreground flex items-start gap-1">
                    <XCircle className="w-3 h-3 text-[#EF4444] flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{signal.whatDidntWork}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archived signals list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ArchiveIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Архив пуст</p>
            <p className="text-xs mt-1">Завершённые сигналы появятся здесь</p>
          </div>
        ) : (
          filtered.map(signal => (
            <div
              key={signal.id}
              onClick={() => setSelectedSignalId(signal.id)}
              className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-4 cursor-pointer transition-all hover:scale-[1.005] hover:comic-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {signal.priority && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white" style={{ backgroundColor: PRIORITY_BG[signal.priority as keyof typeof PRIORITY_BG] || '#ccc' }}>
                        {signal.priority}
                      </span>
                    )}
                    {signal.signalType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: TYPE_COLORS[signal.signalType] || '#9CA3AF' }}>
                        {signal.signalType}
                      </span>
                    )}
                    {signal.source && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--comic-tag-bg)] text-muted-foreground">{signal.source}</span>
                    )}
                    {signal.status === 'completed' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4ECB71]/10 text-[#4ECB71] font-bold">✓ Завершено</span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold mb-0.5">{signal.title}</h4>
                  {signal.aiSummary && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1">🤖 {signal.aiSummary}</p>
                  )}
                  {/* Quick metrics */}
                  {(signal.reach || signal.engagement) && (
                    <div className="flex gap-3 mt-1.5">
                      {signal.reach && <span className="text-[9px] text-muted-foreground">👁 {signal.reach.toLocaleString()}</span>}
                      {signal.engagement && <span className="text-[9px] text-muted-foreground">💬 {signal.engagement.toLocaleString()}</span>}
                      {signal.mediaMentions && <span className="text-[9px] text-muted-foreground">📰 {signal.mediaMentions}</span>}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(signal.createdAt).toLocaleDateString('ru')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

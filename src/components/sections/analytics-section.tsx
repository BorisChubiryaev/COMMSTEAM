'use client'

import { useState, useMemo } from 'react'
import { useAppStore, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_BG } from '@/lib/store'
import { cn } from '@/lib/utils'
import { BarChart3, TrendingUp, Sparkles, Loader2, Target, Eye, MessageSquare, Lightbulb, Users, Zap, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { MarkdownContent } from '@/components/markdown-content'

const SOURCE_EMOJIS: Record<string, string> = {
  'ДЗО': '🏢',
  'Трабы/Команды': '👥',
  'Мероприятия': '🎤',
  'Тренды/Рынок': '📈',
  'Задачи от руководства': '👔',
}

const MEANING_COLORS: Record<string, string> = {
  'ИИ': '#FF6B35',
  'RecSys/Рекомендации': '#00C9A7',
  'СберID': '#3B82F6',
  'Персонализация и данные': '#A78BFA',
  'Безопасность и доверие': '#EF4444',
  'HR-бренд/Команда': '#F59E0B',
  'Технологическое лидерство и инновации': '#4ECB71',
}

type BarChartProps = {
  data: Array<{ key: string; count: number; color?: string }>
  maxVal: number
  colorMap?: Record<string, string>
  labelWidth?: string
}

function BarChart({ data, maxVal, colorMap, labelWidth = 'w-32' }: BarChartProps) {
  return (
    <div className="space-y-1.5">
      {data.map(({ key, count, color }) => {
        const pct = maxVal > 0 ? (count / maxVal * 100) : 0
        const barColor = color || colorMap?.[key] || '#FF6B35'
        return (
          <div key={key} className="flex items-center gap-2 group">
            <span className={cn("text-[11px] truncate", labelWidth)}>{key}</span>
            <div className="flex-1 bg-[var(--comic-tag-bg)] rounded-lg h-6 overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all duration-700 ease-out flex items-center px-2"
                style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%`, backgroundColor: barColor }}
              >
                {pct > 15 && (
                  <span className="text-[9px] font-bold text-white">{count}</span>
                )}
              </div>
              {pct <= 15 && count > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{count}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AnalyticsSection() {
  const { signals, teamMembers, events } = useAppStore()
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Compute stats
  const totalSignals = signals.length
  const activeSignals = signals.filter(s => s.status !== 'archived')
  const completedSignals = signals.filter(s => s.status === 'completed' || s.status === 'archived')
  const withFeedback = completedSignals.filter(s => s.whatWorked || s.whatDidntWork)

  const byStatus = signals.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc }, {} as Record<string, number>)
  const byPriority = signals.reduce((acc, s) => { if (s.priority) acc[s.priority] = (acc[s.priority] || 0) + 1; return acc }, {} as Record<string, number>)
  const bySource = signals.reduce((acc, s) => { if (s.source) acc[s.source] = (acc[s.source] || 0) + 1; return acc }, {} as Record<string, number>)
  const byDistribution = signals.reduce((acc, s) => { if (s.distribution) { s.distribution.split(',').filter(Boolean).forEach(d => { acc[d.trim()] = (acc[d.trim()] || 0) + 1 }) } return acc }, {} as Record<string, number>)
  const byMeaning = signals.reduce((acc, s) => { if (s.meanings) { s.meanings.split(',').filter(Boolean).forEach(m => { const key = m.trim(); acc[key] = (acc[key] || 0) + 1 }) } return acc }, {} as Record<string, number>)
  const byType = signals.reduce((acc, s) => { if (s.signalType) acc[s.signalType] = (acc[s.signalType] || 0) + 1; return acc }, {} as Record<string, number>)

  const avgReach = completedSignals.filter(s => s.reach).reduce((sum, s) => sum + (s.reach || 0), 0) / (completedSignals.filter(s => s.reach).length || 1)
  const avgEngagement = completedSignals.filter(s => s.engagement).reduce((sum, s) => sum + (s.engagement || 0), 0) / (completedSignals.filter(s => s.engagement).length || 1)

  const pipelineStages = [
    { status: 'input', label: '📥 Входящее', color: '#9CA3AF' },
    { status: 'classification', label: '🏷️ Классификация', color: '#60A5FA' },
    { status: 'evaluation', label: '⚡ Оценка', color: '#FBBF24' },
    { status: 'meaning', label: '🧠 Смыслы', color: '#A78BFA' },
    { status: 'distribution', label: '📡 Распределение', color: '#34D399' },
    { status: 'launch', label: '🚀 Запуск', color: '#FF6B35' },
    { status: 'measurement', label: '📊 Измерение', color: '#00C9A7' },
    { status: 'feedback', label: '💬 Обратная связь', color: '#FF3F8E' },
    { status: 'completed', label: '✅ Завершено', color: '#4ECB71' },
  ]

  const maxPipelineCount = Math.max(...pipelineStages.map(s => byStatus[s.status] || 0), 1)

  const handleGenerateSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ai/period-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: periodEnd || new Date().toISOString(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({
          title: 'ИИ-саммари не создано',
          description: data.error || 'Проверьте OPENROUTER_API_KEY и AI_MODEL в .env',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'ИИ-саммари не создано',
        description: 'Не удалось подключиться к локальному API',
        variant: 'destructive',
      })
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-5">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Всего сигналов', value: totalSignals, color: '#FF6B35', icon: Zap },
          { label: 'Активных', value: activeSignals.length, color: '#3B82F6', icon: Target },
          { label: 'Завершено', value: completedSignals.length, color: '#4ECB71', icon: Eye },
          { label: 'Срочных (A)', value: byPriority['A'] || 0, color: '#EF4444', icon: ArrowUpRight },
          { label: 'Средний охват', value: Math.round(avgReach).toLocaleString(), color: '#00C9A7', icon: TrendingUp },
          { label: 'С обратной связью', value: withFeedback.length, color: '#A78BFA', icon: MessageSquare },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl comic-title" style={{ color }}>{value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel - full width */}
      <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#FF6B35] rounded-lg flex items-center justify-center text-white text-xs">📋</span>
          Воронка обработки сигналов
        </h3>
        <div className="flex items-end gap-1 h-40">
          {pipelineStages.map(({ status, label, color }) => {
            const count = byStatus[status] || 0
            const heightPct = maxPipelineCount > 0 ? (count / maxPipelineCount * 100) : 0
            return (
              <div key={status} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color }}>{count}</span>
                <div className="w-full relative" style={{ height: '120px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700 ease-out"
                    style={{ 
                      height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%`,
                      backgroundColor: color,
                      opacity: count > 0 ? 1 : 0.2,
                    }}
                  />
                </div>
                <span className="text-[8px] text-center leading-tight text-muted-foreground truncate w-full">{label.replace(/^\S+\s/, '')}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Priority */}
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#EF4444] rounded flex items-center justify-center text-white text-[10px]">🎯</span>
            По приоритету
          </h3>
          <BarChart 
            data={[
              { key: '🔴 A — Срочно', count: byPriority['A'] || 0, color: '#EF4444' },
              { key: '🟠 B — Важно', count: byPriority['B'] || 0, color: '#F97316' },
              { key: '🟡 C — Обычно', count: byPriority['C'] || 0, color: '#EAB308' },
              { key: '⚫ Отклонено', count: byPriority['Отклонено'] || 0, color: '#9CA3AF' },
            ]}
            maxVal={totalSignals}
            labelWidth="w-28"
          />
        </div>

        {/* By Type */}
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#3B82F6] rounded flex items-center justify-center text-white text-[10px]">📋</span>
            По типу сигнала
          </h3>
          <BarChart 
            data={[
              { key: '📰 Новость', count: byType['Новость'] || 0, color: '#3B82F6' },
              { key: '💡 Идея/Инициатива', count: byType['Идея/Инициатива'] || 0, color: '#A78BFA' },
              { key: '📢 Инфоповод', count: byType['Инфоповод'] || 0, color: '#F59E0B' },
              { key: '📝 Задача/Поручение', count: byType['Задача/Поручение'] || 0, color: '#EF4444' },
            ]}
            maxVal={totalSignals}
            labelWidth="w-36"
          />
        </div>

        {/* By Source */}
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#00C9A7] rounded flex items-center justify-center text-white text-[10px]">📡</span>
            По источнику
          </h3>
          <BarChart 
            data={Object.entries(SOURCE_EMOJIS).map(([key, emoji]) => ({ 
              key: `${emoji} ${key}`, 
              count: bySource[key] || 0,
              color: '#00C9A7'
            }))}
            maxVal={totalSignals}
            labelWidth="w-40"
          />
        </div>

        {/* By Meaning */}
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#A78BFA] rounded flex items-center justify-center text-white text-[10px]">🧠</span>
            Карта смыслов
          </h3>
          <BarChart 
            data={Object.entries(MEANING_COLORS).map(([key, color]) => ({ 
              key, 
              count: byMeaning[key] || 0,
              color
            }))}
            maxVal={totalSignals}
            labelWidth="w-44"
          />
        </div>

        {/* By Distribution */}
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#FF6B35] rounded flex items-center justify-center text-white text-[10px]">🔀</span>
            По направлению
          </h3>
          <BarChart 
            data={[
              { key: '📰 PR', count: byDistribution['PR'] || 0, color: '#FF6B35' },
              { key: '📣 Маркетинг', count: byDistribution['Маркетинг'] || 0, color: '#F59E0B' },
              { key: '🏠 Внутриком', count: byDistribution['Внутриком'] || 0, color: '#4ECB71' },
            ]}
            maxVal={totalSignals}
            labelWidth="w-28"
          />
        </div>

        {/* Team Activity */}
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#3B82F6] rounded flex items-center justify-center text-white text-[10px]">👥</span>
            Активность команды
          </h3>
          <div className="space-y-2">
            {teamMembers.map(member => {
              const assigned = activeSignals.filter(s => s.assigneeId === member.id).length
              const completed = completedSignals.filter(s => s.assigneeId === member.id).length
              return (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--comic-bg-hover)] border border-[var(--comic-border-color)]/20">
                  <div className="w-8 h-8 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[var(--comic-border-color)] flex-shrink-0">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{member.name}</p>
                    <p className="text-[9px] text-muted-foreground">{member.role}</p>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    <span className="bg-[#3B82F6]/10 text-[#3B82F6] px-1.5 py-0.5 rounded font-bold">{assigned} акт.</span>
                    <span className="bg-[#4ECB71]/10 text-[#4ECB71] px-1.5 py-0.5 rounded font-bold">{completed} зав.</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Insights from feedback */}
      {withFeedback.length > 0 && (
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#4ECB71] rounded flex items-center justify-center text-white text-[10px]">💡</span>
            Инсайты из обратной связи
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {withFeedback.map(signal => (
              <div key={signal.id} className="p-3 rounded-lg border-2 border-[#4ECB71]/30 bg-[#4ECB71]/5">
                <p className="text-xs font-bold mb-1">{signal.title}</p>
                {signal.whatWorked && (
                  <p className="text-[10px] text-muted-foreground mb-1"><span className="text-[#4ECB71]">✅</span> {signal.whatWorked}</p>
                )}
                {signal.whatDidntWork && (
                  <p className="text-[10px] text-muted-foreground mb-1"><span className="text-[#EF4444]">❌</span> {signal.whatDidntWork}</p>
                )}
                {signal.newInsights && (
                  <p className="text-[10px] text-muted-foreground"><span className="text-[#FBBF24]">💡</span> {signal.newInsights}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Period Summary */}
      <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#A78BFA]/5 rounded-bl-[100px]" />
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#A78BFA] rounded-lg flex items-center justify-center text-white text-xs">🤖</span>
          ИИ-саммари за период
        </h3>
        <div className="flex gap-3 mb-3 flex-wrap items-end">
          <div>
            <label className="text-xs font-bold block mb-1">С</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]"
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">По</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]"
            />
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="comic-btn bg-[#A78BFA] hover:bg-[#9b7ae0] text-white px-4 py-2 text-sm flex items-center gap-2"
          >
            {summaryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Сгенерировать саммари
          </button>
        </div>
        {summary ? (
          <div className="bg-[var(--comic-bg-alt)] border-2 border-dashed border-[#A78BFA] rounded-xl p-4 relative">
            <div className="absolute top-2 right-2 text-lg">🤖</div>
            <MarkdownContent content={summary} className="pr-6" />
          </div>
        ) : (
          <div className="bg-[var(--comic-bg-hover)] rounded-xl p-6 text-center text-muted-foreground border-2 border-dashed border-[var(--comic-border-color)]/30">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Выберите период и сгенерируйте ИИ-саммари</p>
            <p className="text-xs mt-1">ИИ проанализирует все сигналы за выбранный период</p>
          </div>
        )}
      </div>
    </div>
  )
}

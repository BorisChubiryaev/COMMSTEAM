'use client'

import { useState, useMemo } from 'react'
import { useAppStore, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_BG, type Signal } from '@/lib/store'
import { cn } from '@/lib/utils'
import { BarChart3, TrendingUp, Sparkles, Loader2, Target, Eye, MessageSquare, Lightbulb, Users, Zap, ArrowUpRight, ArrowDownRight, Minus, Download, Image as ImageIcon } from 'lucide-react'
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

function splitValues(value: string | null) {
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : []
}

function countBy<T extends string>(items: T[]) {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function topEntries(map: Record<string, number>, limit = 4) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function formatSlideDate(value: Date) {
  return value.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string) {
  ctx.fillStyle = color
  roundRect(ctx, x, y, width, height, radius)
  ctx.fill()
}

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color = '#111827', lineWidth = 4) {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  roundRect(ctx, x, y, width, height, radius)
  ctx.stroke()
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
    } else {
      if (line) lines.push(line)
      line = word
      if (lines.length >= maxLines) break
    }
  }
  if (line && lines.length < maxLines) lines.push(line)

  lines.forEach((item, index) => {
    const value = index === maxLines - 1 && words.join(' ').length > lines.join(' ').length ? `${item.replace(/\s+\S*$/, '')}...` : item
    ctx.fillText(value, x, y + index * lineHeight)
  })
  return y + lines.length * lineHeight
}

function drawMetricCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, label: string, value: string, color: string) {
  fillRoundRect(ctx, x + 6, y + 8, width, 112, 18, '#11182718')
  fillRoundRect(ctx, x, y, width, 112, 18, '#FFFFFF')
  strokeRoundRect(ctx, x, y, width, 112, 18)
  fillRoundRect(ctx, x + width - 52, y + 16, 34, 34, 10, `${color}25`)
  ctx.fillStyle = color
  ctx.font = '700 42px Arial'
  ctx.fillText(value, x + 22, y + 50)
  ctx.fillStyle = '#4B5563'
  ctx.font = '700 18px Arial'
  ctx.fillText(label, x + 22, y + 84)
}

function drawBarList(ctx: CanvasRenderingContext2D, title: string, entries: Array<[string, number]>, x: number, y: number, width: number, colors: string[]) {
  ctx.fillStyle = '#111827'
  ctx.font = '800 25px Arial'
  ctx.fillText(title, x, y)
  const max = Math.max(...entries.map(([, count]) => count), 1)
  entries.forEach(([label, count], index) => {
    const rowY = y + 42 + index * 54
    const color = colors[index % colors.length]
    ctx.fillStyle = '#374151'
    ctx.font = '700 18px Arial'
    ctx.fillText(label, x, rowY)
    fillRoundRect(ctx, x, rowY + 12, width, 18, 9, '#E5E7EB')
    fillRoundRect(ctx, x, rowY + 12, Math.max(18, width * (count / max)), 18, 9, color)
    ctx.fillStyle = '#111827'
    ctx.font = '800 18px Arial'
    ctx.fillText(String(count), x + width + 18, rowY + 28)
  })
}

function drawIllustration(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fillRoundRect(ctx, x, y + 48, 310, 220, 28, '#FFE8D9')
  strokeRoundRect(ctx, x, y + 48, 310, 220, 28)
  fillRoundRect(ctx, x + 28, y + 22, 150, 86, 18, '#FFFFFF')
  strokeRoundRect(ctx, x + 28, y + 22, 150, 86, 18)
  ctx.fillStyle = '#FF6B35'
  ctx.font = '800 24px Arial'
  ctx.fillText('NEWS', x + 56, y + 58)
  fillRoundRect(ctx, x + 58, y + 72, 88, 10, 5, '#00C9A7')
  fillRoundRect(ctx, x + 58, y + 88, 60, 10, 5, '#A78BFA')

  ctx.save()
  ctx.translate(x + 206, y + 112)
  ctx.rotate(-0.24)
  fillRoundRect(ctx, -16, -22, 132, 54, 14, '#00C9A7')
  strokeRoundRect(ctx, -16, -22, 132, 54, 14)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 38px Arial'
  ctx.fillText('AI', 22, 16)
  ctx.restore()

  fillRoundRect(ctx, x + 46, y + 146, 84, 84, 20, '#111827')
  fillRoundRect(ctx, x + 62, y + 162, 52, 52, 12, '#FFFFFF')
  ctx.fillStyle = '#FF6B35'
  ctx.beginPath()
  ctx.moveTo(x + 210, y + 186)
  ctx.lineTo(x + 282, y + 154)
  ctx.lineTo(x + 282, y + 226)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 5
  ctx.stroke()
  fillRoundRect(ctx, x + 188, y + 178, 34, 56, 10, '#FFFFFF')
  strokeRoundRect(ctx, x + 188, y + 178, 34, 56, 10)
}

function drawWeeklyReportImage(signals: Signal[], start: Date, end: Date) {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 900
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const completed = signals.filter(signal => signal.status === 'completed' || signal.status === 'archived')
  const urgent = signals.filter(signal => signal.priority === 'A')
  const launched = signals.filter(signal => signal.status === 'launch' || signal.status === 'measurement' || signal.status === 'completed' || signal.status === 'archived')
  const byPriority = countBy(signals.map(signal => signal.priority || 'Без приоритета'))
  const byDistribution = countBy(signals.flatMap(signal => splitValues(signal.distribution)))
  const byMeaning = countBy(signals.flatMap(signal => splitValues(signal.meanings)))
  const byStatus = countBy(signals.map(signal => STATUS_LABELS[signal.status] || signal.status))
  const topSignals = [...signals]
    .sort((a, b) => ((b.priority === 'A' ? 3 : b.priority === 'B' ? 2 : 1) - (a.priority === 'A' ? 3 : a.priority === 'B' ? 2 : 1)))
    .slice(0, 4)

  ctx.fillStyle = '#FFF7ED'
  ctx.fillRect(0, 0, 1600, 900)
  fillRoundRect(ctx, -80, 650, 1760, 320, 80, '#F9FAFB')
  fillRoundRect(ctx, 1180, -120, 340, 340, 170, '#00C9A726')
  fillRoundRect(ctx, 1280, 80, 260, 260, 130, '#A78BFA20')

  ctx.fillStyle = '#111827'
  ctx.font = '900 58px Arial'
  ctx.fillText('Недельный отчёт CommsTeam', 72, 100)
  ctx.font = '700 25px Arial'
  ctx.fillStyle = '#4B5563'
  ctx.fillText(`${formatSlideDate(start)} — ${formatSlideDate(end)} · коммуникационные сигналы и инфоповоды`, 76, 142)

  drawIllustration(ctx, 1190, 74)

  drawMetricCard(ctx, 72, 190, 220, 'сигналов', String(signals.length), '#FF6B35')
  drawMetricCard(ctx, 318, 190, 220, 'запущено', String(launched.length), '#00C9A7')
  drawMetricCard(ctx, 564, 190, 220, 'закрыто', String(completed.length), '#4ECB71')
  drawMetricCard(ctx, 810, 190, 220, 'срочных A', String(urgent.length), '#EF4444')

  fillRoundRect(ctx, 72, 350, 650, 360, 24, '#FFFFFF')
  strokeRoundRect(ctx, 72, 350, 650, 360, 24)
  drawBarList(ctx, 'Фокус недели', topEntries(byMeaning, 5), 112, 402, 420, ['#FF6B35', '#00C9A7', '#A78BFA', '#3B82F6', '#4ECB71'])

  fillRoundRect(ctx, 760, 350, 380, 360, 24, '#FFFFFF')
  strokeRoundRect(ctx, 760, 350, 380, 360, 24)
  drawBarList(ctx, 'Каналы', topEntries(byDistribution, 4), 800, 402, 220, ['#FF6B35', '#F59E0B', '#4ECB71', '#00A7E1'])

  fillRoundRect(ctx, 1180, 350, 348, 360, 24, '#FFFFFF')
  strokeRoundRect(ctx, 1180, 350, 348, 360, 24)
  ctx.fillStyle = '#111827'
  ctx.font = '800 25px Arial'
  ctx.fillText('Статусы', 1220, 402)
  topEntries(byStatus, 5).forEach(([label, count], index) => {
    const y = 450 + index * 42
    fillRoundRect(ctx, 1220, y - 22, 226, 30, 15, ['#9CA3AF', '#60A5FA', '#FF6B35', '#00C9A7', '#4ECB71'][index] + '24')
    ctx.fillStyle = '#111827'
    ctx.font = '700 17px Arial'
    ctx.fillText(label.slice(0, 20), 1236, y)
    ctx.font = '900 20px Arial'
    ctx.fillText(String(count), 1468, y)
  })

  fillRoundRect(ctx, 72, 750, 1456, 94, 24, '#111827')
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '800 24px Arial'
  ctx.fillText('Ключевые карточки', 112, 795)
  ctx.font = '600 18px Arial'
  if (topSignals.length > 0) {
    topSignals.forEach((signal, index) => {
      const x = 112 + index * 350
      ctx.fillStyle = signal.priority === 'A' ? '#FCA5A5' : signal.priority === 'B' ? '#FDBA74' : '#A7F3D0'
      ctx.fillText(signal.priority || '•', x, 828)
      ctx.fillStyle = '#FFFFFF'
      drawText(ctx, signal.title, x + 34, 828, 280, 20, 2)
    })
  } else {
    ctx.fillText('За неделю новых сигналов не было. Можно использовать слайд как пустой weekly-шаблон.', 112, 828)
  }

  return canvas
}

export function AnalyticsSection() {
  const { signals, teamMembers, events } = useAppStore()
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  const weekEnd = useMemo(() => new Date(), [])
  const weekStart = useMemo(() => {
    const date = new Date(weekEnd)
    date.setDate(date.getDate() - 6)
    date.setHours(0, 0, 0, 0)
    return date
  }, [weekEnd])

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

  const weeklySignals = useMemo(() => {
    return signals.filter(signal => {
      const createdAt = new Date(signal.createdAt)
      return createdAt >= weekStart && createdAt <= weekEnd
    })
  }, [signals, weekStart, weekEnd])

  const weeklyMeanings = useMemo(() => {
    return countBy(weeklySignals.flatMap(signal => splitValues(signal.meanings)))
  }, [weeklySignals])

  const weeklyDistributions = useMemo(() => {
    return countBy(weeklySignals.flatMap(signal => splitValues(signal.distribution)))
  }, [weeklySignals])

  const weeklyPriorities = useMemo(() => {
    return countBy(weeklySignals.map(signal => signal.priority || 'Без приоритета'))
  }, [weeklySignals])

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

  const handleDownloadWeeklySlide = () => {
    const canvas = drawWeeklyReportImage(weeklySignals, weekStart, weekEnd)
    if (!canvas) {
      toast({ title: 'Не удалось создать слайд', variant: 'destructive' })
      return
    }

    const link = document.createElement('a')
    link.download = `commsteam-weekly-report-${weekEnd.toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast({ title: 'Слайд скачан', description: 'PNG 16:9 готов для презентации или отправки в чат.' })
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

      {/* Weekly Slide Report */}
      <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-bl-[80px] bg-[#00C9A7]/10" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#00C9A7] rounded-lg flex items-center justify-center text-white text-xs">▣</span>
              Недельный отчёт картинкой
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Сформирует PNG-слайд 16:9 за последние 7 дней: ключевые метрики, фокус недели, каналы, статусы и заметные карточки.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadWeeklySlide}
            className="comic-btn bg-[#00C9A7] hover:bg-[#00b896] text-white px-4 py-2 text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Скачать слайд PNG
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <div className="aspect-video rounded-lg border-2 border-[var(--comic-border-color)] bg-[#FFF7ED] p-4 overflow-hidden relative">
            <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-[#00C9A7]/20" />
            <div className="absolute right-12 top-14 h-16 w-16 rounded-full bg-[#A78BFA]/20" />
            <div className="relative z-10 h-full flex flex-col">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground">
                  {formatSlideDate(weekStart)} — {formatSlideDate(weekEnd)}
                </p>
                <h4 className="comic-title text-xl text-foreground">Недельный отчёт CommsTeam</h4>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { label: 'сигналов', value: weeklySignals.length, color: '#FF6B35' },
                  { label: 'A', value: weeklyPriorities['A'] || 0, color: '#EF4444' },
                  { label: 'PR', value: weeklyDistributions['PR'] || 0, color: '#FF6B35' },
                  { label: 'внутриком', value: weeklyDistributions['Внутриком'] || 0, color: '#4ECB71' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border-2 border-[var(--comic-border-color)] bg-white px-2 py-2">
                    <p className="text-lg font-black" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[9px] font-bold text-muted-foreground truncate">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3">
                <div className="rounded-lg border-2 border-[var(--comic-border-color)] bg-white/90 p-3">
                  <p className="text-[10px] font-black mb-2">Фокус</p>
                  <div className="space-y-1.5">
                    {topEntries(weeklyMeanings, 3).map(([label, count]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-16 truncate text-[9px] font-bold">{label}</span>
                        <span className="h-2 flex-1 rounded bg-[#00C9A7]/25 overflow-hidden">
                          <span className="block h-full rounded bg-[#00C9A7]" style={{ width: `${Math.max(18, count * 28)}%` }} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border-2 border-[var(--comic-border-color)] bg-[#111827] p-3 text-white">
                  <p className="text-[10px] font-black mb-2">Картинка включает</p>
                  <p className="text-[9px] leading-relaxed text-white/80">метрики, каналы, статусы, смыслы и визуальную сцену с новостями.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border-2 border-dashed border-[var(--comic-border-color)] bg-[var(--comic-bg-hover)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-[#00C9A7]" />
              <span className="text-xs font-bold">Что попадёт в отчёт</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Период</span><b>{formatSlideDate(weekStart)} — {formatSlideDate(weekEnd)}</b></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Сигналов</span><b>{weeklySignals.length}</b></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Срочных A</span><b>{weeklyPriorities['A'] || 0}</b></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Топ-смысл</span><b className="text-right">{topEntries(weeklyMeanings, 1)[0]?.[0] || 'нет данных'}</b></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Топ-канал</span><b>{topEntries(weeklyDistributions, 1)[0]?.[0] || 'нет данных'}</b></div>
            </div>
          </div>
        </div>
      </div>

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

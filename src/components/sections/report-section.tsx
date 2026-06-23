'use client'

import { useState } from 'react'
import { FileText, Loader2, Sparkles, Copy, Send, Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Default to the current ISO week (Mon–Sun).
function currentWeek() {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 0 = Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(monday), end: iso(sunday) }
}

export function ReportSection() {
  const week = currentWeek()
  const [periodStart, setPeriodStart] = useState(week.start)
  const [periodEnd, setPeriodEnd] = useState(week.end)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)

  const build = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(`${periodEnd}T23:59:59`).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка сборки')
      setText(data.text || '')
      toast({ title: 'Отчёт собран', description: 'Проверьте и отредактируйте перед отправкой.' })
    } catch (err) {
      toast({ title: 'Не удалось собрать отчёт', description: err instanceof Error ? err.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: 'Скопировано' })
    } catch {
      toast({ title: 'Не удалось скопировать', variant: 'destructive' })
    }
  }

  const sendToChat = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки')
      toast({ title: 'Отправлено в командный чат', description: `Сообщений: ${data.chunks}` })
    } catch (err) {
      toast({ title: 'Не удалось отправить', description: err instanceof Error ? err.message : '', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Отчёт: ${periodStart} — ${periodEnd}`,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          aiSummary: text,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Отчёт сохранён' })
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#FF6B35] shrink-0" />
        <div className="min-w-0">
          <h2 className="comic-title text-lg text-[#FF6B35] truncate">Отчёт</h2>
          <p className="text-xs text-muted-foreground">Сборка статуса команды из событий и сигналов за период</p>
        </div>
      </div>

      <div className="comic-border comic-shadow bg-card p-3 sm:p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs font-bold block mb-1">С</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)] text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">По</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)] text-foreground"
            />
          </div>
          <button
            onClick={build}
            disabled={loading}
            className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Собрать отчёт
          </button>
        </div>
      </div>

      {text ? (
        <div className="comic-border comic-shadow bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-[var(--comic-border-color)] flex-wrap">
            <span className="text-sm font-bold flex-1 min-w-0">Черновик — отредактируйте перед отправкой</span>
            <button onClick={copy} className="comic-btn bg-card px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Копировать
            </button>
            <button onClick={save} disabled={saving} className="comic-btn bg-card px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Сохранить
            </button>
            <button onClick={sendToChat} disabled={sending} className="comic-btn bg-[#00C9A7] text-white px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-60">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} В Telegram
            </button>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[460px] p-4 text-sm bg-transparent text-foreground font-mono leading-relaxed focus:outline-none resize-y"
          />
        </div>
      ) : (
        <div className="comic-border comic-shadow bg-card p-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-[#FF6B35]" />
          <h3 className="comic-title text-base mb-1">Соберите отчёт за период</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Портал соберёт хайлайты по темам (AI), итоги недели по датам, текущие задачи,
            опубликованные посты и планы — из событий и сигналов. Черновик можно
            отредактировать, скопировать или отправить в командный чат.
          </p>
        </div>
      )}
    </div>
  )
}

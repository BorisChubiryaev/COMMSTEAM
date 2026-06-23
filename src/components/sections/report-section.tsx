'use client'

import { useMemo, useState } from 'react'
import { FileText, Loader2, Sparkles, Copy, Send, Save, Plus, X } from 'lucide-react'
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

type Highlight = { theme: string; text: string }
type DatedItem = { date?: string; dateLabel: string; title: string; responsible: string }
type OngoingItem = { title: string; assignee: string }
type PostItem = { title: string; linksText: string }

function fmtDM(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}
function monthLabel(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

// Reassemble the email-ready text from the edited blocks — mirrors the server format.
function assemble(
  period: { start: string; end: string },
  highlights: Highlight[],
  past: DatedItem[],
  ongoing: OngoingItem[],
  posts: PostItem[],
  plans: DatedItem[],
) {
  const lines: string[] = []
  lines.push(`Статус / Команда коммуникации · ${fmtDM(period.start)}–${fmtDM(period.end)}`)
  lines.push('')

  const hl = highlights.filter(h => h.theme.trim() || h.text.trim())
  if (hl.length) {
    lines.push('Хайлайты недели:')
    lines.push('')
    for (const h of hl) lines.push(`${h.theme} — ${h.text}`)
    lines.push('')
  }

  lines.push(`Итоги недели: ${fmtDM(period.start)}–${fmtDM(period.end)}`)
  const pastRows = past.filter(p => p.title.trim())
  if (!pastRows.length) lines.push('— нет событий за период')
  for (const p of pastRows) lines.push(`${p.dateLabel} — ${p.title}${p.responsible.trim() ? ` / ${p.responsible}` : ''}`)
  lines.push('')

  const ong = ongoing.filter(o => o.title.trim())
  if (ong.length) {
    lines.push('В работе:')
    for (const o of ong) lines.push(`+ ${o.title}${o.assignee.trim() ? ` / ${o.assignee}` : ''}`)
    lines.push('')
  }

  const ps = posts.filter(p => p.title.trim())
  if (ps.length) {
    lines.push('Посты:')
    for (const p of ps) {
      const links = p.linksText.split(/[\s,]+/).filter(Boolean)
      lines.push(`+ ${p.title}${links.length ? ` — ${links.join(' ')}` : ''}`)
    }
    lines.push('')
  }

  const pl = plans.filter(p => p.title.trim())
  if (pl.length) {
    lines.push('Планы:')
    let currentMonth = ''
    for (const p of pl) {
      if (p.date) {
        const m = monthLabel(p.date)
        if (m !== currentMonth) { lines.push(`— ${m} —`); currentMonth = m }
      }
      lines.push(`${p.dateLabel} — ${p.title}${p.responsible.trim() ? ` / ${p.responsible}` : ''}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

const inputCls = 'p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)] text-foreground focus:outline-none focus:border-[#FF6B35]'

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Убрать" className="shrink-0 text-muted-foreground hover:text-[#FF3F8E] p-1">
      <X className="w-4 h-4" />
    </button>
  )
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="text-xs text-[#FF6B35] hover:underline flex items-center gap-1 mt-1">
      <Plus className="w-3.5 h-3.5" /> {label}
    </button>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="comic-border comic-shadow-sm bg-card p-3">
      <h3 className="text-sm font-bold mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function ReportSection() {
  const week = currentWeek()
  const [periodStart, setPeriodStart] = useState(week.start)
  const [periodEnd, setPeriodEnd] = useState(week.end)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [built, setBuilt] = useState(false)

  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [past, setPast] = useState<DatedItem[]>([])
  const [ongoing, setOngoing] = useState<OngoingItem[]>([])
  const [posts, setPosts] = useState<PostItem[]>([])
  const [plans, setPlans] = useState<DatedItem[]>([])

  const text = useMemo(
    () => assemble({ start: periodStart, end: periodEnd }, highlights, past, ongoing, posts, plans),
    [periodStart, periodEnd, highlights, past, ongoing, posts, plans],
  )

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
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка сборки')
      setHighlights((d.highlights || []).map((h: Highlight) => ({ theme: h.theme || '', text: h.text || '' })))
      setPast((d.past || []).map((p: { date?: string; dateLabel?: string; title?: string; responsible?: string }) => ({ date: p.date, dateLabel: p.dateLabel || '', title: p.title || '', responsible: p.responsible || '' })))
      setOngoing((d.ongoing || []).map((o: { title?: string; assignee?: string }) => ({ title: o.title || '', assignee: o.assignee || '' })))
      setPosts((d.posts || []).map((p: { title?: string; links?: string[] }) => ({ title: p.title || '', linksText: (p.links || []).join(' ') })))
      setPlans((d.plans || []).map((p: { date?: string; dateLabel?: string; title?: string; responsible?: string }) => ({ date: p.date, dateLabel: p.dateLabel || '', title: p.title || '', responsible: p.responsible || '' })))
      setBuilt(true)
      toast({ title: 'Отчёт собран', description: 'Отредактируйте блоки перед отправкой.' })
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
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка отправки')
      toast({ title: 'Отправлено в командный чат', description: `Сообщений: ${d.chunks}` })
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

  // Generic helpers for editing a list item / removing / adding.
  function patch<T>(setList: React.Dispatch<React.SetStateAction<T[]>>, i: number, p: Partial<T>) {
    setList(list => list.map((item, idx) => (idx === i ? { ...item, ...p } : item)))
  }
  function remove<T>(setList: React.Dispatch<React.SetStateAction<T[]>>, i: number) {
    setList(list => list.filter((_, idx) => idx !== i))
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
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">По</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputCls} />
          </div>
          <button onClick={build} disabled={loading} className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {built ? 'Пересобрать' : 'Собрать отчёт'}
          </button>
        </div>
      </div>

      {!built ? (
        <div className="comic-border comic-shadow bg-card p-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-[#FF6B35]" />
          <h3 className="comic-title text-base mb-1">Соберите отчёт за период</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Портал соберёт хайлайты по темам (AI), итоги недели, текущие задачи, посты и планы —
            из событий и сигналов. Каждый блок можно отредактировать по отдельности перед отправкой.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold flex-1 min-w-0">Блоки отчёта — редактируйте перед отправкой</span>
            <button onClick={copy} className="comic-btn bg-card px-3 py-1.5 text-xs flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Копировать</button>
            <button onClick={save} disabled={saving} className="comic-btn bg-card px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-60">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Сохранить</button>
            <button onClick={sendToChat} disabled={sending} className="comic-btn bg-[#00C9A7] text-white px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-60">{sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} В Telegram</button>
          </div>

          <Block title="Хайлайты по темам">
            {highlights.map((h, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input value={h.theme} onChange={e => patch(setHighlights, i, { theme: e.target.value })} className={`${inputCls} w-32 sm:w-44 shrink-0`} placeholder="Тема" />
                <textarea value={h.text} onChange={e => patch(setHighlights, i, { text: e.target.value })} className={`${inputCls} flex-1`} rows={2} placeholder="Хайлайт" />
                <RemoveBtn onClick={() => remove(setHighlights, i)} />
              </div>
            ))}
            <AddBtn label="Добавить тему" onClick={() => setHighlights(l => [...l, { theme: '', text: '' }])} />
          </Block>

          <Block title="Итоги недели">
            {past.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={p.dateLabel} onChange={e => patch(setPast, i, { dateLabel: e.target.value })} className={`${inputCls} w-20 shrink-0`} placeholder="дата" />
                <input value={p.title} onChange={e => patch(setPast, i, { title: e.target.value })} className={`${inputCls} flex-1`} placeholder="Событие" />
                <input value={p.responsible} onChange={e => patch(setPast, i, { responsible: e.target.value })} className={`${inputCls} w-24 sm:w-32 shrink-0`} placeholder="кто" />
                <RemoveBtn onClick={() => remove(setPast, i)} />
              </div>
            ))}
            <AddBtn label="Добавить пункт" onClick={() => setPast(l => [...l, { dateLabel: '', title: '', responsible: '' }])} />
          </Block>

          <Block title="В работе">
            {ongoing.map((o, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={o.title} onChange={e => patch(setOngoing, i, { title: e.target.value })} className={`${inputCls} flex-1`} placeholder="Задача" />
                <input value={o.assignee} onChange={e => patch(setOngoing, i, { assignee: e.target.value })} className={`${inputCls} w-24 sm:w-32 shrink-0`} placeholder="кто" />
                <RemoveBtn onClick={() => remove(setOngoing, i)} />
              </div>
            ))}
            <AddBtn label="Добавить задачу" onClick={() => setOngoing(l => [...l, { title: '', assignee: '' }])} />
          </Block>

          <Block title="Посты">
            {posts.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <input value={p.title} onChange={e => patch(setPosts, i, { title: e.target.value })} className={`${inputCls} w-full`} placeholder="Заголовок поста" />
                  <input value={p.linksText} onChange={e => patch(setPosts, i, { linksText: e.target.value })} className={`${inputCls} w-full text-xs`} placeholder="Ссылки через пробел" />
                </div>
                <RemoveBtn onClick={() => remove(setPosts, i)} />
              </div>
            ))}
            <AddBtn label="Добавить пост" onClick={() => setPosts(l => [...l, { title: '', linksText: '' }])} />
          </Block>

          <Block title="Планы">
            {plans.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={p.dateLabel} onChange={e => patch(setPlans, i, { dateLabel: e.target.value })} className={`${inputCls} w-20 shrink-0`} placeholder="дата" />
                <input value={p.title} onChange={e => patch(setPlans, i, { title: e.target.value })} className={`${inputCls} flex-1`} placeholder="Событие" />
                <input value={p.responsible} onChange={e => patch(setPlans, i, { responsible: e.target.value })} className={`${inputCls} w-24 sm:w-32 shrink-0`} placeholder="кто" />
                <RemoveBtn onClick={() => remove(setPlans, i)} />
              </div>
            ))}
            <AddBtn label="Добавить план" onClick={() => setPlans(l => [...l, { dateLabel: '', title: '', responsible: '' }])} />
          </Block>

          <div className="comic-border comic-shadow-sm bg-card overflow-hidden">
            <div className="px-3 py-2 border-b-2 border-[var(--comic-border-color)] text-sm font-bold">Предпросмотр текста</div>
            <pre className="p-3 text-xs whitespace-pre-wrap font-mono text-foreground max-h-72 overflow-y-auto custom-scrollbar">{text}</pre>
          </div>
        </>
      )}
    </div>
  )
}

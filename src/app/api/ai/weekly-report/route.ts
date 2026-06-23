import { db } from '@/lib/db'
import { OpenRouterError, createOpenRouterCompletion } from '@/lib/openrouter'

/**
 * Weekly status-report builder. Unlike the analytical period-summary, this
 * assembles a ready-to-send report in the team's own format: theme highlights
 * (AI narrative, grounded in real items), a dated "past week" timeline, work in
 * progress, published posts and future plans. Everything except the highlight
 * narrative is deterministic, so the facts/dates are never invented.
 */

const ACTIVE_STAGES = ['classification', 'evaluation', 'meaning', 'distribution', 'launch', 'measurement', 'feedback']

function fmtDate(d: Date) {
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

function parseMeanings(meanings: string | null): string[] {
  if (!meanings) return []
  return meanings.split(',').map(s => s.trim()).filter(Boolean)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const start = new Date(body.periodStart)
    const end = new Date(body.periodEnd)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return Response.json({ error: 'periodStart и periodEnd обязательны' }, { status: 400 })
    }
    // How far ahead to pull plans (default: 6 months).
    const horizon = body.planHorizonEnd ? new Date(body.planHorizonEnd) : new Date(end.getTime() + 1000 * 60 * 60 * 24 * 183)

    const [eventsPast, eventsFuture, signalsWindow, ongoing, signalsFuture] = await Promise.all([
      db.event.findMany({
        where: { date: { gte: start, lte: end }, status: { not: 'cancelled' } },
        include: { organizer: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      db.event.findMany({
        where: { date: { gt: end, lte: horizon }, status: { not: 'cancelled' } },
        include: { organizer: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      db.signal.findMany({
        where: {
          status: { not: 'archived' },
          OR: [{ updatedAt: { gte: start, lte: end } }, { launchDate: { gte: start, lte: end } }],
        },
        include: { assignee: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.signal.findMany({
        where: { status: { in: ACTIVE_STAGES } },
        include: { assignee: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      db.signal.findMany({
        where: { launchDate: { gt: end, lte: horizon }, status: { not: 'archived' } },
        include: { assignee: { select: { name: true } } },
        orderBy: { launchDate: 'asc' },
      }),
    ])

    // ── Highlights: group window signals by meaning ──────────────────────────
    const byTheme = new Map<string, { title: string; note: string }[]>()
    for (const s of signalsWindow) {
      const note = (s.aiContent || s.aiSummary || s.content || '').slice(0, 240)
      for (const m of parseMeanings(s.meanings)) {
        const arr = byTheme.get(m) || []
        arr.push({ title: s.title, note })
        byTheme.set(m, arr)
      }
    }

    let highlights: { theme: string; text: string }[] = []
    if (byTheme.size > 0) {
      const context = [...byTheme.entries()]
        .map(([theme, items]) => `Тема: ${theme}\n${items.map(i => `- ${i.title}${i.note ? ` — ${i.note}` : ''}`).join('\n')}`)
        .join('\n\n')
      try {
        const raw = await createOpenRouterCompletion({
          messages: [
            {
              role: 'system',
              content: 'Ты помощник руководителя команды коммуникаций Сбера. По списку тем и относящихся к ним сигналов за неделю напиши краткий хайлайт на КАЖДУЮ тему: 1–2 деловых предложения строго по фактам из списка, без выдумок, без эмодзи. Верни строго JSON: {"highlights":[{"theme":"...","text":"..."}]}.',
            },
            { role: 'user', content: context },
          ],
          maxTokens: 1200,
          temperature: 0,
          json: true,
        })
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.highlights)) {
          highlights = parsed.highlights.filter((h: { theme?: string; text?: string }) => h.theme && h.text)
        }
      } catch (e) {
        console.error('Weekly report highlight AI failed, using fallback:', e)
        // Fallback: list titles per theme without narrative so the report still builds.
        highlights = [...byTheme.entries()].map(([theme, items]) => ({
          theme,
          text: items.map(i => i.title).join('; '),
        }))
      }
    }

    // ── Deterministic blocks ─────────────────────────────────────────────────
    // Display date: tentative events keep their rough date for sorting but show a
    // free-text label ("Август ??"). responsible: portal member, else free text.
    const evWho = (e: typeof eventsPast[number]) => e.organizer?.name || e.responsible || null
    const evDate = (e: typeof eventsPast[number]) => (e.tentative && e.dateText ? e.dateText : fmtDate(e.date))

    const past = [
      ...eventsPast.map(e => ({ date: e.date, dateLabel: evDate(e), title: e.title, responsible: evWho(e) })),
      ...signalsWindow.filter(s => s.launchDate && s.launchDate >= start && s.launchDate <= end)
        .map(s => ({ date: s.launchDate as Date, dateLabel: fmtDate(s.launchDate as Date), title: s.title, responsible: s.assignee?.name || null })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    const ongoingList = ongoing.map(s => ({ title: s.title, assignee: s.assignee?.name || null }))

    // A "post" is anything explicitly published, or any window signal carrying a link.
    const posts = signalsWindow
      .filter(s => s.published || s.link)
      .map(s => ({
        title: s.title,
        links: (s.postLinks || s.link || '').split(/[\s,]+/).filter(Boolean),
      }))

    const plans = [
      ...eventsFuture.map(e => ({ date: e.date, dateLabel: evDate(e), title: e.title, responsible: evWho(e) })),
      ...signalsFuture.map(s => ({ date: s.launchDate as Date, dateLabel: fmtDate(s.launchDate as Date), title: s.title, responsible: s.assignee?.name || null })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    // ── Render plain text (email-ready) ──────────────────────────────────────
    const lines: string[] = []
    lines.push(`Статус / Команда коммуникации · ${fmtDate(start)}–${fmtDate(end)}`)
    lines.push('')

    if (highlights.length > 0) {
      lines.push('Хайлайты недели:')
      lines.push('')
      for (const h of highlights) lines.push(`${h.theme} — ${h.text}`)
      lines.push('')
    }

    lines.push(`Итоги недели: ${fmtDate(start)}–${fmtDate(end)}`)
    if (past.length === 0) lines.push('— нет событий за период')
    for (const p of past) lines.push(`${p.dateLabel} — ${p.title}${p.responsible ? ` / ${p.responsible}` : ''}`)
    lines.push('')

    if (ongoingList.length > 0) {
      lines.push('В работе:')
      for (const o of ongoingList) lines.push(`+ ${o.title}${o.assignee ? ` / ${o.assignee}` : ''}`)
      lines.push('')
    }

    if (posts.length > 0) {
      lines.push('Посты:')
      for (const p of posts) {
        lines.push(`+ ${p.title}${p.links.length ? ` — ${p.links.join(' ')}` : ''}`)
      }
      lines.push('')
    }

    if (plans.length > 0) {
      lines.push('Планы:')
      let currentMonth = ''
      for (const p of plans) {
        const month = fmtMonth(p.date)
        if (month !== currentMonth) { lines.push(`— ${month} —`); currentMonth = month }
        lines.push(`${p.dateLabel} — ${p.title}${p.responsible ? ` / ${p.responsible}` : ''}`)
      }
      lines.push('')
    }

    const text = lines.join('\n').trim()

    return Response.json({ text, highlights, past, ongoing: ongoingList, posts, plans })
  } catch (error) {
    console.error('Weekly report error:', error)
    if (error instanceof OpenRouterError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json({ error: 'Не удалось собрать отчёт' }, { status: 500 })
  }
}

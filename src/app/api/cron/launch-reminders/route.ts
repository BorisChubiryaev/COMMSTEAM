import { db } from '@/lib/db'
import { notifyTeam } from '@/lib/notify'

// Reminds the team about signals launching within the next 24 hours.
// Wire it to Vercel Cron (see vercel.json). Each signal is reminded once —
// dedupe is tracked via a DecisionHistory row, so no schema change is needed.
const REMINDER_ACTION = 'launch_reminder'
const WINDOW_MS = 24 * 60 * 60 * 1000

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatLaunch(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(date)
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return true // no secret configured — allow (e.g. manual trigger in dev)
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const horizon = new Date(now.getTime() + WINDOW_MS)

  const signals = await db.signal.findMany({
    where: {
      launchDate: { gte: now, lte: horizon },
      status: { notIn: ['archived', 'completed'] },
    },
    include: { assignee: true },
  })

  let sent = 0
  for (const signal of signals) {
    const already = await db.decisionHistory.findFirst({
      where: { signalId: signal.id, action: REMINDER_ACTION },
      select: { id: true },
    })
    if (already || !signal.launchDate) continue

    const assignee = signal.assignee ? `\nОтветственный: <b>${escapeHtml(signal.assignee.name)}</b>` : ''
    const place = signal.launchLocation ? `\nМесто: ${escapeHtml(signal.launchLocation)}` : ''
    const delivered = await notifyTeam(
      `⏰ Скоро запуск (${formatLaunch(signal.launchDate)} МСК)\n<b>${escapeHtml(signal.title)}</b>${assignee}${place}`,
    )

    // Don't burn the one-time reminder if delivery isn't configured yet.
    if (!delivered) continue

    await db.decisionHistory.create({
      data: {
        signalId: signal.id,
        action: REMINDER_ACTION,
        actor: 'system',
        note: `Напоминание о запуске ${formatLaunch(signal.launchDate)}`,
      },
    })
    sent += 1
  }

  return Response.json({ ok: true, checked: signals.length, sent })
}

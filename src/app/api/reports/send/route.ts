import { notifyTeam, isTeamNotifyConfigured } from '@/lib/notify'

/** Post an assembled report to the team Telegram chat, chunked under the 4096 limit. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const text: string = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return Response.json({ error: 'Пустой отчёт' }, { status: 400 })
  if (!isTeamNotifyConfigured()) {
    return Response.json({ error: 'Командный чат не настроен (TELEGRAM_NOTIFY_CHAT_ID)' }, { status: 400 })
  }

  // Split on blank lines, packing into ~3500-char chunks to stay under Telegram's limit.
  const blocks = text.split('\n\n')
  const chunks: string[] = []
  let buf = ''
  for (const block of blocks) {
    if ((buf + '\n\n' + block).length > 3500 && buf) {
      chunks.push(buf)
      buf = block
    } else {
      buf = buf ? `${buf}\n\n${block}` : block
    }
  }
  if (buf) chunks.push(buf)

  let delivered = 0
  for (const chunk of chunks) {
    const ok = await notifyTeam(chunk)
    if (ok) delivered++
  }

  if (delivered === 0) return Response.json({ error: 'Не удалось отправить' }, { status: 502 })
  return Response.json({ success: true, chunks: delivered })
}

import { db } from '@/lib/db'
import { OpenRouterError } from '@/lib/openrouter'
import { analyzeSignalInput } from '@/lib/signal-analysis'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const signalId = String(body.signalId || '').trim()

    if (!signalId) {
      return Response.json({ error: 'signalId required' }, { status: 400 })
    }

    const signal = await db.signal.findUnique({ where: { id: signalId } })
    if (!signal) {
      return Response.json({ error: 'Signal not found' }, { status: 404 })
    }

    const analysis = await analyzeSignalInput(signal)
    const updated = await db.signal.update({
      where: { id: signal.id },
      data: analysis,
      include: {
        assignee: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return Response.json({ signal: updated })
  } catch (error) {
    console.error('AI signal analysis error:', error)
    if (error instanceof OpenRouterError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json({ error: 'Не удалось разобрать новость' }, { status: 500 })
  }
}

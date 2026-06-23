import { db } from '@/lib/db'
import { recordCommentKnowledge } from '@/lib/knowledge'
import { after } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const comment = await db.comment.create({
    data: {
      content: body.content,
      authorId: body.authorId,
      signalId: body.signalId || null,
      contactId: body.contactId || null,
    },
    include: { author: true },
  })
  if (comment.signalId) {
    after(() => recordCommentKnowledge(comment.authorId, comment.signalId!))
  }
  return Response.json(comment)
}

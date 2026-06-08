import { db } from '@/lib/db'

type TelegramUser = {
  id?: number
  username?: string
  first_name?: string
  last_name?: string
}

type TelegramMessage = {
  message_id: number
  text?: string
  caption?: string
  chat?: { id: number | string }
  from?: TelegramUser
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
  edited_channel_post?: TelegramMessage
}

const URL_PATTERN = /https?:\/\/[^\s<>"')]+/i

function getWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
}

function getMessage(update: TelegramUpdate) {
  return update.message || update.edited_message || update.channel_post || update.edited_channel_post || null
}

function getMessageText(message: TelegramMessage) {
  return (message.text || message.caption || '').trim()
}

function getTitle(text: string, link: string | null) {
  const withoutLink = link ? text.replace(link, '').trim() : text
  const firstLine = withoutLink.split('\n').map(line => line.trim()).find(Boolean)
  return firstLine?.slice(0, 180) || link || 'Новость из Telegram'
}

function getTelegramName(user?: TelegramUser) {
  if (!user) return null
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return user.username ? `@${user.username}` : fullName || String(user.id || '')
}

function telegramReply(chatId: number | string | undefined, text: string) {
  if (!chatId) return Response.json({ ok: true })
  return Response.json({
    method: 'sendMessage',
    chat_id: chatId,
    text,
  })
}

export async function POST(req: Request) {
  const expectedSecret = getWebhookSecret()
  const actualSecret = req.headers.get('x-telegram-bot-api-secret-token')

  if (expectedSecret && actualSecret !== expectedSecret) {
    return Response.json({ error: 'Invalid Telegram webhook secret' }, { status: 401 })
  }

  const update = await req.json() as TelegramUpdate
  const message = getMessage(update)

  if (!message) {
    return Response.json({ ok: true, skipped: 'unsupported_update' })
  }

  const text = getMessageText(message)
  const chatId = message.chat?.id

  if (text.startsWith('/start')) {
    return telegramReply(
      chatId,
      'Присылайте сюда ссылку или текст новости. Я сохраню ее во входящие CommsTeam Hub.'
    )
  }

  if (!text) {
    return telegramReply(chatId, 'Пока принимаю текстовые сообщения и подписи к медиа.')
  }

  const link = text.match(URL_PATTERN)?.[0] || null
  const chatIdString = String(chatId ?? 'unknown')
  const messageIdString = String(message.message_id)

  const item = await db.incomingNews.upsert({
    where: {
      source_telegramChatId_telegramMessageId: {
        source: 'telegram',
        telegramChatId: chatIdString,
        telegramMessageId: messageIdString,
      },
    },
    create: {
      title: getTitle(text, link),
      content: text,
      link,
      source: 'telegram',
      status: 'new',
      rawPayload: JSON.stringify(update),
      telegramChatId: chatIdString,
      telegramMessageId: messageIdString,
      telegramUsername: message.from?.username || null,
      telegramFirstName: message.from?.first_name || null,
      telegramLastName: message.from?.last_name || null,
    },
    update: {
      title: getTitle(text, link),
      content: text,
      link,
      rawPayload: JSON.stringify(update),
      telegramUsername: message.from?.username || null,
      telegramFirstName: message.from?.first_name || null,
      telegramLastName: message.from?.last_name || null,
    },
  })

  return telegramReply(
    chatId,
    `Сохранил во входящие: ${item.title}\nАвтор: ${getTelegramName(message.from) || 'не указан'}`
  )
}

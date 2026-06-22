import { db } from '@/lib/db'
import { classifyIncomingNews } from '@/lib/incoming-news-intelligence'
import { convertIncomingToSignal, ignoreIncoming } from '@/lib/incoming-news-actions'
import {
  isTelegramConfigured,
  tgAnswerCallbackQuery,
  tgEditMessageText,
  tgGetChatMemberStatus,
  tgSendMessage,
  type ReplyMarkup,
} from '@/lib/telegram'
import { after } from 'next/server'

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

type TelegramCallbackQuery = {
  id: string
  data?: string
  from?: TelegramUser
  message?: TelegramMessage
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
  edited_channel_post?: TelegramMessage
  callback_query?: TelegramCallbackQuery
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

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function telegramReply(chatId: number | string | undefined, text: string) {
  if (!chatId) return Response.json({ ok: true })
  return Response.json({
    method: 'sendMessage',
    chat_id: chatId,
    text,
  })
}

function itemActionsKeyboard(id: string): ReplyMarkup {
  return {
    inline_keyboard: [[
      { text: '➡️ В канбан', callback_data: `conv:${id}` },
      { text: '🚫 Игнор', callback_data: `ign:${id}` },
    ]],
  }
}

const PRIORITY_LABEL: Record<string, string> = {
  A: '🔴 A — высокий',
  B: '🟠 B — средний',
  C: '🟡 C — низкий',
  Отклонено: '⚪️ Отклонено',
}

// Send the AI verdict back to the user once async classification finishes.
async function sendAnalysisFollowup(incomingId: string, chatId: number | string) {
  if (!isTelegramConfigured()) return

  const item = await db.incomingNews.findUnique({
    where: { id: incomingId },
    include: { signal: { select: { title: true } }, duplicateOf: { select: { title: true } } },
  })
  if (!item) return

  if (item.status === 'duplicate') {
    const dupTitle = item.signal?.title || item.duplicateOf?.title || ''
    await tgSendMessage(
      chatId,
      `♻️ Похоже на дубль (${item.duplicateScore ?? '?'}%).\n${escapeHtml(item.duplicateReason || dupTitle)}`,
    )
    return
  }

  const lines = [`🧠 <b>AI-разбор:</b> ${escapeHtml(item.title)}`]
  if (item.aiSummary) lines.push('', escapeHtml(item.aiSummary))

  const facts: string[] = []
  if (item.aiSignalType) facts.push(`Тип: ${escapeHtml(item.aiSignalType)}`)
  if (item.aiSource) facts.push(`Источник: ${escapeHtml(item.aiSource)}`)
  if (item.aiPriority) facts.push(`Приоритет: ${PRIORITY_LABEL[item.aiPriority] || item.aiPriority}`)
  const scores = [
    item.aiRelevance != null ? `актуальность ${item.aiRelevance}/5` : null,
    item.aiAlignment != null ? `соответствие ${item.aiAlignment}/5` : null,
    item.aiUrgency != null ? `срочность ${item.aiUrgency}/5` : null,
  ].filter(Boolean)
  if (scores.length) facts.push(`Оценки: ${scores.join(', ')}`)
  if (facts.length) lines.push('', facts.join('\n'))

  await tgSendMessage(chatId, lines.join('\n'), { replyMarkup: itemActionsKeyboard(incomingId) })
}

async function handleCallback(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat?.id
  const messageId = query.message?.message_id
  const [action, id] = (query.data || '').split(':')

  if (!id) {
    await tgAnswerCallbackQuery(query.id)
    return Response.json({ ok: true })
  }

  const actor = getTelegramName(query.from) || 'telegram'

  if (action === 'conv') {
    const result = await convertIncomingToSignal(id, actor)
    if ('error' in result) {
      await tgAnswerCallbackQuery(query.id, 'Новость не найдена')
    } else {
      await tgAnswerCallbackQuery(query.id, 'Отправлено в канбан ✅')
      if (chatId && messageId) {
        await tgEditMessageText(chatId, messageId, `✅ Отправлено в канбан: ${escapeHtml(result.signal?.title || '')}`)
      }
    }
  } else if (action === 'ign') {
    const result = await ignoreIncoming(id, actor)
    await tgAnswerCallbackQuery(query.id, 'error' in result ? 'Новость не найдена' : 'Скрыто 🚫')
    if (!('error' in result) && chatId && messageId) {
      await tgEditMessageText(chatId, messageId, '🚫 Новость проигнорирована')
    }
  } else {
    await tgAnswerCallbackQuery(query.id)
  }

  return Response.json({ ok: true })
}

async function handleCommand(text: string, chatId: number | string | undefined) {
  if (text.startsWith('/start') || text.startsWith('/help')) {
    return telegramReply(
      chatId,
      [
        'Привет! Я бот CommsTeam Hub.',
        '',
        'Присылайте ссылку или текст новости — я сохраню её во «Входящие» и сделаю AI-разбор.',
        '',
        'Команды:',
        '/login — получить код для входа на сайт',
        '/list — последние входящие',
        '/help — эта справка',
      ].join('\n'),
    )
  }

  if (text.startsWith('/list')) {
    const items = await db.incomingNews.findMany({
      where: { status: 'new' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, aiPriority: true },
    })
    if (items.length === 0) {
      return telegramReply(chatId, 'Во «Входящих» пусто 🎉')
    }
    const list = items
      .map((item, i) => `${i + 1}. ${item.title}${item.aiPriority ? ` — ${item.aiPriority}` : ''}`)
      .join('\n')
    return telegramReply(chatId, `Последние входящие:\n\n${list}`)
  }

  return null
}

const LOGIN_ALLOWED_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted'])
const LOGIN_CODE_TTL_MS = 10 * 60 * 1000

// Issue a one-time login code, but only to members of the team chat.
async function handleLogin(message: TelegramMessage) {
  const chatId = message.chat?.id
  const userId = message.from?.id
  if (!userId) return telegramReply(chatId, 'Не удалось определить ваш Telegram-аккаунт.')

  const teamChatId = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim()
  if (!teamChatId) return telegramReply(chatId, 'Командный чат не настроен. Обратитесь к администратору.')

  const status = await tgGetChatMemberStatus(teamChatId, userId)
  if (!status || !LOGIN_ALLOWED_STATUSES.has(status)) {
    return telegramReply(chatId, '🚫 Нет доступа: вы не состоите в командном чате.')
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ').trim()
    || message.from?.username
    || `tg${userId}`

  await db.teamMember.upsert({
    where: { telegramId: String(userId) },
    create: {
      name,
      telegramId: String(userId),
      telegramChatId: String(chatId ?? userId),
      telegramUsername: message.from?.username || null,
      loginCode: code,
      loginCodeExpiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
    },
    update: {
      telegramChatId: String(chatId ?? userId),
      telegramUsername: message.from?.username || null,
      loginCode: code,
      loginCodeExpiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
    },
  })

  return telegramReply(
    chatId,
    `🔑 Ваш код для входа: ${code}\nВведите его на сайте. Код действует 10 минут.`,
  )
}

export async function POST(req: Request) {
  const expectedSecret = getWebhookSecret()
  const actualSecret = req.headers.get('x-telegram-bot-api-secret-token')

  if (expectedSecret && actualSecret !== expectedSecret) {
    return Response.json({ error: 'Invalid Telegram webhook secret' }, { status: 401 })
  }

  const update = await req.json() as TelegramUpdate

  if (update.callback_query) {
    return handleCallback(update.callback_query)
  }

  const message = getMessage(update)

  if (!message) {
    return Response.json({ ok: true, skipped: 'unsupported_update' })
  }

  const text = getMessageText(message)
  const chatId = message.chat?.id

  if (text.startsWith('/login')) {
    return handleLogin(message)
  }

  if (text.startsWith('/')) {
    const handled = await handleCommand(text, chatId)
    if (handled) return handled
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

  await db.decisionHistory.create({
    data: {
      incomingNewsId: item.id,
      action: 'created',
      actor: 'telegram',
      note: `Новость получена от ${getTelegramName(message.from) || 'Telegram'}`,
    },
  })

  after(async () => {
    await classifyIncomingNews(item.id, {
      title: item.title,
      content: item.content,
      link: item.link,
    })
    if (chatId) {
      await sendAnalysisFollowup(item.id, chatId)
    }
  })

  return telegramReply(
    chatId,
    `Сохранил во входящие: ${item.title}\nГотовлю AI-разбор…`,
  )
}

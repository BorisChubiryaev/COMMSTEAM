// Lightweight Telegram Bot API client.
//
// The webhook can always reply to the *current* message by returning a method
// object in its HTTP response (see the webhook route). But follow-up messages
// (e.g. an AI summary produced asynchronously), inline-button updates and
// proactive notifications require an outbound call to the Bot API, which needs
// TELEGRAM_BOT_TOKEN. Every helper degrades gracefully to a no-op when the
// token is missing, so the app keeps working without it.

type InlineButton = { text: string; callback_data: string }
type ReplyMarkup = { inline_keyboard: InlineButton[][] }

function getToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim()
}

export function isTelegramConfigured() {
  return Boolean(getToken())
}

async function callApi<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const token = getToken()
  if (!token) {
    console.warn(`Telegram ${method} skipped: TELEGRAM_BOT_TOKEN is not configured`)
    return null
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })

    const data = await response.json().catch(() => null)
    if (!data?.ok) {
      console.error(`Telegram ${method} failed:`, data?.description || response.status)
      return null
    }
    return data.result as T
  } catch (error) {
    console.error(`Telegram ${method} error:`, error)
    return null
  }
}

export function tgSendMessage(
  chatId: number | string,
  text: string,
  options: { replyMarkup?: ReplyMarkup; replyTo?: number } = {},
) {
  return callApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_to_message_id: options.replyTo,
    reply_markup: options.replyMarkup,
  })
}

export function tgEditMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options: { replyMarkup?: ReplyMarkup } = {},
) {
  return callApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: options.replyMarkup ?? { inline_keyboard: [] },
  })
}

// Returns the member's status in a chat ('creator' | 'administrator' | 'member' |
// 'restricted' | 'left' | 'kicked'), or null if the lookup failed.
export async function tgGetChatMemberStatus(chatId: number | string, userId: number | string) {
  const result = await callApi<{ status?: string }>('getChatMember', {
    chat_id: chatId,
    user_id: userId,
  })
  return result?.status ?? null
}

export function tgAnswerCallbackQuery(callbackQueryId: string, text?: string) {
  return callApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  })
}

export type { InlineButton, ReplyMarkup }

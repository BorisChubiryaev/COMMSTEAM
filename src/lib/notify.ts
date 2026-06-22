import { tgSendMessage } from '@/lib/telegram'

// Team notification channel. Set TELEGRAM_NOTIFY_CHAT_ID to a group/channel chat
// id (e.g. -1001234567890) where the bot is a member. Notifications are no-ops
// when it (or the bot token) is missing, so the app never breaks without it.
function getTeamChatId() {
  return process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim()
}

export function isTeamNotifyConfigured() {
  return Boolean(getTeamChatId())
}

/**
 * Post a notification to the shared team chat.
 * Returns true only if a message was actually delivered.
 */
export async function notifyTeam(text: string): Promise<boolean> {
  const chatId = getTeamChatId()
  if (!chatId) return false
  const result = await tgSendMessage(chatId, text)
  return result !== null
}

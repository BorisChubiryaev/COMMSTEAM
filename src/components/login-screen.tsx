'use client'

import { useEffect, useRef, useState } from 'react'
import type { TeamMember } from '@/lib/store'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'comm_steam_test_bot'

type TelegramAuthUser = Record<string, string | number>

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthUser) => void
  }
}

export function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: TeamMember) => void }) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.onTelegramAuth = async (user: TelegramAuthUser) => {
      setSubmitting(true)
      setError(null)
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'Не удалось войти')
          setSubmitting(false)
          return
        }
        onAuthenticated(data.user)
      } catch {
        setError('Сеть недоступна, попробуйте ещё раз')
        setSubmitting(false)
      }
    }

    // Inject the Telegram Login Widget script (renders its own button).
    const container = widgetRef.current
    if (container && !container.querySelector('script')) {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', BOT_USERNAME)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-userpic', 'true')
      script.setAttribute('data-request-access', 'write')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')
      container.appendChild(script)
    }

    return () => { delete window.onTelegramAuth }
  }, [onAuthenticated])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card comic-border comic-shadow-lg comic-pop p-8 text-center">
        <div className="w-20 h-20 bg-[#FF6B35] rounded-2xl comic-shadow-lg flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">⚡</span>
        </div>
        <h1 className="comic-title text-3xl text-[#FF6B35] mb-2">CommsTeam Hub</h1>
        <p className="text-muted-foreground mb-6">
          Вход только для участников командного чата. Авторизуйтесь через Telegram.
        </p>

        <div className="flex justify-center min-h-[48px]" ref={widgetRef} />

        {submitting && <p className="text-sm text-muted-foreground mt-4">Проверяем доступ…</p>}
        {error && (
          <p className="text-sm text-red-500 mt-4 font-medium">{error}</p>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Нет доступа? Попросите добавить вас в рабочую группу Telegram.
        </p>
      </div>
    </div>
  )
}

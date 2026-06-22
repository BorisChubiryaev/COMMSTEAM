'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { TeamMember } from '@/lib/store'

const BOT_ID = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || '8921085716'

type TelegramAuthUser = Record<string, string | number>

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          options: { bot_id: string; request_access?: string; lang?: string },
          callback: (user: TelegramAuthUser | false) => void,
        ) => void
      }
    }
  }
}

export function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: TeamMember) => void }) {
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!window.Telegram?.Login)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load Telegram's widget script once; it exposes window.Telegram.Login.auth.
  useEffect(() => {
    if (ready) return
    const existing = document.getElementById('telegram-login-script') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => setReady(true))
      return
    }
    const script = document.createElement('script')
    script.id = 'telegram-login-script'
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.onload = () => setReady(true)
    script.onerror = () => setError('Не удалось загрузить Telegram. Проверьте сеть или блокировщики.')
    document.body.appendChild(script)
  }, [ready])

  const handleLogin = () => {
    const login = window.Telegram?.Login
    if (!login) { setError('Telegram ещё не загрузился, попробуйте через секунду'); return }

    setError(null)
    login.auth({ bot_id: BOT_ID, request_access: 'write' }, async (user) => {
      if (!user) { setError('Вход отменён'); return }
      setSubmitting(true)
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
    })
  }

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

        <Button
          onClick={handleLogin}
          disabled={!ready || submitting}
          className="comic-btn bg-[#229ED9] hover:bg-[#1c8ac0] text-white h-11 px-6 text-base"
        >
          {submitting ? 'Проверяем доступ…' : ready ? '✈️  Войти через Telegram' : 'Загрузка…'}
        </Button>

        {error && <p className="text-sm text-red-500 mt-4 font-medium">{error}</p>}

        <p className="text-xs text-muted-foreground mt-6">
          Нет доступа? Попросите добавить вас в рабочую группу Telegram.
        </p>
      </div>
    </div>
  )
}

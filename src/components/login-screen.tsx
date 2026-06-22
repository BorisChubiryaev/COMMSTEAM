'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TeamMember } from '@/lib/store'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'comm_steam_test_bot'

export function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: TeamMember) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setError('Код состоит из 6 цифр'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card comic-border comic-shadow-lg comic-pop p-8 text-center">
        <div className="w-20 h-20 bg-[#FF6B35] rounded-2xl comic-shadow-lg flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">⚡</span>
        </div>
        <h1 className="comic-title text-3xl text-[#FF6B35] mb-2">CommsTeam Hub</h1>
        <p className="text-muted-foreground mb-6">Вход для участников командного чата через Telegram.</p>

        <ol className="text-left text-sm text-muted-foreground space-y-2 mb-5">
          <li>
            1. Откройте бота{' '}
            <a
              href={`https://t.me/${BOT_USERNAME}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#229ED9] font-medium hover:underline"
            >
              @{BOT_USERNAME}
            </a>
          </li>
          <li>2. Отправьте команду <code className="px-1.5 py-0.5 rounded bg-[var(--comic-tag-bg)] font-mono">/login</code></li>
          <li>3. Введите полученный код ниже</li>
        </ol>

        <form onSubmit={submit} className="space-y-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            autoFocus
            className="text-center text-2xl tracking-[0.4em] font-mono h-12"
          />
          <Button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="comic-btn w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white h-11 text-base"
          >
            {submitting ? 'Проверяем…' : 'Войти'}
          </Button>
        </form>

        {error && <p className="text-sm text-red-500 mt-4 font-medium">{error}</p>}
      </div>
    </div>
  )
}

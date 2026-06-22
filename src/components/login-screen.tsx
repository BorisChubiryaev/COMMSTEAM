'use client'

import { useEffect, useRef, useState } from 'react'
import type { TeamMember } from '@/lib/store'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'comm_steam_test_bot'

export function LoginScreen({ onAuthenticated: _onAuthenticated }: { onAuthenticated: (user: TeamMember) => void }) {
  const widgetRef = useRef<HTMLDivElement>(null)
  // Surface an auth error passed back by the GET redirect flow.
  const [error] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('auth_error')
  })

  // Clean the error param out of the URL so it doesn't stick on reload.
  useEffect(() => {
    if (error) window.history.replaceState({}, '', window.location.pathname)
  }, [error])

  // Render the official Telegram Login Widget. On success Telegram redirects the
  // whole page to data-auth-url (our GET /api/auth/telegram), which sets the
  // session cookie and sends the user back to "/". No popup postMessage involved.
  useEffect(() => {
    const container = widgetRef.current
    if (!container || container.querySelector('script')) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram`)
    container.appendChild(script)
  }, [])

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

        {error && <p className="text-sm text-red-500 mt-4 font-medium">{error}</p>}

        <p className="text-xs text-muted-foreground mt-6">
          Нет доступа? Попросите добавить вас в рабочую группу Telegram.
        </p>
      </div>
    </div>
  )
}

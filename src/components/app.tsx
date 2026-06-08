'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore, STATUS_LABELS, STATUSES, PRIORITY_COLORS, PRIORITY_BG, type Section } from '@/lib/store'
import { Sidebar } from '@/components/sidebar'
import { KanbanBoard } from '@/components/sections/kanban-board'
import { IncomingNewsSection } from '@/components/sections/incoming-news-section'
import { NewsFeedSection } from '@/components/sections/news-feed-section'
import { CalendarSection } from '@/components/sections/calendar-section'
import { ContactsSection } from '@/components/sections/contacts-section'
import { ArchiveSection } from '@/components/sections/archive-section'
import { AnalyticsSection } from '@/components/sections/analytics-section'
import { HelpSection } from '@/components/sections/help-section'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/markdown-content'
import { Menu, Bell, Plus, HelpCircle, Moon, Sun, Trash2, X, Keyboard, Download, Sparkles, LayoutDashboard, Inbox, Newspaper, Calendar, Users, Archive, BarChart3 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from '@/hooks/use-toast'

const MOBILE_NAV_ITEMS = [
  { id: 'kanban' as const, icon: LayoutDashboard, label: 'Канбан' },
  { id: 'inbox' as const, icon: Inbox, label: 'Входящие' },
  { id: 'news' as const, icon: Newspaper, label: 'Новости' },
  { id: 'calendar' as const, icon: Calendar, label: 'Календарь' },
  { id: 'contacts' as const, icon: Users, label: 'Контакты' },
  { id: 'archive' as const, icon: Archive, label: 'Архив' },
  { id: 'analytics' as const, icon: BarChart3, label: 'Аналитика' },
  { id: 'help' as const, icon: HelpCircle, label: 'Справка' },
]

function sectionTitle(section: Section) {
  const titles: Record<Section, string> = {
    kanban: 'Канбан',
    inbox: 'Входящие',
    news: 'Новости',
    calendar: 'Календарь',
    contacts: 'Контакты',
    archive: 'Архив',
    analytics: 'Аналитика',
    help: 'Справка',
  }
  return titles[section]
}

export function App() {
  const { activeSection, setActiveSection, toggleSidebar, currentUser, setCurrentUser, setTeamMembers, setSignals, setIncomingNews, setContacts, setEvents, signals, incomingNews, selectedSignalId, setSelectedSignalId } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [showNewSignal, setShowNewSignal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Close modals when section changes
  useEffect(() => {
    setSelectedSignalId(null)
  }, [activeSection, setSelectedSignalId])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N: New signal
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setActiveSection('kanban')
        setShowNewSignal(true)
      }
      // Escape: Close any open modal
      if (e.key === 'Escape') {
        setSelectedSignalId(null)
        setShowNewSignal(false)
        setShowShortcuts(false)
      }
      // Ctrl+/: Show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
      }
      // Ctrl+K: Focus search (only on kanban)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setActiveSection('kanban')
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder="Поиск сигналов..."]') as HTMLInputElement
          searchInput?.focus()
        }, 100)
      }
      // Ctrl+1-8: Navigate sections
      if (e.ctrlKey || e.metaKey) {
        const sections: Section[] = ['kanban', 'inbox', 'news', 'calendar', 'contacts', 'archive', 'analytics', 'help']
        const num = parseInt(e.key)
        if (num >= 1 && num <= sections.length) {
          e.preventDefault()
          setActiveSection(sections[num - 1])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSelectedSignalId, setActiveSection])

  // Close notifications when clicking outside
  useEffect(() => {
    if (!showNotifications) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.relative')) setShowNotifications(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showNotifications])

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [teamRes, signalsRes, incomingNewsRes, contactsRes, eventsRes] = await Promise.all([
        fetch('/api/team'),
        fetch('/api/signals'),
        fetch('/api/incoming-news'),
        fetch('/api/contacts'),
        fetch('/api/events'),
      ])

      if (teamRes.ok) {
        const team = await teamRes.json()
        setTeamMembers(team)
        if (team.length > 0 && !currentUser) {
          setCurrentUser(team[0])
        }
      }

      if (signalsRes.ok) {
        const data = await signalsRes.json()
        setSignals(data)
      }

      if (incomingNewsRes.ok) {
        const data = await incomingNewsRes.json()
        setIncomingNews(data)
      }

      if (contactsRes.ok) {
        const data = await contactsRes.json()
        setContacts(data)
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setEvents(data)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser, setCurrentUser, setTeamMembers, setSignals, setIncomingNews, setContacts, setEvents])

  useEffect(() => {
    // Seed first, then load
    fetch('/api/seed', { method: 'POST' }).then(() => {
      loadData()
    }).catch(() => {
      loadData()
    })
  }, [])

  const renderSection = () => {
    switch (activeSection) {
      case 'kanban': return <KanbanBoard />
      case 'inbox': return <IncomingNewsSection />
      case 'news': return <NewsFeedSection />
      case 'calendar': return <CalendarSection />
      case 'contacts': return <ContactsSection />
      case 'archive': return <ArchiveSection />
      case 'analytics': return <AnalyticsSection />
      case 'help': return <HelpSection />
      default: return <KanbanBoard />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-[#FF6B35] rounded-2xl comic-shadow-lg flex items-center justify-center mx-auto mb-5 animate-bounce">
              <span className="text-4xl">⚡</span>
            </div>
            {/* Decorative comic sparkles */}
            <div className="absolute -top-2 -right-2 text-2xl animate-ping" style={{ animationDuration: '2s' }}>✦</div>
            <div className="absolute -bottom-1 -left-3 text-lg animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>✧</div>
          </div>
          <h2 className="comic-title text-3xl text-[#FF6B35]">Загрузка...</h2>
          <p className="text-muted-foreground mt-2">Подготавливаем ваше пространство</p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header Bar */}
      <header className="h-14 bg-card flex items-center px-3 sm:px-4 gap-2 sm:gap-3 z-30 comic-shadow-sm relative overflow-hidden sticky top-0" style={{ borderBottom: '3px solid var(--comic-border-color)' }}>
        {/* Decorative speed lines in header */}
        <div className="absolute inset-0 comic-speed-lines pointer-events-none" />

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={toggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="min-w-0 flex-1 flex items-center gap-2">
          <h2 className="comic-title text-base sm:text-lg text-[#FF6B35] truncate">
            {sectionTitle(activeSection)}
          </h2>
          {/* Comic action word decoration */}
          {activeSection === 'kanban' && signals.filter(s => s.priority === 'A').length > 0 && (
            <span className="comic-sticker bg-[#FF3F8E] text-white text-[10px] hidden lg:inline-flex">СРОЧНО!</span>
          )}
        </div>

        {activeSection === 'kanban' && (
          <Button
            className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white h-9 px-2.5 sm:px-4 shrink-0"
            onClick={() => setShowNewSignal(true)}
            title="Новый сигнал"
          >
            <Plus className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Новый сигнал</span>
          </Button>
        )}

        <Button variant="ghost" size="icon" onClick={() => setActiveSection('help')} title="Справка" className="comic-jitter hidden sm:inline-flex shrink-0">
          <HelpCircle className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)} title="Горячие клавиши (Ctrl+/)" className="hidden md:inline-flex shrink-0">
          <Keyboard className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} className="comic-wiggle shrink-0">
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
        </Button>

        <div className="relative">
          <Button variant="ghost" size="icon" className="relative comic-wiggle" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell className="w-5 h-5" />
            {signals.filter(s => s.status === 'input').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF3F8E] text-white text-[10px] rounded-full flex items-center justify-center comic-pulse">
                {signals.filter(s => s.status === 'input').length}
              </span>
            )}
          </Button>
          {showNotifications && (
            <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 bg-card comic-border comic-shadow-lg z-50 comic-pop">
              <div className="p-3 border-b-2 border-[var(--comic-border-color)] flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span className="comic-action-word text-[#FF3F8E] text-base">BOOM!</span>
                  Уведомления
                </h3>
                <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {signals.filter(s => s.status === 'input').length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Нет новых сигналов</div>
                ) : (
                  signals.filter(s => s.status === 'input').map(signal => (
                    <button
                      key={signal.id}
                      className="w-full p-3 text-left hover:bg-[var(--comic-bg-hover)] border-b border-border transition-colors"
                      onClick={() => {
                        setSelectedSignalId(signal.id)
                        setShowNotifications(false)
                      }}
                    >
                      <p className="text-sm font-bold truncate">{signal.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {signal.source && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--comic-tag-bg)] text-muted-foreground">{signal.source}</span>}
                        {signal.signalType && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00C9A7]/10 text-[#00C9A7]">{signal.signalType}</span>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {currentUser && (
          <div className="hidden sm:flex items-center gap-2 ml-2">
            <div className="w-8 h-8 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[var(--comic-border-color)] comic-shadow-sm">
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="text-sm font-medium hidden md:block">{currentUser.name}</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6">
          {renderSection()}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-[var(--comic-border-color)] bg-card/95 backdrop-blur lg:hidden mobile-bottom-nav">
        <div className="flex gap-1 overflow-x-auto px-2 py-2">
          {MOBILE_NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const isActive = activeSection === id
            const badge = id === 'inbox' ? incomingNews.filter(item => item.status === 'new').length : id === 'kanban' ? signals.filter(signal => signal.status !== 'archived').length : 0
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`relative flex min-w-[72px] flex-col items-center justify-center rounded-lg border-2 px-2 py-1.5 text-[10px] font-bold transition-colors ${
                  isActive
                    ? 'border-[#FF6B35] bg-[#FF6B35] text-white'
                    : 'border-transparent text-muted-foreground hover:bg-[var(--comic-bg-hover)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-0.5 truncate">{label}</span>
                {badge > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#FF3F8E] px-1 text-[9px] leading-4 text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="hidden lg:block bg-[var(--sidebar)] text-gray-400 py-3 px-6 text-center text-sm relative" style={{ borderTop: '3px solid #FF6B35' }}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B35] via-[#FFD166] to-[#00C9A7]" />
        <p>⚡ CommsTeam Hub — Единое пространство команды коммуникации • Оцифровка процессов с ИИ • 2025</p>
      </footer>

      {/* Signal Detail Modal */}
      <SignalDetailModal 
        open={selectedSignalId !== null}
        onClose={() => setSelectedSignalId(null)}
      />

      {/* New Signal Modal */}
      {activeSection === 'kanban' && showNewSignal && (
        <NewSignalModal 
          onClose={() => setShowNewSignal(false)}
          onCreated={() => {
            setShowNewSignal(false)
            loadData()
            toast({ title: '⚡ Сигнал создан!', description: 'Новый сигнал добавлен на канбан-доску' })
          }}
        />
      )}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && <KeyboardShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}

// New Signal Modal
function NewSignalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [link, setLink] = useState('')
  const [source, setSource] = useState('')
  const [signalType, setSignalType] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const { currentUser } = useAppStore()

  const handleAiSummary = async () => {
    if (!content && !link) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, link }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSummary(data.summary)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({
          title: 'ИИ-запрос не выполнен',
          description: data.error || 'Проверьте OPENROUTER_API_KEY и AI_MODEL в .env',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('AI summary failed:', err)
      toast({
        title: 'ИИ-запрос не выполнен',
        description: 'Не удалось подключиться к локальному API',
        variant: 'destructive',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          link: link || null,
          source: source || null,
          signalType: signalType || null,
          aiSummary: aiSummary || null,
          status: 'input',
          assigneeId: currentUser?.id || null,
        }),
      })
      if (res.ok) {
        onCreated()
      }
    } catch (err) {
      console.error('Failed to create signal:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card comic-border comic-shadow-lg w-full sm:max-w-2xl max-h-[94dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 custom-scrollbar comic-pop rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky -top-4 sm:static z-10 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 bg-card flex items-center justify-between mb-4 sm:mb-6 border-b-2 sm:border-b-0 border-[var(--comic-border-color)]">
          <h2 className="comic-title text-xl sm:text-2xl text-[#FF6B35]">⚡ Новый сигнал</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Заголовок *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-3 border-2 border-[var(--comic-border-color)] rounded-lg focus:outline-none focus:border-[#FF6B35] text-sm bg-[var(--comic-input-bg)] text-foreground"
              placeholder="О чём новость?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Ссылка</label>
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              className="w-full p-3 border-2 border-[var(--comic-border-color)] rounded-lg focus:outline-none focus:border-[#FF6B35] text-sm bg-[var(--comic-input-bg)] text-foreground"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Содержание</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full p-3 border-2 border-[var(--comic-border-color)] rounded-lg focus:outline-none focus:border-[#FF6B35] text-sm min-h-[100px] bg-[var(--comic-input-bg)] text-foreground"
              placeholder="Опишите новость или вставьте текст..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Источник</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full p-3 border-2 border-[var(--comic-border-color)] rounded-lg focus:outline-none focus:border-[#FF6B35] text-sm bg-[var(--comic-input-bg)] text-foreground"
              >
                <option value="">Выберите...</option>
                <option value="ДЗО">ДЗО</option>
                <option value="Трабы/Команды">Трабы/Команды</option>
                <option value="Мероприятия">Мероприятия</option>
                <option value="Тренды/Рынок">Тренды/Рынок</option>
                <option value="Задачи от руководства">Задачи от руководства</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Тип сигнала</label>
              <select
                value={signalType}
                onChange={e => setSignalType(e.target.value)}
                className="w-full p-3 border-2 border-[var(--comic-border-color)] rounded-lg focus:outline-none focus:border-[#FF6B35] text-sm bg-[var(--comic-input-bg)] text-foreground"
              >
                <option value="">Выберите...</option>
                <option value="Новость">Новость</option>
                <option value="Идея/Инициатива">Идея/Инициатива</option>
                <option value="Инфоповод">Инфоповод</option>
                <option value="Задача/Поручение">Задача/Поручение</option>
              </select>
            </div>
          </div>

          {/* AI Summary */}
          {(content || link) && (
            <div className="bg-[var(--comic-bg-alt)] border-2 border-dashed border-[#FF6B35] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🤖</span>
                <span className="text-sm font-bold">ИИ-саммари</span>
                {!aiSummary && (
                  <button
                    type="button"
                    onClick={handleAiSummary}
                    disabled={aiLoading}
                    className="ml-auto comic-btn bg-[#00C9A7] hover:bg-[#00b896] text-white text-xs px-3 py-1"
                  >
                    {aiLoading ? '⏳ Генерация...' : 'Сгенерировать'}
                  </button>
                )}
              </div>
              {aiSummary && (
                <MarkdownContent content={aiSummary} className="text-muted-foreground" />
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-6 py-3 text-sm">
              Создать сигнал
            </button>
            <button type="button" onClick={onClose} className="comic-btn bg-[var(--comic-bg-hover)] hover:bg-muted text-foreground px-6 py-3 text-sm">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Signal Detail Modal (enhanced version)
function SignalDetailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selectedSignalId, signals, updateSignal, setSignals, currentUser } = useAppStore()
  const signal = signals.find(s => s.id === selectedSignalId)
  const [comment, setComment] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [aiContentLoading, setAiContentLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const refreshSignal = useCallback(async () => {
    if (!selectedSignalId) return
    try {
      const res = await fetch(`/api/signals/${selectedSignalId}`)
      if (res.ok) {
        const data = await res.json()
        updateSignal(data)
        setSignals(signals.map(s => s.id === data.id ? data : s))
      }
    } catch (err) {
      console.error(err)
    }
  }, [selectedSignalId, signals, setSignals, updateSignal])

  const handleStatusChange = async (newStatus: string) => {
    if (!signal) return
    try {
      const res = await fetch(`/api/signals/${signal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        updateSignal(updated)
        setSignals(signals.map(s => s.id === updated.id ? updated : s))
        toast({ title: `Сигнал перемещён: ${STATUS_LABELS[newStatus] || newStatus}` })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!signal) return
    try {
      const res = await fetch(`/api/signals/${signal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        const updated = await res.json()
        updateSignal(updated)
        setSignals(signals.map(s => s.id === updated.id ? updated : s))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!signal) return
    try {
      const res = await fetch(`/api/signals/${signal.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSignals(signals.filter(s => s.id !== signal.id))
        onClose()
        toast({ title: 'Сигнал удалён', description: `"${signal.title}" удалён из системы` })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddComment = async () => {
    if (!comment || !signal || !currentUser) return
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: comment,
          authorId: currentUser.id,
          signalId: signal.id,
        }),
      })
      setComment('')
      refreshSignal()
    } catch (err) {
      console.error(err)
    }
  }

  const handleGenerateContent = async () => {
    if (!signal) return
    setAiContentLoading(true)
    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signalTitle: signal.title,
          signalContent: signal.content || '',
          publicationType: signal.publicationType || 'Посты в соцсетях',
          meanings: signal.meanings || '',
          distribution: signal.distribution || '',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        await handleFieldUpdate('aiContent', data.content)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({
          title: 'ИИ-контент не создан',
          description: data.error || 'Проверьте OPENROUTER_API_KEY и AI_MODEL в .env',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'ИИ-контент не создан',
        description: 'Не удалось подключиться к локальному API',
        variant: 'destructive',
      })
    } finally {
      setAiContentLoading(false)
    }
  }

  const handleAnalyzeSignal = async () => {
    if (!signal) return
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/ai/analyze-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId: signal.id }),
      })

      if (res.ok) {
        const data = await res.json()
        updateSignal(data.signal)
        setSignals(signals.map(s => s.id === data.signal.id ? data.signal : s))
        toast({
          title: 'Разбор применён',
          description: 'Поля сигнала заполнены рекомендацией. Проверьте и поправьте при необходимости.',
        })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({
          title: 'Разбор не выполнен',
          description: data.error || 'Проверьте OPENROUTER_API_KEY и AI_MODEL в окружении',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Разбор не выполнен',
        description: 'Не удалось подключиться к API анализа',
        variant: 'destructive',
      })
    } finally {
      setAnalysisLoading(false)
    }
  }

  if (!open || !signal) return null

  const statusSteps = ['input', 'classification', 'evaluation', 'meaning', 'distribution', 'launch', 'measurement', 'feedback', 'completed']
  const currentStep = statusSteps.indexOf(signal.status)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card comic-border comic-shadow-lg w-full sm:max-w-3xl max-h-[96dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar comic-pop rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b-2 border-[var(--comic-border-color)] sticky top-0 bg-card z-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {signal.priority && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${PRIORITY_COLORS[signal.priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-200'}`}>
                    {signal.priority}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--comic-border-color)] text-white">
                  {STATUS_LABELS[signal.status as keyof typeof STATUS_LABELS] || signal.status}
                </span>
                {signal.signalType && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00C9A7] text-white">
                    {signal.signalType}
                  </span>
                )}
              </div>
              <h2 className="comic-title text-lg sm:text-xl text-foreground break-words">{signal.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <button
                onClick={handleAnalyzeSignal}
                disabled={analysisLoading}
                className="comic-btn bg-[#00C9A7] hover:bg-[#00b896] text-white px-3 py-2 sm:py-1.5 text-xs inline-flex items-center gap-1.5"
                title="Заполнить поля рекомендацией ИИ"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {analysisLoading ? 'Разбор...' : 'Разобрать новость'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-muted-foreground hover:text-[#EF4444] transition-colors p-1"
                title="Удалить сигнал"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="ml-auto sm:ml-2 text-muted-foreground hover:text-foreground text-2xl transition-colors">✕</button>
            </div>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg comic-pop">
              <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-2">Удалить этот сигнал?</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="comic-btn bg-[#EF4444] hover:bg-red-600 text-white px-4 py-1.5 text-xs">Да, удалить</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="comic-btn bg-card text-foreground px-4 py-1.5 text-xs">Отмена</button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {statusSteps.map((step, i) => (
              <div
                key={step}
                className="h-2 min-w-9 flex-1 rounded-full cursor-pointer transition-all hover:opacity-80"
                style={{
                  backgroundColor: i <= currentStep ? STATUSES.find(s => s.value === step)?.color || '#FF6B35' : 'var(--comic-tag-bg)',
                }}
                onClick={() => handleStatusChange(step)}
                title={STATUS_LABELS[step as keyof typeof STATUS_LABELS]}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">Входящее</span>
            <span className="text-[9px] text-muted-foreground">Завершено</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* AI Summary */}
          {signal.aiSummary && (
            <div className="bg-[var(--comic-bg-alt)] border-2 border-[#FF6B35] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🤖</span>
                <span className="text-sm font-bold text-[#FF6B35]">ИИ-саммари</span>
              </div>
              <MarkdownContent content={signal.aiSummary} className="text-muted-foreground" />
            </div>
          )}

          {/* Content & Link */}
          {signal.content && (
            <div>
              <h3 className="text-sm font-bold mb-1">📄 Содержание</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{signal.content}</p>
            </div>
          )}
          {signal.link && (
            <div>
              <h3 className="text-sm font-bold mb-1">🔗 Ссылка</h3>
              <a href={signal.link} target="_blank" rel="noopener noreferrer" className="text-sm text-[#00C9A7] underline break-all hover:text-[#00b896]">
                {signal.link}
              </a>
            </div>
          )}

          {/* Source & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">📡 Источник</label>
              <select
                value={signal.source || ''}
                onChange={e => handleFieldUpdate('source', e.target.value)}
                className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
              >
                <option value="">Не указан</option>
                <option value="ДЗО">ДЗО</option>
                <option value="Трабы/Команды">Трабы/Команды</option>
                <option value="Мероприятия">Мероприятия</option>
                <option value="Тренды/Рынок">Тренды/Рынок</option>
                <option value="Задачи от руководства">Задачи от руководства</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">📋 Тип сигнала</label>
              <select
                value={signal.signalType || ''}
                onChange={e => handleFieldUpdate('signalType', e.target.value)}
                className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
              >
                <option value="">Не указан</option>
                <option value="Новость">Новость</option>
                <option value="Идея/Инициатива">Идея/Инициатива</option>
                <option value="Инфоповод">Инфоповод</option>
                <option value="Задача/Поручение">Задача/Поручение</option>
              </select>
            </div>
          </div>

          {/* Evaluation - shown after classification */}
          {currentStep >= 2 && (
            <div className="border-2 border-[#FBBF24] rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-900/10">
              <h3 className="text-sm font-bold mb-3">⚡ Фильтр / Оценка</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {[
                  { field: 'relevance', label: 'Актуальность' },
                  { field: 'alignment', label: 'Соответствие смыслам' },
                  { field: 'urgency', label: 'Срочность' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-xs font-bold mb-1">{label}</label>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          onClick={() => handleFieldUpdate(field, v)}
                          className={`h-9 rounded border-2 border-[var(--comic-border-color)] text-xs font-bold transition-all ${
                            (signal as any)[field] >= v ? 'bg-[#FF6B35] text-white' : 'bg-card text-muted-foreground'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Потенциал</label>
                  <div className="flex flex-wrap gap-1">
                    {['PR', 'HR', 'Продукт', 'Репутация'].map(p => (
                      <button
                        key={p}
                        onClick={() => handleFieldUpdate('potential', signal.potential?.includes(p) ? signal.potential.replace(p, '').replace(',,', ',').replace(/^,|,$/g, '') : `${signal.potential || ''},${p}`.replace(/^,/, ''))}
                        className={`text-xs px-2 py-1 rounded border-2 border-[var(--comic-border-color)] transition-all ${
                          signal.potential?.includes(p) ? 'bg-[#00C9A7] text-white' : 'bg-card text-muted-foreground'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Приоритет</label>
                  <div className="flex flex-wrap gap-1">
                    {['A', 'B', 'C', 'Отклонено'].map(p => (
                      <button
                        key={p}
                        onClick={() => handleFieldUpdate('priority', p)}
                        className={`text-xs px-3 py-1 rounded border-2 border-[var(--comic-border-color)] font-bold transition-all ${
                          signal.priority === p ? 'text-white' : 'bg-card text-muted-foreground'
                        }`}
                        style={signal.priority === p ? { backgroundColor: PRIORITY_BG[p as keyof typeof PRIORITY_BG] } : {}}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-bold mb-1">Риски и чувствительность</label>
                <textarea
                  value={signal.risks || ''}
                  onChange={e => handleFieldUpdate('risks', e.target.value)}
                  className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                  rows={2}
                  placeholder="Опишите риски..."
                />
              </div>
            </div>
          )}

          {/* Meanings - shown after evaluation */}
          {currentStep >= 3 && (
            <div className="border-2 border-[#A78BFA] rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/10">
              <h3 className="text-sm font-bold mb-3">🧠 Карта смыслов</h3>
              <div className="flex flex-wrap gap-2">
                {['ИИ', 'RecSys/Рекомендации', 'СберID', 'Персонализация и данные', 'Безопасность и доверие', 'HR-бренд/Команда', 'Технологическое лидерство и инновации'].map(m => {
                  const isActive = signal.meanings?.includes(m)
                  return (
                    <button
                      key={m}
                      onClick={() => handleFieldUpdate('meanings', isActive ? signal.meanings?.replace(m, '').replace(',,', ',').replace(/^,|,$/g, '') : `${signal.meanings || ''},${m}`.replace(/^,/, ''))}
                      className={`text-xs px-3 py-1.5 rounded-lg border-2 border-[var(--comic-border-color)] font-medium transition-all ${
                        isActive ? 'bg-[#A78BFA] text-white' : 'bg-card text-muted-foreground'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Distribution */}
          {currentStep >= 4 && (
            <div className="border-2 border-[#34D399] rounded-lg p-4 bg-green-50/50 dark:bg-green-900/10">
              <h3 className="text-sm font-bold mb-3">📡 Распределение по направлениям</h3>
              <div className="flex flex-wrap gap-2">
                {['PR', 'Маркетинг', 'Внутриком'].map(d => {
                  const isActive = signal.distribution?.includes(d)
                  return (
                    <button
                      key={d}
                      onClick={() => handleFieldUpdate('distribution', isActive ? signal.distribution?.replace(d, '').replace(',,', ',').replace(/^,|,$/g, '') : `${signal.distribution || ''},${d}`.replace(/^,/, ''))}
                      className={`text-sm px-4 py-2 rounded-lg border-2 border-[var(--comic-border-color)] font-bold transition-all ${
                        isActive ? 'bg-[#34D399] text-white' : 'bg-card text-muted-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Launch */}
          {currentStep >= 5 && (
            <div className="border-2 border-[#FF6B35] rounded-lg p-4 bg-orange-50/50 dark:bg-orange-900/10">
              <h3 className="text-sm font-bold mb-3">🚀 Запуск (публикация)</h3>
              <div className="mb-3">
                <label className="block text-xs font-bold mb-1">Тип публикации</label>
                <div className="flex flex-wrap gap-1">
                  {['Посты в соцсетях', 'Статья', 'Пресс-релиз', 'Выступление', 'Внутренняя коммуникация', 'Мероприятие/Митап', 'Реклама'].map(t => (
                    <button
                      key={t}
                      onClick={() => handleFieldUpdate('publicationType', t)}
                      className={`text-xs px-3 py-1.5 rounded-lg border-2 border-[var(--comic-border-color)] transition-all ${
                        signal.publicationType === t ? 'bg-[#FF6B35] text-white' : 'bg-card text-muted-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-bold">ИИ-контент</label>
                  <button
                    onClick={handleGenerateContent}
                    disabled={aiContentLoading}
                    className="comic-btn bg-[#00C9A7] hover:bg-[#00b896] text-white text-xs px-3 py-1"
                  >
                    {aiContentLoading ? '⏳ Генерация...' : '🤖 Сгенерировать'}
                  </button>
                </div>
                {signal.aiContent ? (
                  <div className="bg-[var(--comic-bg-alt)] border-2 border-dashed border-[#00C9A7] rounded-lg p-3">
                    <MarkdownContent content={signal.aiContent} />
                  </div>
                ) : (
                  <textarea
                    value={signal.aiContent || ''}
                    onChange={e => handleFieldUpdate('aiContent', e.target.value)}
                    className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                    rows={4}
                    placeholder="Сгенерируйте контент с помощью ИИ или напишите вручную..."
                  />
                )}
              </div>
            </div>
          )}

          {/* Measurement */}
          {currentStep >= 6 && (
            <div className="border-2 border-[#00C9A7] rounded-lg p-4 bg-teal-50/50 dark:bg-teal-900/10">
              <h3 className="text-sm font-bold mb-3">📊 Измерение и результат</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {[
                  { field: 'reach', label: 'Охват/Показы' },
                  { field: 'engagement', label: 'Вовлеченность' },
                  { field: 'mediaMentions', label: 'Упоминания в СМИ' },
                  { field: 'traffic', label: 'Переходы/Трафик' },
                  { field: 'leads', label: 'Лиды/Заявки' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-xs font-bold mb-1">{label}</label>
                    <input
                      type="number"
                      value={(signal as any)[field] || ''}
                      onChange={e => handleFieldUpdate(field, e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Влияние на бизнес</label>
                <textarea
                  value={signal.businessImpact || ''}
                  onChange={e => handleFieldUpdate('businessImpact', e.target.value)}
                  className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                  rows={2}
                  placeholder="Опишите влияние на метрики продукта/бизнеса..."
                />
              </div>
            </div>
          )}

          {/* Feedback */}
          {currentStep >= 7 && (
            <div className="border-2 border-[#FF3F8E] rounded-lg p-4 bg-pink-50/50 dark:bg-pink-900/10">
              <h3 className="text-sm font-bold mb-3">💬 Обратная связь</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">✅ Что сработало</label>
                  <textarea
                    value={signal.whatWorked || ''}
                    onChange={e => handleFieldUpdate('whatWorked', e.target.value)}
                    className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">❌ Что не сработало</label>
                  <textarea
                    value={signal.whatDidntWork || ''}
                    onChange={e => handleFieldUpdate('whatDidntWork', e.target.value)}
                    className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">💡 Новые инсайты и тренды</label>
                  <textarea
                    value={signal.newInsights || ''}
                    onChange={e => handleFieldUpdate('newInsights', e.target.value)}
                    className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="border-2 border-border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-3">💬 Комментарии ({signal.comments?.length || 0})</h3>
            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto custom-scrollbar">
              {signal.comments?.map((c: any) => (
                <div key={c.id} className="speech-bubble">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold">{c.author?.name || 'Неизвестный'}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('ru')}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              ))}
              {(!signal.comments || signal.comments.length === 0) && (
                <p className="text-sm text-muted-foreground italic">Пока нет комментариев</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="flex-1 p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)] text-foreground"
                placeholder="Написать комментарий..."
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              />
              <button onClick={handleAddComment} className="comic-btn bg-[#FF6B35] text-white px-4 py-2 text-xs shrink-0">
                →
              </button>
            </div>
          </div>

          {/* Move buttons */}
          <div className="flex gap-2 pt-2 flex-wrap">
            {currentStep > 0 && currentStep < statusSteps.length - 1 && (
              <button
                onClick={() => handleStatusChange(statusSteps[currentStep - 1])}
                className="comic-btn bg-[var(--comic-bg-hover)] hover:bg-muted text-foreground px-4 py-2 text-sm"
              >
                ← Назад
              </button>
            )}
            {currentStep < statusSteps.length - 1 && (
              <button
                onClick={() => handleStatusChange(statusSteps[currentStep + 1])}
                className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-4 py-2 text-sm"
              >
                Далее →
              </button>
            )}
            {signal.status !== 'archived' && (
              <button
                onClick={() => handleStatusChange('archived')}
                className="comic-btn bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 text-sm sm:ml-auto"
              >
                📦 В архив
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Keyboard Shortcuts Overlay
function KeyboardShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { category: '🚀 Навигация', items: [
      { keys: 'Ctrl + 1-7', desc: 'Переключение секций' },
      { keys: 'Ctrl + K', desc: 'Поиск сигналов' },
      { keys: 'Ctrl + /', desc: 'Показать эту справку' },
    ]},
    { category: '📋 Канбан', items: [
      { keys: 'Ctrl + N', desc: 'Новый сигнал' },
      { keys: 'Escape', desc: 'Закрыть модальное окно' },
    ]},
    { category: '🎨 Интерфейс', items: [
      { keys: '🌙/☀️', desc: 'Переключить тёмную тему' },
      { keys: '🔔', desc: 'Уведомления' },
      { keys: '❓', desc: 'Справка' },
    ]},
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card comic-panel max-w-lg w-full p-0 comic-pop" onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="comic-title text-xl text-[#FF6B35] flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Горячие клавиши
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl transition-colors">✕</button>
          </div>

          <div className="space-y-4">
            {shortcuts.map(({ category, items }) => (
              <div key={category}>
                <h3 className="text-sm font-bold mb-2 text-foreground">{category}</h3>
                <div className="space-y-1.5">
                  {items.map(({ keys, desc }) => (
                    <div key={keys} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[var(--comic-bg-alt)]">
                      <span className="text-xs text-muted-foreground">{desc}</span>
                      <div className="flex gap-1">
                        {keys.split(' + ').map((key, i) => (
                          <span key={i} className="flex items-center">
                            {i > 0 && <span className="text-[10px] text-muted-foreground mx-0.5">+</span>}
                            <kbd className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--comic-border-color)] text-white border border-white/10 comic-shadow-sm">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-3 border-t border-border text-center">
            <p className="text-[10px] text-muted-foreground">
              Нажмите <kbd className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--comic-border-color)] text-white">Esc</kbd> чтобы закрыть
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Check, ExternalLink, Link2, Loader2, Newspaper, Pencil, Plus, RefreshCw, Send, Trash2, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { MarkdownContent } from '@/components/markdown-content'
import { cn } from '@/lib/utils'

type NewsItem = {
  id: string
  sourceUrl: string
  sourceName: string
  title: string
  description?: string
  excerpt: string
  url: string
}

type SourceResult = {
  sourceUrl: string
  sourceName: string
  items: NewsItem[]
  error?: string
}

const DEFAULT_SOURCES = [
  'https://news.mail.ru/politics/71135364/',
]

function normalizeSource(value: string) {
  const source = value.trim()
  if (!source) return ''

  try {
    return new URL(source).toString()
  } catch {
    try {
      return new URL(`https://${source}`).toString()
    } catch {
      return ''
    }
  }
}

export function NewsFeedSection() {
  const { currentUser, signals, setSignals, setActiveSection } = useAppStore()
  const [sources, setSources] = useState(DEFAULT_SOURCES)
  const [sourceInput, setSourceInput] = useState('')
  const [items, setItems] = useState<NewsItem[]>([])
  const [results, setResults] = useState<SourceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingUrl, setCreatingUrl] = useState<string | null>(null)
  const [editingSource, setEditingSource] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const key = item.sourceName || 'Источник'
      acc[key] = acc[key] || []
      acc[key].push(item)
      return acc
    }, {} as Record<string, NewsItem[]>)
  }, [items])

  const addSource = (value = sourceInput) => {
    const normalized = normalizeSource(value)
    if (!normalized) {
      toast({
        title: 'Некорректная ссылка',
        description: 'Вставьте URL новости или новостного раздела',
        variant: 'destructive',
      })
      return
    }

    if (sources.includes(normalized)) {
      setSourceInput('')
      return
    }

    setSources(prev => [...prev, normalized])
    setSourceInput('')
  }

  const removeSource = (source: string) => {
    setSources(prev => prev.filter(item => item !== source))
    if (editingSource === source) {
      setEditingSource(null)
      setEditingValue('')
    }
  }

  const startEditSource = (source: string) => {
    setEditingSource(source)
    setEditingValue(source)
  }

  const cancelEditSource = () => {
    setEditingSource(null)
    setEditingValue('')
  }

  const saveEditSource = () => {
    if (!editingSource) return

    const normalized = normalizeSource(editingValue)
    if (!normalized) {
      toast({
        title: 'Некорректная ссылка',
        description: 'Вставьте URL новости или новостного раздела',
        variant: 'destructive',
      })
      return
    }

    const alreadyExists = sources.some(source => source === normalized && source !== editingSource)
    if (alreadyExists) {
      toast({
        title: 'Источник уже есть',
        description: 'Такая ссылка уже добавлена в список',
      })
      cancelEditSource()
      return
    }

    setSources(prev => prev.map(source => source === editingSource ? normalized : source))
    cancelEditSource()
  }

  const parseNews = async () => {
    if (sources.length === 0) {
      toast({
        title: 'Добавьте источники',
        description: 'Вставьте ссылки на новости или страницы новостных разделов',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/news-feed/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: 'Не удалось собрать новости',
          description: data.error || 'Проверьте ссылки на источники',
          variant: 'destructive',
        })
        return
      }

      setItems(data.items || [])
      setResults(data.results || [])
      toast({
        title: 'Новостной поток обновлён',
        description: `Найдено новостей: ${(data.items || []).length}`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Не удалось собрать новости',
        description: 'Локальный API не ответил',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createSignal = async (item: NewsItem) => {
    setCreatingUrl(item.url)
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          content: item.excerpt,
          link: item.url,
          source: 'Тренды/Рынок',
          signalType: 'Новость',
          status: 'input',
          assigneeId: currentUser?.id || null,
        }),
      })

      if (!res.ok) {
        toast({
          title: 'Сигнал не создан',
          description: 'Не удалось сохранить новость в канбан',
          variant: 'destructive',
        })
        return
      }

      const signal = await res.json()
      setSignals([signal, ...signals])
      toast({
        title: 'Новость добавлена в сигналы',
        description: item.title,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Сигнал не создан',
        description: 'Локальный API не ответил',
        variant: 'destructive',
      })
    } finally {
      setCreatingUrl(null)
    }
  }

  const removeItem = (url: string) => {
    setItems(prev => prev.filter(item => item.url !== url))
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-5">
      <section className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#00C9A7]" />
              Новостной поток
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Добавьте ссылки на конкретные новости или страницы новостных разделов. После парсинга материалы будут приведены к единому виду.
            </p>
          </div>
          <button
            onClick={parseNews}
            disabled={loading}
            className="comic-btn bg-[#00C9A7] hover:bg-[#00b896] text-white px-4 py-2 text-sm flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Собрать новости
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_1fr] gap-4">
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Источники
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={sourceInput}
                  onChange={event => setSourceInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addSource()
                    }
                  }}
                  className="w-full h-10 pl-9 pr-3 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)] text-foreground focus:outline-none focus:border-[#00C9A7]"
                  placeholder="news.mail.ru/politics/ или ссылка на новость"
                />
              </div>
              <button
                type="button"
                onClick={() => addSource()}
                className="comic-btn bg-[#00C9A7] hover:bg-[#00b896] text-white h-10 px-3 inline-flex items-center gap-2"
                title="Добавить источник"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Добавить</span>
              </button>
            </div>
            <div className="min-h-28 rounded-lg border border-[var(--comic-border-color)]/15 bg-[var(--comic-bg-hover)] p-2 space-y-2">
              {sources.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-xs text-muted-foreground text-center">
                  Источники пока не добавлены
                </div>
              ) : (
                sources.map(source => {
                  const sourceName = (() => {
                    try {
                      return new URL(source).hostname.replace(/^www\./, '')
                    } catch {
                      return source
                    }
                  })()
                  return (
                    <div key={source} className="flex items-center gap-2 rounded-md bg-[var(--comic-bg)] border border-[var(--comic-border-color)]/10 px-2 py-2">
                      <Link2 className="w-3.5 h-3.5 text-[#00C9A7] flex-shrink-0" />
                      {editingSource === source ? (
                        <>
                          <input
                            value={editingValue}
                            onChange={event => setEditingValue(event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                saveEditSource()
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                cancelEditSource()
                              }
                            }}
                            className="min-w-0 flex-1 h-8 px-2 rounded border border-[var(--comic-border-color)]/25 bg-[var(--comic-input-bg)] text-xs focus:outline-none focus:border-[#00C9A7]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={saveEditSource}
                            className="text-muted-foreground hover:text-[#00C9A7] p-1"
                            title="Сохранить"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditSource}
                            className="text-muted-foreground hover:text-[#EF4444] p-1"
                            title="Отменить"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{sourceName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{source}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditSource(source)}
                            className="text-muted-foreground hover:text-[#00C9A7] p-1"
                            title="Редактировать источник"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSource(source)}
                            className="text-muted-foreground hover:text-[#EF4444] p-1"
                            title="Удалить источник"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{sources.length} источников</span>
              <button
                onClick={() => setSources([])}
                className="inline-flex items-center gap-1 hover:text-foreground"
                type="button"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Очистить
              </button>
            </div>
          </div>

          <div className="bg-[var(--comic-bg-hover)] rounded-lg border border-[var(--comic-border-color)]/15 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-2xl font-bold text-[#00C9A7]">{items.length}</p>
                <p className="text-xs text-muted-foreground">новостей</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#FF6B35]">{Object.keys(groupedItems).length}</p>
                <p className="text-xs text-muted-foreground">источников с новостями</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#EF4444]">{results.filter(result => result.error).length}</p>
                <p className="text-xs text-muted-foreground">ошибок</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#A78BFA]">{sources.length}</p>
                <p className="text-xs text-muted-foreground">в очереди</p>
              </div>
            </div>

            {results.some(result => result.error) && (
              <div className="mt-4 space-y-2">
                {results.filter(result => result.error).map(result => (
                  <div key={result.sourceUrl} className="text-xs rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/5 p-2">
                    <span className="font-bold text-[#EF4444]">{result.sourceName}: </span>
                    <span className="text-muted-foreground">{result.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="bg-[var(--comic-bg)] comic-border p-8 text-center text-muted-foreground">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-35" />
          <p className="text-sm font-medium">Поток пока пуст</p>
          <p className="text-xs mt-1">Добавьте источники и нажмите “Собрать новости”.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedItems).map(([sourceName, sourceItems]) => (
            <section key={sourceName} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{sourceName}</h3>
                <span className="text-xs text-muted-foreground">{sourceItems.length}</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {sourceItems.map(item => (
                  <article
                    key={item.url}
                    className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-bold leading-snug hover:text-[#00C9A7]"
                        >
                          {item.title}
                        </a>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.sourceName}</span>
                          <span>•</span>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                            открыть
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.url)}
                        className="text-muted-foreground hover:text-[#EF4444] p-1"
                        title="Убрать из потока"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.description && item.description !== item.excerpt && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}

                    <MarkdownContent content={item.excerpt} className="text-muted-foreground line-clamp-5" />

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => createSignal(item)}
                        disabled={creatingUrl === item.url}
                        className={cn(
                          "comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-3 py-1.5 text-xs inline-flex items-center gap-2",
                          creatingUrl === item.url && "opacity-70"
                        )}
                      >
                        {creatingUrl === item.url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        В сигнал
                      </button>
                      <button
                        type="button"
                        onClick={() => addSource(item.url)}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        добавить как источник
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

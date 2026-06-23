'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, History, Inbox, MessageCircle, RefreshCw, RotateCcw, Send, Sparkles, Trash2 } from 'lucide-react'
import { useAppStore, type IncomingNews, type Signal } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

const STATUS_LABELS: Record<string, string> = {
  new: 'Новые',
  converted: 'В канбане',
  duplicate: 'Дубли',
  ignored: 'Скрытые',
}

const SOURCE_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  manual: 'Вручную',
  parser: 'Парсер',
  rss: 'RSS',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSender(item: IncomingNews) {
  if (item.telegramUsername) return `@${item.telegramUsername}`
  return [item.telegramFirstName, item.telegramLastName].filter(Boolean).join(' ') || 'Источник не указан'
}

function splitValues(value: string | null) {
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : []
}

function decisionLabel(action: string) {
  const labels: Record<string, string> = {
    created: 'Добавлено',
    auto_analyzed: 'AI-предразбор',
    auto_analysis_failed: 'Ошибка AI',
    marked_duplicate: 'Найден дубль',
    converted: 'В канбан',
    ignored: 'Скрыто',
    restored: 'Возвращено',
    edited: 'Изменено',
  }
  return labels[action] || action
}

export function IncomingNewsSection() {
  const { incomingNews, setIncomingNews, updateIncomingNews, signals, setSignals, setSelectedSignalId } = useAppStore()
  const [activeStatus, setActiveStatus] = useState<string>('new')
  const [loading, setLoading] = useState(false)
  const [bulkConverting, setBulkConverting] = useState(false)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const counts = useMemo(() => {
    return incomingNews.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})
  }, [incomingNews])

  const visibleItems = useMemo(() => {
    return incomingNews.filter(item => activeStatus === 'all' || item.status === activeStatus)
  }, [incomingNews, activeStatus])

  const convertibleItems = useMemo(() => {
    return incomingNews.filter(item => item.status === 'new' && !item.signalId)
  }, [incomingNews])

  const loadIncomingNews = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/incoming-news')
      if (res.ok) {
        setIncomingNews(await res.json())
      }
    } catch (err) {
      console.error('Failed to load incoming news:', err)
      toast({ title: 'Не удалось обновить входящие', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const convertToSignal = async (item: IncomingNews) => {
    setConvertingId(item.id)
    try {
      const res = await fetch(`/api/incoming-news/${item.id}/convert`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Не удалось отправить новость в канбан')
      }

      const data = await res.json()
      updateIncomingNews(data.incomingNews)
      if (!signals.some(signal => signal.id === data.signal.id)) {
        setSignals([data.signal, ...signals])
      }
      setSelectedSignalId(data.signal.id)
      toast({ title: 'Новость отправлена в канбан', description: data.signal.title })
    } catch (err) {
      console.error('Failed to convert incoming news:', err)
      toast({
        title: 'Не удалось отправить в канбан',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setConvertingId(null)
    }
  }

  const convertAllToSignals = async () => {
    if (convertibleItems.length === 0) return

    setBulkConverting(true)
    try {
      const results: Array<{ incomingNews: IncomingNews; signal: Signal }> = []
      const failed: string[] = []

      for (const item of convertibleItems) {
        try {
          const res = await fetch(`/api/incoming-news/${item.id}/convert`, { method: 'POST' })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Не удалось отправить новость в канбан')
          }
          results.push(await res.json())
        } catch (err) {
          console.error('Failed to convert incoming news:', err)
          failed.push(item.title)
        }
      }

      if (results.length > 0) {
        const updatedIncomingById = new Map(results.map(result => [result.incomingNews.id, result.incomingNews]))
        const newSignals = results
          .map(result => result.signal)
          .filter(signal => !signals.some(existing => existing.id === signal.id))

        setIncomingNews(incomingNews.map(item => updatedIncomingById.get(item.id) || item))
        setSignals([...newSignals, ...signals])
      }

      toast({
        title: failed.length > 0 ? 'Часть новостей отправлена в канбан' : 'Все входящие добавлены в канбан',
        description: failed.length > 0
          ? `Готово: ${results.length}, не получилось: ${failed.length}`
          : `Создано сигналов: ${results.length}`,
        variant: failed.length > 0 ? 'destructive' : undefined,
      })
    } finally {
      setBulkConverting(false)
    }
  }

  const analyzeIncoming = async (item: IncomingNews) => {
    setAnalyzingId(item.id)
    try {
      const res = await fetch(`/api/incoming-news/${item.id}/analyze`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Не удалось разобрать входящую новость')
      }

      updateIncomingNews(await res.json())
      toast({ title: 'Предразбор обновлён', description: item.title })
    } catch (err) {
      console.error('Failed to analyze incoming news:', err)
      toast({
        title: 'Не удалось разобрать входящую',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setAnalyzingId(null)
    }
  }

  const updateIncomingStatus = async (item: IncomingNews, status: string, note: string) => {
    setUpdatingId(item.id)
    try {
      const res = await fetch(`/api/incoming-news/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Не удалось обновить входящую новость')
      }

      updateIncomingNews(await res.json())
      toast({ title: status === 'ignored' ? 'Новость скрыта' : 'Новость возвращена' })
    } catch (err) {
      console.error('Failed to update incoming news:', err)
      toast({
        title: 'Не удалось обновить входящую',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-card comic-border comic-shadow-sm px-3 py-1.5">
          <Inbox className="w-4 h-4 text-[#FF6B35]" />
          <span className="text-sm font-bold">{counts.new || 0}</span>
          <span className="text-xs text-muted-foreground">новых</span>
        </div>
        <div className="flex items-center gap-2 bg-card comic-border comic-shadow-sm px-3 py-1.5">
          <Send className="w-4 h-4 text-[#00C9A7]" />
          <span className="text-sm font-bold text-[#00C9A7]">{counts.converted || 0}</span>
          <span className="text-xs text-muted-foreground">в канбане</span>
        </div>
        <button
          type="button"
          onClick={loadIncomingNews}
          className="ml-auto comic-btn bg-card text-foreground text-xs px-3 py-2 flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Обновить
        </button>
        <button
          type="button"
          onClick={convertAllToSignals}
          className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-xs px-3 py-2 flex items-center gap-1.5"
          disabled={bulkConverting || convertibleItems.length === 0}
          title={convertibleItems.length === 0 ? 'Нет новых входящих для добавления' : 'Отправить все новые входящие в канбан'}
        >
          <Send className="w-3.5 h-3.5" />
          {bulkConverting ? 'Добавляем...' : `Добавить все${convertibleItems.length ? ` (${convertibleItems.length})` : ''}`}
        </button>
      </div>

      <div className="flex sm:p-4 items-center gap-2 overflow-x-auto pb-1">
        {['new', 'converted', 'duplicate', 'ignored', 'all'].map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveStatus(status)}
            className={cn(
              "whitespace-nowrap rounded-lg border-2 border-[var(--comic-border-color)] px-3 py-1.5 text-xs font-bold transition-colors",
              activeStatus === status ? "bg-[#FF6B35] text-white comic-shadow-sm" : "bg-card text-muted-foreground hover:bg-[var(--comic-bg-hover)]"
            )}
          >
            {status === 'all' ? 'Все' : STATUS_LABELS[status]}
            <span className="ml-1 opacity-70">{status === 'all' ? incomingNews.length : counts[status] || 0}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {visibleItems.map(item => (
          <article key={item.id} className="bg-card comic-border comic-shadow-sm rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-9 w-9 flex-shrink-0 rounded-lg border-2 border-[var(--comic-border-color)] bg-[#FF6B35]/10 flex items-center justify-center">
                {item.source === 'telegram' ? <MessageCircle className="h-5 w-5 text-[#00A7E1]" /> : <Sparkles className="h-5 w-5 text-[#FF6B35]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-[var(--comic-tag-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--comic-tag-text)]">
                    {SOURCE_LABELS[item.source] || item.source}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                  {item.status !== 'new' && (
                    <span className="rounded bg-[#00C9A7]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#00A7E1]">
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold leading-snug">{item.title}</h3>
                {item.status === 'duplicate' && (
                  <div className="mt-2 rounded-lg border-2 border-[#FBBF24] bg-[#FBBF24]/10 px-3 py-2">
                    <p className="text-xs font-bold text-[#92400E]">
                      Похоже на дубль{item.duplicateScore ? ` (${item.duplicateScore}%)` : ''}
                    </p>
                    {item.duplicateReason && (
                      <p className="mt-1 text-[11px] leading-relaxed text-[#92400E]">{item.duplicateReason}</p>
                    )}
                    {item.duplicateOf && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Оригинал: {item.duplicateOf.title}</p>
                    )}
                  </div>
                )}
                {item.content && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {item.content}
                  </p>
                )}

                {(item.aiSummary || item.aiPriority || item.aiSignalType || item.aiMeanings) && (
                  <div className="mt-3 rounded-lg border-2 border-[#00C9A7]/50 bg-[#00C9A7]/5 px-3 py-2">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded bg-[#00C9A7] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        <Sparkles className="h-3 w-3" />
                        Предразбор
                      </span>
                      {item.aiPriority && (
                        <span className="rounded bg-[#FF6B35]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#FF6B35]">
                          Приоритет {item.aiPriority}
                        </span>
                      )}
                      {item.aiSignalType && (
                        <span className="rounded bg-[var(--comic-tag-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--comic-tag-text)]">
                          {item.aiSignalType}
                        </span>
                      )}
                    </div>
                    {item.aiSummary && (
                      <p className="text-xs leading-relaxed text-foreground">{item.aiSummary}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {splitValues(item.aiMeanings).slice(0, 3).map(value => (
                        <span key={value} className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {value}
                        </span>
                      ))}
                      {splitValues(item.aiDistribution).map(value => (
                        <span key={value} className="rounded bg-[#00A7E1]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#00A7E1]">
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{getSender(item)}</span>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B35] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Открыть ссылку
                    </a>
                  )}
                </div>

                {item.decisionHistory && item.decisionHistory.length > 0 && (
                  <details className="mt-3">
                    <summary className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground">
                      <History className="h-3 w-3" />
                      История решений
                    </summary>
                    <div className="mt-2 space-y-1.5 border-l-2 border-[var(--comic-border-color)] pl-3">
                      {item.decisionHistory.slice(0, 5).map(entry => (
                        <div key={entry.id} className="text-[10px] leading-relaxed text-muted-foreground">
                          <span className="font-bold text-foreground">{decisionLabel(entry.action)}</span>
                          <span> · {entry.actor} · {formatDate(entry.createdAt)}</span>
                          {entry.note && <div>{entry.note}</div>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                  onClick={() => analyzeIncoming(item)}
                  disabled={bulkConverting || analyzingId === item.id || item.status === 'converted'}
                className="comic-btn bg-[#00C9A7] hover:bg-[#00b896] text-white px-3 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {analyzingId === item.id ? 'Разбор...' : 'Разобрать'}
              </button>
              {item.signalId ? (
                <button
                  type="button"
                  onClick={() => item.signalId && setSelectedSignalId(item.signalId)}
                  className="comic-btn bg-[var(--comic-bg-hover)] text-foreground px-3 py-2 text-xs"
                >
                  Открыть сигнал
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => convertToSignal(item)}
                  disabled={bulkConverting || convertingId === item.id || item.status === 'duplicate' || item.status === 'ignored'}
                  className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-3 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {convertingId === item.id ? 'Отправляем...' : 'В канбан'}
                </button>
              )}
              {item.status === 'ignored' || item.status === 'duplicate' ? (
                <button
                  type="button"
                  onClick={() => updateIncomingStatus(item, 'new', 'Вернули во входящие')}
                  disabled={bulkConverting || updatingId === item.id}
                  className="comic-btn bg-card text-foreground px-3 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Вернуть
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateIncomingStatus(item, 'ignored', 'Скрыли из входящих')}
                  disabled={bulkConverting || updatingId === item.id || item.status === 'converted'}
                  className="comic-btn bg-[var(--comic-bg-hover)] text-foreground px-3 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Скрыть
                </button>
              )}
            </div>
          </article>
        ))}

        {visibleItems.length === 0 && (
          <div className="xl:col-span-2 rounded-xl border-2 border-dashed border-[var(--comic-border-color)] bg-[var(--comic-column-bg)] py-16 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-bold text-muted-foreground">В этой папке пока пусто</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Новые сообщения из Telegram появятся здесь.</p>
          </div>
        )}
      </div>
    </div>
  )
}

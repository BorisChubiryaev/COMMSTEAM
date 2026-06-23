'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Plus, ChevronLeft, ChevronRight, MapPin, Clock, Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'

const EVENT_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  'Мероприятие': { bg: '#FF6B35', border: '#FF6B35', dot: '#FF6B35' },
  'Митап': { bg: '#00C9A7', border: '#00C9A7', dot: '#00C9A7' },
  'Выступление': { bg: '#A78BFA', border: '#A78BFA', dot: '#A78BFA' },
  'Встреча': { bg: '#FBBF24', border: '#FBBF24', dot: '#FBBF24' },
}

export function CalendarSection() {
  const { events, setEvents, contacts } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [contactDrafts, setContactDrafts] = useState<Record<string, string>>({})

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getEventsForDate = (date: Date) => {
    return events.filter(e => isSameDay(new Date(e.date), date))
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const updateEventContacts = async (eventId: string, contactIds: string[]) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      })
      if (res.ok) {
        const updated = await res.json()
        setEvents(events.map(event => event.id === updated.id ? updated : event))
        setContactDrafts(drafts => ({ ...drafts, [eventId]: '' }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Calendar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="comic-title text-xl sm:text-2xl text-foreground">
            📅 {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="comic-btn bg-[var(--comic-bg)] text-sm px-2 py-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="comic-btn bg-[#FF6B35] text-white text-xs px-3 py-1"
            >
              Сегодня
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="comic-btn bg-[var(--comic-bg)] text-sm px-2 py-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-[var(--comic-bg)] comic-border comic-shadow rounded-xl overflow-hidden min-h-[430px]">
          {/* Week days header */}
          <div className="grid grid-cols-7 border-b-2 border-[var(--comic-border-color)]">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-[10px] font-bold text-foreground bg-[var(--comic-bg-hover)] border-r border-[var(--comic-border-color)]/30 last:border-r-0 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayEvents = getEventsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const today = isToday(day)

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-[54px] sm:min-h-[70px] p-1 sm:p-1.5 border border-[var(--comic-border-color)]/20 cursor-pointer transition-all hover:bg-[var(--comic-bg-hover)]",
                    !isCurrentMonth && "bg-[var(--comic-bg-hover)]/50 opacity-40",
                    isSelected && "bg-[#FF6B35]/5 ring-2 ring-[#FF6B35] ring-inset",
                    today && "bg-[#FF6B35]/5"
                  )}
                >
                  <div className={cn(
                    "text-[10px] sm:text-[11px] font-bold mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full",
                    today && "bg-[#FF6B35] text-white",
                    !today && isCurrentMonth && "text-foreground",
                    !today && !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 1).map(event => {
                      const colors = EVENT_COLORS[event.type || ''] || EVENT_COLORS['Встреча']
                      return (
                        <div
                          key={event.id}
                          className="hidden sm:block text-[8px] px-1 py-0.5 rounded truncate text-white font-medium"
                          style={{ backgroundColor: colors.bg }}
                        >
                          {event.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 0 && (
                      <div className="sm:hidden flex gap-0.5 pl-0.5">
                        {dayEvents.slice(0, 3).map(event => {
                          const colors = EVENT_COLORS[event.type || ''] || EVENT_COLORS['Встреча']
                          return <span key={event.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
                        })}
                      </div>
                    )}
                    {dayEvents.length > 1 && (
                      <div className="hidden sm:block text-[8px] text-muted-foreground pl-1 font-bold">+{dayEvents.length - 1}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        {selectedDate && (
          <div className="mt-4">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#FF6B35] rounded flex items-center justify-center text-white text-[10px]">📋</span>
              События на {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </h3>
            {getEventsForDate(selectedDate).length === 0 ? (
              <div className="bg-[var(--comic-bg)] comic-border p-4 text-center text-muted-foreground text-sm">
                <p className="text-2xl mb-1">🗓️</p>
                Нет событий на эту дату
              </div>
            ) : (
              <div className="space-y-2">
                {getEventsForDate(selectedDate).map(event => {
                  const colors = EVENT_COLORS[event.type || ''] || EVENT_COLORS['Встреча']
                  return (
                    <div key={event.id} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-3 flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0" style={{ backgroundColor: colors.dot }} />
                      <div className="flex-1">
                        <p className="text-sm font-bold">{event.title}</p>
                        {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5">
                          {event.location && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{event.location}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{format(new Date(event.date), 'HH:mm')}
                          </span>
                        </div>
                        <div className="mt-3 rounded-lg border border-[var(--comic-border-color)]/20 bg-[var(--comic-bg-hover)]/50 p-2">
                          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                            <UsersIcon className="h-3 w-3" />
                            Участники и упоминания
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(event.contacts || []).length === 0 ? (
                              <span className="text-[10px] text-muted-foreground italic">Пока не связаны контакты</span>
                            ) : (
                              (event.contacts || []).map(contact => (
                                <button
                                  key={contact.id}
                                  type="button"
                                  onClick={() => updateEventContacts(event.id, (event.contacts || []).filter(item => item.id !== contact.id).map(item => item.id))}
                                  className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] font-medium text-[#3B82F6] hover:bg-[#3B82F6]/20"
                                  title="Убрать связь"
                                >
                                  {contact.name} ×
                                </button>
                              ))
                            )}
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <select
                              value={contactDrafts[event.id] || ''}
                              onChange={e => setContactDrafts(drafts => ({ ...drafts, [event.id]: e.target.value }))}
                              className="min-w-0 flex-1 rounded-md border border-[var(--comic-border-color)] bg-[var(--comic-input-bg)] px-2 py-1 text-xs"
                            >
                              <option value="">Добавить контакт...</option>
                              {contacts
                                .filter(contact => !(event.contacts || []).some(linked => linked.id === contact.id))
                                .map(contact => (
                                  <option key={contact.id} value={contact.id}>
                                    {contact.name}{contact.company ? ` · ${contact.company}` : ''}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={!contactDrafts[event.id]}
                              onClick={() => updateEventContacts(event.id, [...(event.contacts || []).map(contact => contact.id), contactDrafts[event.id]])}
                              className="comic-btn bg-[#3B82F6] text-white px-2 py-1 text-xs disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <span className={cn("self-start text-[10px] px-2 py-0.5 rounded-full border font-medium",
                        event.status === 'planned' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                        event.status === 'confirmed' && "bg-green-50 text-green-700 border-green-200",
                        event.status === 'completed' && "bg-[var(--comic-bg-hover)] text-muted-foreground border-[var(--comic-border-color)]/30",
                      )}>
                        {event.status === 'planned' ? 'Запланировано' : event.status === 'confirmed' ? 'Подтверждено' : event.status === 'completed' ? 'Завершено' : event.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar - Upcoming Events */}
      <div className="lg:w-72 space-y-4">
        <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#00C9A7] rounded flex items-center justify-center text-white text-[10px]">🗓</span>
            Ближайшие события
          </h3>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">Нет предстоящих событий</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(event => {
                const colors = EVENT_COLORS[event.type || ''] || EVENT_COLORS['Встреча']
                return (
                  <div key={event.id} className="p-2 rounded-lg border-2 border-[var(--comic-border-color)]/20 hover:border-[#FF6B35]/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.dot }} />
                      <p className="text-xs font-bold truncate">{event.title}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground ml-4">
                      <span>{format(new Date(event.date), 'd MMM', { locale: ru })}</span>
                      {event.location && <span>· {event.location}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowNewEvent(true)}
          className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white w-full py-3 text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Новое событие
        </button>
      </div>

      {/* New Event Form */}
      {showNewEvent && (
        <NewEventModal onClose={() => setShowNewEvent(false)} defaultDate={selectedDate} />
      )}
    </div>
  )
}

function NewEventModal({ onClose, defaultDate }: { onClose: () => void; defaultDate: Date | null }) {
  const { setEvents } = useAppStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Мероприятие')
  const [responsible, setResponsible] = useState('')
  const [tentative, setTentative] = useState(false)
  const [dateText, setDateText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          date: new Date(`${date}T${time}`).toISOString(),
          location,
          type,
          status: 'planned',
          responsible: responsible || null,
          tentative,
          dateText: tentative ? (dateText || null) : null,
        }),
      })
      if (res.ok) {
        const eventsRes = await fetch('/api/events')
        if (eventsRes.ok) setEvents(await eventsRes.json())
        onClose()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[var(--comic-bg)] comic-border comic-shadow-lg max-w-md w-full p-4 sm:p-6 max-h-[92dvh] overflow-y-auto custom-scrollbar rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
        <h2 className="comic-title text-xl text-[#FF6B35] mb-4">📅 Новое событие</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="Название события *" required />
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="Описание" rows={2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold block mb-1">Дата</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" />
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-1">Время</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" />
            </div>
          </div>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="📍 Место" />
          <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="🧑 Ответственный (для отчёта)" />
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input type="checkbox" checked={tentative} onChange={e => setTentative(e.target.checked)} className="w-4 h-4 accent-[#FF6B35]" />
            Предварительная дата
          </label>
          {tentative && (
            <input type="text" value={dateText} onChange={e => setDateText(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="Дата текстом, напр. «Август ??»" />
          )}
          <div>
            <label className="text-[10px] font-bold block mb-1">Тип</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(EVENT_COLORS).map(([t, c]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn("text-xs px-3 py-1.5 rounded-lg border-2 border-[var(--comic-border-color)] font-medium transition-all",
                    type === t ? "text-white" : "bg-[var(--comic-bg)] text-muted-foreground"
                  )}
                  style={type === t ? { backgroundColor: c.bg } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button type="submit" className="comic-btn bg-[#FF6B35] text-white px-4 py-2 text-sm">Создать</button>
            <button type="button" onClick={onClose} className="comic-btn bg-[var(--comic-tag-bg)] text-foreground px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      </div>
    </div>
  )
}

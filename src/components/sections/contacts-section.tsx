'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Plus, Search, Phone, Mail, MessageCircle, Building2, Tag, MessageSquare, Send } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const TAG_COLORS: Record<string, string> = {
  'СМИ': '#3B82F6',
  'Журналисты': '#3B82F6',
  'Технологии': '#A78BFA',
  'Внутренний': '#4ECB71',
  'Руководство': '#F59E0B',
  'Партнёр': '#FF6B35',
}

export function ContactsSection() {
  const { contacts, setContacts, currentUser } = useAppStore()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.tags?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase())
  )

  const contact = selectedContact ? contacts.find(c => c.id === selectedContact) : null

  const handleAddComment = async () => {
    if (!newComment || !contact || !currentUser) return
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          authorId: currentUser.id,
          contactId: contact.id,
        }),
      })
      setNewComment('')
      const contactsRes = await fetch('/api/contacts')
      if (contactsRes.ok) setContacts(await contactsRes.json())
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)]"
            placeholder="Поиск по имени, компании, тегу..."
          />
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="comic-btn bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-4 py-2 text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Контакт
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Contact List */}
        <div className={cn("space-y-2 overflow-y-auto custom-scrollbar pr-1", contact ? "w-1/3" : "w-full")}>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-2">👤</p>
              <p className="text-sm font-medium">Контактов пока нет</p>
              <p className="text-xs mt-1">Добавьте первый контакт</p>
              <button onClick={() => setShowNew(true)} className="comic-btn bg-[#FF6B35] text-white text-xs px-3 py-1.5 mt-3">
                + Добавить
              </button>
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedContact(selectedContact === c.id ? null : c.id)}
                className={cn(
                  "bg-[var(--comic-bg)] comic-border p-3 cursor-pointer transition-all hover:scale-[1.01] comic-shadow-sm",
                  selectedContact === c.id && "ring-2 ring-[#FF6B35] bg-[var(--comic-bg-alt)]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-[var(--comic-border-color)] flex-shrink-0">
                    <AvatarFallback className="bg-[#00C9A7] text-white text-sm font-bold">
                      {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{c.name}</p>
                    <div className="flex items-center gap-1">
                      {c.company && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          {c.company}
                        </span>
                      )}
                      {c.role && (
                        <span className="text-[10px] text-muted-foreground truncate">· {c.role}</span>
                      )}
                    </div>
                  </div>
                  {/* Quick action buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    {c.email && (
                      <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="w-6 h-6 bg-[#3B82F6]/10 rounded flex items-center justify-center text-[#3B82F6] hover:bg-[#3B82F6]/20 transition-colors">
                        <Mail className="w-3 h-3" />
                      </a>
                    )}
                    {c.telegram && (
                      <a href={`https://t.me/${c.telegram.replace('@', '')}`} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="w-6 h-6 bg-[#00C9A7]/10 rounded flex items-center justify-center text-[#00C9A7] hover:bg-[#00C9A7]/20 transition-colors">
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                {c.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.split(',').filter(Boolean).map((tag, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{
                        backgroundColor: (TAG_COLORS[tag.trim()] || '#FF6B35') + '15',
                        color: TAG_COLORS[tag.trim()] || '#FF6B35',
                      }}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Detail */}
        {contact && (
          <div className="flex-1 bg-[var(--comic-bg)] comic-border comic-shadow p-5 overflow-y-auto custom-scrollbar">
            <div className="flex items-start gap-4 mb-5">
              <Avatar className="w-16 h-16 border-3 border-[var(--comic-border-color)] flex-shrink-0">
                <AvatarFallback className="bg-[#00C9A7] text-white text-xl font-bold">
                  {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="comic-title text-xl text-foreground">{contact.name}</h3>
                {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
                {contact.company && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {contact.company}
                  </p>
                )}
              </div>
            </div>

            {/* Contact Info Cards */}
            <div className="space-y-2 mb-5">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-2.5 rounded-lg border-2 border-[#3B82F6]/20 bg-[#3B82F6]/5 hover:bg-[#3B82F6]/10 transition-colors group">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Email</p>
                    <p className="text-sm text-[#3B82F6] group-hover:underline">{contact.email}</p>
                  </div>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-2.5 rounded-lg border-2 border-[#4ECB71]/20 bg-[#4ECB71]/5 hover:bg-[#4ECB71]/10 transition-colors">
                  <div className="w-8 h-8 bg-[#4ECB71] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Телефон</p>
                    <p className="text-sm">{contact.phone}</p>
                  </div>
                </a>
              )}
              {contact.telegram && (
                <a href={`https://t.me/${contact.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg border-2 border-[#00C9A7]/20 bg-[#00C9A7]/5 hover:bg-[#00C9A7]/10 transition-colors">
                  <div className="w-8 h-8 bg-[#00C9A7] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Telegram</p>
                    <p className="text-sm text-[#00C9A7]">{contact.telegram}</p>
                  </div>
                </a>
              )}
            </div>

            {/* Tags */}
            {contact.tags && (
              <div className="mb-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Теги
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.split(',').filter(Boolean).map((tag, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium border" style={{
                      backgroundColor: (TAG_COLORS[tag.trim()] || '#FF6B35') + '10',
                      color: TAG_COLORS[tag.trim()] || '#FF6B35',
                      borderColor: (TAG_COLORS[tag.trim()] || '#FF6B35') + '30',
                    }}>
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div className="mb-5 bg-[var(--comic-bg-alt)] border-2 border-dashed border-[#FF6B35] rounded-xl p-4">
                <p className="text-[10px] font-bold text-[#FF6B35] uppercase mb-1">📝 Заметки</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            {/* Comments */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Комментарии ({contact.comments?.length || 0})
              </p>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto custom-scrollbar">
                {contact.comments?.map((c: any) => (
                  <div key={c.id} className="bg-[var(--comic-bg-hover)] rounded-lg p-2.5 border border-[var(--comic-border-color)]/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-4 h-4 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-[7px] font-bold">
                        {c.author?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <span className="text-[10px] font-bold">{c.author?.name || 'Неизвестный'}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('ru')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.content}</p>
                  </div>
                ))}
                {(!contact.comments || contact.comments.length === 0) && (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Нет комментариев</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-xs focus:outline-none focus:border-[#FF6B35] bg-[var(--comic-input-bg)]"
                  placeholder="Комментарий..."
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment} className="comic-btn bg-[#FF6B35] text-white px-3 py-1 text-xs flex items-center gap-1">
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Contact Modal */}
      {showNew && <NewContactModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

function NewContactModal({ onClose }: { onClose: () => void }) {
  const { setContacts } = useAppStore()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company: company || null, role: role || null, email: email || null, phone: phone || null, telegram: telegram || null, notes: notes || null, tags: tags || null }),
      })
      if (res.ok) {
        const contactsRes = await fetch('/api/contacts')
        if (contactsRes.ok) setContacts(await contactsRes.json())
        onClose()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-[var(--comic-bg)] comic-border comic-shadow-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        <h2 className="comic-title text-xl text-[#FF6B35] mb-4">👤 Новый контакт</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="Имя *" required />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="Компания" />
            <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="Роль" />
          </div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="📧 Email" />
          <div className="grid grid-cols-2 gap-3">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="📱 Телефон" />
            <input type="text" value={telegram} onChange={e => setTelegram(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="💬 Telegram" />
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="📝 Заметки" rows={2} />
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full p-2 border-2 border-[var(--comic-border-color)] rounded-lg text-sm bg-[var(--comic-input-bg)]" placeholder="🏷️ Теги (через запятую): СМИ, Партнёр" />
          <div className="flex gap-2 pt-2">
            <button type="submit" className="comic-btn bg-[#FF6B35] text-white px-4 py-2 text-sm">Создать</button>
            <button type="button" onClick={onClose} className="comic-btn bg-[var(--comic-tag-bg)] text-foreground px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      </div>
    </div>
  )
}

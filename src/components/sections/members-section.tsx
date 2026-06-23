'use client'

import { useAppStore } from '@/lib/store'
import { Send, ListChecks, Crown } from 'lucide-react'

const ACTIVE = (status: string) => status !== 'archived' && status !== 'completed'

export function MembersSection() {
  const { teamMembers, signals, currentUser, setActiveSection, setKanbanOnlyMine } = useAppStore()

  const countFor = (memberId: string) =>
    signals.filter(s => s.assigneeId === memberId && ACTIVE(s.status)).length

  const showMyTasks = () => {
    setKanbanOnlyMine(true)
    setActiveSection('kanban')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="text-lg font-bold">Участники команды</h3>
          <p className="text-sm text-muted-foreground">
            {teamMembers.length} зарегистрировано через Telegram
          </p>
        </div>
        <button
          onClick={showMyTasks}
          className="comic-btn ml-auto bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-sm px-3 py-2 flex items-center gap-1.5"
        >
          <ListChecks className="w-4 h-4" />
          Мои задачи
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map(member => {
          const isMe = currentUser?.id === member.id
          const assigned = countFor(member.id)
          return (
            <div
              key={member.id}
              className="bg-card comic-border comic-shadow-sm p-4 flex items-start gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#FF6B35] flex items-center justify-center text-white font-bold border-2 border-[var(--comic-border-color)] overflow-hidden flex-shrink-0">
                {member.avatar
                  ? <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                  : member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold truncate">{member.name}</p>
                  {isMe && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4ECB71]/15 text-[#4ECB71] font-bold flex items-center gap-0.5">
                      <Crown className="w-3 h-3" /> вы
                    </span>
                  )}
                </div>
                {member.role && <p className="text-xs text-muted-foreground truncate">{member.role}</p>}
                {member.telegramUsername && (
                  <a
                    href={`https://t.me/${member.telegramUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[#229ED9] hover:underline"
                  >
                    <Send className="w-3 h-3" />@{member.telegramUsername}
                  </a>
                )}
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--comic-tag-bg)] text-muted-foreground font-medium">
                    {assigned} {assigned === 1 ? 'активная задача' : 'активных задач'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {teamMembers.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">
            Пока никто не вошёл. Участники появляются здесь после входа через бота.
          </div>
        )}
      </div>
    </div>
  )
}

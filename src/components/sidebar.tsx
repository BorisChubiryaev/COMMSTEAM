'use client'

import { useAppStore, STATUS_LABELS } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  UsersRound,
  Archive,
  BarChart3,
  Inbox,
  Newspaper,
  Menu,
  X,
  Zap,
  Radio,
  Network,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { id: 'kanban' as const, icon: LayoutDashboard, label: 'Канбан', emoji: '📋', color: '#FF6B35' },
  { id: 'inbox' as const, icon: Inbox, label: 'Входящие', emoji: '📥', color: '#FFD166' },
  { id: 'news' as const, icon: Newspaper, label: 'Новости', emoji: '🗞️', color: '#00C9A7' },
  { id: 'calendar' as const, icon: Calendar, label: 'Календарь', emoji: '📅', color: '#00C9A7' },
  { id: 'contacts' as const, icon: Users, label: 'Контакты', emoji: '👥', color: '#A78BFA' },
  { id: 'members' as const, icon: UsersRound, label: 'Участники', emoji: '🧑‍🤝‍🧑', color: '#22D3EE' },
  { id: 'archive' as const, icon: Archive, label: 'Архив', emoji: '📦', color: '#9CA3AF' },
  { id: 'analytics' as const, icon: BarChart3, label: 'Аналитика', emoji: '📊', color: '#FBBF24' },
  { id: 'report' as const, icon: FileText, label: 'Отчёт', emoji: '📝', color: '#FF6B35' },
  { id: 'knowledge' as const, icon: Network, label: 'Граф знаний', emoji: '🧠', color: '#1D9E75' },
  { id: 'help' as const, icon: HelpCircle, label: 'Справка', emoji: '📖', color: '#FF3F8E' },
]

export function Sidebar() {
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen, teamMembers, currentUser, signals, incomingNews } = useAppStore()

  const incomingCount = incomingNews.filter(item => item.status === 'new').length
  const urgentCount = signals.filter(s => s.priority === 'A' && s.status !== 'archived' && s.status !== 'completed').length

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[260px] flex flex-col transition-transform duration-300",
          "lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRight: '3px solid #FF6B35',
        }}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center border-2 border-white/20" style={{ boxShadow: '3px 3px 0px 0px rgba(255,107,53,0.3)' }}>
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="comic-title text-lg text-[#FF6B35] leading-tight">CommsTeam</h1>
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#4ECB71]" />
              <p className="text-[10px] text-[#4ECB71]">Hub Online</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick stats */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 rounded-lg p-2 text-center border border-white/10">
              <p className="text-lg font-bold text-[#FF6B35]">{signals.filter(s => s.status !== 'archived').length}</p>
              <p className="text-[9px] text-gray-400">Активных</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-lg p-2 text-center border border-white/10">
              <p className="text-lg font-bold text-[#EF4444]">{urgentCount}</p>
              <p className="text-[9px] text-gray-400">Срочных</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-lg p-2 text-center border border-white/10">
              <p className="text-lg font-bold text-[#FBBF24]">{incomingCount}</p>
              <p className="text-[9px] text-gray-400">Новостей</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 px-3 mb-2 font-bold">Навигация</p>
          {navItems.map((item) => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id)
                  setSidebarOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-white border-2 border-white/10"
                    : "text-gray-400 hover:bg-white/5 hover:text-white border-2 border-transparent"
                )}
                style={isActive ? { 
                  backgroundColor: item.color + '25',
                  boxShadow: `inset 0 0 0 1px ${item.color}40, 2px 2px 0px 0px ${item.color}30`
                } : {}}
              >
                <span className="text-lg">{item.emoji}</span>
                <span>{item.label}</span>
                {item.id === 'kanban' && signals.length > 0 && (
                  <span className={cn(
                    "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    isActive ? "bg-white/20" : "bg-white/10"
                  )}>
                    {signals.length}
                  </span>
                )}
                {item.id === 'inbox' && incomingCount > 0 && (
                  <span className={cn(
                    "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    isActive ? "bg-white/20" : "bg-white/10"
                  )}>
                    {incomingCount}
                  </span>
                )}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* Team Members */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => { setActiveSection('members'); setSidebarOpen(false) }}
            className="w-full text-left text-[9px] uppercase tracking-[0.2em] text-gray-500 hover:text-gray-300 px-3 mb-2 font-bold transition-colors"
          >
            Команда · все участники →
          </button>
          <div className="space-y-0.5">
            {teamMembers.slice(0, 5).map((member) => (
              <button
                key={member.id}
                onClick={() => { setActiveSection('members'); setSidebarOpen(false) }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
                  currentUser?.id === member.id
                    ? "bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                )}
              >
                <Avatar className="w-7 h-7 border-2 border-current flex-shrink-0">
                  <AvatarFallback className="text-[10px] bg-[#2d2d4e] font-bold">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="truncate text-xs font-medium">{member.name}</p>
                  <p className="text-[9px] opacity-60 truncate">{member.role}</p>
                </div>
                {currentUser?.id === member.id && (
                  <span className="ml-auto text-[10px] text-[#4ECB71]">●</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <p className="text-[9px] text-gray-500 text-center">
            ⚡ CommsTeam Hub © 2026
          </p>
        </div>
      </aside>
    </>
  )
}

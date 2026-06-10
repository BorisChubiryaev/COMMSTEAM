import { create } from 'zustand'

export type Section = 'kanban' | 'inbox' | 'news' | 'calendar' | 'contacts' | 'archive' | 'analytics' | 'help'

export interface TeamMember {
  id: string
  name: string
  avatar: string | null
  role: string | null
}

export interface Signal {
  id: string
  title: string
  content: string | null
  link: string | null
  aiSummary: string | null
  source: string | null
  signalType: string | null
  relevance: number | null
  alignment: number | null
  urgency: number | null
  potential: string | null
  risks: string | null
  priority: string | null
  meanings: string | null
  distribution: string | null
  publicationType: string | null
  aiContent: string | null
  launchDate: string | null
  launchLocation: string | null
  calendarEventId: string | null
  calendarEvent?: Event | null
  status: string
  reach: number | null
  engagement: number | null
  mediaMentions: number | null
  traffic: number | null
  leads: number | null
  businessImpact: string | null
  whatWorked: string | null
  whatDidntWork: string | null
  newInsights: string | null
  meaningMapUpdate: string | null
  assigneeId: string | null
  assignee: TeamMember | null
  comments: Comment[]
  decisionHistory?: DecisionHistory[]
  createdAt: string
  updatedAt: string
}

export interface IncomingNews {
  id: string
  title: string
  content: string | null
  link: string | null
  source: string
  status: string
  rawPayload: string | null
  aiSummary: string | null
  aiSource: string | null
  aiSignalType: string | null
  aiRelevance: number | null
  aiAlignment: number | null
  aiUrgency: number | null
  aiPotential: string | null
  aiRisks: string | null
  aiPriority: string | null
  aiMeanings: string | null
  aiDistribution: string | null
  aiPublicationType: string | null
  aiAnalyzedAt: string | null
  duplicateScore: number | null
  duplicateReason: string | null
  duplicateOfId: string | null
  duplicateOf: IncomingNews | null
  telegramChatId: string | null
  telegramMessageId: string | null
  telegramUsername: string | null
  telegramFirstName: string | null
  telegramLastName: string | null
  signalId: string | null
  signal: Signal | null
  decisionHistory?: DecisionHistory[]
  createdAt: string
  updatedAt: string
}

export interface DecisionHistory {
  id: string
  action: string
  actor: string
  note: string | null
  metadata: string | null
  incomingNewsId: string | null
  signalId: string | null
  createdAt: string
}

export interface Contact {
  id: string
  name: string
  company: string | null
  role: string | null
  email: string | null
  phone: string | null
  telegram: string | null
  notes: string | null
  tags: string | null
  comments: Comment[]
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  location: string | null
  type: string | null
  status: string
  organizerId: string | null
  organizer: TeamMember | null
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  content: string
  authorId: string
  author: TeamMember
  signalId: string | null
  contactId: string | null
  createdAt: string
  updatedAt: string
}

export interface PeriodSummary {
  id: string
  title: string
  periodStart: string
  periodEnd: string
  aiSummary: string | null
  createdAt: string
  updatedAt: string
}

interface AppState {
  activeSection: Section
  setActiveSection: (section: Section) => void
  
  selectedSignalId: string | null
  setSelectedSignalId: (id: string | null) => void
  
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  
  currentUser: TeamMember | null
  setCurrentUser: (user: TeamMember | null) => void
  
  teamMembers: TeamMember[]
  setTeamMembers: (members: TeamMember[]) => void
  
  signals: Signal[]
  setSignals: (signals: Signal[]) => void
  updateSignal: (signal: Signal) => void

  incomingNews: IncomingNews[]
  setIncomingNews: (items: IncomingNews[]) => void
  updateIncomingNews: (item: IncomingNews) => void
  
  contacts: Contact[]
  setContacts: (contacts: Contact[]) => void
  
  events: Event[]
  setEvents: (events: Event[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeSection: 'kanban',
  setActiveSection: (section) => set({ activeSection: section }),
  
  selectedSignalId: null,
  setSelectedSignalId: (id) => set({ selectedSignalId: id }),
  
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  teamMembers: [],
  setTeamMembers: (members) => set({ teamMembers: members }),
  
  signals: [],
  setSignals: (signals) => set({ signals: signals }),
  updateSignal: (signal) => set((state) => ({
    signals: state.signals.map(s => s.id === signal.id ? signal : s)
  })),

  incomingNews: [],
  setIncomingNews: (items) => set({ incomingNews: items }),
  updateIncomingNews: (item) => set((state) => ({
    incomingNews: state.incomingNews.map(existing => existing.id === item.id ? item : existing)
  })),
  
  contacts: [],
  setContacts: (contacts) => set({ contacts: contacts }),
  
  events: [],
  setEvents: (events) => set({ events: events }),
}))

// Constants
export const SOURCES = [
  'ДЗО',
  'Трабы/Команды',
  'Мероприятия',
  'Тренды/Рынок',
  'Задачи от руководства',
] as const

export const SIGNAL_TYPES = [
  'Новость',
  'Идея/Инициатива',
  'Инфоповод',
  'Задача/Поручение',
] as const

export const PRIORITIES = ['A', 'B', 'C', 'Отклонено'] as const

export const MEANINGS = [
  'ИИ',
  'RecSys/Рекомендации',
  'СберID',
  'Персонализация и данные',
  'Безопасность и доверие',
  'HR-бренд/Команда',
  'Технологическое лидерство и инновации',
] as const

export const DISTRIBUTIONS = ['PR', 'Маркетинг', 'Внутриком'] as const

export const PUBLICATION_TYPES = [
  'Посты в соцсетях',
  'Статья',
  'Пресс-релиз',
  'Выступление',
  'Внутренняя коммуникация',
  'Мероприятие/Митап',
  'Реклама',
] as const

export const STATUSES = [
  { value: 'input', label: 'Входящее', color: '#9CA3AF' },
  { value: 'classification', label: 'Классификация', color: '#60A5FA' },
  { value: 'evaluation', label: 'Оценка', color: '#FBBF24' },
  { value: 'meaning', label: 'Смыслы', color: '#A78BFA' },
  { value: 'distribution', label: 'Распределение', color: '#34D399' },
  { value: 'launch', label: 'Запуск', color: '#FF6B35' },
  { value: 'measurement', label: 'Измерение', color: '#00C9A7' },
  { value: 'feedback', label: 'Обратная связь', color: '#FF3F8E' },
  { value: 'completed', label: 'Завершено', color: '#4ECB71' },
  { value: 'archived', label: 'Архив', color: '#6B7280' },
] as const

export const POTENTIALS = ['PR', 'HR', 'Продукт', 'Репутация'] as const

export const STATUS_LABELS: Record<string, string> = {
  input: 'Входящее',
  classification: 'Классификация',
  evaluation: 'Оценка',
  meaning: 'Смыслы',
  distribution: 'Распределение',
  launch: 'Запуск',
  measurement: 'Измерение',
  feedback: 'Обратная связь',
  completed: 'Завершено',
  archived: 'Архив',
}

export const PRIORITY_COLORS: Record<string, string> = {
  'A': 'bg-red-500 text-white',
  'B': 'bg-orange-500 text-white',
  'C': 'bg-yellow-400 text-black',
  'Отклонено': 'bg-gray-400 text-white',
}

export const PRIORITY_BG: Record<string, string> = {
  'A': '#EF4444',
  'B': '#F97316',
  'C': '#EAB308',
  'Отклонено': '#9CA3AF',
}

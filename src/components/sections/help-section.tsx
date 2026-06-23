'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Terminal,
  Workflow,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Rocket,
  Brain,
  Shield,
  Users,
  BarChart3,
  MessageSquare,
  Sparkles,
  Monitor,
  Database,
  Server,
  Globe,
  Key,
  FolderTree,
  Zap,
} from 'lucide-react'

const SECTIONS = [
  { id: 'about', label: 'О проекте', icon: BookOpen, color: '#FF6B35' },
  { id: 'access', label: 'Вход и уведомления', icon: Shield, color: '#229ED9' },
  { id: 'quickstart', label: 'Быстрый старт', icon: Rocket, color: '#00C9A7' },
  { id: 'workflow', label: 'Рабочий процесс', icon: Workflow, color: '#A78BFA' },
  { id: 'features', label: 'Возможности', icon: Sparkles, color: '#FBBF24' },
  { id: 'architecture', label: 'Архитектура', icon: Server, color: '#3B82F6' },
  { id: 'env', label: 'Переменные окружения', icon: Key, color: '#EF4444' },
  { id: 'api', label: 'API маршруты', icon: Globe, color: '#34D399' },
  { id: 'faq', label: 'FAQ', icon: Lightbulb, color: '#F59E0B' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#1a1a2e] hover:bg-[#2d2d4e] text-gray-400 hover:text-white transition-colors"
      title="Копировать"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#4ECB71]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative bg-[#1a1a2e] rounded-xl p-4 overflow-x-auto custom-scrollbar border-2 border-[#2d2d4e]">
      <CopyButton text={code} />
      <span className="absolute top-2 right-12 text-[9px] text-gray-500 uppercase font-bold">{lang}</span>
      <pre className="text-sm text-[#e5e7eb] font-mono whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Collapsible({ title, icon: Icon, color, children, defaultOpen = false }: {
  title: string
  icon: any
  color: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-[var(--comic-bg)] comic-border comic-shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[var(--comic-bg-hover)] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-sm font-bold flex-1 text-left">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--comic-border-color)]/20">
          {children}
        </div>
      )}
    </div>
  )
}

function StepCard({ step, title, color, children }: {
  step: number
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm border-2 border-[var(--comic-border-color)] flex-shrink-0"
          style={{ backgroundColor: color, boxShadow: `3px 3px 0px 0px ${color}40` }}
        >
          {step}
        </div>
        <div className="w-0.5 flex-1 bg-[var(--comic-border-color)]/20 mt-2" />
      </div>
      <div className="pb-6 flex-1">
        <h4 className="text-sm font-bold mb-2" style={{ color }}>{title}</h4>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      </div>
    </div>
  )
}

export function HelpSection() {
  const [activeSection, setActiveSection] = useState('about')

  const renderContent = () => {
    switch (activeSection) {
      case 'about':
        return (
          <div className="space-y-5">
            {/* Hero card */}
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow-lg p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF6B35]/5 rounded-bl-[100px]" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00C9A7]/5 rounded-tr-[80px]" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-[#FF6B35] rounded-2xl flex items-center justify-center border-3 border-[var(--comic-border-color)]" style={{ boxShadow: '4px 4px 0px 0px rgba(26,26,46,1)' }}>
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="comic-title text-2xl text-[#FF6B35]">CommsTeam Hub</h2>
                    <p className="text-sm text-muted-foreground">Единое пространство команды коммуникации</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  <strong>CommsTeam Hub</strong> — веб-приложение для оцифровки работы команды коммуникаций.
                  Оно объединяет все этапы обработки новостей и сигналов: от поступления до измерения результатов и обратной связи.
                  Вход — через Telegram (по коду от бота), доступ только участникам командного чата. Telegram-бот принимает новости,
                  делает AI-разбор и шлёт уведомления. ИИ на базе OpenRouter (Gemini) генерирует саммари, контент и аналитику.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Next.js 16', 'TypeScript', 'Tailwind CSS', 'Prisma + PostgreSQL', 'OpenRouter AI', 'Telegram-вход', 'Vercel'].map(tag => (
                    <span key={tag} className="text-[10px] px-2.5 py-1 rounded-lg bg-[#FF6B35]/10 text-[#FF6B35] font-bold border border-[#FF6B35]/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Brain, title: 'ИИ-помощник', desc: 'Генерация саммари, контента и аналитики на базе Google Gemini через OpenRouter', color: '#A78BFA' },
                { icon: Workflow, title: 'Полный цикл', desc: 'От поступления сигнала до измерения результата и обратной связи', color: '#00C9A7' },
                { icon: Users, title: 'Командная работа', desc: 'Общий канбан, комментарии, назначение ответственных и отслеживание', color: '#FF6B35' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-2xl" style={{ backgroundColor: color + '10' }} />
                  <Icon className="w-6 h-6 mb-2" style={{ color }} />
                  <h4 className="text-sm font-bold mb-1">{title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case 'access':
        return (
          <div className="space-y-5">
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="comic-title text-lg text-[#229ED9] mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Как войти
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Доступ — только для участников командного Telegram-чата. Логина по паролю нет.
              </p>
              <div className="space-y-0">
                <StepCard step={1} title="Откройте бота" color="#229ED9">
                  <p className="text-xs">Напишите боту команды (кнопка на экране входа ведёт прямо в чат с ним).</p>
                </StepCard>
                <StepCard step={2} title="Отправьте /login" color="#34D399">
                  <p className="text-xs">Бот проверит, что вы состоите в командном чате, и пришлёт 6-значный код (действует 10 минут).</p>
                </StepCard>
                <StepCard step={3} title="Введите код" color="#FF6B35">
                  <p className="text-xs">Впишите код на экране входа — вы внутри. Ваш аккаунт автоматически появляется во вкладке «Участники».</p>
                </StepCard>
              </div>
            </div>

            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#229ED9]" />
                Уведомления — 3 канала
              </h3>
              <div className="space-y-3">
                {[
                  { icon: '🔔', t: 'Колокольчик в приложении', d: 'Лично вам: задачи, назначенные на вас, и новые входящие. Счётчик — непрочитанное.' },
                  { icon: '💬', t: 'Telegram в личке', d: 'Когда вам назначают сигнал — бот пишет в ЛС.' },
                  { icon: '👥', t: 'Командный чат', d: 'Лента новых входящих (с кнопками «В канбан»/«Игнор») и напоминания о запусках за 24 часа.' },
                ].map(({ icon, t, d }) => (
                  <div key={t} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--comic-bg-hover)] border border-[var(--comic-border-color)]/20">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div>
                      <h4 className="text-sm font-bold">{t}</h4>
                      <p className="text-xs text-muted-foreground">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Команды бота
              </h3>
              <div className="space-y-2">
                {[
                  { cmd: '/login', d: 'Получить код для входа на сайт' },
                  { cmd: '/list', d: 'Последние входящие' },
                  { cmd: '/help', d: 'Справка по боту' },
                  { cmd: 'ссылка / текст', d: 'Прислать новость — бот сохранит её во «Входящие» и сделает AI-разбор' },
                ].map(({ cmd, d }) => (
                  <div key={cmd} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--comic-bg-hover)] border border-[var(--comic-border-color)]/20">
                    <code className="text-xs font-mono bg-[#1a1a2e] text-white px-2 py-1 rounded flex-shrink-0">{cmd}</code>
                    <span className="text-xs text-muted-foreground">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'quickstart':
        return (
          <div className="space-y-5">
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="comic-title text-lg text-[#00C9A7] mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Как запустить локально
              </h3>

              <div className="space-y-0">
                <StepCard step={1} title="Установите зависимости" color="#9CA3AF">
                  <CodeBlock code={`cd /Users/ch/dev/COMMSTEAM\nnpm install`} />
                  <p className="text-xs text-muted-foreground mt-1">Используется npm, он устанавливается вместе с Node.js</p>
                </StepCard>

                <StepCard step={2} title="Настройте базу данных (PostgreSQL)" color="#60A5FA">
                  <CodeBlock code={`# Применить схему к Postgres (Neon)\nnpm run db:push\n\n# Сгенерировать Prisma Client\nnpm run db:generate`} />
                  <p className="text-xs text-muted-foreground mt-1">Боевая БД — Neon Postgres; строка подключения в <code className="bg-[var(--comic-tag-bg)] px-1 rounded text-[10px]">.env.local</code>. После изменения схемы перезапустите dev-сервер.</p>
                </StepCard>

                <StepCard step={3} title="Настройте переменные окружения" color="#FBBF24">
                  <p className="text-xs mb-2">Заполните <code className="bg-[var(--comic-tag-bg)] px-1 rounded">.env</code> — полный список см. в разделе «Переменные окружения».</p>
                  <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-lg p-3 mt-2">
                    <p className="text-xs text-[#FF6B35] font-bold">⚠️ Минимум для работы: DATABASE_URL, AUTH_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_NOTIFY_CHAT_ID, OPENROUTER_API_KEY</p>
                  </div>
                </StepCard>

                <StepCard step={4} title="Запустите dev-сервер" color="#FF6B35">
                  <CodeBlock code={`npm run dev`} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Сервер запустится на <code className="bg-[var(--comic-tag-bg)] px-1 rounded text-[10px]">http://localhost:3000</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Первый запрос может занять 5-30 секунд (компиляция Turbopack)
                  </p>
                </StepCard>

                <StepCard step={5} title="Войдите через Telegram" color="#229ED9">
                  <p className="text-xs">Откройте приложение, напишите боту <code className="bg-[var(--comic-tag-bg)] px-1 rounded">/login</code>, введите код. Демо-данных нет — участники появляются после входа. Подробнее в разделе «Вход и уведомления».</p>
                </StepCard>

                <StepCard step={6} title="Готово!" color="#A78BFA">
                  <p className="text-sm">Откройте <code className="bg-[var(--comic-tag-bg)] px-1.5 py-0.5 rounded font-bold">http://localhost:3000</code> в браузере и начните работу! 🎉</p>
                </StepCard>
              </div>
            </div>

            {/* Useful commands */}
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-foreground" />
                Полезные команды
              </h3>
              <div className="space-y-3">
                {[
                  { cmd: 'npm run dev', desc: 'Запуск dev-сервера (порт 3000)' },
                  { cmd: 'npm run lint', desc: 'Проверка кода ESLint' },
                  { cmd: 'npm run db:push', desc: 'Применить схему к БД' },
                  { cmd: 'npm run db:generate', desc: 'Сгенерировать Prisma Client' },
                  { cmd: 'npm run db:reset', desc: 'Сбросить БД и миграции' },
                  { cmd: 'npm run build', desc: 'Production-сборка (не используйте для разработки)' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--comic-bg-hover)] border border-[var(--comic-border-color)]/20">
                    <code className="text-xs font-mono bg-[#1a1a2e] text-white px-2 py-1 rounded">{cmd}</code>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'workflow':
        return (
          <div className="space-y-4">
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="comic-title text-lg text-[#A78BFA] mb-2 flex items-center gap-2">
                <Workflow className="w-5 h-5" />
                Рабочий процесс обработки сигнала
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Каждый сигнал проходит через 9 стадий. Нажмите на карточку сигнала на канбан-доске, 
                чтобы открыть детали и перевести его на следующий этап.
              </p>
            </div>

            {[
              {
                step: 1, status: 'input', label: '📥 Входящее', color: '#9CA3AF',
                desc: 'Новость или сигнал поступает в систему',
                actions: ['Создайте сигнал кнопкой "+ Новый сигнал"', 'Укажите заголовок, содержание или ссылку', 'Нажмите "Сгенерировать" для ИИ-саммари'],
                icon: Monitor,
              },
              {
                step: 2, status: 'classification', label: '🏷️ Классификация', color: '#60A5FA',
                desc: 'Определяем тип сигнала и источник',
                actions: ['Выберите источник: ДЗО, Трабы/Команды, Мероприятия, Тренды/Рынок, Задачи от руководства', 'Выберите тип: Новость, Идея/Инициатива, Инфоповод, Задача/Поручение'],
                icon: FolderTree,
              },
              {
                step: 3, status: 'evaluation', label: '⚡ Оценка', color: '#FBBF24',
                desc: 'Фильтруем и определяем приоритет',
                actions: ['Оцените актуальность (1-5)', 'Оцените соответствие смыслам (1-5)', 'Оцените срочность (1-5)', 'Укажите потенциал: PR, HR, Продукт, Репутация', 'Установите приоритет: A (срочно), B (важно), C (обычно), Отклонено'],
                icon: Shield,
              },
              {
                step: 4, status: 'meaning', label: '🧠 Карта смыслов', color: '#A78BFA',
                desc: 'Привязываем к смысловым направлениям',
                actions: ['Выберите подходящие смыслы: ИИ, RecSys, СберID, Персонализация и данные, Безопасность и доверие, HR-бренд/Команда, Технологическое лидерство и инновации'],
                icon: Brain,
              },
              {
                step: 5, status: 'distribution', label: '📡 Распределение', color: '#34D399',
                desc: 'Определяем направление коммуникации',
                actions: ['Выберите направление: PR, Маркетинг, Внутриком', 'Можно выбрать несколько направлений'],
                icon: Users,
              },
              {
                step: 6, status: 'launch', label: '🚀 Запуск', color: '#FF6B35',
                desc: 'Создаём и публикуем контент',
                actions: ['Выберите тип публикации: Посты в соцсетях, Статья, Пресс-релиз и т.д.', 'Нажмите "🤖 Сгенерировать" для ИИ-контента', 'Или напишите контент вручную'],
                icon: Rocket,
              },
              {
                step: 7, status: 'measurement', label: '📊 Измерение', color: '#00C9A7',
                desc: 'Замеряем результаты публикации',
                actions: ['Заполните метрики: охват, вовлечённость, упоминания в СМИ, трафик, лиды', 'Опишите влияние на бизнес'],
                icon: BarChart3,
              },
              {
                step: 8, status: 'feedback', label: '💬 Обратная связь', color: '#FF3F8E',
                desc: 'Анализируем, что сработало и что нет',
                actions: ['Укажите, что сработало', 'Укажите, что не сработало', 'Запишите новые инсайты и тренды'],
                icon: MessageSquare,
              },
              {
                step: 9, status: 'completed', label: '✅ Завершено', color: '#4ECB71',
                desc: 'Сигнал полностью обработан',
                actions: ['Сигнал можно отправить в архив', 'Данные используются в аналитике'],
                icon: Check,
              },
            ].map(({ step, label, color, desc, actions, icon: Icon }) => (
              <div key={step} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white border-2 border-[var(--comic-border-color)] flex-shrink-0"
                    style={{ backgroundColor: color, boxShadow: `3px 3px 0px 0px ${color}40` }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold" style={{ color }}>{label}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: color }}>
                        Шаг {step}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{desc}</p>
                    <ul className="space-y-1">
                      {actions.map((action, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color }}>▸</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'features':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: '📋', title: 'Канбан-доска', color: '#FF6B35',
                  desc: 'Визуализация всех сигналов по стадиям обработки',
                  features: ['9 колонок-стадий обработки', 'Поиск по сигналам', 'Фильтрация по приоритету и источнику', 'Карточки с ИИ-саммари и тегами', 'Статистика (активные, срочные, сегодня)'],
                },
                {
                  icon: '📅', title: 'Календарь', color: '#00C9A7',
                  desc: 'Управление мероприятиями и событиями',
                  features: ['Месячный вид календаря', 'Создание событий с типом и локацией', 'Панель ближайших событий', 'Навигация по месяцам'],
                },
                {
                  icon: '👥', title: 'Контакты', color: '#A78BFA',
                  desc: 'База контактов СМИ, партнёров, коллег',
                  features: ['Карточки контактов с тегами', 'Быстрые действия (email, Telegram)', 'Комментарии к контактам', 'Поиск по контактам'],
                },
                {
                  icon: '📦', title: 'Архив', color: '#9CA3AF',
                  desc: 'Завершённые и архивированные сигналы',
                  features: ['Фильтрация по типу', 'Просмотр обратной связи', 'Метрики результатов', 'Быстрый поиск'],
                },
                {
                  icon: '📊', title: 'Аналитика', color: '#FBBF24',
                  desc: 'Статистика и ИИ-анализ по периодам',
                  features: ['Обзорные метрики', 'Воронка обработки', 'Графики по приоритету, типу, источнику', 'Карта смыслов', 'Активность команды', 'ИИ-саммари за период'],
                },
                {
                  icon: '🤖', title: 'ИИ-помощник', color: '#A78BFA',
                  desc: 'Интеграция с Google Gemini через OpenRouter',
                  features: ['Автоматическое саммари новости', 'Генерация контента для публикации', 'Периодное саммари по сигналам', 'Подсказки по оценке и смыслам'],
                },
                {
                  icon: '✈️', title: 'Telegram-бот', color: '#229ED9',
                  desc: 'Приём новостей и уведомления',
                  features: ['Пришлите ссылку/текст — попадёт во «Входящие»', 'AI-разбор с кнопками «В канбан»/«Игнор»', 'Лента входящих в командный чат', 'Команды /login, /list'],
                },
                {
                  icon: '🔑', title: 'Вход и участники', color: '#34D399',
                  desc: 'Доступ только для командного чата',
                  features: ['Вход по коду из Telegram (/login)', 'Вкладка «Участники» со списком', 'Фильтр «Мои задачи» на канбане', 'Авто-онбординг при первом входе'],
                },
                {
                  icon: '🔔', title: 'Уведомления', color: '#FF3F8E',
                  desc: 'Три канала оповещений',
                  features: ['Колокольчик: назначенное вам + входящие', 'ЛС в Telegram при назначении', 'Командный чат: входящие + дедлайны', 'Напоминания о запусках за 24ч'],
                },
              ].map(({ icon, title, color, desc, features }) => (
                <div key={title} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[60px]" style={{ backgroundColor: color + '08' }} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{icon}</span>
                      <h4 className="text-sm font-bold" style={{ color }}>{title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{desc}</p>
                    <ul className="space-y-1">
                      {features.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'architecture':
        return (
          <div className="space-y-4">
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="comic-title text-lg text-[#3B82F6] mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" />
                Структура проекта
              </h3>
              <CodeBlock code={`my-project/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Главная страница (SPA)
│   │   ├── layout.tsx          # Root layout (шрифты, Toaster)
│   │   ├── globals.css         # Глобальные стили + comic-theme
│   │   └── api/                # API маршруты
│   │       ├── auth/           # Вход (login-code, me, logout)
│   │       ├── signals/        # CRUD сигналов (+ уведомления о назначении)
│   │       ├── incoming-news/  # Входящие (+ analyze, convert)
│   │       ├── events/         # CRUD событий
│   │       ├── contacts/       # CRUD контактов
│   │       ├── team/           # Участники команды
│   │       ├── comments/       # Комментарии
│   │       ├── summaries/      # Периодные саммари
│   │       ├── cron/           # Напоминания о запусках
│   │       ├── integrations/   # telegram/webhook (бот)
│   │       └── ai/             # ИИ-эндпоинты
│   │           ├── summary/            # Саммари новости
│   │           ├── generate-content/   # Генерация контента
│   │           └── period-summary/     # Саммари за период
│   ├── components/
│   │   ├── app.tsx             # Оболочка SPA, шапка, колокольчик, авторизация
│   │   ├── sidebar.tsx         # Боковая навигация
│   │   ├── login-screen.tsx    # Экран входа по коду
│   │   ├── sections/           # Секции: kanban, incoming-news, news-feed,
│   │   │   │                   #   calendar, contacts, members, archive,
│   │   │   └── ...             #   analytics, help
│   │   └── ui/                 # shadcn/ui компоненты
│   ├── lib/
│   │   ├── store.ts            # Zustand store + справочники
│   │   ├── auth.ts             # Сессия + проверка Telegram
│   │   ├── telegram.ts         # Клиент Bot API
│   │   ├── notify.ts           # Уведомления (ЛС / командный чат)
│   │   ├── signal-analysis.ts  # AI-разбор сигналов
│   │   ├── db.ts               # Prisma клиент
│   │   └── utils.ts
│   ├── middleware.ts           # Защита /api/* сессией
│   └── hooks/
├── prisma/schema.prisma        # Схема (PostgreSQL)
├── vercel.json                 # Cron-задания
├── CLAUDE.md                   # Гид для ИИ-агента
└── package.json`} lang="text" />
            </div>

            {/* Tech stack */}
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-foreground" />
                Технологический стек
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'Next.js 16', desc: 'Фреймворк React с App Router', category: 'Фронтенд' },
                  { name: 'TypeScript 5', desc: 'Типизированный JavaScript', category: 'Фронтенд' },
                  { name: 'Tailwind CSS 4', desc: 'Utility-first CSS', category: 'Фронтенд' },
                  { name: 'shadcn/ui', desc: 'Компоненты на Radix UI', category: 'Фронтенд' },
                  { name: 'Zustand', desc: 'Управление состоянием', category: 'Фронтенд' },
                  { name: 'Prisma', desc: 'ORM для PostgreSQL', category: 'Бэкенд' },
                  { name: 'PostgreSQL (Neon)', desc: 'Облачная база данных', category: 'Бэкенд' },
                  { name: 'Telegram Bot API', desc: 'Вход, приём новостей, уведомления', category: 'Интеграции' },
                  { name: 'OpenRouter', desc: 'API для ИИ-моделей', category: 'ИИ' },
                  { name: 'Google Gemini', desc: 'ИИ-модель для генерации', category: 'ИИ' },
                  { name: 'Vercel', desc: 'Хостинг + Cron', category: 'Инфра' },
                ].map(({ name, desc, category }) => (
                  <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--comic-bg-hover)] border border-[var(--comic-border-color)]/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1a1a2e] text-white font-bold uppercase">{category}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'env':
        return (
          <div className="space-y-4">
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="comic-title text-lg text-[#EF4444] mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Переменные окружения (.env)
              </h3>
              <CodeBlock code={`# === БАЗА ДАННЫХ (PostgreSQL / Neon) ===
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"

# === ИИ (OpenRouter) ===
OPENROUTER_API_KEY="sk-or-v1-ваш-ключ"   # openrouter.ai/keys
AI_MODEL="google/gemini-2.5-flash"

# === TELEGRAM (бот, вход, уведомления) ===
TELEGRAM_BOT_TOKEN="123456:ABC..."        # от @BotFather
TELEGRAM_WEBHOOK_SECRET="строка"          # проверка вебхука
TELEGRAM_NOTIFY_CHAT_ID="-100..."         # id командного чата (бот должен быть в нём)
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="comm_steam_test_bot"

# === СЕССИИ И CRON ===
AUTH_SECRET="случайная-длинная-строка"    # подпись cookie сессии
CRON_SECRET="случайная-строка"            # защита /api/cron/*`} lang="env" />
            </div>

            <div className="bg-[#FF6B35]/5 border-2 border-[#FF6B35]/20 rounded-xl p-4">
              <h4 className="text-sm font-bold text-[#FF6B35] mb-2">⚠️ Важно</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-[#EF4444] flex-shrink-0">•</span>
                  <span>Без <code className="bg-[var(--comic-tag-bg)] px-1 rounded font-bold">DATABASE_URL</code> приложение не запустится</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FBBF24] flex-shrink-0">•</span>
                  <span>Без <code className="bg-[var(--comic-tag-bg)] px-1 rounded font-bold">OPENROUTER_API_KEY</code> ИИ-функции будут возвращать ошибку 500</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4ECB71] flex-shrink-0">•</span>
                  <span>Файл <code className="bg-[var(--comic-tag-bg)] px-1 rounded">.env</code> не коммичится в Git (добавлен в .gitignore)</span>
                </li>
              </ul>
            </div>
          </div>
        )

      case 'api':
        return (
          <div className="space-y-3">
            <div className="bg-[var(--comic-bg)] comic-border comic-shadow p-5">
              <h3 className="comic-title text-lg text-[#34D399] mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                API маршруты
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Все <code className="bg-[var(--comic-tag-bg)] px-1 rounded">/api/*</code> защищены сессией (middleware → 401 без входа). Исключения: вход <code className="bg-[var(--comic-tag-bg)] px-1 rounded">/api/auth/*</code>, вебхук бота и <code className="bg-[var(--comic-tag-bg)] px-1 rounded">/api/cron/*</code> (со своими секретами).</p>
            </div>

            {[
              {
                method: 'GET', path: '/api/signals', desc: 'Получить все сигналы', color: '#4ECB71',
                detail: 'Возвращает массив сигналов с вложенными assignee и comments',
              },
              {
                method: 'POST', path: '/api/signals', desc: 'Создать новый сигнал', color: '#FF6B35',
                detail: 'Body: { title, content?, link?, source?, signalType?, status?, assigneeId? }',
              },
              {
                method: 'GET', path: '/api/signals/[id]', desc: 'Получить сигнал по ID', color: '#4ECB71',
                detail: 'Возвращает сигнал с вложенными assignee и comments',
              },
              {
                method: 'PATCH', path: '/api/signals/[id]', desc: 'Обновить сигнал', color: '#FBBF24',
                detail: 'Body: { status?, priority?, meanings?, distribution?, ...любое поле }',
              },
              {
                method: 'DELETE', path: '/api/signals/[id]', desc: 'Удалить сигнал', color: '#EF4444',
                detail: 'Удаляет сигнал и все его комментарии',
              },
              {
                method: 'GET', path: '/api/events', desc: 'Получить все события', color: '#4ECB71',
                detail: 'Возвращает массив событий с вложенным organizer',
              },
              {
                method: 'POST', path: '/api/events', desc: 'Создать событие', color: '#FF6B35',
                detail: 'Body: { title, date, description?, location?, type?, status? }',
              },
              {
                method: 'GET', path: '/api/contacts', desc: 'Получить все контакты', color: '#4ECB71',
                detail: 'Возвращает массив контактов с вложенными comments',
              },
              {
                method: 'POST', path: '/api/contacts', desc: 'Создать контакт', color: '#FF6B35',
                detail: 'Body: { name, company?, role?, email?, phone?, telegram?, tags? }',
              },
              {
                method: 'GET', path: '/api/team', desc: 'Участники команды', color: '#4ECB71',
                detail: 'Безопасные поля (без кода входа): id, name, avatar, role, email, telegramUsername',
              },
              {
                method: 'GET', path: '/api/auth/me', desc: 'Текущий пользователь сессии', color: '#229ED9',
                detail: '401 если не авторизован. Также: POST /api/auth/login-code (вход по коду), POST /api/auth/logout',
              },
              {
                method: 'POST', path: '/api/integrations/telegram/webhook', desc: 'Вебхук Telegram-бота', color: '#229ED9',
                detail: 'Новости, команды (/login,/list), кнопки (callback). Защищён secret-заголовком',
              },
              {
                method: 'GET', path: '/api/incoming-news', desc: 'Входящие новости', color: '#4ECB71',
                detail: '+ /[id]/analyze (AI-разбор), /[id]/convert (в сигнал). Источники: telegram, manual, parser',
              },
              {
                method: 'GET', path: '/api/cron/launch-reminders', desc: 'Напоминания о запусках', color: '#F59E0B',
                detail: 'Vercel Cron. Постит в командный чат сигналы с запуском в ближайшие 24ч. Защищён CRON_SECRET',
              },
              {
                method: 'POST', path: '/api/comments', desc: 'Создать комментарий', color: '#FF6B35',
                detail: 'Body: { content, authorId, signalId?, contactId? }',
              },
              {
                method: 'POST', path: '/api/ai/summary', desc: 'ИИ-саммари новости', color: '#A78BFA',
                detail: 'Body: { text?, link? }. Возвращает { summary: string }',
              },
              {
                method: 'POST', path: '/api/ai/generate-content', desc: 'ИИ-генерация контента', color: '#A78BFA',
                detail: 'Body: { signalTitle, signalContent, publicationType, meanings, distribution }',
              },
              {
                method: 'POST', path: '/api/ai/period-summary', desc: 'ИИ-саммари за период', color: '#A78BFA',
                detail: 'Body: { periodStart, periodEnd }. Возвращает { summary: string }',
              },
            ].map(({ method, path, desc, color, detail }) => (
              <div key={method + path} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-3 flex items-start gap-3">
                <span
                  className="text-[9px] font-bold px-2 py-1 rounded-lg text-white flex-shrink-0 border border-[var(--comic-border-color)]"
                  style={{ backgroundColor: color }}
                >
                  {method}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-xs font-mono font-bold text-foreground">{path}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        )

      case 'faq':
        return (
          <div className="space-y-3">
            {[
              {
                q: 'Почему первый запуск долгий?',
                a: 'Next.js с Turbopack компилирует страницы при первом запросе. Это занимает 5-30 секунд в зависимости от памяти. Последующие запросы мгновенные.',
                icon: '⏳',
              },
              {
                q: 'Как войти в приложение?',
                a: 'Напишите Telegram-боту команды /login — он проверит, что вы в командном чате, и пришлёт 6-значный код. Введите код на экране входа. Доступ только участникам командного чата.',
                icon: '🔑',
              },
              {
                q: 'Почему не приходят уведомления?',
                a: 'Уведомления привязаны к событиям. В ЛС бот пишет, когда вам НАЗНАЧИЛИ сигнал. В командный чат падают новые входящие и напоминания о запусках за 24ч. Колокольчик в приложении показывает назначенное на вас + новые входящие. Если тишина — значит событий не было.',
                icon: '🔔',
              },
              {
                q: 'ИИ-функции не работают. Что делать?',
                a: 'Проверьте: 1) Установлена ли переменная OPENROUTER_API_KEY в .env 2) Валидный ли ключ на openrouter.ai/keys 3) Есть ли баланс на аккаунте OpenRouter 4) Не заблокирован ли домен openrouter.ai в вашей сети',
                icon: '🤖',
              },
              {
                q: 'Как добавить нового участника команды?',
                a: 'Добавьте человека в командный Telegram-чат — после этого он сможет войти через /login, и его аккаунт автоматически появится во вкладке «Участники». Вручную создавать участников не нужно.',
                icon: '👤',
              },
              {
                q: 'Как сменить ИИ-модель?',
                a: 'В файле .env измените AI_MODEL на другую модель, доступную на OpenRouter. Список моделей: openrouter.ai/models. После изменения перезапустите dev-сервер.',
                icon: '🧠',
              },
              {
                q: 'Можно ли использовать другую базу данных?',
                a: 'Да, Prisma поддерживает PostgreSQL, MySQL и другие БД. Измените provider в schema.prisma и DATABASE_URL в .env. Но для локальной разработки SQLite самый простой вариант.',
                icon: '🗄️',
              },
              {
                q: 'Как экспортировать данные?',
                a: 'SQLite база находится в db/custom.db. Можно использовать: sqlite3 db/custom.db ".dump" > backup.sql или скопировать файл целиком.',
                icon: '📤',
              },
              {
                q: 'Что если dev-сервер упал?',
                a: 'Проверьте логи в dev.log. Перезапустите: npm run dev. Если не помогает — удалите .next/ и запустите снова.',
                icon: '🔧',
              },
            ].map(({ q, a, icon }) => (
              <div key={q} className="bg-[var(--comic-bg)] comic-border comic-shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{icon}</span>
                  <div>
                    <h4 className="text-sm font-bold mb-1">{q}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="md:h-full flex flex-col md:flex-row gap-4 md:overflow-hidden">
      {/* Sidebar navigation */}
      <div className="md:w-48 flex-shrink-0 flex md:block gap-2 md:space-y-1 overflow-x-auto md:overflow-y-auto custom-scrollbar pb-1 md:pb-0">
        {SECTIONS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              "min-w-max md:w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all",
              activeSection === id
                ? "text-white border-2 border-[var(--comic-border-color)]"
                : "text-muted-foreground hover:bg-[var(--comic-bg-hover)] border-2 border-transparent"
            )}
            style={activeSection === id ? {
              backgroundColor: color + '20',
              color: color,
              boxShadow: `inset 0 0 0 1px ${color}30, 2px 2px 0px 0px ${color}20`
            } : {}}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: activeSection === id ? color : undefined }} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 md:overflow-y-auto custom-scrollbar md:pr-2 md:min-h-0">
        {renderContent()}
      </div>
    </div>
  )
}

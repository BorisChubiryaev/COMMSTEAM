import { db } from '@/lib/db'

const SEED_MEMBERS = [
  { name: 'Анна Петрова', role: 'Руководитель', email: 'anna@commteam.ru' },
  { name: 'Максим Козлов', role: 'PR-менеджер', email: 'max@commteam.ru' },
  { name: 'Елена Смирнова', role: 'Маркетолог', email: 'elena@commteam.ru' },
  { name: 'Дмитрий Волков', role: 'Внутренние коммуникации', email: 'dmitry@commteam.ru' },
]

const SEED_SIGNALS = [
  {
    title: 'Запуск нового ИИ-ассистента в Сбербанке',
    content: 'Сбербанк представил нового ИИ-ассистента на базе GigaChat, который поможет клиентам решать финансовые задачи быстрее и эффективнее.',
    link: 'https://example.com/ai-launch',
    source: 'Тренды/Рынок',
    signalType: 'Новость',
    status: 'evaluation',
    priority: 'A',
    relevance: 5,
    alignment: 5,
    urgency: 4,
    meanings: 'ИИ,Технологическое лидерство и инновации',
    distribution: 'PR,Маркетинг',
    aiSummary: 'Сбербанк запускает ИИ-ассистента GigaChat для клиентов. Высокая значимость для коммуникации — подтверждение технологического лидерства.',
  },
  {
    title: 'Митап по RecSys для разработчиков',
    content: 'Планируется внутренний митап по рекомендательным системам. Нужно подготовить материалы и анонс.',
    source: 'Мероприятия',
    signalType: 'Идея/Инициатива',
    status: 'meaning',
    priority: 'B',
    relevance: 4,
    alignment: 3,
    urgency: 3,
    meanings: 'RecSys/Рекомендации',
    distribution: 'Внутриком',
    aiSummary: 'Внутренний митап по RecSys — хорошая возможность для HR-бренда и обмена знаниями внутри команды.',
  },
  {
    title: 'Статья о персонализации в Forbes',
    content: 'Forbes опубликовал статью о персонализации банковских сервисов, где упоминается Сбер.',
    link: 'https://forbes.example.com/personalization',
    source: 'ДЗО',
    signalType: 'Инфоповод',
    status: 'input',
    meanings: '',
    distribution: '',
    aiSummary: null,
  },
  {
    title: 'Поручение руководства: обновить HR-бренд',
    content: 'Руководство поручило обновить позиционирование HR-бренда к концу квартала.',
    source: 'Задачи от руководства',
    signalType: 'Задача/Поручение',
    status: 'distribution',
    priority: 'A',
    relevance: 5,
    alignment: 5,
    urgency: 5,
    potential: 'HR',
    meanings: 'HR-бренд/Команда',
    distribution: 'Маркетинг,Внутриком',
    aiSummary: 'Срочное поручение руководства по обновлению HR-бренда. Крайний срок — конец квартала. Высокий приоритет.',
  },
  {
    title: 'Новая функция СберID для бизнеса',
    content: 'Запуск СберID для бизнес-клиентов — расширение возможностей авторизации.',
    source: 'Трабы/Команды',
    signalType: 'Новость',
    status: 'launch',
    priority: 'B',
    relevance: 4,
    alignment: 4,
    urgency: 3,
    meanings: 'СберID,Безопасность и доверие',
    distribution: 'PR',
    publicationType: 'Пресс-релиз',
    aiSummary: 'Расширение СберID для B2B — важный инфоповод для коммуникации о безопасности и доверии.',
    aiContent: '📌 СберID теперь доступен для бизнеса!\n\nСбербанк расширяет возможности СберID — теперь удобная и безопасная авторизация доступна и для бизнес-клиентов.\n\n✅ Единый вход в корпоративные сервисы\n✅ Повышенная безопасность\n✅ Простая интеграция\n\n#СберID #Безопасность #B2B',
  },
]

const SEED_EVENTS = [
  {
    title: 'Митап по ИИ-технологиям',
    description: 'Внутренний митап с демонстрацией новых ИИ-решений',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Офис Сбера, конференц-зал А',
    type: 'Митап',
    status: 'confirmed',
  },
  {
    title: 'Пресс-конференция СберID',
    description: 'Презентация СберID для бизнеса для СМИ',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Онлайн (Zoom)',
    type: 'Выступление',
    status: 'planned',
  },
  {
    title: 'HR-форум «Технологии и люди»',
    description: 'Ежегодный форум по HR-бренду и корпоративной культуре',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Крокус Экспо',
    type: 'Мероприятие',
    status: 'planned',
  },
]

const SEED_CONTACTS = [
  {
    name: 'Иван Сидоров',
    company: 'Forbes Russia',
    role: 'Главный редактор',
    email: 'ivan@forbes.ru',
    phone: '+7 999 123-45-67',
    telegram: '@ivan_forbes',
    tags: 'СМИ,Журналисты',
  },
  {
    name: 'Мария Козина',
    company: 'TechCrunch Russia',
    role: 'Корреспондент',
    email: 'maria@techcrunch.ru',
    tags: 'СМИ,Технологии',
  },
  {
    name: 'Алексей Морозов',
    company: 'Сбер',
    role: 'Директор по развитию',
    email: 'morozov@sber.ru',
    tags: 'Внутренний,Руководство',
  },
]

export async function POST() {
  try {
    // Check if already seeded
    const existing = await db.teamMember.count()
    if (existing > 0) {
      return Response.json({ message: 'Already seeded', count: existing })
    }

    // Seed team members
    const members: Array<{ id: string; name: string; role: string | null; avatar: string | null; email: string | null; createdAt: Date; updatedAt: Date }> = []
    for (const m of SEED_MEMBERS) {
      const member = await db.teamMember.create({ data: m })
      members.push(member)
    }

    // Seed signals
    for (const s of SEED_SIGNALS) {
      await db.signal.create({
        data: {
          title: s.title,
          content: s.content || null,
          link: s.link || null,
          source: s.source || null,
          signalType: s.signalType || null,
          status: s.status || 'input',
          priority: s.priority || null,
          relevance: s.relevance || null,
          alignment: s.alignment || null,
          urgency: s.urgency || null,
          potential: s.potential || null,
          meanings: s.meanings || null,
          distribution: s.distribution || null,
          publicationType: (s as any).publicationType || null,
          aiSummary: s.aiSummary || null,
          aiContent: (s as any).aiContent || null,
          assigneeId: members[Math.floor(Math.random() * members.length)].id,
        },
      })
    }

    // Seed events
    for (const e of SEED_EVENTS) {
      await db.event.create({
        data: {
          title: e.title,
          description: e.description || null,
          date: new Date(e.date),
          location: e.location || null,
          type: e.type || null,
          status: e.status || 'planned',
          organizerId: members[0].id,
        },
      })
    }

    // Seed contacts
    for (const c of SEED_CONTACTS) {
      await db.contact.create({
        data: {
          name: c.name,
          company: c.company || null,
          role: c.role || null,
          email: c.email || null,
          phone: c.phone || null,
          telegram: c.telegram || null,
          tags: c.tags || null,
        },
      })
    }

    return Response.json({ 
      message: 'Seeded successfully', 
      members: members.length,
      signals: SEED_SIGNALS.length,
      events: SEED_EVENTS.length,
      contacts: SEED_CONTACTS.length,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return Response.json({ error: 'Seed failed' }, { status: 500 })
  }
}

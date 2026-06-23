# CLAUDE.md — гид по проекту для ИИ-агента

CommsTeam Hub — веб-приложение для команды коммуникаций: хроника событий, AI-разбор новостей, канбан-процесс обработки сигналов, Telegram-бот. Эта заметка описывает, **где что лежит и как работает**, чтобы агент быстро ориентировался.

## Стек и инфраструктура
- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**, **Tailwind v4**, **shadcn/ui** (Radix), **Zustand** (состояние).
- **Prisma + PostgreSQL (Neon)**. Схема: `prisma/schema.prisma`. Клиент: `src/lib/db.ts`.
- **AI** через **OpenRouter** (модель по умолчанию `google/gemini-2.5-flash`): `src/lib/openrouter.ts`.
- **Деплой на Vercel** (`commsteam.vercel.app`). Auto-deploy при коммите в `main`. Env задаются в Vercel и локальном `.env`/`.env.local`.
- Реальные значения DATABASE_URL и Neon-переменные лежат в `.env.local` (загружается Next). Prisma CLI читает `.env` — для `prisma db push` к Neon переопределяй: `DATABASE_URL="$(grep DATABASE_URL_UNPOOLED= .env.local|cut -d= -f2-|tr -d '\"')" npx prisma db push`.

## Аутентификация (Telegram, по коду)
Поток входа — **код через бота** (не Login Widget, он оказался ненадёжным):
1. Пользователь шлёт боту `/login` → webhook (`src/app/api/integrations/telegram/webhook/route.ts`, `handleLogin`) проверяет членство в командном чате (`getChatMember` на `TELEGRAM_NOTIFY_CHAT_ID`), апсертит `TeamMember`, кладёт 6-значный `loginCode` + `loginCodeExpiresAt` (10 мин) и отвечает кодом.
2. Пользователь вводит код на экране входа (`src/components/login-screen.tsx`) → `POST /api/auth/login-code` валидирует (одноразовый) и ставит подписанную httpOnly-cookie сессии.
- Сессия: HMAC-подписанный токен (Web Crypto, чтобы работать в Edge-middleware), `src/lib/auth.ts`. Секрет — `AUTH_SECRET`. Cookie: `commsteam_session`.
- **`src/middleware.ts`** отдаёт 401 на ВСЕ `/api/*`, кроме `PUBLIC_API_PREFIXES`: `/api/auth/*`, telegram webhook, `/api/cron/*`. **Любой новый API-роут защищён по умолчанию** — добавляй в этот список только если он реально публичный (и дай ему свой секрет).
- Фронт-гейт: `src/components/app.tsx` дергает `/api/auth/me`; нет сессии → `LoginScreen`.
- Старый Login-Widget-роут `/api/auth/telegram` (POST/GET) ещё существует, но UI его не использует.

## Telegram-бот
`src/lib/telegram.ts` — клиент Bot API (`tgSendMessage`/`tgEditMessageText`/`tgAnswerCallbackQuery`/`tgGetChatMemberStatus`), no-op без `TELEGRAM_BOT_TOKEN`. Webhook:
- Принимает новость (ссылку/текст) в ЛС → сохраняет в `IncomingNews`, асинхронно (`after`) запускает AI-классификацию, шлёт отправителю разбор с кнопками «В канбан»/«Игнор» (`callback_query`) и постит в **командный чат** ленту новых входящих (`sendTeamFeed`).
- Команды: `/start`,`/help`,`/login`,`/list`.
- `callback_query` ОБЯЗАН быть в `allowed_updates` вебхука (иначе кнопки не доставляются).
- Конвертация/игнор вынесены в `src/lib/incoming-news-actions.ts` (общее для роута и бота).

## Уведомления (3 канала) — `src/lib/notify.ts`
- **In-app колокольчик** (`app.tsx`): назначенные на текущего юзера сигналы + новые входящие, счётчик непрочитанного в `localStorage`.
- **Telegram ЛС**: `notifyMember(assignee, …)` при назначении сигнала (роуты `POST /api/signals`, `PATCH /api/signals/[id]`). DM, если у участника есть `telegramChatId`, иначе фолбэк в командный чат.
- **Командный чат** (`notifyTeam`, `TELEGRAM_NOTIFY_CHAT_ID`): лента входящих + напоминания о запусках (`/api/cron/launch-reminders`, расписание в `vercel.json`, дедуп через `DecisionHistory`, защита `CRON_SECRET`).

## AI-разбор сигналов
`src/lib/signal-analysis.ts`: тянет текст статьи (`src/lib/article-extractor.ts`), просит модель заполнить поля процесса строго из справочников. Вызов через `createOpenRouterCompletion` с `temperature: 0` + `json: true` (есть retry/backoff). Дедуп/классификация входящих: `src/lib/incoming-news-intelligence.ts`. Справочники (источники, типы, приоритеты, смыслы, распределения, типы публикаций, статусы) — **единый источник правды в `src/lib/store.ts`**.

## Структура (главное)
- `src/components/app.tsx` — оболочка SPA, шапка, колокольчик, бутстрап/авторизация, polling-обновление каждые 20с.
- `src/components/sidebar.tsx` — навигация + список команды (ведёт во вкладку «Участники»).
- `src/components/sections/*` — разделы: `kanban-board`, `incoming-news`, `news-feed`, `calendar`, `contacts`, `members`, `archive`, `analytics`, `help`.
- `src/lib/store.ts` — Zustand-стор + все справочники/константы + тип `Section`.
- `src/app/api/*` — REST: `signals`, `incoming-news` (+`/analyze`,`/convert`,`/[id]`), `events`, `contacts`, `team`, `comments`, `summaries`, `ai/*`, `auth/*`, `cron/*`, `integrations/telegram/webhook`, `news-feed/parse`.

## Конвенции вёрстки (важно, тут были баги)
- **Скролл-модель**: на телефоне (< `md`) скроллится страница (`min-h-[100dvh]`, у `body` НЕТ `overflow:hidden`); на `md+` — фиксированная оболочка `md:h-[100dvh] md:overflow-hidden` с внутренним `md:overflow-y-auto` у `<main>`.
- У flex-детей, где может быть широкий контент, ставь **`min-w-0`** (иначе горизонтальный overflow на мобиле).
- Канбан переключает мобильный/десктоп вид на `md`. Граф (`KanbanGraphView`) — без `overflow-hidden`, ноды ограничены по высоте.
- Стиль — «комикс»: классы `comic-border`/`comic-shadow*`/`comic-btn` и CSS-переменные `--comic-*` в `src/app/globals.css`. Тёмная тема через `next-themes`.

## Команды
- `npm run dev` — дев-сервер (порт 3000, лог в `dev.log`).
- `npx tsc --noEmit` — проверка типов. `npx eslint .` — линт (2 пред-существующие ошибки в `ui/carousel.tsx` и `hooks/use-mobile.ts` — не трогать).
- `npx prisma db push` (с переопределением DATABASE_URL, см. выше) + `npx prisma generate` — после изменений схемы. **После generate перезапускай дев-сервер** (Prisma-клиент кэшируется в памяти).

## Чего НЕ делать
- Не коммить/деплой без явной просьбы пользователя. Деплой — это пуш в `main` (Vercel) или `npx vercel`.
- Не возвращать demo-seed: авто-сид убран, участники появляются только через вход по Telegram.
- Не логировать/не отдавать наружу `loginCode`, токены, секреты (см. `select` в `/api/team`).

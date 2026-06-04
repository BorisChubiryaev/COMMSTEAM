# COMMSTEAM

Локальный запуск Next.js-приложения.

## Требования

- Node.js 20 или новее
- npm

## Первый запуск

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Проверьте файл `.env`. Для локального SQLite достаточно:

   ```env
   DATABASE_URL="file:../db/custom.db"
   ```

   Prisma считает относительный путь от папки `prisma`, поэтому `../db/custom.db`
   указывает на базу в корне проекта. База уже лежит в `db/custom.db`. Если файла
   нет, создайте схему командой:

   ```bash
   npx prisma db push
   ```

3. Сгенерируйте Prisma Client:

   ```bash
   npx prisma generate
   ```

4. Запустите dev-сервер:

   ```bash
   npm run dev
   ```

5. Откройте приложение:

   ```text
   http://localhost:3000
   ```

## Полезные команды

```bash
npm run lint        # проверка ESLint
npm run build       # production-сборка
npm run start       # запуск production-сборки
npm run db:push     # применить Prisma-схему к SQLite
npm run db:generate # сгенерировать Prisma Client
```

## ИИ-функции

В интерфейсе есть ИИ-функции через OpenRouter. Для них добавьте в `.env`:

```env
OPENROUTER_API_KEY="sk-or-v1-..."
AI_MODEL="google/gemini-2.5-flash"
```

Без этих переменных основное приложение запускается, но ИИ-запросы будут возвращать ошибку.

import { extractArticleFromUrl } from '@/lib/article-extractor'

type NewsItem = {
  id: string
  sourceUrl: string
  sourceName: string
  title: string
  description?: string
  excerpt: string
  url: string
}

type SourceResult = {
  sourceUrl: string
  sourceName: string
  items: NewsItem[]
  error?: string
}

const MAX_SOURCES = 8
const MAX_ITEMS_PER_SOURCE = 5

function getSourceName(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return rawUrl
  }
}

function normalizeUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Поддерживаются только http/https ссылки')
  }
  return url
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchHtml(url: URL) {
  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!response.ok) {
    throw new Error(`Сайт вернул HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    throw new Error('Источник не похож на HTML-страницу')
  }

  return response.text()
}

function isArticlePage(html: string, url: URL) {
  const path = url.pathname.toLowerCase()
  return /property=["']og:type["'][^>]+content=["']article["']/i.test(html)
    || /content=["']article["'][^>]+property=["']og:type["']/i.test(html)
    || /"@type"\s*:\s*"NewsArticle"/i.test(html)
    || /\/\d{5,}\/?$/.test(path)
}

function extractCandidateLinks(html: string, baseUrl: URL) {
  const links = new Map<string, string>()
  const blockedPath = /(login|auth|signup|register|profile|weather|tv|horoscope|games|photo|video|tag|search|comments)/i

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const href = match[1]
      const label = stripHtml(match[2])
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
      if (label.length < 24 || label.length > 180) continue

      const url = new URL(href, baseUrl)
      if (url.hostname !== baseUrl.hostname) continue
      if (blockedPath.test(url.pathname)) continue
      if (url.pathname === '/' || url.pathname === baseUrl.pathname) continue

      const normalized = url.toString().replace(/#.*$/, '')
      if (!links.has(normalized)) links.set(normalized, label)
    } catch {
      // Ignore malformed anchors.
    }
  }

  return Array.from(links.entries())
    .map(([url, label]) => ({ url, label }))
    .slice(0, MAX_ITEMS_PER_SOURCE * 3)
}

function toNewsItem(article: Awaited<ReturnType<typeof extractArticleFromUrl>>, sourceUrl: string): NewsItem {
  const title = article.title || article.text.slice(0, 90)
  const textWithoutMeta = article.text
    .replace(title, '')
    .replace(article.description || '', '')
    .trim()
  const hasNavigationNoise = /Политика Экономика Общество|Все сервисы|Регистрация Войти/i.test(textWithoutMeta.slice(0, 240))
  const excerpt = !hasNavigationNoise && textWithoutMeta.length > 160
    ? textWithoutMeta.slice(0, 520)
    : (article.description || article.text.slice(0, 520))

  return {
    id: article.url,
    sourceUrl,
    sourceName: getSourceName(article.url),
    title,
    description: article.description,
    excerpt,
    url: article.url,
  }
}

async function parseSource(rawSourceUrl: string): Promise<SourceResult> {
  const sourceName = getSourceName(rawSourceUrl)

  try {
    const sourceUrl = normalizeUrl(rawSourceUrl)
    const html = await fetchHtml(sourceUrl)

    if (isArticlePage(html, sourceUrl)) {
      const article = await extractArticleFromUrl(sourceUrl.toString())
      return {
        sourceUrl: sourceUrl.toString(),
        sourceName,
        items: [toNewsItem(article, sourceUrl.toString())],
      }
    }

    const candidates = extractCandidateLinks(html, sourceUrl)
    const items: NewsItem[] = []

    for (const candidate of candidates) {
      if (items.length >= MAX_ITEMS_PER_SOURCE) break
      try {
        const article = await extractArticleFromUrl(candidate.url)
        items.push(toNewsItem(article, sourceUrl.toString()))
      } catch {
        // Keep parsing other links from the same source.
      }
    }

    return {
      sourceUrl: sourceUrl.toString(),
      sourceName,
      items,
      error: items.length === 0 ? 'Не удалось найти новости на странице источника' : undefined,
    }
  } catch (error) {
    return {
      sourceUrl: rawSourceUrl,
      sourceName,
      items: [],
      error: error instanceof Error ? error.message : 'Не удалось обработать источник',
    }
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const sources = Array.isArray(body.sources) ? body.sources : []
  const normalizedSources = sources
    .map((source: unknown) => String(source || '').trim())
    .filter(Boolean)
    .slice(0, MAX_SOURCES)

  if (normalizedSources.length === 0) {
    return Response.json({ error: 'Добавьте хотя бы одну ссылку на новость или новостной раздел' }, { status: 400 })
  }

  const results = await Promise.all(normalizedSources.map(parseSource))
  const items = results.flatMap(result => result.items)

  return Response.json({
    items,
    results,
    parsedAt: new Date().toISOString(),
  })
}

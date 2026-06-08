type ExtractedArticle = {
  title?: string
  description?: string
  text: string
  url: string
}

const MAX_ARTICLE_CHARS = 12000
const MIN_ARTICLE_CHARS = 240

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getMetaContent(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return cleanText(match[1])
  }
}

function getTitle(html: string) {
  return getMetaContent(html, 'og:title')
    || getMetaContent(html, 'twitter:title')
    || cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
}

function getDescription(html: string) {
  return getMetaContent(html, 'og:description')
    || getMetaContent(html, 'twitter:description')
    || getMetaContent(html, 'description')
}

function getJsonLdText(html: string) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
  const chunks: string[] = []

  for (const script of scripts) {
    const jsonText = script
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(decodeHtml(jsonText))
      const nodes = Array.isArray(parsed) ? parsed : [parsed]
      for (const node of nodes.flatMap(item => item?.['@graph'] || item)) {
        if (typeof node?.headline === 'string') chunks.push(node.headline)
        if (typeof node?.description === 'string') chunks.push(node.description)
        if (typeof node?.articleBody === 'string') chunks.push(node.articleBody)
      }
    } catch {
      // Some publishers ship invalid or escaped JSON-LD; paragraph fallback handles it.
    }
  }

  return cleanText(chunks.join('\n\n'))
}

function getParagraphText(html: string) {
  const normalized = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')

  const articleMatch = normalized.match(/<article[\s\S]*?<\/article>/i)
  const source = articleMatch?.[0] || normalized
  const paragraphs = Array.from(source.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map(match => cleanText(match[1]))
    .filter(text => text.length > 30)

  return paragraphs.join('\n\n')
}

export async function extractArticleFromUrl(rawUrl: string): Promise<ExtractedArticle> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Некорректная ссылка на новость')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Поддерживаются только http/https ссылки')
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    if (/__qrator|qauth|qrator/i.test(errorBody)) {
      throw new Error('Сайт заблокировал автоматическое чтение страницы через anti-bot защиту')
    }
    throw new Error(`Сайт вернул HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    throw new Error('Ссылка не похожа на HTML-страницу новости')
  }

  const html = await response.text()
  const title = getTitle(html)
  const description = getDescription(html)
  const jsonLdText = getJsonLdText(html)
  const paragraphText = getParagraphText(html)
  const body = jsonLdText.length > paragraphText.length ? jsonLdText : paragraphText
  const text = cleanText([title, description, body].filter(Boolean).join('\n\n')).slice(0, MAX_ARTICLE_CHARS)

  if (text.length < MIN_ARTICLE_CHARS) {
    throw new Error('Не удалось извлечь текст новости по ссылке')
  }

  return {
    title,
    description,
    text,
    url: url.toString(),
  }
}

const MAX_EMBED_BYTES = 4 * 1024 * 1024

function absoluteUrl(url: string, origin?: string): string {
  if (/^(https?:|data:)/i.test(url)) return url
  const base = origin || ''
  if (!base) return url
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export async function embedRemoteImage(
  url: string | null | undefined,
  origin?: string,
): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url

  const abs = absoluteUrl(url, origin)
  try {
    const res = await fetch(abs)
    if (!res.ok) return url
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim()
    if (
      contentType.includes('pdf') ||
      contentType.includes('excel') ||
      contentType.includes('ms-excel') ||
      contentType.includes('spreadsheet') ||
      contentType.includes('msword')
    ) {
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length || buf.length > MAX_EMBED_BYTES) return url
    const mime = contentType.startsWith('image/') ? contentType : 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return url
  }
}

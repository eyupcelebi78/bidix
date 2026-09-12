const SKIP = new Set([
  'LTD', 'LTD.', 'STI', 'STI.', 'AS', 'A.S', 'A.S.',
  'SAN', 'SANAYI', 'TIC', 'VE', 'HIZ', 'HIZMETLERI',
  'SIRKETI', 'ANONIM', 'KOLLEKTIF',
])

function foldTr(s: string): string {
  return s
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİiI]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
}

function cleanToken(raw: string): string {
  return foldTr(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** First 2 meaningful words, max ~14 chars — keeps filenames short. */
export function abbreviateName(name: string, maxWords = 2, maxLen = 14): string {
  const words = name
    .split(/\s+/)
    .map(cleanToken)
    .filter((w) => w.length > 0 && !SKIP.has(w) && w.length > 1)

  const picked = (words.length ? words : ['TEKLIF']).slice(0, maxWords)
  let out = picked.join('-')
  if (out.length > maxLen) out = out.slice(0, maxLen).replace(/-+$/, '')
  return out || 'TEKLIF'
}

export function quotePdfFileName(opts: {
  userId: string
  quoteId: string
  customerName?: string | null
  companyTitle?: string | null
}): string {
  const customer = abbreviateName(opts.customerName || 'MUSTERI')
  const company = abbreviateName(opts.companyTitle || 'FIRMA')
  const shortId = opts.quoteId.replace(/-/g, '').slice(0, 6)
  return `${opts.userId}/${customer}_${company}_${shortId}.pdf`
}

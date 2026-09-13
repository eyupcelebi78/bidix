export interface QuoteProductItem {
  product_id: string | null
  product_name: string
  quantity: number
}

export function quoteDayKey(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
}

export function quoteProductKey(items: QuoteProductItem[] | null | undefined) {
  if (!items || items.length === 0) return ''
  return [...items]
    .map((item) => `${item.product_id || item.product_name}:${Number(item.quantity) || 0}`)
    .sort()
    .join('|')
}

export function quoteBatchKey(createdAt: string | null | undefined, items: QuoteProductItem[] | null | undefined) {
  return `${quoteDayKey(createdAt)}::${quoteProductKey(items)}`
}

export function lowestQuotesOf<T extends { grand_total: number }>(quotes: T[]) {
  if (quotes.length === 0) return []
  const lowest = Math.min(...quotes.map((quote) => Number(quote.grand_total) || 0))
  return quotes.filter((quote) => Math.abs((Number(quote.grand_total) || 0) - lowest) < 0.005)
}

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

export function quoteCustomerKey(quote: {
  customer_id?: string | null
  customer_name?: string | null
  customer_company?: string | null
}) {
  const label = quote.customer_company || quote.customer_name || 'Müşteri belirtilmedi'
  return quote.customer_id || `name:${label}`
}

export function findQuoteBatch<
  T extends {
    id: string
    created_at: string | null
    grand_total: number
    customer_id?: string | null
    customer_name?: string | null
    customer_company?: string | null
    quote_items?: QuoteProductItem[] | null
  },
>(quotes: T[], quoteId: string) {
  const current = quotes.find((quote) => quote.id === quoteId)
  if (!current) return null

  const customerKey = quoteCustomerKey(current)
  const batchKey = quoteBatchKey(current.created_at, current.quote_items)
  const batch = quotes.filter((quote) => {
    return quoteCustomerKey(quote) === customerKey
      && quoteBatchKey(quote.created_at, quote.quote_items) === batchKey
  })
  const mains = lowestQuotesOf(batch)

  return {
    current,
    quotes: batch,
    mainQuotes: mains,
    isLowest: mains.some((quote) => quote.id === quoteId),
    others: batch.filter((quote) => quote.id !== quoteId),
  }
}

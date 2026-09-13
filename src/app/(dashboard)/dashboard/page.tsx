import { createClient } from '@/lib/supabase/server'
import { istanbulDayKey } from '@/lib/money-tr'
import { lowestQuotesOf, quoteBatchKey, type QuoteProductItem } from '@/lib/quote-batches'
import { STATUS_LABEL, type QuoteStatus } from '@/lib/quote-share'
import { DashboardView, type DashboardData } from './dashboard-view'

const STATUS_COLOR: Record<QuoteStatus, string> = {
  draft: '#94a3b8',
  sent: '#38bdf8',
  viewed: '#fbbf24',
  accepted: '#34d399',
  rejected: '#f87171',
}

function shiftDay(key: string, delta: number) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + delta))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayLabel(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  })
}

function greeting() {
  const hour = Number(
    new Date().toLocaleString('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Istanbul',
    }),
  )
  if (hour < 6) return 'İyi geceler'
  if (hour < 12) return 'Günaydın'
  if (hour < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [productsRes, companiesRes, quoteCountRes, quotesRes] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('quotes').select('id', { count: 'exact', head: true }),
    supabase
      .from('quotes')
      .select('id, quote_no, share_token, grand_total, status, created_at, dispatched_at, paid_at, customer_id, customer_name, customer_company, quote_items(product_id, product_name, quantity)')
      .order('created_at', { ascending: false }),
  ])

  const quotes = quotesRes.data || []
  const lowestQuotes = lowestRecentQuotes(quotes)
  const today = istanbulDayKey()
  const seriesDays = Array.from({ length: 14 }, (_, index) => shiftDay(today, index - 13))
  const seriesMap = new Map(seriesDays.map((key) => [key, { amount: 0, count: 0 }]))

  const statusMap: Record<QuoteStatus, number> = {
    draft: 0,
    sent: 0,
    viewed: 0,
    accepted: 0,
    rejected: 0,
  }
  const customerMap = new Map<string, number>()
  let quoteTotal = 0
  let openDebt = 0
  let dispatchedCount = 0
  let paidCount = 0
  let thisWeek = 0
  let lastWeek = 0

  for (const quote of quotes) {
    const amount = Number(quote.grand_total) || 0
    const status = (quote.status || 'draft') as QuoteStatus
    if (status in statusMap) statusMap[status] += 1

    if (quote.dispatched_at) {
      dispatchedCount += 1
      if (quote.paid_at) paidCount += 1
      else openDebt += amount
    }
  }

  for (const quote of lowestQuotes) {
    const amount = Number(quote.grand_total) || 0
    quoteTotal += amount

    const name = quote.customer_company || quote.customer_name || 'Müşteri belirtilmedi'
    customerMap.set(name, (customerMap.get(name) || 0) + amount)

    if (!quote.created_at) continue
    const key = istanbulDayKey(quote.created_at)
    const point = seriesMap.get(key)
    if (point) {
      point.amount += amount
      point.count += 1
    }

    const age = seriesDays.indexOf(key)
    if (age >= 7) thisWeek += amount
    else if (age >= 0) lastWeek += amount
  }

  const weekDelta = lastWeek === 0
    ? (thisWeek > 0 ? 100 : 0)
    : Math.round(((thisWeek - lastWeek) / lastWeek) * 100)

  const data: DashboardData = {
    greeting: greeting(),
    productCount: productsRes.count || 0,
    companyCount: companiesRes.count || 0,
    quoteCount: quoteCountRes.count || quotes.length,
    quoteTotal,
    openDebt,
    dispatchedCount,
    paidCount,
    weekDelta,
    series: seriesDays.map((key) => {
      const point = seriesMap.get(key) || { amount: 0, count: 0 }
      return { key, label: dayLabel(key), amount: point.amount, count: point.count }
    }),
    statuses: (Object.keys(statusMap) as QuoteStatus[])
      .filter((key) => statusMap[key] > 0)
      .map((key) => ({
        key,
        label: STATUS_LABEL[key],
        value: statusMap[key],
        color: STATUS_COLOR[key],
      })),
    topCustomers: [...customerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount })),
    recent: lowestQuotes.slice(0, 6).map((quote) => ({
      id: quote.id,
      quoteNo: quote.quote_no,
      shareToken: quote.share_token,
      customer: quote.customer_company || quote.customer_name || 'Müşteri belirtilmedi',
      amount: Number(quote.grand_total) || 0,
      createdAt: quote.created_at || '',
      status: (quote.status || 'draft') as QuoteStatus,
    })),
  }

  return <DashboardView data={data} />
}

function lowestRecentQuotes(
  quotes: Array<{
    id: string
    quote_no: string | null
    share_token: string
    grand_total: number
    status: string
    created_at: string | null
    customer_id: string | null
    customer_name: string | null
    customer_company: string | null
    quote_items?: QuoteProductItem[] | null
  }>,
) {
  const byCustomer = new Map<string, typeof quotes>()

  for (const quote of quotes) {
    const label = quote.customer_company || quote.customer_name || 'Müşteri belirtilmedi'
    const key = quote.customer_id || `name:${label}`
    const list = byCustomer.get(key)
    if (list) list.push(quote)
    else byCustomer.set(key, [quote])
  }

  const mains: typeof quotes = []
  for (const list of byCustomer.values()) {
    const batches = new Map<string, typeof quotes>()
    for (const quote of list) {
      const key = quoteBatchKey(quote.created_at, quote.quote_items)
      const batch = batches.get(key)
      if (batch) batch.push(quote)
      else batches.set(key, [quote])
    }
    for (const batch of batches.values()) {
      mains.push(...lowestQuotesOf(batch))
    }
  }

  return mains.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

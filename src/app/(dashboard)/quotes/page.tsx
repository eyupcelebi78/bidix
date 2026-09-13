'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileText, Loader2, ExternalLink, Trash2, User, FilePlus, ChevronDown, Truck } from 'lucide-react'
import Link from 'next/link'
import { QuoteShareButtons } from '@/components/quote-share-buttons'
import { QuoteStatus, STATUS_LABEL } from '@/lib/quote-share'
import { lowestQuotesOf, quoteBatchKey, QuoteProductItem } from '@/lib/quote-batches'

interface CompanyInfo {
  id: string
  title: string
  multiplier: number
}

interface CustomerInfo {
  id: string
  name: string
  tax_no: string
  phone: string | null
  email: string | null
}

interface Quote {
  id: string
  quote_no: string | null
  share_token: string
  status: QuoteStatus
  customer_id: string | null
  customer_name: string | null
  customer_company: string | null
  subtotal: number
  vat_total: number
  grand_total: number
  pdf_url: string | null
  created_at: string
  dispatched_at: string | null
  company: CompanyInfo | CompanyInfo[] | null
  customer: CustomerInfo | CustomerInfo[] | null
  quote_items?: QuoteProductItem[] | null
}

type QuoteBatch = {
  key: string
  dateLabel: string
  quotes: Quote[]
  mainQuotes: Quote[]
  otherQuotes: Quote[]
}

type CustomerGroup = {
  key: string
  customer: CustomerInfo | null
  label: string
  taxNo: string | null
  quotes: Quote[]
  batches: QuoteBatch[]
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showOthers, setShowOthers] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  const fetchQuotes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_no,
        share_token,
        status,
        customer_id,
        customer_name,
        customer_company,
        subtotal,
        vat_total,
        grand_total,
        pdf_url,
        created_at,
        dispatched_at,
        company:companies(id, title, multiplier),
        customer:customers(id, name, tax_no, phone, email),
        quote_items(product_id, product_name, quantity)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      toast.error('Teklifler yüklenemedi')
      console.error(error)
      return
    }

    setQuotes(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return

    // Önce quote_items'ları sil
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', id)

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Teklif silinemedi')
      return
    }

    toast.success('Teklif silindi')
    fetchQuotes()
  }

  const handleDispatch = async (quote: Quote) => {
    if (quote.dispatched_at) return
    const amount = formatCurrency(Number(quote.grand_total) || 0)
    if (!confirm(`Bu teklif (${amount}) sevk ve fatura kesildi olarak işaretlensin mi?`)) {
      return
    }

    const { error } = await supabase
      .from('quotes')
      .update({ dispatched_at: new Date().toISOString() })
      .eq('id', quote.id)

    if (error) {
      toast.error('Sevk kaydedilemedi')
      return
    }

    toast.success('Teklif sevk edildi — ekstreye düştü')
    fetchQuotes()
  }

  const handleCancelDispatch = async (quote: Quote) => {
    if (!quote.dispatched_at) return
    if (!confirm('Sevk iptal edilsin mi? Teklif ekstrenden de kalkar.')) return

    const { error } = await supabase
      .from('quotes')
      .update({ dispatched_at: null, paid_at: null })
      .eq('id', quote.id)

    if (error) {
      toast.error('Sevk iptal edilemedi')
      return
    }

    toast.success('Sevk iptal edildi — ekstrenden silindi')
    fetchQuotes()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getRemainingDays = (createdAt: string) => {
    const created = new Date(createdAt)
    const expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const diffTime = expiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getStatusBadge = (status: QuoteStatus) => {
    const styles: Record<QuoteStatus, string> = {
      draft: 'bg-slate-600/40 text-slate-300',
      sent: 'bg-sky-500/15 text-sky-300',
      viewed: 'bg-amber-500/15 text-amber-300',
      accepted: 'bg-emerald-500/15 text-emerald-300',
      rejected: 'bg-red-500/15 text-red-300',
    }
    return <Badge className={`font-normal ${styles[status] || styles.draft}`}>{STATUS_LABEL[status] || status}</Badge>
  }

  // Helper to get company from array or object
  const getCompany = (company: CompanyInfo | CompanyInfo[] | null): CompanyInfo | null => {
    if (!company) return null
    if (Array.isArray(company)) return company[0] || null
    return company
  }

  const getCustomer = (customer: CustomerInfo | CustomerInfo[] | null): CustomerInfo | null => {
    if (!customer) return null
    if (Array.isArray(customer)) return customer[0] || null
    return customer
  }

  const groups: CustomerGroup[] = (() => {
    const map = new Map<string, CustomerGroup>()
    for (const q of quotes) {
      const customer = getCustomer(q.customer)
      const label = customer?.name || q.customer_company || q.customer_name || 'Müşteri belirtilmedi'
      const key = customer?.id || q.customer_id || `name:${label}`
      const existing = map.get(key)
      if (existing) {
        existing.quotes.push(q)
      } else {
        map.set(key, {
          key,
          customer,
          label,
          taxNo: customer?.tax_no ?? null,
          quotes: [q],
          batches: [],
        })
      }
    }

    return [...map.values()].map((group) => {
      const batchMap = new Map<string, Quote[]>()
      for (const quote of group.quotes) {
        const key = quoteBatchKey(quote.created_at, quote.quote_items)
        const list = batchMap.get(key)
        if (list) list.push(quote)
        else batchMap.set(key, [quote])
      }

      const batches: QuoteBatch[] = [...batchMap.entries()].map(([key, batchQuotes]) => {
        const mainQuotes = lowestQuotesOf(batchQuotes)
        return {
          key,
          dateLabel: batchQuotes[0]?.created_at
            ? new Date(batchQuotes[0].created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
            : '',
          quotes: batchQuotes,
          mainQuotes,
          otherQuotes: batchQuotes.filter((quote) => !mainQuotes.some((main) => main.id === quote.id)),
        }
      }).sort((a, b) => {
        const aDate = a.quotes[0]?.created_at || ''
        const bDate = b.quotes[0]?.created_at || ''
        return bDate.localeCompare(aDate)
      })

      return { ...group, batches }
    }).sort((a, b) => {
      const aDate = a.quotes[0]?.created_at || ''
      const bDate = b.quotes[0]?.created_at || ''
      return bDate.localeCompare(aDate)
    })
  })()

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleOthers = (key: string) => {
    setShowOthers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderQuoteRow = (quote: Quote, opts?: { muted?: boolean; canSevk?: boolean; isLowest?: boolean }) => {
    const muted = opts?.muted === true
    const canSevk = opts?.canSevk === true && !quote.dispatched_at
    const company = getCompany(quote.company)
    const customer = getCustomer(quote.customer)
    const daysLeft = getRemainingDays(quote.created_at)
    const extra = company && company.multiplier !== 1
      ? ` · +%${Math.round((company.multiplier - 1) * 100)}`
      : ''

    return (
      <div
        key={quote.id}
        className={`flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center ${
          muted ? 'bg-slate-950/35' : 'hover:bg-slate-700/20'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-medium ${muted ? 'text-slate-400' : 'text-white'}`}>
              {quote.quote_no || quote.id.slice(0, 8).toUpperCase()}
            </span>
            {opts?.isLowest && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/80">
                En düşük
              </span>
            )}
            {getStatusBadge(quote.status)}
            {quote.dispatched_at && (
              <Badge className="bg-amber-500/15 font-normal text-amber-300">Sevk</Badge>
            )}
            {daysLeft <= 3 && (
              <span className={`text-xs ${daysLeft <= 1 ? 'text-red-400' : 'text-amber-400/80'}`}>
                {daysLeft <= 1 ? 'Son gün' : `${daysLeft} gün`}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-slate-400">
            {company?.title || 'Firma yok'}
            {extra}
            <span className="text-slate-600"> · {formatDate(quote.created_at)}</span>
          </p>
        </div>

        <p className={`tabular-nums text-lg font-semibold md:w-40 md:text-right ${muted ? 'text-slate-400' : 'text-white'}`}>
          {formatCurrency(quote.grand_total)}
        </p>

        <div className="flex flex-wrap items-center gap-1 md:justify-end">
          <QuoteShareButtons
            quote={{
              id: quote.id,
              share_token: quote.share_token,
              quote_no: quote.quote_no,
              grand_total: quote.grand_total,
              status: quote.status,
              customer_name: quote.customer_name,
              customer_company: quote.customer_company,
            }}
            customer={customer}
            companyTitle={company?.title || null}
            onSent={fetchQuotes}
          />
          {quote.pdf_url ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => window.open(quote.pdf_url!, '_blank')}
              className="text-slate-400 hover:bg-slate-700/60 hover:text-white"
              title="PDF aç"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          ) : null}
          {canSevk && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleDispatch(quote)}
              className="h-8 bg-amber-500 px-2.5 text-xs text-slate-950 hover:bg-amber-400"
            >
              <Truck className="h-3.5 w-3.5" />
              Sevk
            </Button>
          )}
          {opts?.canSevk && quote.dispatched_at && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleCancelDispatch(quote)}
              className="h-8 px-2 text-xs text-amber-300 hover:bg-amber-500/10"
            >
              Sevk iptal
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDelete(quote.id)}
            className="text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Teklifler</h1>
          <p className="mt-1 text-slate-400">
            Müşteriye göre gruplu. Aynı gün ve ürünler bir tur, en düşük teklif önde.
          </p>
        </div>
        <Link href="/quotes/new">
          <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500">
            <FilePlus className="mr-2 h-4 w-4" />
            Yeni Teklif
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : quotes.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-500" />
            <p className="text-lg text-slate-300">Henüz teklif oluşturulmamış</p>
            <p className="text-sm text-slate-500 mb-4">İlk teklifinizi oluşturmak için başlayın</p>
            <Link href="/quotes/new">
              <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500">
                <FilePlus className="mr-2 h-4 w-4" />
                Teklif Oluştur
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isCollapsed = collapsed[group.key] === true
            const sevkCount = group.quotes.filter((quote) => quote.dispatched_at).length
            const meta = [
              group.taxNo ? `VKN ${group.taxNo}` : null,
              `${group.quotes.length} teklif`,
              group.batches.length > 1 ? `${group.batches.length} tur` : null,
              sevkCount > 0 ? `${sevkCount} sevk` : null,
            ].filter(Boolean).join(' · ')

            return (
              <Card key={group.key} className="overflow-hidden border-slate-700/80 bg-slate-800/40">
                <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/12">
                      <User className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{group.label}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                        isCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                  </button>
                  <Link href={`/ekstre?musteri=${encodeURIComponent(group.key)}`} className="shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                    >
                      Ekstre
                    </Button>
                  </Link>
                </div>

                {!isCollapsed && (
                  <div className="border-t border-slate-700/80">
                    {group.batches.map((batch) => {
                      const batchKey = `${group.key}::${batch.key}`
                      const othersOpen = showOthers[batchKey] === true
                      const itemCount = batch.quotes[0]?.quote_items?.length || 0
                      const showLowestLabel = batch.otherQuotes.length > 0
                      return (
                        <div key={batch.key} className="border-b border-slate-700/70 last:border-b-0">
                          <div className="flex items-center gap-3 px-4 pt-3 pb-1">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              {batch.dateLabel}
                              {itemCount > 0 ? ` · ${itemCount} ürün` : ''}
                            </p>
                            <span className="h-px flex-1 bg-slate-700/70" />
                            <p className="text-[11px] text-slate-500">{batch.quotes.length} teklif</p>
                          </div>
                          <div className="divide-y divide-slate-700/60">
                            {batch.mainQuotes.map((quote) =>
                              renderQuoteRow(quote, { canSevk: true, isLowest: showLowestLabel }),
                            )}
                            {othersOpen && batch.otherQuotes.map((quote) => renderQuoteRow(quote, { muted: true }))}
                          </div>
                          {batch.otherQuotes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleOthers(batchKey)}
                              className="flex w-full items-center justify-center gap-1 px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-800/70 hover:text-slate-300"
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${othersOpen ? 'rotate-180' : ''}`} />
                              {othersOpen
                                ? 'Diğer teklifleri gizle'
                                : `Diğer ${batch.otherQuotes.length} teklifi göster`}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {quotes.length > 0 && (
        <p className="text-center text-sm text-slate-500">
          {groups.length} müşteri · {quotes.length} teklif
        </p>
      )}
    </div>
  )
}


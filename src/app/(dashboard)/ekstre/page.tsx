'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { amountToWords, averageTermDays, formatDays, formatLedgerDate, formatMoney } from '@/lib/money-tr'
import {
  BookOpen,
  Building2,
  FileDown,
  Hash,
  Loader2,
  Printer,
  ScrollText,
  Search,
  Truck,
  User,
} from 'lucide-react'

interface CompanyInfo {
  id: string
  title: string
}

interface CustomerInfo {
  id: string
  name: string
  tax_no: string
}

interface DispatchedQuote {
  id: string
  quote_no: string | null
  customer_id: string | null
  customer_name: string | null
  customer_company: string | null
  subtotal: number
  vat_total: number
  grand_total: number
  dispatched_at: string
  paid_at: string | null
  created_at: string
  company: CompanyInfo | CompanyInfo[] | null
  customer: CustomerInfo | CustomerInfo[] | null
}

function unwrap<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export default function EkstrePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <EkstreContent />
    </Suspense>
  )
}

function EkstreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusCustomer = searchParams.get('musteri')
  const requestedPage = Number(searchParams.get('sayfa'))
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1
  const [quotes, setQuotes] = useState<DispatchedQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<CustomerInfo[]>([])
  const [searching, setSearching] = useState(false)
  const [showDebtList, setShowDebtList] = useState(false)
  const supabase = createClient()

  const fetchDispatched = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let request = supabase
      .from('quotes')
      .select(`
        id,
        quote_no,
        customer_id,
        customer_name,
        customer_company,
        subtotal,
        vat_total,
        grand_total,
        dispatched_at,
        paid_at,
        created_at,
        company:companies(id, title),
        customer:customers(id, name, tax_no)
      `)
      .not('dispatched_at', 'is', null)
      .order('dispatched_at', { ascending: true })

    if (focusCustomer && !focusCustomer.startsWith('name:')) {
      request = request.eq('customer_id', focusCustomer)
    }

    const { data, error } = await request

    if (error) {
      toast.error('Ekstre yüklenemedi')
      console.error(error)
      setLoading(false)
      return
    }

    const rows = (data || []) as DispatchedQuote[]
    setQuotes(
      focusCustomer?.startsWith('name:')
        ? rows.filter((quote) => {
            const label = quote.customer_company || quote.customer_name || 'Müşteri belirtilmedi'
            return `name:${label}` === focusCustomer
          })
        : rows,
    )
    setLoading(false)
  }, [focusCustomer, supabase])

  useEffect(() => {
    setLoading(true)
    fetchDispatched()
  }, [fetchDispatched])

  useEffect(() => {
    if (focusCustomer) setShowDebtList(false)
  }, [focusCustomer])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 3) {
      setMatches([])
      setSearching(false)
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setSearching(true)
      const safe = term.replace(/[%_,()]/g, '')
      if (safe.length < 3) {
        if (active) {
          setMatches([])
          setSearching(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, tax_no')
        .or(`name.ilike.%${safe}%,tax_no.ilike.%${safe}%`)
        .order('name')
        .limit(12)

      if (!active) return
      if (error) {
        toast.error('Müşteri aranamadı')
        setMatches([])
      } else {
        setMatches(data || [])
      }
      setSearching(false)
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, supabase])

  const groups = useMemo(() => {
    const map = new Map<string, {
      key: string
      customerId: string | null
      label: string
      taxNo: string | null
      quotes: DispatchedQuote[]
    }>()

    for (const quote of quotes) {
      const customer = unwrap(quote.customer)
      const label = customer?.name || quote.customer_company || quote.customer_name || 'Müşteri belirtilmedi'
      const key = customer?.id || quote.customer_id || `name:${label}`
      const existing = map.get(key)
      if (existing) {
        existing.quotes.push(quote)
      } else {
        map.set(key, {
          key,
          customerId: customer?.id || quote.customer_id || null,
          label,
          taxNo: customer?.tax_no ?? null,
          quotes: [quote],
        })
      }
    }

    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'tr'))
  }, [quotes])

  const debtRows = useMemo(() => {
    return groups
      .map((group) => {
        const unpaid = group.quotes.filter((quote) => !quote.paid_at)
        const remaining = unpaid.reduce((sum, quote) => sum + (Number(quote.grand_total) || 0), 0)
        const avgDays = averageTermDays(
          unpaid.map((quote) => ({
            amount: Number(quote.grand_total) || 0,
            from: quote.dispatched_at || quote.created_at,
          })),
        )
        return {
          key: group.key,
          label: group.label,
          taxNo: group.taxNo,
          remaining,
          avgDays,
          unpaidCount: unpaid.length,
        }
      })
      .filter((row) => row.remaining > 0.004)
      .sort((a, b) => b.remaining - a.remaining || a.label.localeCompare(b.label, 'tr'))
  }, [groups])

  const debtTotals = useMemo(() => {
    const remaining = debtRows.reduce((sum, row) => sum + row.remaining, 0)
    const unpaid = groups.flatMap((group) => group.quotes.filter((quote) => !quote.paid_at))
    return {
      remaining,
      avgDays: averageTermDays(
        unpaid.map((quote) => ({
          amount: Number(quote.grand_total) || 0,
          from: quote.dispatched_at || quote.created_at,
        })),
      ),
      customers: debtRows.length,
    }
  }, [debtRows, groups])

  const PAGE_SIZE = 20
  const totalPages = focusCustomer ? 1 : Math.max(1, Math.ceil(groups.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleGroups = focusCustomer
    ? groups.filter((group) => group.key === focusCustomer || group.customerId === focusCustomer)
    : groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const markPaid = async (quoteId: string, paid: boolean) => {
    const { error } = await supabase
      .from('quotes')
      .update({ paid_at: paid ? new Date().toISOString() : null })
      .eq('id', quoteId)

    if (error) {
      toast.error('Ödeme kaydedilemedi')
      return
    }

    toast.success(paid ? 'Ödeme alındı — borçtan düşüldü' : 'Ödeme geri alındı')
    fetchDispatched()
  }

  const totals = visibleGroups.reduce(
    (acc, group) => {
      for (const quote of group.quotes) {
        const amount = Number(quote.grand_total) || 0
        acc.debit += amount
        if (quote.paid_at) acc.credit += amount
      }
      acc.docs += group.quotes.length
      return acc
    },
    { debit: 0, credit: 0, docs: 0 },
  )
  const openBalance = totals.debit - totals.credit

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80">Muhasebe</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Cari Ekstre</h1>
          <p className="mt-1 text-slate-400">
            {showDebtList
              ? 'Müşteri adı, kalan borç ve ödenmeyen sevklerin ortalama vadesi.'
              : 'Sayfada 20 müşteri ekstresi. Arama 3 harften sonra kısayoldur.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {focusCustomer && (
            <Link href="/ekstre">
              <Button variant="outline" className="border-slate-600 text-slate-200">
                Tüm ekstreler
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            className={
              showDebtList
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                : 'border-slate-600 text-slate-200'
            }
            onClick={() => setShowDebtList((open) => !open)}
            disabled={groups.length === 0}
          >
            <ScrollText className="mr-2 h-4 w-4" />
            {showDebtList ? 'Ekstreye dön' : 'Borç Listesi'}
          </Button>
          {showDebtList && (
            <Button
              type="button"
              variant="outline"
              className="border-slate-600 text-slate-200"
              disabled={debtRows.length === 0}
              onClick={() => {
                downloadDebtListExcel(debtRows, debtTotals)
                toast.success('Excel indirildi')
              }}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Excel
            </Button>
          )}
          <Button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400"
            disabled={showDebtList ? debtRows.length === 0 : visibleGroups.length === 0}
          >
            <Printer className="mr-2 h-4 w-4" />
            Yazdır
          </Button>
        </div>
      </div>

      {showDebtList ? (
        <DebtListCard rows={debtRows} totals={debtTotals} />
      ) : (
      <>
      <div className="relative print:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Müşteri adı veya VKN — en az 3 karakter"
          className="border-slate-600 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
        />
        {query.trim().length > 0 && query.trim().length < 3 && (
          <p className="mt-2 text-xs text-slate-500">Arama için 3 karakter yaz.</p>
        )}
        {(searching || matches.length > 0) && query.trim().length >= 3 && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-xl">
            {searching && (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aranıyor…
              </div>
            )}
            {!searching && matches.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  setQuery('')
                  setMatches([])
                  router.push(`/ekstre?musteri=${customer.id}`)
                }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-slate-700/70"
              >
                <span className="text-sm text-white">{customer.name}</span>
                <span className="text-xs text-slate-400">VKN {customer.tax_no}</span>
              </button>
            ))}
            {!searching && matches.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-400">Eşleşen müşteri yok.</p>
            )}
          </div>
        )}
      </div>

      {visibleGroups.length > 0 && (
        <div className="grid gap-3 print:hidden sm:grid-cols-3">
          <SummaryCard
            label="Müşteri"
            value={focusCustomer ? '1' : `${visibleGroups.length} / ${groups.length}`}
          />
          <SummaryCard label="Sevk belgesi" value={String(totals.docs)} />
          <SummaryCard label="Kalan borç" value={formatMoney(openBalance)} accent />
        </div>
      )}

      {visibleGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
          <p className="mt-4 text-lg text-slate-200">
            {focusCustomer ? 'Bu müşteride sevk yok' : 'Henüz sevk yok'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Teklifler sayfasında ilgili turun en düşük teklifine Sevk basınca ekstre burada oluşur.
          </p>
          <Link href="/quotes">
            <Button className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950">
              <Truck className="mr-2 h-4 w-4" />
              Tekliflere dön
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleGroups.map((group) => (
            <StatementCard key={group.key} group={group} onTogglePaid={markPaid} />
          ))}
          {!focusCustomer && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 print:hidden">
              <Link
                href={currentPage <= 2 ? '/ekstre' : `/ekstre?sayfa=${currentPage - 1}`}
                className={`rounded-lg border border-slate-600 px-3 py-1.5 text-sm ${
                  currentPage <= 1 ? 'pointer-events-none text-slate-600' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                Önceki
              </Link>
              <span className="text-sm text-slate-400">
                Sayfa {currentPage} / {totalPages}
              </span>
              <Link
                href={currentPage >= totalPages ? `/ekstre?sayfa=${currentPage}` : `/ekstre?sayfa=${currentPage + 1}`}
                className={`rounded-lg border border-slate-600 px-3 py-1.5 text-sm ${
                  currentPage >= totalPages ? 'pointer-events-none text-slate-600' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                Sonraki
              </Link>
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  )
}

type DebtRow = {
  key: string
  label: string
  taxNo: string | null
  remaining: number
  avgDays: number
  unpaidCount: number
}

function downloadDebtListExcel(
  rows: DebtRow[],
  totals: { remaining: number; avgDays: number; customers: number },
) {
  const today = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
  const fileDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
  const unpaidDocs = rows.reduce((sum, row) => sum + row.unpaidCount, 0)

  const sheet = [
    ['Cari borç listesi'],
    [`Tarih: ${today}`],
    [`Müşteri: ${totals.customers}`],
    [],
    ['Müşteri', 'VKN', 'Açık belge', 'Ort. vade (gün)', 'Kalan borç (₺)'],
    ...rows.map((row) => [
      row.label,
      row.taxNo || '',
      row.unpaidCount,
      row.avgDays,
      Number(row.remaining.toFixed(2)),
    ]),
    ['Toplam', '', unpaidDocs, totals.avgDays, Number(totals.remaining.toFixed(2))],
  ]

  const ws = XLSX.utils.aoa_to_sheet(sheet)
  ws['!cols'] = [
    { wch: 36 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Borç Listesi')
  XLSX.writeFile(wb, `cari-borc-listesi-${fileDate}.xlsx`)
}

function DebtListCard({
  rows,
  totals,
}: {
  rows: DebtRow[]
  totals: { remaining: number; avgDays: number; customers: number }
}) {
  const today = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
        <ScrollText className="mx-auto h-10 w-10 text-slate-500" />
        <p className="mt-4 text-lg text-slate-200">Açık borç yok</p>
        <p className="mt-1 text-sm text-slate-500">Ödenmemiş sevk kalmayınca liste boş kalır.</p>
      </div>
    )
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-amber-900/20 bg-[#f4efe4] text-stone-900 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)] print:shadow-none">
      <div className="border-b border-stone-300/80 bg-[#ebe4d4] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-800/80">
              Cari borç listesi
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Müşteri bakiyeleri</h2>
            <p className="mt-2 text-xs text-stone-600">
              {today} · {totals.customers} müşteri · Ort. vade {formatDays(totals.avgDays)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-stone-500">Bidix</p>
            <p className="mt-1 text-lg font-semibold">{formatMoney(totals.remaining)}</p>
            <p className="text-xs text-stone-500">Toplam kalan borç</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-400/70 text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-2 pr-3 font-semibold">Müşteri</th>
                <th className="py-2 pr-3 text-right font-semibold">Açık belge</th>
                <th className="py-2 pr-3 text-right font-semibold">Ort. vade</th>
                <th className="py-2 text-right font-semibold">Kalan borç</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-stone-300/70">
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/ekstre?musteri=${encodeURIComponent(row.key)}`}
                      className="font-medium underline-offset-2 hover:underline print:no-underline"
                    >
                      {row.label}
                    </Link>
                    {row.taxNo && (
                      <p className="mt-0.5 text-xs text-stone-500">VKN {row.taxNo}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-stone-600">
                    {row.unpaidCount}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums font-medium">
                    {formatDays(row.avgDays)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">
                    {formatMoney(row.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm">
                <td className="pt-4 font-semibold">Toplam</td>
                <td className="pt-4 text-right tabular-nums text-stone-600">
                  {rows.reduce((sum, row) => sum + row.unpaidCount, 0)}
                </td>
                <td className="pt-4 text-right tabular-nums font-medium">
                  {formatDays(totals.avgDays)}
                </td>
                <td className="pt-4 text-right tabular-nums text-lg font-semibold">
                  {formatMoney(totals.remaining)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-xs italic text-stone-600">
          Ort. vade, ödenmeyen sevklerin tutarına göre ağırlıklı ortalamasıdır. Sevk tarihinden bugüne gün sayısı alınır.
        </p>
      </div>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function StatementCard({
  group,
  onTogglePaid,
}: {
  group: {
    key: string
    customerId: string | null
    label: string
    taxNo: string | null
    quotes: DispatchedQuote[]
  }
  onTogglePaid: (quoteId: string, paid: boolean) => void
}) {
  let running = 0
  const rows = group.quotes.map((quote) => {
    const debit = Number(quote.grand_total) || 0
    const credit = quote.paid_at ? debit : 0
    running += debit - credit
    const company = unwrap(quote.company)
    return { quote, company, debit, credit, balance: running }
  })
  const remaining = running
  const vat = group.quotes.reduce((sum, quote) => sum + (Number(quote.vat_total) || 0), 0)

  return (
    <article className="overflow-hidden rounded-2xl border border-amber-900/20 bg-[#f4efe4] text-stone-900 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)] print:break-inside-avoid print:shadow-none">
      <div className="border-b border-stone-300/80 bg-[#ebe4d4] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-800/80">
              Cari hesap ekstresi
            </p>
            <h2 className="mt-1 flex items-start gap-2 text-xl font-semibold tracking-tight">
              <User className="mt-1 h-5 w-5 shrink-0 text-amber-800" />
              {group.key ? (
                <Link
                  href={`/ekstre?musteri=${encodeURIComponent(group.key)}`}
                  className="break-words underline-offset-4 hover:underline print:no-underline"
                >
                  {group.label}
                </Link>
              ) : (
                <span>{group.label}</span>
              )}
            </h2>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-600">
              {group.taxNo && (
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  VKN {group.taxNo}
                </span>
              )}
              <span>{rows.length} sevk belgesi</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-stone-500">Bidix</p>
            <Badge className="mt-1 bg-amber-700 text-amber-50 hover:bg-amber-700">
              Sevk / Fatura
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-400/70 text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-2 pr-3 font-semibold">Tarih</th>
                <th className="py-2 pr-3 font-semibold">Belge</th>
                <th className="py-2 pr-3 font-semibold">Açıklama</th>
                <th className="py-2 pr-3 text-right font-semibold">KDV</th>
                <th className="py-2 pr-3 text-right font-semibold">Borç</th>
                <th className="py-2 pr-3 text-right font-semibold">Alacak</th>
                <th className="py-2 pr-3 text-right font-semibold">Bakiye</th>
                <th className="py-2 text-right font-semibold print:hidden"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ quote, company, debit, credit, balance }) => (
                <tr key={quote.id} className="border-b border-stone-300/70">
                  <td className="py-2.5 pr-3 tabular-nums text-stone-700">
                    {formatLedgerDate(quote.dispatched_at || quote.created_at)}
                  </td>
                  <td className="py-2.5 pr-3 font-medium">
                    {quote.quote_no || quote.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-start gap-1.5">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                      <span>
                        Sevk ve fatura —{' '}
                        {company?.id ? (
                          <Link
                            href={`/companies/${company.id}`}
                            className="underline-offset-2 hover:underline print:no-underline"
                          >
                            {company.title}
                          </Link>
                        ) : (
                          company?.title || 'Firma'
                        )}
                        {quote.paid_at ? ' · Tahsil edildi' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-stone-600">
                    {formatMoney(Number(quote.vat_total) || 0)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums font-medium">
                    {formatMoney(debit)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-800">
                    {credit > 0 ? formatMoney(credit) : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                    {formatMoney(balance)}
                  </td>
                  <td className="py-2.5 text-right print:hidden">
                    {quote.paid_at ? (
                      <button
                        type="button"
                        onClick={() => onTogglePaid(quote.id, false)}
                        className="rounded-full border border-stone-400 px-2 py-0.5 text-[11px] text-stone-500 hover:bg-stone-200"
                      >
                        Geri al
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onTogglePaid(quote.id, true)}
                        className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-medium text-emerald-50 hover:bg-emerald-800"
                      >
                        Ödendi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-stone-400/70 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xl text-xs italic leading-relaxed text-stone-600">
            Yalnız {amountToWords(remaining)}. Kalan borç, ödenen satırlar düşüldükten sonradır.
          </p>
          <div className="text-right text-sm">
            <p className="text-stone-500">KDV {formatMoney(vat)}</p>
            <p className="text-lg font-semibold tracking-tight">Kalan {formatMoney(remaining)}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

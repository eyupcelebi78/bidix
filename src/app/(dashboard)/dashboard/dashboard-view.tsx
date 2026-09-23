'use client'

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/money-tr'
import { quoteSharePath, STATUS_LABEL, type QuoteStatus } from '@/lib/quote-share'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  ExternalLink,
  Pencil,
  FilePlus,
  FileStack,
  Package,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react'

export interface DashboardData {
  greeting: string
  productCount: number
  companyCount: number
  quoteCount: number
  quoteTotal: number
  openDebt: number
  dispatchedCount: number
  paidCount: number
  weekDelta: number
  series: { key: string; label: string; amount: number; count: number }[]
  statuses: { key: QuoteStatus; label: string; value: number; color: string }[]
  topCustomers: { name: string; amount: number }[]
  recent: {
    id: string
    quoteNo: string | null
    shareToken: string
    customer: string
    amount: number
    createdAt: string
    status: QuoteStatus
  }[]
}

const STATUS_STYLE: Record<QuoteStatus, string> = {
  draft: 'bg-slate-600/40 text-slate-300',
  sent: 'bg-sky-500/15 text-sky-300',
  viewed: 'bg-amber-500/15 text-amber-300',
  accepted: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || target === 0) {
      setValue(target)
      return
    }
    setValue(0)
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      setValue(target * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number; payload?: { count?: number } }>
  label?: string
}) {
  if (!active || !payload?.[0]) return null
  const value = Number(payload[0].value) || 0
  const count = payload[0].payload?.count
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-white">{formatMoney(value)}</p>
      {typeof count === 'number' && <p className="text-slate-500">{count} teklif</p>}
    </div>
  )
}

function StatCard({
  label,
  target,
  format,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  target: number
  format: (value: number) => string
  hint?: ReactNode
  icon: ComponentType<{ className?: string }>
  tone: string
}) {
  const value = useCountUp(target)
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-white">{format(value)}</p>
          {hint}
        </div>
        <div className={`shrink-0 rounded-xl bg-gradient-to-br p-2.5 text-white ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function RevenueChart({ series }: { series: DashboardData['series'] }) {
  const ticks = useMemo(
    () => series.filter((_, index) => index % 2 === 0).map((row) => row.label),
    [series],
  )

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <AreaChart data={series} margin={{ top: 12, right: 12, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="quoteFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e293b" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="label"
            ticks={ticks}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={16}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(value) =>
              Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)} bin` : String(value)
            }
          />
          <Tooltip content={<ChartTip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#34d399"
            strokeWidth={2}
            fill="url(#quoteFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DashboardView({ data }: { data: DashboardData }) {
  const empty = data.quoteCount === 0
  const statusTotal = data.statuses.reduce((sum, row) => sum + row.value, 0) || 1
  const maxCustomer = Math.max(...data.topCustomers.map((row) => row.amount), 1)
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Istanbul',
      }),
    [],
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
            {todayLabel}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">{data.greeting}</h1>
          <p className="mt-1 text-slate-400">Teklif, sevk ve tahsilatın özeti.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quotes/new">
            <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500">
              <FilePlus className="mr-2 h-4 w-4" />
              Yeni Teklif
            </Button>
          </Link>
          <Link href="/ekstre">
            <Button variant="outline" className="border-slate-600 text-slate-200">
              <BookOpen className="mr-2 h-4 w-4" />
              Ekstre
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Teklif"
          target={data.quoteCount}
          format={(value) => Math.round(value).toLocaleString('tr-TR')}
          hint={<p className="mt-1 text-xs text-slate-500">Tüm kayıtlar</p>}
          icon={FileStack}
          tone="from-emerald-500 to-cyan-500"
        />
        <StatCard
          label="Teklif tutarı"
          target={data.quoteTotal}
          format={formatMoney}
          hint={
            <p className={`mt-1 inline-flex items-center gap-1 text-xs ${data.weekDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.weekDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              En düşük · bu hafta %{Math.abs(data.weekDelta)}
            </p>
          }
          icon={Sparkles}
          tone="from-amber-500 to-orange-500"
        />
        <StatCard
          label="Açık borç"
          target={data.openDebt}
          format={formatMoney}
          hint={<p className="mt-1 text-xs text-slate-500">Sevk edilip ödenmeyen</p>}
          icon={Wallet}
          tone="from-rose-500 to-orange-500"
        />
        <StatCard
          label="Sevk"
          target={data.dispatchedCount}
          format={(value) => Math.round(value).toLocaleString('tr-TR')}
          hint={<p className="mt-1 text-xs text-slate-500">{data.paidCount} tahsil edildi</p>}
          icon={Truck}
          tone="from-violet-500 to-fuchsia-500"
        />
      </div>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-medium text-white">14 günlük ciro</h2>
          <p className="mt-0.5 text-sm text-slate-500">Her turun en düşük teklif tutarı, güne göre</p>
        </div>
        {empty ? (
          <p className="py-16 text-center text-sm text-slate-500">Henüz teklif yok — grafik ilk kayıttan sonra dolar.</p>
        ) : (
          <RevenueChart series={data.series} />
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5 sm:p-6">
          <h2 className="text-base font-medium text-white">Durum</h2>
          <p className="mt-0.5 text-sm text-slate-500">Tekliflerin şu anki hali</p>
          {data.statuses.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Durum verisi yok</p>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-900">
                {data.statuses.map((row) => (
                  <div
                    key={row.key}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${(row.value / statusTotal) * 100}%`, backgroundColor: row.color }}
                    title={`${row.label}: ${row.value}`}
                  />
                ))}
              </div>
              <div className="space-y-3">
                {data.statuses.map((row) => {
                  const pct = Math.round((row.value / statusTotal) * 100)
                  return (
                    <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="text-slate-200">{row.label}</span>
                      </div>
                      <p className="shrink-0 tabular-nums text-slate-400">
                        {row.value} <span className="text-slate-600">· %{pct}</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5 sm:p-6">
          <h2 className="text-base font-medium text-white">En yüksek hacim</h2>
          <p className="mt-0.5 text-sm text-slate-500">Müşteriye göre en düşük teklif tutarı</p>
          {data.topCustomers.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Müşteri verisi yok</p>
          ) : (
            <div className="mt-6 space-y-4">
              {data.topCustomers.map((row) => {
                const width = Math.max(8, (row.amount / maxCustomer) * 100)
                return (
                  <div key={row.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm text-slate-200" title={row.name}>{row.name}</p>
                      <p className="shrink-0 text-sm tabular-nums text-white">{formatMoney(row.amount)}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full bg-cyan-400/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-white">Son teklifler</h2>
            <p className="mt-0.5 text-sm text-slate-500">Her turun en düşük teklifi</p>
          </div>
          <Link href="/quotes" className="text-sm text-emerald-400 hover:text-emerald-300">
            Tümü
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-300">Henüz teklif yok</p>
            <p className="mt-1 text-xs text-slate-500">İlk teklifi oluşturunca özet dolar.</p>
            <Link href="/quotes/new">
              <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500">
                <FilePlus className="mr-2 h-4 w-4" />
                Teklif Oluştur
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/60">
            {data.recent.map((quote) => (
              <div key={quote.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {quote.quoteNo || quote.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="truncate text-xs text-slate-500">{quote.customer}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-slate-100">
                      {formatMoney(quote.amount)}
                    </p>
                    <Badge className={`mt-1 font-normal ${STATUS_STYLE[quote.status]}`}>
                      {STATUS_LABEL[quote.status]}
                    </Badge>
                  </div>
                  <Link href={`/quotes/${quote.id}/edit`}>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-slate-400 hover:bg-slate-700/60 hover:text-white"
                      title="Revize et"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={quoteSharePath(quote.shareToken)} target="_blank" rel="noreferrer">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      title="Teklifi aç"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/products" icon={Package} label="Ürünler" value={`${data.productCount} kayıt`} />
        <QuickLink href="/companies" icon={Building2} label="Firmalar" value={`${data.companyCount} kayıt`} />
        <QuickLink href="/quotes" icon={FileStack} label="Teklifler" value="Listeye git" />
      </div>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-800/40 px-4 py-3.5 transition hover:border-emerald-500/40 hover:bg-slate-800/70"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-700/70 p-2 text-slate-300 group-hover:text-emerald-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-white">{label}</p>
          <p className="text-xs text-slate-500">{value}</p>
        </div>
      </div>
    </Link>
  )
}

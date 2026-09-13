'use client'

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)

  useEffect(() => {
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
  money,
}: {
  active?: boolean
  payload?: Array<{ value?: number; payload?: { count?: number } }>
  label?: string
  money?: boolean
}) {
  if (!active || !payload?.[0]) return null
  const value = Number(payload[0].value) || 0
  const count = payload[0].payload?.count
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-white">
        {money ? formatMoney(value) : value}
      </p>
      {typeof count === 'number' && (
        <p className="text-slate-500">{count} teklif</p>
      )}
    </div>
  )
}

function StatCard({
  label,
  display,
  hint,
  icon: Icon,
  tone,
  delay,
}: {
  label: string
  display: string
  hint?: ReactNode
  icon: ComponentType<{ className?: string }>
  tone: string
  delay: number
}) {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both rounded-2xl border border-slate-700/80 bg-slate-800/40 p-4"
      style={{ animationDelay: `${delay}ms`, animationDuration: '700ms' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{display}</p>
          {hint}
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-2.5 text-white ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

export function DashboardView({ data }: { data: DashboardData }) {
  const [ready, setReady] = useState(false)
  const quoteTotal = useCountUp(data.quoteTotal)
  const openDebt = useCountUp(data.openDebt)
  const quoteCount = useCountUp(data.quoteCount)
  const dispatched = useCountUp(data.dispatchedCount)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 80)
    return () => window.clearTimeout(timer)
  }, [])

  const empty = data.quoteCount === 0
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Teklif"
          display={Math.round(quoteCount).toLocaleString('tr-TR')}
          hint={<p className="mt-1 text-xs text-slate-500">Tüm kayıtlar</p>}
          icon={FileStack}
          tone="from-emerald-500 to-cyan-500"
          delay={40}
        />
        <StatCard
          label="Teklif tutarı"
          display={formatMoney(quoteTotal)}
          hint={
            <p className={`mt-1 inline-flex items-center gap-1 text-xs ${data.weekDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.weekDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              En düşük · bu hafta %{Math.abs(data.weekDelta)}
            </p>
          }
          icon={Sparkles}
          tone="from-amber-500 to-orange-500"
          delay={110}
        />
        <StatCard
          label="Açık borç"
          display={formatMoney(openDebt)}
          hint={<p className="mt-1 text-xs text-slate-500">Sevk edilip ödenmeyen</p>}
          icon={Wallet}
          tone="from-rose-500 to-orange-500"
          delay={180}
        />
        <StatCard
          label="Sevk"
          display={Math.round(dispatched).toLocaleString('tr-TR')}
          hint={<p className="mt-1 text-xs text-slate-500">{data.paidCount} tahsil edildi</p>}
          icon={Truck}
          tone="from-violet-500 to-fuchsia-500"
          delay={250}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <section
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-2xl border border-slate-700/80 bg-slate-800/40 p-4 xl:col-span-3"
          style={{ animationDelay: '280ms', animationDuration: '750ms' }}
        >
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-medium text-white">14 günlük ciro</h2>
              <p className="text-xs text-slate-500">Günlük teklif tutarı</p>
            </div>
          </div>
          <div className="h-[280px]">
            {ready ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="quoteFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${Math.round(Number(value) / 1000)}k` : String(value)
                    }
                  />
                  <Tooltip content={<ChartTip money />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    fill="url(#quoteFill)"
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-xl bg-slate-700/30" />
            )}
          </div>
        </section>

        <section
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-2xl border border-slate-700/80 bg-slate-800/40 p-4 xl:col-span-2"
          style={{ animationDelay: '360ms', animationDuration: '750ms' }}
        >
          <h2 className="text-sm font-medium text-white">Durum dağılımı</h2>
          <p className="text-xs text-slate-500">Tekliflerin şu anki hali</p>
          <div className="mt-2 h-[220px]">
            {ready && data.statuses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statuses}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={3}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {data.statuses.map((row) => (
                      <Cell key={row.key} fill={row.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {empty ? 'Henüz teklif yok' : 'Yükleniyor…'}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.statuses.map((row) => (
              <span key={row.key} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                {row.label} {row.value}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-2xl border border-slate-700/80 bg-slate-800/40 p-4"
          style={{ animationDelay: '440ms', animationDuration: '750ms' }}
        >
          <h2 className="text-sm font-medium text-white">En yüksek hacim</h2>
          <p className="mb-4 text-xs text-slate-500">Müşteriye göre teklif tutarı</p>
          {data.topCustomers.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Müşteri verisi yok</p>
          ) : ready ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topCustomers}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${Math.round(Number(value) / 1000)}k` : String(value)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTip money />} />
                  <Bar
                    dataKey="amount"
                    fill="#22d3ee"
                    radius={[0, 8, 8, 0]}
                    animationDuration={900}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] animate-pulse rounded-xl bg-slate-700/30" />
          )}
        </section>

        <section
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-2xl border border-slate-700/80 bg-slate-800/40 p-4"
          style={{ animationDelay: '520ms', animationDuration: '750ms' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white">Son teklifler</h2>
              <p className="text-xs text-slate-500">Her turun en düşük teklifi</p>
            </div>
            <Link href="/quotes" className="text-xs text-emerald-400 hover:text-emerald-300">
              Tümü
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-slate-300">Henüz teklif yok</p>
              <p className="mt-1 text-xs text-slate-500">İlk teklifi oluşturunca grafikler dolar.</p>
              <Link href="/quotes/new">
                <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Teklif Oluştur
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/70">
              {data.recent.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">
                      {quote.quoteNo || quote.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="truncate text-xs text-slate-500">{quote.customer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums text-slate-100">
                        {formatMoney(quote.amount)}
                      </p>
                      <Badge className={`mt-1 font-normal ${STATUS_STYLE[quote.status]}`}>
                        {STATUS_LABEL[quote.status]}
                      </Badge>
                    </div>
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
      </div>

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
      className="group flex items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-800/30 px-4 py-3 transition hover:border-emerald-500/40 hover:bg-slate-800/60"
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

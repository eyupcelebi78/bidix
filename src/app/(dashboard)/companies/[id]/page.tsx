'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatLedgerDate, formatMoney } from '@/lib/money-tr'
import { getTemplateName } from '@/lib/templates'
import { ArrowLeft, Building2, Loader2, Mail, Phone } from 'lucide-react'

type Company = Tables<'companies'>

interface CompanyQuote {
  id: string
  quote_no: string | null
  customer_name: string | null
  customer_company: string | null
  grand_total: number
  created_at: string
  dispatched_at: string | null
  paid_at: string | null
}

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const [company, setCompany] = useState<Company | null>(null)
  const [quotes, setQuotes] = useState<CompanyQuote[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [companyRes, quotesRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', params.id).single(),
      supabase
        .from('quotes')
        .select('id, quote_no, customer_name, customer_company, grand_total, created_at, dispatched_at, paid_at')
        .eq('company_id', params.id)
        .order('created_at', { ascending: false }),
    ])

    if (companyRes.error || !companyRes.data) {
      toast.error('Firma bulunamadı')
      setLoading(false)
      return
    }

    setCompany(companyRes.data)
    setQuotes(quotesRes.data || [])
    setLoading(false)
  }, [params.id, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="space-y-4">
        <p className="text-slate-300">Firma bulunamadı.</p>
        <Link href="/companies">
          <Button variant="outline" className="border-slate-600 text-slate-200">Firmalara dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/companies" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Firmalar
      </Link>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">Satış firması</p>
        <h1 className="mt-1 flex items-start gap-2 text-3xl font-bold text-white">
          <Building2 className="mt-1.5 h-6 w-6 shrink-0 text-emerald-400" />
          <span className="break-words">{company.title}</span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="bg-slate-700 text-slate-200">
            {company.multiplier === 1 ? 'Normal' : `+%${Math.round((company.multiplier - 1) * 100)}`}
          </Badge>
          <Badge className="bg-slate-700 text-slate-200">
            {getTemplateName(company.default_template_key || 'form')}
          </Badge>
        </div>
        <div className="mt-4 space-y-1 text-sm text-slate-400">
          {company.address && <p>{company.address}</p>}
          {company.phone && (
            <p className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              {company.phone}
            </p>
          )}
          {company.email && (
            <p className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {company.email}
            </p>
          )}
          {(company.tax_office || company.tax_no) && (
            <p>{[company.tax_office, company.tax_no].filter(Boolean).join(' / ')}</p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/40">
        <div className="border-b border-slate-700 px-5 py-3">
          <h2 className="text-sm font-medium text-white">Bu firmadan teklifler</h2>
        </div>
        {quotes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Bu firmadan teklif yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Tarih</th>
                  <th className="px-5 py-2.5 font-medium">Belge</th>
                  <th className="px-5 py-2.5 font-medium">Müşteri</th>
                  <th className="px-5 py-2.5 font-medium">Durum</th>
                  <th className="px-5 py-2.5 text-right font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-slate-800">
                    <td className="px-5 py-3 text-slate-300">{formatLedgerDate(quote.created_at)}</td>
                    <td className="px-5 py-3 font-medium text-white">
                      {quote.quote_no || quote.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {quote.customer_company || quote.customer_name || '—'}
                    </td>
                    <td className="px-5 py-3">
                      {quote.paid_at ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300">Ödendi</Badge>
                      ) : quote.dispatched_at ? (
                        <Badge className="bg-amber-500/20 text-amber-300">Sevk</Badge>
                      ) : (
                        <Badge className="bg-slate-600/50 text-slate-300">Teklif</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-white">
                      {formatMoney(Number(quote.grand_total) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

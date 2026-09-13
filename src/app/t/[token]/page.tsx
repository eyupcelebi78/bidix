import { createClient } from '@/lib/supabase/server'
import { formatTry, QuoteStatus, STATUS_LABEL } from '@/lib/quote-share'
import { PublicQuoteActions } from './public-quote-actions'
import { FileDown } from 'lucide-react'
import type { Metadata } from 'next'

type PublicQuote = {
  quote: {
    quote_no: string | null
    customer_name: string | null
    customer_company: string | null
    currency: string
    subtotal: number
    vat_total: number
    grand_total: number
    pdf_url: string | null
    created_at: string | null
    status: QuoteStatus
  }
  company: {
    title: string
    phone: string | null
    email: string | null
  } | null
  items: Array<{
    product_name: string
    product_brand: string | null
    product_unit: string
    quantity: number
    unit_price_effective: number
    line_total: number
  }>
}

export const metadata: Metadata = {
  title: 'Teklif',
  robots: { index: false, follow: false },
}

function num(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_public_quote', { p_token: token })
  const payload = data as PublicQuote | null

  if (!payload?.quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-slate-900">Teklif bulunamadı</p>
          <p className="mt-2 text-sm text-slate-500">Link hatalı veya teklif silinmiş olabilir.</p>
        </div>
      </div>
    )
  }

  const { quote, company, items } = payload
  const created = quote.created_at
    ? new Date(quote.created_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Bidix
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {STATUS_LABEL[quote.status] || quote.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm text-slate-500">{created}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {company?.title || 'Fiyat teklifi'}
          </h1>
          <p className="mt-1 text-slate-600">
            {quote.customer_company || quote.customer_name || 'Müşteri'}
            {quote.quote_no ? ` · ${quote.quote_no}` : ''}
          </p>

          <div className="mt-6 overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Ürün</th>
                  <th className="px-3 py-2 text-right font-medium">Miktar</th>
                  <th className="px-3 py-2 text-right font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).map((item, index) => (
                  <tr key={`${item.product_name}-${index}`} className="border-t">
                    <td className="px-3 py-2 text-slate-800">
                      {item.product_name}
                      {item.product_brand ? (
                        <span className="text-slate-400"> ({item.product_brand})</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {num(item.quantity)} {item.product_unit}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-800">
                      {formatTry(num(item.line_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Ara toplam</span>
              <span>{formatTry(num(quote.subtotal))}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>KDV</span>
              <span>{formatTry(num(quote.vat_total))}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-slate-900">
              <span>Genel toplam</span>
              <span>{formatTry(num(quote.grand_total))}</span>
            </div>
          </div>

          {quote.pdf_url && (
            <a
              href={quote.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <FileDown className="h-4 w-4" />
              PDF indir
            </a>
          )}

          <div className="mt-8 border-t pt-6">
            <PublicQuoteActions token={token} initialStatus={quote.status} />
          </div>

          {(company?.phone || company?.email) && (
            <p className="mt-6 text-center text-xs text-slate-400">
              {company.phone}
              {company.phone && company.email ? ' · ' : ''}
              {company.email}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/money-tr'
import { findQuoteBatch } from '@/lib/quote-batches'
import { catalogBasePrice, quoteHeaderTotals, quoteLineAmounts } from '@/lib/quote-calc'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { QuickProductDialog } from '@/components/quick-product-dialog'

type Product = Tables<'products'>
type Company = Tables<'companies'>
type SignatureProfile = Tables<'signature_profiles'>

type QuoteItemRow = {
  id: string
  product_id: string | null
  product_name: string
  product_brand: string | null
  product_unit: string
  quantity: number
  unit_price_effective: number
  vat_rate: number
}

type EditLine = QuoteItemRow & {
  catalog_price: number | null
}

type SiblingQuote = {
  id: string
  quote_no: string | null
  created_at: string
  grand_total: number
  customer_id: string | null
  customer_name: string | null
  customer_company: string | null
  dispatched_at: string | null
  company_id: string
  company: Company
  quote_items: QuoteItemRow[]
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export default function EditQuotePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quoteNo, setQuoteNo] = useState<string | null>(null)
  const [dispatchedAt, setDispatchedAt] = useState<string | null>(null)
  const [customerLabel, setCustomerLabel] = useState('')
  const [company, setCompany] = useState<Company | null>(null)
  const [lines, setLines] = useState<EditLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [isLowest, setIsLowest] = useState(true)
  const [siblings, setSiblings] = useState<SiblingQuote[]>([])
  const [pricePrompt, setPricePrompt] = useState<Array<{
    product_id: string
    name: string
    catalog: number
    next: number
  }> | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [quoteRes, productsRes, allRes] = await Promise.all([
      supabase
        .from('quotes')
        .select(`
          id, quote_no, created_at, dispatched_at, customer_id, customer_name, customer_company, grand_total,
          company:companies(*),
          quote_items(id, product_id, product_name, product_brand, product_unit, quantity, unit_price_effective, vat_rate)
        `)
        .eq('id', params.id)
        .single(),
      supabase.from('products').select('*').order('name'),
      supabase
        .from('quotes')
        .select(`
          id, quote_no, created_at, dispatched_at, customer_id, customer_name, customer_company, grand_total, company_id,
          company:companies(*),
          quote_items(id, product_id, product_name, product_brand, product_unit, quantity, unit_price_effective, vat_rate)
        `)
        .order('created_at', { ascending: false })
        .limit(300),
    ])

    if (quoteRes.error || !quoteRes.data) {
      toast.error('Teklif bulunamadı')
      setLoading(false)
      return
    }

    const loadedCompany = unwrap(quoteRes.data.company as Company | Company[] | null)
    const catalog = productsRes.data || []
    const items = (quoteRes.data.quote_items || []) as QuoteItemRow[]
    setQuoteNo(quoteRes.data.quote_no)
    setDispatchedAt(quoteRes.data.dispatched_at)
    setCustomerLabel(quoteRes.data.customer_company || quoteRes.data.customer_name || 'Müşteri')
    setCompany(loadedCompany)
    setProducts(catalog)
    setLines(items.map((item) => ({
      ...item,
      catalog_price: catalog.find((product) => product.id === item.product_id)?.unit_price ?? null,
    })))

    const all = (allRes.data || []).map((row) => ({
      ...row,
      company: unwrap(row.company as Company | Company[] | null),
      quote_items: (row.quote_items || []) as QuoteItemRow[],
    })) as SiblingQuote[]

    const batch = findQuoteBatch(all, params.id)
    setIsLowest(batch?.isLowest ?? true)
    setSiblings((batch?.others || []).filter((row): row is SiblingQuote => Boolean(row.company)))
    setLoading(false)
  }, [params.id, supabase])

  useEffect(() => {
    load()
  }, [load])

  const multiplier = Number(company?.multiplier) || 1
  const totals = useMemo(() => {
    const priced = lines.map((line) => quoteLineAmounts(line.unit_price_effective, line.quantity, line.vat_rate))
    return quoteHeaderTotals(priced)
  }, [lines])

  const addProduct = () => {
    const product = products.find((row) => row.id === selectedProductId)
    if (!product || !isLowest) return
    if (lines.some((line) => line.product_id === product.id)) {
      toast.error('Bu ürün zaten teklifte')
      return
    }
    setLines((prev) => [
      ...prev,
      {
        id: `new-${product.id}`,
        product_id: product.id,
        product_name: product.name,
        product_brand: product.brand,
        product_unit: product.unit,
        quantity: 1,
        unit_price_effective: product.unit_price * multiplier,
        vat_rate: product.vat_rate,
        catalog_price: product.unit_price,
      },
    ])
    setSelectedProductId('')
  }

  const addCreatedProduct = (product: Product) => {
    if (!isLowest) return
    setProducts((prev) => {
      if (prev.some((row) => row.id === product.id)) return prev
      return [...prev, product].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    })
    setLines((prev) => {
      if (prev.some((line) => line.product_id === product.id)) return prev
      return [
        ...prev,
        {
          id: `new-${product.id}`,
          product_id: product.id,
          product_name: product.name,
          product_brand: product.brand,
          product_unit: product.unit,
          quantity: 1,
          unit_price_effective: product.unit_price * multiplier,
          vat_rate: product.vat_rate,
          catalog_price: product.unit_price,
        },
      ]
    })
    setSelectedProductId('')
  }

  const updateLine = (id: string, patch: Partial<EditLine>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const removeLine = (id: string) => {
    if (!isLowest) return
    setLines((prev) => prev.filter((line) => line.id !== id))
  }

  const priceMismatches = () => {
    return lines.flatMap((line) => {
      if (!line.product_id || line.catalog_price == null) return []
      const next = catalogBasePrice(line.unit_price_effective, multiplier)
      if (Math.abs(next - line.catalog_price) < 0.005) return []
      return [{
        product_id: line.product_id,
        name: line.product_name,
        catalog: line.catalog_price,
        next,
      }]
    })
  }

  const persistQuote = async (
    quoteId: string,
    targetCompany: Company,
    sourceLines: EditLine[],
    sourceMultiplier: number,
  ) => {
    const ratio = (Number(targetCompany.multiplier) || 1) / (sourceMultiplier || 1)
    const items = sourceLines.map((line, index) => {
      const amounts = quoteLineAmounts(
        Number(line.unit_price_effective) * ratio,
        line.quantity,
        line.vat_rate,
      )
      return {
        quote_id: quoteId,
        product_id: line.product_id,
        product_name: line.product_name,
        product_brand: line.product_brand,
        product_unit: line.product_unit,
        quantity: line.quantity,
        vat_rate: line.vat_rate,
        sort_order: index,
        ...amounts,
      }
    })
    const header = quoteHeaderTotals(items)

    const { error: delError } = await supabase.from('quote_items').delete().eq('quote_id', quoteId)
    if (delError) throw delError
    if (items.length > 0) {
      const { error: insError } = await supabase.from('quote_items').insert(items)
      if (insError) throw insError
    }
    const { data: updated, error: upError } = await supabase
      .from('quotes')
      .update({
        subtotal: header.subtotal,
        vat_total: header.vat_total,
        grand_total: header.grand_total,
        pdf_url: null,
      })
      .eq('id', quoteId)
      .select('id, quote_no, customer_name, customer_company, currency, subtotal, vat_total, grand_total, created_at')
      .single()
    if (upError || !updated) throw upError || new Error('Teklif güncellenemedi')

    let signature: SignatureProfile | null = null
    if (targetCompany.signature_profile_id) {
      const { data } = await supabase
        .from('signature_profiles')
        .select('*')
        .eq('id', targetCompany.signature_profile_id)
        .single()
      signature = data
    }

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId,
        templateKey: targetCompany.default_template_key || 'form',
        quoteData: {
          quote: updated,
          company: {
            title: targetCompany.title,
            address: targetCompany.address,
            tax_office: targetCompany.tax_office,
            tax_no: targetCompany.tax_no,
            phone: targetCompany.phone,
            email: targetCompany.email,
            iban: targetCompany.iban,
            logo_url: targetCompany.logo_url,
          },
          signature: signature
            ? {
                signer_name: signature.signer_name,
                signer_title: signature.signer_title,
                signature_image_url: signature.signature_image_url,
                stamp_image_url: signature.stamp_image_url,
              }
            : null,
          items: items.map((item) => ({
            product_name: item.product_name,
            product_brand: item.product_brand,
            product_unit: item.product_unit,
            quantity: item.quantity,
            unit_price_effective: item.unit_price_effective,
            vat_rate: item.vat_rate,
            line_subtotal: item.line_subtotal,
            line_vat: item.line_vat,
            line_total: item.line_total,
          })),
        },
      }),
    })

    if (response.ok) {
      const { pdfUrl } = await response.json()
      if (pdfUrl) {
        await supabase.from('quotes').update({ pdf_url: pdfUrl }).eq('id', quoteId)
      }
    }
  }

  const save = async (updateCatalog: boolean) => {
    if (!company) return
    if (lines.length === 0) {
      toast.error('En az bir kalem olmalı')
      return
    }
    if (lines.some((line) => !line.quantity || line.quantity <= 0)) {
      toast.error('Miktarlar 0’dan büyük olmalı')
      return
    }

    setSaving(true)
    try {
      if (updateCatalog) {
        for (const row of priceMismatches()) {
          const { error } = await supabase
            .from('products')
            .update({ unit_price: row.next })
            .eq('id', row.product_id)
          if (error) throw error
        }
      }

      await persistQuote(params.id, company, lines, multiplier)

      if (isLowest) {
        for (const sibling of siblings) {
          if (!sibling.company) continue
          await persistQuote(sibling.id, sibling.company, lines, multiplier)
        }
      }

      toast.success(
        isLowest && siblings.length > 0
          ? `Teklif ve turdaki ${siblings.length} diğer teklif güncellendi`
          : 'Teklif güncellendi',
      )
      router.push('/quotes')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
      setPricePrompt(null)
    }
  }

  const requestSave = () => {
    const mismatches = priceMismatches()
    if (mismatches.length > 0) {
      setPricePrompt(mismatches)
      return
    }
    save(false)
  }

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
        <p className="text-slate-300">Teklif bulunamadı.</p>
        <Link href="/quotes"><Button variant="outline">Tekliflere dön</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/quotes" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Teklifler
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white">Teklifi revize et</h1>
          <p className="mt-1 text-slate-400">
            {quoteNo || params.id.slice(0, 8).toUpperCase()} · {customerLabel} · {company.title}
          </p>
        </div>
        <Button
          onClick={requestSave}
          disabled={saving}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Kaydet
        </Button>
      </div>

      {dispatchedAt && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Bu teklif sevk edilmiş. Kaydedince ekstre tutarı da yeni rakama döner.
        </div>
      )}

      {isLowest ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {siblings.length > 0
            ? `Bu turun en düşük teklifi. Kalem, adet ve fiyat değişince diğer ${siblings.length} teklif firma çarpanına göre otomatik güncellenir.`
            : 'Bu turun en düşük teklifi. Turda başka teklif yok, yalnızca bu kayıt güncellenir.'}
          {siblings.some((row) => row.dispatched_at) ? ' Turda sevkli teklif de var.' : ''}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3 text-sm text-slate-300">
          En düşük teklif değil. Sadece bu firmanın birim fiyatını değiştirebilirsin; kalem ekleme/silme ve en düşük teklif kilitli.
        </div>
      )}

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Kalemler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLowest && (
            <div className="flex gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="flex-1 border-slate-600 bg-slate-700 text-white">
                  <SelectValue placeholder="Ürün ekle..." />
                </SelectTrigger>
                <SelectContent className="max-h-64 border-slate-600 bg-slate-700">
                  {products.map((product) => (
                    <SelectItem
                      key={product.id}
                      value={product.id}
                      disabled={lines.some((line) => line.product_id === product.id)}
                      className="text-white"
                    >
                      {product.name}{product.brand ? ` (${product.brand})` : ''} — {formatMoney(product.unit_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addProduct} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
                <Plus className="h-4 w-4" />
              </Button>
              <QuickProductDialog onCreated={addCreatedProduct} />
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Ürün</TableHead>
                  <TableHead className="w-28 text-slate-300">Miktar</TableHead>
                  <TableHead className="w-36 text-right text-slate-300">Birim fiyat</TableHead>
                  <TableHead className="text-right text-slate-300">Tutar</TableHead>
                  {isLowest && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const amounts = quoteLineAmounts(line.unit_price_effective, line.quantity, line.vat_rate)
                  return (
                    <TableRow key={line.id} className="border-slate-700">
                      <TableCell className="text-white">
                        {line.product_name}
                        {line.product_brand && (
                          <span className="ml-1 text-sm text-slate-400">({line.product_brand})</span>
                        )}
                        <div className="text-xs text-slate-500">
                          {line.product_unit} · KDV %{line.vat_rate}
                          {line.catalog_price != null && (
                            <> · listede {formatMoney(line.catalog_price * multiplier)}</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isLowest ? (
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                            className="border-slate-600 bg-slate-700 text-white"
                          />
                        ) : (
                          <span className="text-slate-200">{line.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price_effective}
                          onChange={(e) => updateLine(line.id, { unit_price_effective: parseFloat(e.target.value) || 0 })}
                          className="border-slate-600 bg-slate-700 text-right text-white"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-white">
                        {formatMoney(amounts.line_total)}
                      </TableCell>
                      {isLowest && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line.id)}
                            className="text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end text-sm">
            <div className="space-y-1 text-right">
              <p className="text-slate-400">Ara toplam {formatMoney(totals.subtotal)}</p>
              <p className="text-slate-400">KDV {formatMoney(totals.vat_total)}</p>
              <p className="text-lg font-semibold text-white">{formatMoney(totals.grand_total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLowest && siblings.length > 0 && (
        <p className="text-xs text-slate-500">
          Yayılacak teklifler:{' '}
          {siblings.map((row) => row.company?.title || 'Firma').join(', ')}
        </p>
      )}

      <Dialog open={pricePrompt !== null} onOpenChange={(open) => !open && setPricePrompt(null)}>
        <DialogContent className="border-slate-700 bg-slate-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ürün listesi de güncellensin mi?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Teklifteki birim fiyat, ürünler listesindeki fiyattan farklı. Çarpan düşülmüş hali (1x) listeye yazılır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {pricePrompt?.map((row) => (
              <div key={row.product_id} className="rounded-lg border border-slate-700 px-3 py-2">
                <p className="text-white">{row.name}</p>
                <p className="text-slate-400">
                  Listede {formatMoney(row.catalog)} → {formatMoney(row.next)}
                </p>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPricePrompt(null)} className="text-slate-300">
              Vazgeç
            </Button>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-200"
              disabled={saving}
              onClick={() => save(false)}
            >
              Sadece teklifi kaydet
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
              disabled={saving}
              onClick={() => save(true)}
            >
              Listeyi de güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

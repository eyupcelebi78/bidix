'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, FileDown, Building2, Search, X, Layers, History } from 'lucide-react'

type Product = Tables<'products'>
type Company = Tables<'companies'>
type Customer = Tables<'customers'>

function normalizeTaxNo(value: string): string {
  return value.replace(/\s+/g, '').replace(/[^0-9A-Za-z]/g, '').toUpperCase()
}

interface QuoteItem {
  product_id: string
  product: Product
  quantity: number
}

interface LastPrice {
  unitPrice: number
  quotedAt: string
  companyTitle: string | null
}

export default function NewQuotePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerTaxNo, setCustomerTaxNo] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [lastPrices, setLastPrices] = useState<Record<string, LastPrice>>({})
  const [loadingLastPrices, setLoadingLastPrices] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [productsRes, companiesRes, customersRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('companies').select('*').order('multiplier'),
      supabase.from('customers').select('*').order('name'),
    ])

    setProducts(productsRes.data || [])
    setCompanies(companiesRes.data || [])
    setCustomers(customersRes.data || [])

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const activeCustomerId =
    selectedCustomer?.id ||
    customers.find((c) => c.tax_no === normalizeTaxNo(customerTaxNo))?.id ||
    null

  const fetchLastPrices = useCallback(async (customerId: string) => {
    setLoadingLastPrices(true)
    const { data: prevQuotes, error } = await supabase
      .from('quotes')
      .select('id, created_at, company:companies(title, multiplier)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(200)

    const baseQuotes = (prevQuotes || []).filter((q) => {
      const company = Array.isArray(q.company) ? q.company[0] : q.company
      return Math.abs(Number(company?.multiplier ?? 1) - 1) < 0.001
    })

    if (error || baseQuotes.length === 0) {
      setLastPrices({})
      setLoadingLastPrices(false)
      return
    }

    // En son teklif turu: son 1x teklifin zamanına yakın üretilen diğer 1x teklifler
    const latestMs = new Date(baseQuotes[0].created_at || 0).getTime()
    const BATCH_MS = 10 * 60 * 1000
    const latestBatch = baseQuotes.filter((q) => {
      const t = new Date(q.created_at || 0).getTime()
      return Math.abs(latestMs - t) <= BATCH_MS
    })

    const quoteIds = latestBatch.map((q) => q.id)
    const { data: prevItems } = await supabase
      .from('quote_items')
      .select('quote_id, product_id, product_name, unit_price_effective')
      .in('quote_id', quoteIds)

    const quoteMeta = new Map(
      latestBatch.map((q) => {
        const company = Array.isArray(q.company) ? q.company[0] : q.company
        return [q.id, { created_at: q.created_at, title: company?.title || null }]
      }),
    )

    const next: Record<string, LastPrice> = {}
    const takeLowest = (key: string, info: LastPrice) => {
      const current = next[key]
      if (!current || info.unitPrice < current.unitPrice) next[key] = info
    }

    for (const row of prevItems || []) {
      const meta = quoteMeta.get(row.quote_id)
      const info: LastPrice = {
        unitPrice: Number(row.unit_price_effective),
        quotedAt: meta?.created_at || '',
        companyTitle: meta?.title || null,
      }
      if (row.product_id) takeLowest(row.product_id, info)
      takeLowest(`name:${row.product_name.trim().toLowerCase()}`, info)
    }

    setLastPrices(next)
    setLoadingLastPrices(false)
  }, [supabase])

  useEffect(() => {
    if (!activeCustomerId) {
      setLastPrices({})
      return
    }
    fetchLastPrices(activeCustomerId)
  }, [activeCustomerId, fetchLastPrices])

  const getLastPrice = (product: Product): LastPrice | undefined => {
    return lastPrices[product.id] || lastPrices[`name:${product.name.trim().toLowerCase()}`]
  }

  const formatMoney = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatShortDate = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  const addItem = () => {
    if (!selectedProductId) {
      toast.error('Lütfen bir ürün seçin')
      return
    }

    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    // Check if already added
    if (items.some(item => item.product_id === selectedProductId)) {
      toast.error('Bu ürün zaten eklenmiş')
      return
    }

    setItems([...items, {
      product_id: product.id,
      product,
      quantity: 1,
    }])
    setSelectedProductId('')
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setItems(items.map(item =>
      item.product_id === productId
        ? { ...item, quantity: Math.max(0.01, quantity) }
        : item
    ))
  }

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.product_id !== productId))
  }

  const calculateTotals = (multiplier: number = 1) => {
    let subtotal = 0
    let vatTotal = 0

    items.forEach(item => {
      const effectivePrice = item.product.unit_price * multiplier
      const lineSubtotal = effectivePrice * item.quantity
      const lineVat = lineSubtotal * (item.product.vat_rate / 100)
      subtotal += lineSubtotal
      vatTotal += lineVat
    })

    return {
      subtotal,
      vatTotal,
      grandTotal: subtotal + vatTotal,
    }
  }

  const pickCustomer = (c: Customer) => {
    setSelectedCustomer(c)
    setCustomerName(c.name)
    setCustomerTaxNo(c.tax_no)
    setCustomerQuery(c.name)
    setCustomerPhone(c.phone || '')
    setCustomerEmail(c.email || '')
    setShowSuggestions(false)
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerName('')
    setCustomerTaxNo('')
    setCustomerQuery('')
    setCustomerPhone('')
    setCustomerEmail('')
    setShowSuggestions(false)
  }

  const matchingCustomers = customers.filter((c) => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return false
    return (
      c.name.toLowerCase().includes(q) ||
      c.tax_no.toLowerCase().includes(normalizeTaxNo(customerQuery))
    )
  }).slice(0, 6)

  const resolveCustomer = async (userId: string): Promise<Customer> => {
    const name = customerName.trim() || customerQuery.trim() || selectedCustomer?.name || ''
    const taxNo = normalizeTaxNo(customerTaxNo) || selectedCustomer?.tax_no || ''
    const phone = customerPhone.trim() || null
    const email = customerEmail.trim() || null

    if (selectedCustomer) {
      const next = {
        ...selectedCustomer,
        name: name || selectedCustomer.name,
        phone: phone ?? selectedCustomer.phone,
        email: email ?? selectedCustomer.email,
      }
      if (next.name !== selectedCustomer.name || next.phone !== selectedCustomer.phone || next.email !== selectedCustomer.email) {
        await supabase
          .from('customers')
          .update({ name: next.name, phone: next.phone, email: next.email })
          .eq('id', selectedCustomer.id)
      }
      return next
    }

    if (!name) throw new Error('Müşteri adı gerekli')
    if (!taxNo) throw new Error('İlk teklif için müşteri vergi numarası gerekli')

    const existing = customers.find((c) => c.tax_no === taxNo)
    if (existing) {
      const next = {
        ...existing,
        name: name || existing.name,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
      }
      if (next.name !== existing.name || next.phone !== existing.phone || next.email !== existing.email) {
        await supabase
          .from('customers')
          .update({ name: next.name, phone: next.phone, email: next.email })
          .eq('id', existing.id)
      }
      return next
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({ user_id: userId, name, tax_no: taxNo, phone, email })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error('Bu vergi numarası zaten kayıtlı')
      throw error
    }

    setCustomers((prev) => [...prev, data])
    return data
  }

  const generateQuoteForCompany = async (
    userId: string,
    customer: Customer,
    company: Company,
  ): Promise<string | null> => {
    const totals = calculateTotals(company.multiplier)

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        user_id: userId,
        company_id: company.id,
        template_id: null,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_company: customer.name,
        subtotal: totals.subtotal,
        vat_total: totals.vatTotal,
        grand_total: totals.grandTotal,
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    const quoteItems = items.map((item, index) => {
      const effectivePrice = item.product.unit_price * company.multiplier
      const lineSubtotal = effectivePrice * item.quantity
      const lineVat = lineSubtotal * (item.product.vat_rate / 100)
      const lineTotal = lineSubtotal + lineVat

      return {
        quote_id: quote.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_brand: item.product.brand,
        product_unit: item.product.unit,
        quantity: item.quantity,
        unit_price_effective: effectivePrice,
        vat_rate: item.product.vat_rate,
        line_subtotal: lineSubtotal,
        line_vat: lineVat,
        line_total: lineTotal,
        sort_order: index,
      }
    })

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) throw itemsError

    let signatureProfile = null
    if (company.signature_profile_id) {
      const { data: sig } = await supabase
        .from('signature_profiles')
        .select('*')
        .eq('id', company.signature_profile_id)
        .single()
      signatureProfile = sig
    }

    const pdfQuoteData = {
      quote: {
        id: quote.id,
        quote_no: quote.quote_no,
        customer_name: quote.customer_name,
        customer_company: quote.customer_company,
        currency: quote.currency,
        subtotal: quote.subtotal,
        vat_total: quote.vat_total,
        grand_total: quote.grand_total,
        created_at: quote.created_at,
      },
      company: {
        title: company.title,
        address: company.address,
        tax_office: company.tax_office,
        tax_no: company.tax_no,
        phone: company.phone,
        email: company.email,
        iban: company.iban,
        logo_url: company.logo_url,
      },
      signature: signatureProfile ? {
        signer_name: signatureProfile.signer_name,
        signer_title: signatureProfile.signer_title,
        signature_image_url: signatureProfile.signature_image_url,
        stamp_image_url: signatureProfile.stamp_image_url,
      } : null,
      items: quoteItems.map((item) => ({
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
    }

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId: quote.id,
        quoteData: pdfQuoteData,
        templateKey: company.default_template_key || 'form',
        userId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'PDF oluşturulamadı')
    }

    const { pdfUrl } = await response.json()

    await supabase
      .from('quotes')
      .update({ pdf_url: pdfUrl })
      .eq('id', quote.id)

    return pdfUrl || null
  }

  const handleGenerateQuote = async (company: Company) => {
    if (items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin')
      return
    }

    setGenerating(company.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Oturum bulunamadı')

      const customer = await resolveCustomer(user.id)
      setSelectedCustomer(customer)
      setCustomerName(customer.name)
      setCustomerTaxNo(customer.tax_no)
      setCustomerQuery(customer.name)

      const pdfUrl = await generateQuoteForCompany(user.id, customer, company)
      toast.success(`${company.title} için teklif oluşturuldu. WhatsApp veya e-posta ile Teklifler sayfasından gönder.`)
      if (pdfUrl) window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error('Quote generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Teklif oluşturulamadı')
    } finally {
      setGenerating(null)
    }
  }

  const handleGenerateAll = async () => {
    if (items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin')
      return
    }
    if (companies.length === 0) {
      toast.error('Önce firma eklemeniz gerekiyor')
      return
    }

    setGenerating('all')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Oturum bulunamadı')

      const customer = await resolveCustomer(user.id)
      setSelectedCustomer(customer)
      setCustomerName(customer.name)
      setCustomerTaxNo(customer.tax_no)
      setCustomerQuery(customer.name)

      let ok = 0
      const pdfs: string[] = []

      for (const company of companies) {
        setGenerating(company.id)
        const pdfUrl = await generateQuoteForCompany(user.id, customer, company)
        ok += 1
        if (pdfUrl) pdfs.push(pdfUrl)
      }

      toast.success(`${ok} firmadan teklif oluşturuldu`)
      pdfs.forEach((url) => window.open(url, '_blank'))
    } catch (error) {
      console.error('Quote generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Toplu teklif oluşturulamadı')
    } finally {
      setGenerating(null)
    }
  }

  const displayTotals = calculateTotals(1)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Teklif Oluştur</h1>
        <p className="mt-1 text-slate-400">Yeni bir teklif oluşturun ve PDF olarak indirin</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Müşteri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Kayıtlı müşteriyi ara ve seç. İlk kez teklif veriyorsan adı ve vergi numarasını gir — sonraki tekliflerde geçmişi buradan takip edilir.
              </p>

              {selectedCustomer ? (
                <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white break-words">{selectedCustomer.name}</p>
                    <p className="text-sm text-slate-400">VKN: {selectedCustomer.tax_no}</p>
                    {(selectedCustomer.phone || selectedCustomer.email) && (
                      <p className="text-xs text-slate-500">
                        {[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCustomer}
                    className="shrink-0 text-slate-300 hover:text-white"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Değiştir
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative space-y-2">
                    <Label className="text-slate-200">Müşteri adı *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={customerQuery}
                        onChange={(e) => {
                          setCustomerQuery(e.target.value)
                          setCustomerName(e.target.value)
                          setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="İsim veya vergi no ile ara..."
                        className="border-slate-600 bg-slate-700 pl-10 text-white placeholder:text-slate-500"
                      />
                    </div>
                    {showSuggestions && matchingCustomers.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                        {matchingCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => pickCustomer(c)}
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-700"
                          >
                            <span className="text-sm text-white">{c.name}</span>
                            <span className="text-xs text-slate-400">VKN: {c.tax_no}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Vergi numarası *</Label>
                    <Input
                      value={customerTaxNo}
                      onChange={(e) => setCustomerTaxNo(e.target.value)}
                      placeholder="İlk teklifte zorunlu — sonraki seferlerde hatırlanır"
                      className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
                    />
                    {customerTaxNo && customers.some((c) => c.tax_no === normalizeTaxNo(customerTaxNo)) && (
                      <p className="text-xs text-emerald-400">
                        Bu VKN kayıtlı. Teklif, mevcut müşteriye bağlanacak.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-200">WhatsApp</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="05xx xxx xx xx"
                    className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">E-posta</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="musteri@firma.com"
                    className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                İsteğe bağlı. Teklifler sayfasından WhatsApp veya e-posta ile göndermek için kullanılır.
              </p>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Ürünler</CardTitle>
              {activeCustomerId && (
                <p className="text-xs text-slate-400">
                  {loadingLastPrices
                    ? 'Bu müşteriye verilen son fiyatlar yükleniyor…'
                    : Object.keys(lastPrices).length > 0
                      ? 'Son teklif turundaki 1x (normal) firmaların en düşük birim fiyatı gösterilir.'
                      : 'Bu müşteriye henüz ürün teklifi yok — ilk fiyatlar katalogdan gider.'}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Product */}
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 border-slate-600 bg-slate-700 text-white">
                    <SelectValue placeholder="Ürün seçin..." />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700 max-h-64">
                    {products.map((product) => {
                      const last = getLastPrice(product)
                      return (
                      <SelectItem 
                        key={product.id} 
                        value={product.id} 
                        className="text-white hover:bg-slate-600"
                        disabled={items.some(i => i.product_id === product.id)}
                      >
                        {product.name} {product.brand && `(${product.brand})`} — ₺{formatMoney(product.unit_price)}
                        {last ? ` · 1x en düşük ₺${formatMoney(last.unitPrice)}` : ''}
                      </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button onClick={addItem} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <div className="rounded-lg border border-slate-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-300">Ürün</TableHead>
                        <TableHead className="text-slate-300 w-24">Miktar</TableHead>
                        <TableHead className="text-slate-300">Birim</TableHead>
                        <TableHead className="text-right text-slate-300">Birim Fiyat</TableHead>
                        <TableHead className="text-right text-slate-300">Son 1x en düşük</TableHead>
                        <TableHead className="text-right text-slate-300">Tutar</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const last = getLastPrice(item.product)
                        const delta = last ? item.product.unit_price - last.unitPrice : 0
                        return (
                        <TableRow key={item.product_id} className="border-slate-700">
                          <TableCell className="text-white">
                            {item.product.name}
                            {item.product.brand && (
                              <span className="text-slate-400 text-sm ml-1">({item.product.brand})</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                              className="w-20 border-slate-600 bg-slate-700 text-white"
                            />
                          </TableCell>
                          <TableCell className="text-slate-300">{item.product.unit}</TableCell>
                          <TableCell className="text-right text-slate-300">
                            ₺{formatMoney(item.product.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {last ? (
                              <div className="text-xs">
                                <div className="flex items-center justify-end gap-1 text-amber-300">
                                  <History className="h-3 w-3" />
                                  ₺{formatMoney(last.unitPrice)}
                                </div>
                                <div className="text-slate-500">
                                  {formatShortDate(last.quotedAt)}
                                  {delta !== 0 && (
                                    <span className={delta > 0 ? ' text-red-400' : ' text-emerald-400'}>
                                      {' '}
                                      {delta > 0 ? '+' : ''}{formatMoney(delta)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium">
                            ₺{formatMoney(item.product.unit_price * item.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.product_id)}
                              className="text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {items.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Henüz ürün eklenmedi. Yukarıdan ürün seçerek başlayın.
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Totals */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Özet (Baz Fiyat)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-slate-300">
                <span>Ara Toplam:</span>
                <span>₺{displayTotals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>KDV:</span>
                <span>₺{displayTotals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex justify-between text-lg font-bold text-white">
                <span>Genel Toplam:</span>
                <span>₺{displayTotals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Generate Buttons */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Teklif Oluştur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {companies.length === 0 ? (
                <div className="text-center py-4">
                  <Building2 className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-slate-400 text-sm">Önce firma eklemeniz gerekiyor</p>
                </div>
              ) : (
                <>
                <Button
                  onClick={handleGenerateAll}
                  disabled={generating !== null || items.length === 0}
                  className="h-auto w-full whitespace-normal bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-3 hover:from-amber-600 hover:to-orange-600"
                >
                  {generating !== null ? (
                    <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Layers className="mr-2 h-4 w-4 shrink-0" />
                  )}
                  <span className="text-left leading-snug">
                    Tüm firmalardan teklif ver ({companies.length})
                  </span>
                </Button>
                {companies.map((company) => {
                  const companyTotals = calculateTotals(company.multiplier)
                  return (
                    <Button
                      key={company.id}
                      onClick={() => handleGenerateQuote(company)}
                      disabled={generating !== null || items.length === 0}
                      className={`h-auto min-h-11 w-full items-start justify-between gap-3 whitespace-normal px-3 py-2.5 text-left ${
                        company.multiplier === 1
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      }`}
                    >
                      <span className="flex min-w-0 flex-1 items-start gap-2">
                        {generating === company.id ? (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                        ) : (
                          <FileDown className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 break-words leading-snug">
                          {company.title}
                          {company.multiplier !== 1 && (
                            <span className="ml-1 opacity-80">
                              (+%{Math.round((company.multiplier - 1) * 100)})
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-xs tabular-nums opacity-80">
                        ₺{companyTotals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                      </span>
                    </Button>
                  )
                })}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


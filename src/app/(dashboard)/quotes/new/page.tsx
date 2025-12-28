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
import { Plus, Trash2, Loader2, FileDown, Building2 } from 'lucide-react'

type Product = Tables<'products'>
type Company = Tables<'companies'>
type QuoteTemplate = Tables<'quote_templates'>

interface QuoteItem {
  product_id: string
  product: Product
  quantity: number
}

export default function NewQuotePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [productsRes, companiesRes, templatesRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('companies').select('*').order('multiplier'),
      supabase.from('quote_templates').select('*').order('name'),
    ])

    setProducts(productsRes.data || [])
    setCompanies(companiesRes.data || [])
    setTemplates(templatesRes.data || [])

    // Set default template if available
    if (templatesRes.data && templatesRes.data.length > 0) {
      setSelectedTemplateId(templatesRes.data[0].id)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  const handleGenerateQuote = async (company: Company) => {
    if (items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin')
      return
    }

    setGenerating(company.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Oturum bulunamadı')

      const totals = calculateTotals(company.multiplier)

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          company_id: company.id,
          template_id: selectedTemplateId || null,
          customer_name: customerName || null,
          customer_company: customerCompany || null,
          subtotal: totals.subtotal,
          vat_total: totals.vatTotal,
          grand_total: totals.grandTotal,
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Create quote items
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

      // Get company signature profile if exists
      let signatureProfile = null
      if (company.signature_profile_id) {
        const { data: sig } = await supabase
          .from('signature_profiles')
          .select('*')
          .eq('id', company.signature_profile_id)
          .single()
        signatureProfile = sig
      }

      // Get template info
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

      // Prepare quote data for PDF
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
        items: quoteItems.map(item => ({
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

      // Generate PDF
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quoteId: quote.id, 
          quoteData: pdfQuoteData,
          templateKey: selectedTemplate?.base_template_key || 'modern',
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'PDF oluşturulamadı')
      }

      const result = await response.json()
      const { pdfUrl, isHtml, message } = result

      // Update quote with PDF URL
      await supabase
        .from('quotes')
        .update({ pdf_url: pdfUrl })
        .eq('id', quote.id)

      if (isHtml) {
        toast.success(`${company.title} için teklif oluşturuldu! (HTML önizleme - PDF için yazdırın)`, {
          duration: 5000,
        })
      } else {
        toast.success(`${company.title} için teklif oluşturuldu!`)
      }
      
      // Open in new tab
      window.open(pdfUrl, '_blank')

    } catch (error) {
      console.error('Quote generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Teklif oluşturulamadı')
    } finally {
      setGenerating(null)
    }
  }

  const getCompanyLabel = (company: Company) => {
    if (company.multiplier === 1) return company.title
    return `${company.title} (+%${Math.round((company.multiplier - 1) * 100)})`
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
              <CardTitle className="text-white">Müşteri Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-200">Müşteri Adı</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Firma Adı</Label>
                <Input
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="Örn: ABC Ltd. Şti."
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Ürünler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Product */}
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 border-slate-600 bg-slate-700 text-white">
                    <SelectValue placeholder="Ürün seçin..." />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700 max-h-64">
                    {products.map((product) => (
                      <SelectItem 
                        key={product.id} 
                        value={product.id} 
                        className="text-white hover:bg-slate-600"
                        disabled={items.some(i => i.product_id === product.id)}
                      >
                        {product.name} {product.brand && `(${product.brand})`} - ₺{product.unit_price.toLocaleString('tr-TR')}
                      </SelectItem>
                    ))}
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
                        <TableHead className="text-right text-slate-300">Tutar</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
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
                            ₺{item.product.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium">
                            ₺{(item.product.unit_price * item.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
                      ))}
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

          {/* Template Selection */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Şablon</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                  <SelectValue placeholder="Şablon seçin..." />
                </SelectTrigger>
                <SelectContent className="border-slate-600 bg-slate-700">
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white hover:bg-slate-600">
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                companies.map((company) => {
                  const companyTotals = calculateTotals(company.multiplier)
                  return (
                    <Button
                      key={company.id}
                      onClick={() => handleGenerateQuote(company)}
                      disabled={generating !== null || items.length === 0}
                      className={`w-full justify-between ${
                        company.multiplier === 1
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {generating === company.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        {getCompanyLabel(company)}
                      </span>
                      <span className="text-xs opacity-80">
                        ₺{companyTotals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                      </span>
                    </Button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Trash2, Eye, Download, Upload, X, Sparkles, Check, Lock,
  ChevronDown, Rocket, ArrowRight, Loader2, Gift,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDemoLimit } from '@/lib/use-demo-limit'

interface ProductItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  vatRate: number
}

interface GeneratedOffer {
  offerNo: number
  template: string
  multiplier: number
  totals: { subtotal: number; vat_total: number; grand_total: number }
  pdfUrl: string
  previewUrl: string
}

const TEMPLATES = [
  { id: 'modern', name: 'Modern', preview: '🎨', free: true },
  { id: 'classic', name: 'Klasik', preview: '📋', free: true },
  { id: 'minimal', name: 'Minimal', preview: '✨', free: false },
  { id: 'elegant', name: 'Elegant', preview: '👔', free: false },
  { id: 'bold', name: 'Bold', preview: '⚡', free: false },
  { id: 'corporate', name: 'Corporate', preview: '🏢', free: false },
]

const TEMPLATE_NAMES: Record<string, string> = {
  modern: 'Modern Tasarım',
  classic: 'Klasik Kurumsal',
  minimal: 'Minimal Sade',
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function DemoBuilder() {
  const router = useRouter()
  const limit = useDemoLimit()

  const [products, setProducts] = useState<ProductItem[]>([
    { id: '1', name: 'Web Sitesi Tasarımı', quantity: 1, unitPrice: 5000, vatRate: 20 },
  ])
  const [companyName, setCompanyName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [stampPreview, setStampPreview] = useState<string | null>(null)
  const [stampBase64, setStampBase64] = useState<string | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(['modern', 'classic'])
  const [showDetails, setShowDetails] = useState(false)

  const [loading, setLoading] = useState(false)
  const [offers, setOffers] = useState<GeneratedOffer[] | null>(null)
  const [previewOffer, setPreviewOffer] = useState<GeneratedOffer | null>(null)
  const [gateOpen, setGateOpen] = useState(false)

  // ── Product handlers ──
  const addProduct = () =>
    setProducts((p) => [
      ...p,
      { id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0, vatRate: 20 },
    ])

  const removeProduct = (id: string) =>
    setProducts((p) => (p.length > 1 ? p.filter((x) => x.id !== id) : p))

  const updateProduct = (id: string, field: keyof ProductItem, value: string | number) =>
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)))

  // Live total preview (standard, no multiplier) so the user sees a number form.
  const liveTotal = products.reduce((sum, p) => {
    const sub = p.unitPrice * p.quantity
    return sum + sub + sub * (p.vatRate / 100)
  }, 0)

  const handleStamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!ok.includes(file.type.toLowerCase())) {
      toast.error('PNG, JPG, GIF veya WEBP yükleyin.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setStampPreview(result)
      setStampBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const toggleTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!
    if (!t.free) {
      setGateOpen(true)
      return
    }
    setSelectedTemplates((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          toast.error('En az bir şablon seçili olmalı')
          return prev
        }
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 3) {
        toast.error('En fazla 3 şablon')
        return prev
      }
      return [...prev, id]
    })
  }

  // ── Generate ──
  const generate = async () => {
    // Free-usage gate
    if (!limit.canUse) {
      setGateOpen(true)
      return
    }

    const invalid = products.filter((p) => !p.name.trim() || p.quantity <= 0 || p.unitPrice <= 0)
    if (invalid.length > 0) {
      toast.error('Lütfen her ürünün adını, miktarını ve fiyatını girin.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/demo/generate-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName || 'Demo Firma',
          customerName: customerName || 'Demo Müşteri',
          stampImageBase64: stampBase64,
          selectedTemplates,
          items: products.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            vatRate: p.vatRate,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Teklifler oluşturulamadı')
      }
      const data = await res.json()
      setOffers(data.offers)
      limit.increment()
      toast.success(`✨ ${data.offers.length} teklif hazır!`)
      // Bring results into view on next paint.
      setTimeout(() => {
        document.getElementById('demo-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const download = (url: string, name: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const startOver = () => {
    setOffers(null)
    setTimeout(() => {
      document.getElementById('demo-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  // ── Render ──
  return (
    <div id="demo-builder" className="mx-auto w-full max-w-3xl">
      {/* Free-usage pill */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-4 py-1.5 text-sm">
          <Gift className="size-4 text-green-500" />
          {limit.ready && !limit.canUse ? (
            <span className="text-muted-foreground">Ücretsiz denemen doldu — kaydol, sınırsız devam et</span>
          ) : (
            <span className="text-muted-foreground">
              Kayıt yok · <strong className="text-foreground">{limit.ready ? limit.remaining : limit.limit}</strong> ücretsiz teklif hakkın var
            </span>
          )}
        </div>
      </div>

      <Card className="border-2 shadow-2xl overflow-hidden">
        <CardContent className="p-5 sm:p-7 space-y-6">
          {/* Step 1: products */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
              <h3 className="font-semibold">Ne teklif ediyorsun?</h3>
              <span className="text-xs text-muted-foreground">Ürün veya hizmetlerini yaz</span>
            </div>

            {/* Column hints */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <div className="col-span-5">Ürün / Hizmet</div>
              <div className="col-span-2 text-center">Adet</div>
              <div className="col-span-2 text-center">Birim ₺</div>
              <div className="col-span-2 text-center">KDV %</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {products.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-5">
                    <Input
                      value={p.name}
                      onChange={(e) => updateProduct(p.id, 'name', e.target.value)}
                      placeholder={idx === 0 ? 'Örn: Web sitesi tasarımı' : 'Ürün veya hizmet adı'}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number" min="0.01" step="0.01" inputMode="decimal"
                      value={p.quantity}
                      onChange={(e) => updateProduct(p.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="text-center"
                      aria-label="Adet"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number" min="0" step="0.01" inputMode="decimal"
                      value={p.unitPrice}
                      onChange={(e) => updateProduct(p.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="text-center"
                      aria-label="Birim fiyat"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input
                      type="number" min="0" max="100" step="1" inputMode="numeric"
                      value={p.vatRate}
                      onChange={(e) => updateProduct(p.id, 'vatRate', parseFloat(e.target.value) || 0)}
                      className="text-center"
                      aria-label="KDV oranı"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="text-muted-foreground hover:text-destructive size-9"
                      onClick={() => removeProduct(p.id)}
                      disabled={products.length === 1}
                      aria-label="Satırı sil"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                <Plus className="size-4 mr-1.5" /> Satır Ekle
              </Button>
              <div className="text-sm text-muted-foreground">
                Tahmini toplam:{' '}
                <strong className="text-foreground">₺{fmt(liveTotal)}</strong>
              </div>
            </div>
          </div>

          {/* Step 2: templates */}
          <div className="space-y-3 border-t pt-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
              <h3 className="font-semibold">Şablon seç</h3>
              <span className="text-xs text-muted-foreground">Aynı ürünler, farklı tasarım & fiyat</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TEMPLATES.map((t) => {
                const active = selectedTemplates.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTemplate(t.id)}
                    className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-500/10'
                        : t.free
                        ? 'border-border hover:border-blue-300'
                        : 'border-border bg-muted/40 opacity-70'
                    }`}
                  >
                    {!t.free && <Lock className="absolute top-1 right-1 size-3 text-muted-foreground" />}
                    {active && <Check className="absolute top-1 left-1 size-3.5 text-blue-500" />}
                    <span className="text-xl">{t.preview}</span>
                    <span className="text-[11px] font-medium">{t.name}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              🔒 Kilitli şablonlar üyelere özel. Ücretsiz olanlar: Modern & Klasik.
            </p>
          </div>

          {/* Optional details */}
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span>Firma / müşteri bilgisi & kaşe ekle (opsiyonel)</span>
              <ChevronDown className={`size-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
            {showDetails && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cn">Firma Adı</Label>
                    <Input id="cn" placeholder="Örn: ABC Teknoloji" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mn">Müşteri Adı</Label>
                    <Input id="mn" placeholder="Örn: XYZ İnşaat" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Kaşe / İmza</Label>
                  {!stampPreview ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => document.getElementById('stamp-input')?.click()}>
                        <Upload className="size-4 mr-2" /> Görsel Yükle
                      </Button>
                      <input id="stamp-input" type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" className="hidden" onChange={handleStamp} />
                      <span className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP</span>
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={stampPreview} alt="Kaşe" className="size-20 rounded-md border object-contain" />
                      <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 size-6" onClick={() => { setStampPreview(null); setStampBase64(null) }}>
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Generate CTA */}
          <div className="border-t pt-5 space-y-2">
            {limit.ready && !limit.canUse ? (
              <Button
                onClick={() => setGateOpen(true)}
                size="lg"
                className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Sparkles className="mr-2 size-5" /> Ücretsiz Üye Ol, Devam Et
              </Button>
            ) : (
              <Button
                onClick={generate}
                disabled={loading}
                size="lg"
                className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" /> Teklifler hazırlanıyor…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-5" /> {selectedTemplates.length} Farklı Teklif Oluştur
                  </>
                )}
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {limit.ready && limit.canUse && (
                <>⚡ Saniyeler içinde · {limit.remaining} ücretsiz hakkın kaldı · kayıt gerekmez</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {offers && (
        <div id="demo-results" className="mt-10 space-y-6 scroll-mt-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2 text-green-600 dark:text-green-400 font-semibold">
              <Check className="size-5" /> {offers.length} teklifin hazır — karşılaştır ve indir
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {offers.map((o) => (
              <Card key={o.offerNo} className="flex flex-col border-2">
                <CardContent className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={o.offerNo === 1 ? 'default' : 'secondary'}>
                      {o.offerNo === 1 ? '⭐ Standart' : o.offerNo === 2 ? '+%10' : '+%15'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{TEMPLATE_NAMES[o.template] || o.template}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ara Toplam</span><span>₺{fmt(o.totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>KDV</span><span>₺{fmt(o.totals.vat_total)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t">
                      <span className="font-semibold">Toplam</span>
                      <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">₺{fmt(o.totals.grand_total)}</span>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewOffer(o)}>
                      <Eye className="size-4 mr-2" /> Önizle
                    </Button>
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={() => download(o.pdfUrl, `bidix-teklif-${o.offerNo}.pdf`)}>
                      <Download className="size-4 mr-2" /> PDF İndir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Conversion nudge */}
          <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2 border-purple-500/20">
            <CardContent className="py-8 text-center space-y-4">
              <h3 className="text-2xl font-bold">Beğendin mi? Bunları kaydet & yönet</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Ücretsiz üyelikle tekliflerini sakla, düzenle, müşterine gönder. Tüm şablonların ve sınırsız teklifin kilidini aç.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
                <Button size="lg" onClick={() => router.push('/register')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 px-8 group">
                  <Sparkles className="mr-2 size-5" /> Ücretsiz Kayıt Ol
                  <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8" onClick={startOver} disabled={!limit.canUse}>
                  {limit.canUse ? 'Yeni Teklif Oluştur' : 'Ücretsiz hakların doldu'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PDF preview dialog */}
      <Dialog open={!!previewOffer} onOpenChange={(o) => !o && setPreviewOffer(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm">
              Teklif Önizleme {previewOffer && `— ${TEMPLATE_NAMES[previewOffer.template] || previewOffer.template}`}
              <Badge variant="outline">Demo</Badge>
            </DialogTitle>
          </DialogHeader>
          {previewOffer && (
            <div className="flex-1 min-h-0 bg-muted/10">
              <iframe src={previewOffer.previewUrl} className="w-full h-[78vh]" title="PDF Önizleme" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Signup gate */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="sr-only">Ücretsiz üyelik</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600">
              <Rocket className="size-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold">Ücretsiz denemeni sevdik! 🎉</h3>
            <p className="text-muted-foreground">
              {limit.canUse
                ? 'Bu şablon ve daha fazlası ücretsiz üyelere özel. 30 saniyede kaydol, tüm şablonların kilidini aç.'
                : `${limit.limit} ücretsiz teklifini oluşturdun. Ücretsiz üyelikle sınırsız devam et — tekliflerin kaydolsun, tüm şablonlar açılsın.`}
            </p>
            <div className="flex flex-col w-full gap-2 pt-2">
              <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={() => router.push('/register')}>
                <Sparkles className="mr-2 size-5" /> Ücretsiz Kayıt Ol
              </Button>
              <Button variant="ghost" onClick={() => router.push('/login')}>
                Zaten hesabım var — Giriş yap
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileText, Eye, X, Lock, Check } from 'lucide-react'
import { generateTemplate, QuoteData } from '@/lib/pdf-templates'
import { BUILTIN_TEMPLATES, BuiltinTemplate } from '@/lib/templates'

// Örnek önizleme verileri
const SAMPLE_QUOTE_DATA: QuoteData = {
  quote: {
    id: 'preview-001',
    quote_no: 'TKL-2024-001',
    customer_name: null,
    customer_company: 'KAHRAMANMARAŞ ELBİSTAN KARAELBİSTAN 6. ETAP 1. KISIM TOPLU KONUTLARI SİTE YÖNETİMİ',
    currency: 'TRY',
    subtotal: 15750.00,
    vat_total: 2835.00,
    grand_total: 18585.00,
    created_at: new Date().toISOString(),
  },
  company: {
    title: 'ORC GRUP DANIŞMANLIK TEMİZLİK VALE HİZ. KIRTASİYE HIRDAVAT SANAYİ TİC. LTD. ŞTİ.',
    address: 'Yenişehir Mh. Aydıntaş Ayçel Sk. MVK Sitesi A Blok No:7 Daire No:69 Pendik / İstanbul',
    tax_office: 'Pendik',
    tax_no: '64507601899',
    phone: null,
    email: 'info@orcgrup.com',
    iban: null,
    logo_url: null,
  },
  signature: {
    signer_name: '',
    signer_title: '',
    signature_image_url: null,
    stamp_image_url: '/stamps/orc-grup-kase.png',
  },
  items: [
    {
      product_name: 'Çelik Vida M8x50',
      product_brand: 'Bosch',
      product_unit: 'adet',
      quantity: 500,
      unit_price_effective: 2.50,
      vat_rate: 18,
      line_subtotal: 1250.00,
      line_vat: 225.00,
      line_total: 1475.00,
    },
    {
      product_name: 'Paslanmaz Somun M8',
      product_brand: 'Fischer',
      product_unit: 'adet',
      quantity: 500,
      unit_price_effective: 1.80,
      vat_rate: 18,
      line_subtotal: 900.00,
      line_vat: 162.00,
      line_total: 1062.00,
    },
    {
      product_name: 'Elektrik Kablosu 2.5mm²',
      product_brand: 'Prysmian',
      product_unit: 'metre',
      quantity: 1000,
      unit_price_effective: 8.50,
      vat_rate: 18,
      line_subtotal: 8500.00,
      line_vat: 1530.00,
      line_total: 10030.00,
    },
    {
      product_name: 'LED Panel 60x60',
      product_brand: 'Philips',
      product_unit: 'adet',
      quantity: 20,
      unit_price_effective: 255.00,
      vat_rate: 18,
      line_subtotal: 5100.00,
      line_vat: 918.00,
      line_total: 6018.00,
    },
  ],
}

const getTemplateColor = (key: string) => {
  switch (key) {
    case 'form': return 'bg-slate-200 text-slate-800'
    case 'modern': return 'bg-emerald-500/20 text-emerald-400'
    case 'classic': return 'bg-amber-500/20 text-amber-400'
    case 'minimal': return 'bg-purple-500/20 text-purple-400'
    case 'corporate': return 'bg-blue-500/20 text-blue-400'
    case 'elegant': return 'bg-yellow-500/20 text-yellow-400'
    case 'bold': return 'bg-orange-500/20 text-orange-400'
    default: return 'bg-slate-500/20 text-slate-400'
  }
}

export default function TemplatesPage() {
  // Seçili (ücretsiz) şablon
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // Önizleme durumu
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewTemplateName, setPreviewTemplateName] = useState('')

  const handlePreview = (t: BuiltinTemplate) => {
    setPreviewHtml(generateTemplate(t.key, SAMPLE_QUOTE_DATA))
    setPreviewTemplateName(t.name)
    setPreviewOpen(true)
  }

  const handleSelect = (t: BuiltinTemplate) => {
    if (t.premium) {
      toast.info('Bu şablon Premium üyelere özel. Yükseltmek için üye olun.')
      return
    }
    setSelectedKey(t.key)
    toast.success(`${t.name} şablonu seçildi`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Şablonlar</h1>
          <p className="mt-1 text-slate-400">
            Teklif tasarımlarınızı seçin — firmalarınıza şablon atayın
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        3 şablon ücretsiz seçilebilir (Teklif Formu, Modern, Klasik). Diğerleri önizlenebilir; seçim için Premium gerekir.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {BUILTIN_TEMPLATES.map((t) => {
          const isSelected = selectedKey === t.key
          return (
            <Card
              key={t.key}
              className={`border-slate-700 bg-slate-800/50 overflow-hidden group transition-shadow ${
                isSelected ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              {/* Önizleme alanı - tıklanabilir */}
              <div
                className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => handlePreview(t)}
              >
                {/* Mini önizleme iframe */}
                <div className="absolute inset-0 pointer-events-none transform scale-[0.25] origin-top-left w-[400%] h-[400%]">
                  <iframe
                    srcDoc={generateTemplate(t.key, SAMPLE_QUOTE_DATA)}
                    className="w-full h-full border-0"
                    title={`Preview ${t.name}`}
                  />
                </div>

                {/* Premium kilit rozeti */}
                {t.premium && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-1 text-xs font-medium text-yellow-400">
                    <Lock className="h-3 w-3" />
                    Premium
                  </div>
                )}

                {/* Ücretsiz seçili işareti */}
                {isSelected && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white">
                    <Check className="h-3 w-3" />
                    Seçili
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Eye className="h-5 w-5" />
                    <span>Önizle</span>
                  </div>
                </div>
              </div>

              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg text-white">{t.name}</CardTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={getTemplateColor(t.key)}>{t.name}</Badge>
                    {t.premium ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Lock className="mr-1 h-3 w-3" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400">Ücretsiz</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="mb-3 text-sm text-slate-400">{t.description}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(t)}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Önizle
                  </Button>
                  {t.premium ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      onClick={() => handleSelect(t)}
                      className="flex-1 border-slate-700 text-slate-500"
                    >
                      <Lock className="mr-1 h-3 w-3" />
                      Premium — Kilitli
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSelect(t)}
                      className={`flex-1 ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-600'
                          : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Seçildi
                        </>
                      ) : (
                        'Seç'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Önizleme Modalı */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span className="font-medium text-white">{previewTemplateName} - Önizleme</span>
                <Badge className="bg-emerald-500/20 text-emerald-400">Örnek Veri</Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Önizleme iframe */}
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full pt-14 border-0"
              title="Template Preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}

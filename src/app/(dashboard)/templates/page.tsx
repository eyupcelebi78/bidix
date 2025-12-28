'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, FileText, Loader2, Copy, Eye, X } from 'lucide-react'
import { generateTemplate, QuoteData } from '@/lib/pdf-templates'

type QuoteTemplate = Tables<'quote_templates'>

// Örnek önizleme verileri
const SAMPLE_QUOTE_DATA: QuoteData = {
  quote: {
    id: 'preview-001',
    quote_no: 'TKL-2024-001',
    customer_name: 'Ahmet Yılmaz',
    customer_company: 'ABC İnşaat Ltd. Şti.',
    currency: 'TRY',
    subtotal: 15750.00,
    vat_total: 2835.00,
    grand_total: 18585.00,
    created_at: new Date().toISOString(),
  },
  company: {
    title: 'Örnek Firma A.Ş.',
    address: 'Atatürk Cad. No:123, Kadıköy, İstanbul',
    tax_office: 'Kadıköy',
    tax_no: '1234567890',
    phone: '+90 216 123 45 67',
    email: 'info@ornekfirma.com',
    iban: 'TR00 0000 0000 0000 0000 0000 00',
    logo_url: null,
  },
  signature: {
    signer_name: 'Mehmet Demir',
    signer_title: 'Satış Müdürü',
    signature_image_url: null,
    stamp_image_url: null,
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

const TEMPLATE_KEYS = [
  { value: 'modern', label: 'Modern', description: 'Minimalist ve çağdaş tasarım' },
  { value: 'classic', label: 'Klasik', description: 'Geleneksel ve profesyonel görünüm' },
  { value: 'minimal', label: 'Minimal', description: 'Sade ve temiz düzen' },
  { value: 'corporate', label: 'Kurumsal', description: 'Profesyonel iş görünümü' },
  { value: 'elegant', label: 'Zarif', description: 'Sofistike ve şık tasarım' },
  { value: 'bold', label: 'Cesur', description: 'Güçlü ve etkileyici tasarım' },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null)
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewTemplateName, setPreviewTemplateName] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [baseTemplateKey, setBaseTemplateKey] = useState('modern')

  const supabase = createClient()

  const fetchTemplates = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Şablonlar yüklenemedi')
      return
    }

    setTemplates(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const resetForm = () => {
    setName('')
    setBaseTemplateKey('modern')
    setEditingTemplate(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (template: QuoteTemplate) => {
    setEditingTemplate(template)
    setName(template.name)
    setBaseTemplateKey(template.base_template_key)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Oturum bulunamadı')
      setSaving(false)
      return
    }

    const templateData = {
      name,
      base_template_key: baseTemplateKey,
      user_id: user.id,
    }

    if (editingTemplate) {
      const { error } = await supabase
        .from('quote_templates')
        .update(templateData)
        .eq('id', editingTemplate.id)

      if (error) {
        toast.error('Şablon güncellenemedi')
        setSaving(false)
        return
      }
      toast.success('Şablon güncellendi')
    } else {
      const { error } = await supabase
        .from('quote_templates')
        .insert(templateData)

      if (error) {
        toast.error('Şablon eklenemedi')
        setSaving(false)
        return
      }
      toast.success('Şablon eklendi')
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchTemplates()
  }

  const handleDuplicate = async (template: QuoteTemplate) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('quote_templates')
      .insert({
        name: `${template.name} (Kopya)`,
        base_template_key: template.base_template_key,
        config_json: template.config_json,
        user_id: user.id,
      })

    if (error) {
      toast.error('Şablon kopyalanamadı')
      return
    }

    toast.success('Şablon kopyalandı')
    fetchTemplates()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return

    const { error } = await supabase
      .from('quote_templates')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Şablon silinemedi')
      return
    }

    toast.success('Şablon silindi')
    fetchTemplates()
  }

  const getTemplateColor = (key: string) => {
    switch (key) {
      case 'modern': return 'bg-emerald-500/20 text-emerald-400'
      case 'classic': return 'bg-amber-500/20 text-amber-400'
      case 'minimal': return 'bg-purple-500/20 text-purple-400'
      case 'corporate': return 'bg-blue-500/20 text-blue-400'
      case 'elegant': return 'bg-yellow-500/20 text-yellow-400'
      case 'bold': return 'bg-orange-500/20 text-orange-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const handlePreview = (template: QuoteTemplate) => {
    const html = generateTemplate(template.base_template_key, SAMPLE_QUOTE_DATA)
    setPreviewHtml(html)
    setPreviewTemplateName(template.name)
    setPreviewOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Şablonlar</h1>
          <p className="mt-1 text-slate-400">PDF şablonlarınızı yönetin</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
          <Plus className="mr-2 h-4 w-4" />
          Şablon Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-500" />
            <p className="text-lg text-slate-300">Henüz şablon eklenmemiş</p>
            <p className="text-sm text-slate-500">Teklif PDF&apos;leri için şablon oluşturun</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="border-slate-700 bg-slate-800/50 overflow-hidden group">
              {/* Preview area - clickable */}
              <div 
                className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => handlePreview(template)}
              >
                {/* Mini preview iframe */}
                <div className="absolute inset-0 pointer-events-none transform scale-[0.25] origin-top-left w-[400%] h-[400%]">
                  <iframe
                    srcDoc={generateTemplate(template.base_template_key, SAMPLE_QUOTE_DATA)}
                    className="w-full h-full border-0"
                    title={`Preview ${template.name}`}
                  />
                </div>
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
                  <CardTitle className="text-lg text-white">{template.name}</CardTitle>
                  <Badge className={`mt-1 ${getTemplateColor(template.base_template_key)}`}>
                    {TEMPLATE_KEYS.find(k => k.value === template.base_template_key)?.label || template.base_template_key}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Önizle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="border-slate-600 text-slate-300 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-700 bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Şablon Adı *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Örn: Ana Firma Şablonu"
                  className="border-slate-600 bg-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Temel Tasarım</Label>
                <Select value={baseTemplateKey} onValueChange={setBaseTemplateKey}>
                  <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700">
                    {TEMPLATE_KEYS.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-white hover:bg-slate-600">
                        <div>
                          <span className="font-medium">{t.label}</span>
                          <span className="ml-2 text-slate-400 text-xs">{t.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-slate-300"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTemplate ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
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
            {/* Preview iframe */}
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


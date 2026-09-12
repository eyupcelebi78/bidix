'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  downloadProductTemplate,
  parseProductExcel,
  type ParseResult,
} from '@/lib/product-excel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, Pencil, Trash2, Search, Loader2, FileDown, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react'

type Product = Tables<'products'>

const UNITS = ['adet', 'kg', 'mt', 'paket', 'kutu', 'litre', 'm²', 'm³']
const VAT_RATES = [0, 1, 8, 10, 18, 20]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Excel import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<ParseResult | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [unit, setUnit] = useState('adet')
  const [unitPrice, setUnitPrice] = useState('')
  const [vatRate, setVatRate] = useState('18')

  const supabase = createClient()

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Ürünler yüklenemedi')
      return
    }

    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const resetForm = () => {
    setName('')
    setBrand('')
    setUnit('adet')
    setUnitPrice('')
    setVatRate('18')
    setEditingProduct(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setBrand(product.brand || '')
    setUnit(product.unit)
    setUnitPrice(product.unit_price.toString())
    setVatRate(product.vat_rate.toString())
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

    const productData = {
      name,
      brand: brand || null,
      unit,
      unit_price: parseFloat(unitPrice) || 0,
      vat_rate: parseFloat(vatRate),
      user_id: user.id,
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id)

      if (error) {
        toast.error('Ürün güncellenemedi')
        setSaving(false)
        return
      }
      toast.success('Ürün güncellendi')
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData)

      if (error) {
        toast.error('Ürün eklenemedi')
        setSaving(false)
        return
      }
      toast.success('Ürün eklendi')
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Ürün silinemedi')
      return
    }

    toast.success('Ürün silindi')
    fetchProducts()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input so selecting the same file again re-triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    setImportFileName(file.name)
    try {
      const result = await parseProductExcel(file)
      setImportResult(result)
      setImportOpen(true)
    } catch {
      toast.error('Dosya okunamadı. Lütfen geçerli bir Excel dosyası seçin.')
    }
  }

  const handleImportConfirm = async () => {
    if (!importResult || importResult.valid.length === 0) return
    setImporting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Oturum bulunamadı')
      setImporting(false)
      return
    }

    const payload = importResult.valid.map((r) => ({
      name: r.name,
      brand: r.brand,
      unit: r.unit,
      unit_price: r.unit_price,
      vat_rate: r.vat_rate,
      user_id: user.id,
    }))

    const { error } = await supabase.from('products').insert(payload)

    setImporting(false)

    if (error) {
      toast.error('Ürünler içe aktarılamadı')
      return
    }

    toast.success(`${payload.length} ürün başarıyla eklendi`)
    setImportOpen(false)
    setImportResult(null)
    setImportFileName('')
    fetchProducts()
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Ürünler</h1>
          <p className="mt-1 text-slate-400">Ürün kataloğunuzu yönetin</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={downloadProductTemplate}
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Excel Şablonu İndir
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Excel&apos;den İçe Aktar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
            <Plus className="mr-2 h-4 w-4" />
            Ürün Ekle
          </Button>
        </div>
      </div>

      {/* İçe aktarma ipucu */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 px-4 py-3 text-sm text-slate-400">
        Çok sayıda ürünü tek tek eklemeyin: <span className="text-slate-200">Excel Şablonu İndir</span> ile
        şablonu alın, doldurun ve <span className="text-slate-200">Excel&apos;den İçe Aktar</span> ile
        toplu olarak yükleyin.
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Ürün veya marka ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-slate-600 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-300">Ürün Adı</TableHead>
              <TableHead className="text-slate-300">Marka</TableHead>
              <TableHead className="text-slate-300">Birim</TableHead>
              <TableHead className="text-right text-slate-300">Birim Fiyat</TableHead>
              <TableHead className="text-right text-slate-300">KDV</TableHead>
              <TableHead className="text-right text-slate-300">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-400">
                  {search ? 'Arama sonucu bulunamadı' : 'Henüz ürün eklenmemiş'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-slate-700">
                  <TableCell className="font-medium text-white">{product.name}</TableCell>
                  <TableCell className="text-slate-300">{product.brand || '-'}</TableCell>
                  <TableCell className="text-slate-300">{product.unit}</TableCell>
                  <TableCell className="text-right text-slate-300">
                    ₺{product.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">%{product.vat_rate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-700 bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ürün Adı *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-slate-600 bg-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marka</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="border-slate-600 bg-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Birim</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-600 bg-slate-700">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="text-white hover:bg-slate-600">
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>KDV Oranı</Label>
                  <Select value={vatRate} onValueChange={setVatRate}>
                    <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-600 bg-slate-700">
                      {VAT_RATES.map((v) => (
                        <SelectItem key={v} value={v.toString()} className="text-white hover:bg-slate-600">
                          %{v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Birim Fiyat (KDV Hariç) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                  className="border-slate-600 bg-slate-700 text-white"
                />
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
                {editingProduct ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excel içe aktarma önizleme diyaloğu */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!importing) setImportOpen(o) }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden border-slate-700 bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Excel İçe Aktarma Önizlemesi</DialogTitle>
          </DialogHeader>

          {importResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-slate-400 truncate max-w-[220px]">{importFileName}</span>
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {importResult.valid.length} geçerli
                </Badge>
                {importResult.errors.length > 0 && (
                  <Badge className="bg-red-500/20 text-red-400">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {importResult.errors.length} hatalı
                  </Badge>
                )}
              </div>

              {importResult.valid.length > 0 ? (
                <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-300">Ürün Adı</TableHead>
                        <TableHead className="text-slate-300">Marka</TableHead>
                        <TableHead className="text-slate-300">Birim</TableHead>
                        <TableHead className="text-right text-slate-300">Birim Fiyat</TableHead>
                        <TableHead className="text-right text-slate-300">KDV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.valid.map((r) => (
                        <TableRow key={r.rowNumber} className="border-slate-700">
                          <TableCell className="font-medium text-white">{r.name}</TableCell>
                          <TableCell className="text-slate-300">{r.brand || '-'}</TableCell>
                          <TableCell className="text-slate-300">{r.unit}</TableCell>
                          <TableCell className="text-right text-slate-300">
                            ₺{r.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">%{r.vat_rate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
                  İçe aktarılacak geçerli ürün bulunamadı. Şablonu indirip doldurduğunuzdan emin olun.
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="max-h-[20vh] overflow-y-auto rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
                  <p className="mb-2 font-medium text-red-400">Atlanacak satırlar:</p>
                  <ul className="space-y-1 text-slate-300">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>
                        <span className="text-slate-500">Satır {err.rowNumber}:</span> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImportOpen(false)}
              disabled={importing}
              className="text-slate-300"
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={handleImportConfirm}
              disabled={importing || !importResult || importResult.valid.length === 0}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importResult ? `İçe Aktar (${importResult.valid.length} ürün)` : 'İçe Aktar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


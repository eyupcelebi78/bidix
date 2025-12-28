'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'

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
        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
          <Plus className="mr-2 h-4 w-4" />
          Ürün Ekle
        </Button>
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
    </div>
  )
}


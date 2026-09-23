'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

type Product = Tables<'products'>

const UNITS = ['adet', 'kg', 'mt', 'paket', 'kutu', 'litre', 'm²', 'm³']
const VAT_RATES = [0, 1, 8, 10, 18, 20]

export function QuickProductDialog({
  onCreated,
}: {
  onCreated: (product: Product) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [unit, setUnit] = useState('adet')
  const [unitPrice, setUnitPrice] = useState('')
  const [vatRate, setVatRate] = useState('18')
  const supabase = createClient()

  const reset = () => {
    setName('')
    setBrand('')
    setUnit('adet')
    setUnitPrice('')
    setVatRate('18')
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    const price = parseFloat(unitPrice.replace(',', '.'))
    if (!trimmed) {
      toast.error('Ürün adı gerekli')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Geçerli bir birim fiyat gir')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Oturum bulunamadı')

      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: trimmed,
          brand: brand.trim() || null,
          unit,
          unit_price: price,
          vat_rate: parseFloat(vatRate),
        })
        .select()
        .single()

      if (error || !data) throw error || new Error('Ürün eklenemedi')

      toast.success('Ürün listeye ve teklife eklendi')
      onCreated(data)
      reset()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ürün eklenemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="shrink-0 border-slate-600 text-slate-200"
        title="Listede yoksa yeni ürün ekle"
      >
        <Plus className="mr-1 h-4 w-4" />
        Yeni ürün
      </Button>

      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="border-slate-700 bg-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hızlı ürün ekle</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ürünler listesine kaydedilir ve hemen teklife eklenir. Sayfa yenilenmez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Ürün adı *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Çelik Vida M8"
                className="border-slate-600 bg-slate-700 text-white"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marka</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="İsteğe bağlı"
                className="border-slate-600 bg-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Birim</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700">
                    {UNITS.map((item) => (
                      <SelectItem key={item} value={item} className="text-white">
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>KDV %</Label>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700">
                    {VAT_RATES.map((rate) => (
                      <SelectItem key={rate} value={String(rate)} className="text-white">
                        %{rate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Birim fiyat (KDV hariç) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0,00"
                className="border-slate-600 bg-slate-700 text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-300" disabled={saving}>
              Vazgeç
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Kaydet ve teklife ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

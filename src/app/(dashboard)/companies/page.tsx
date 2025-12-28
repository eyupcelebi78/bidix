'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Pencil, Trash2, Building2, Loader2, Upload } from 'lucide-react'
import Image from 'next/image'

type Company = Tables<'companies'>
type SignatureProfile = Tables<'signature_profiles'>

const MULTIPLIERS = [
  { value: '1.00', label: 'Normal (x1.00)' },
  { value: '1.10', label: '+%10 (x1.10)' },
  { value: '1.15', label: '+%15 (x1.15)' },
]

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [signatureProfiles, setSignatureProfiles] = useState<SignatureProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [taxNo, setTaxNo] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [iban, setIban] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [signatureProfileId, setSignatureProfileId] = useState('')
  const [multiplier, setMultiplier] = useState('1.00')

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [companiesRes, signaturesRes] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('signature_profiles').select('*').order('created_at', { ascending: false }),
    ])

    if (companiesRes.error) {
      toast.error('Firmalar yüklenemedi')
      return
    }

    setCompanies(companiesRes.data || [])
    setSignatureProfiles(signaturesRes.data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setTitle('')
    setAddress('')
    setTaxOffice('')
    setTaxNo('')
    setPhone('')
    setEmail('')
    setIban('')
    setLogoUrl('')
    setSignatureProfileId('')
    setMultiplier('1.00')
    setEditingCompany(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (company: Company) => {
    setEditingCompany(company)
    setTitle(company.title)
    setAddress(company.address || '')
    setTaxOffice(company.tax_office || '')
    setTaxNo(company.tax_no || '')
    setPhone(company.phone || '')
    setEmail(company.email || '')
    setIban(company.iban || '')
    setLogoUrl(company.logo_url || '')
    setSignatureProfileId(company.signature_profile_id || '')
    setMultiplier(company.multiplier.toString())
    setDialogOpen(true)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file)

    if (uploadError) {
      toast.error('Logo yüklenemedi')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName)

    setLogoUrl(publicUrl)
    setUploading(false)
    toast.success('Logo yüklendi')
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

    const companyData = {
      title,
      address: address || null,
      tax_office: taxOffice || null,
      tax_no: taxNo || null,
      phone: phone || null,
      email: email || null,
      iban: iban || null,
      logo_url: logoUrl || null,
      signature_profile_id: signatureProfileId || null,
      multiplier: parseFloat(multiplier),
      user_id: user.id,
    }

    if (editingCompany) {
      const { error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', editingCompany.id)

      if (error) {
        toast.error('Firma güncellenemedi')
        setSaving(false)
        return
      }
      toast.success('Firma güncellendi')
    } else {
      const { error } = await supabase
        .from('companies')
        .insert(companyData)

      if (error) {
        toast.error('Firma eklenemedi')
        setSaving(false)
        return
      }
      toast.success('Firma eklendi')
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Firma silinemedi')
      return
    }

    toast.success('Firma silindi')
    fetchData()
  }

  const getMultiplierLabel = (mult: number) => {
    if (mult === 1) return 'Normal'
    return `+%${Math.round((mult - 1) * 100)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Firmalar</h1>
          <p className="mt-1 text-slate-400">Teklif verecek firmalarınızı yönetin</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
          <Plus className="mr-2 h-4 w-4" />
          Firma Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : companies.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <Building2 className="mb-4 h-12 w-12 text-slate-500" />
            <p className="text-lg text-slate-300">Henüz firma eklenmemiş</p>
            <p className="text-sm text-slate-500">Teklif oluşturmak için en az bir firma ekleyin</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="border-slate-700 bg-slate-800/50">
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  {company.logo_url ? (
                    <Image
                      src={company.logo_url}
                      alt={company.title}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-contain bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700">
                      <Building2 className="h-6 w-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg text-white">{company.title}</CardTitle>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      company.multiplier === 1 
                        ? 'bg-slate-600 text-slate-300' 
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {getMultiplierLabel(company.multiplier)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(company)}
                    className="text-slate-400 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(company.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-400">
                {company.address && <p>{company.address}</p>}
                {company.phone && <p>📞 {company.phone}</p>}
                {company.email && <p>✉️ {company.email}</p>}
                {company.tax_office && company.tax_no && (
                  <p>🏛️ {company.tax_office} / {company.tax_no}</p>
                )}
                {company.signature_profile_id && (
                  <p className="flex items-center gap-1 text-emerald-400">
                    ✍️ {signatureProfiles.find(sp => sp.id === company.signature_profile_id)?.signer_name || 'İmza Atanmış'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Firma Düzenle' : 'Yeni Firma Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Firma Logosu</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt="Logo"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-lg object-contain bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-700">
                      <Building2 className="h-8 w-8 text-slate-500" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" className="border-slate-600" disabled={uploading} asChild>
                      <span>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Logo Yükle
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Firma Ünvanı *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="border-slate-600 bg-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border-slate-600 bg-slate-700 text-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxOffice">Vergi Dairesi</Label>
                  <Input
                    id="taxOffice"
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    className="border-slate-600 bg-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNo">Vergi No</Label>
                  <Input
                    id="taxNo"
                    value={taxNo}
                    onChange={(e) => setTaxNo(e.target.value)}
                    className="border-slate-600 bg-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-slate-600 bg-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-slate-600 bg-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="border-slate-600 bg-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fiyat Çarpanı</Label>
                  <Select value={multiplier} onValueChange={setMultiplier}>
                    <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-600 bg-slate-700">
                      {MULTIPLIERS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-white hover:bg-slate-600">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>İmza Profili</Label>
                  <Select value={signatureProfileId} onValueChange={setSignatureProfileId}>
                    <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-600 bg-slate-700">
                      {signatureProfiles.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id} className="text-white hover:bg-slate-600">
                          {sp.signer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                {editingCompany ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


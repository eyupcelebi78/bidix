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
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Upload, Stamp, Building2 } from 'lucide-react'
import Image from 'next/image'

type SignatureProfile = Tables<'signature_profiles'>
type Company = Tables<'companies'>

export default function SignaturesPage() {
  const [profiles, setProfiles] = useState<SignatureProfile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<SignatureProfile | null>(null)
  const [uploadingStamp, setUploadingStamp] = useState(false)

  // Form state
  const [signerName, setSignerName] = useState('')
  const [signerTitle, setSignerTitle] = useState('')
  const [stampImageUrl, setStampImageUrl] = useState('')
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profilesRes, companiesRes] = await Promise.all([
      supabase.from('signature_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('title'),
    ])

    if (profilesRes.error) {
      toast.error('Profiller yüklenemedi')
      return
    }

    setProfiles(profilesRes.data || [])
    setCompanies(companiesRes.data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setSignerName('')
    setSignerTitle('')
    setStampImageUrl('')
    setSelectedCompanyIds([])
    setEditingProfile(null)
  }

  // Bu profile bağlı firmaları bul
  const getLinkedCompanies = (profileId: string) => {
    return companies.filter(c => c.signature_profile_id === profileId)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (profile: SignatureProfile) => {
    setEditingProfile(profile)
    setSignerName(profile.signer_name)
    setSignerTitle(profile.signer_title)
    setStampImageUrl(profile.stamp_image_url || '')
    // Bu profile bağlı firmaları seç
    const linkedCompanyIds = companies
      .filter(c => c.signature_profile_id === profile.id)
      .map(c => c.id)
    setSelectedCompanyIds(linkedCompanyIds)
    setDialogOpen(true)
  }

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingStamp(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploadingStamp(false)
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('stamps')
      .upload(fileName, file)

    if (uploadError) {
      toast.error('Kaşe yüklenemedi')
      setUploadingStamp(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('stamps')
      .getPublicUrl(fileName)

    setStampImageUrl(publicUrl)
    setUploadingStamp(false)
    toast.success('Kaşe yüklendi')
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

    const profileData = {
      signer_name: signerName,
      signer_title: signerTitle,
      signature_image_url: null,
      stamp_image_url: stampImageUrl || null,
      user_id: user.id,
    }

    let profileId: string

    if (editingProfile) {
      const { error } = await supabase
        .from('signature_profiles')
        .update(profileData)
        .eq('id', editingProfile.id)

      if (error) {
        toast.error('Profil güncellenemedi')
        setSaving(false)
        return
      }
      profileId = editingProfile.id
    } else {
      const { data, error } = await supabase
        .from('signature_profiles')
        .insert(profileData)
        .select()
        .single()

      if (error || !data) {
        toast.error('Profil eklenemedi')
        setSaving(false)
        return
      }
      profileId = data.id
    }

    // Firmaları güncelle - önce bu profile bağlı tüm firmaların bağlantısını kaldır
    const previouslyLinkedCompanyIds = companies
      .filter(c => c.signature_profile_id === profileId)
      .map(c => c.id)

    // Bağlantısı kaldırılacak firmalar (önceden bağlıydı ama şimdi seçili değil)
    const toUnlink = previouslyLinkedCompanyIds.filter(id => !selectedCompanyIds.includes(id))
    
    // Yeni bağlanacak firmalar (şimdi seçili ama önceden bağlı değildi)
    const toLink = selectedCompanyIds.filter(id => !previouslyLinkedCompanyIds.includes(id))

    // Bağlantıları kaldır
    if (toUnlink.length > 0) {
      await supabase
        .from('companies')
        .update({ signature_profile_id: null })
        .in('id', toUnlink)
    }

    // Yeni bağlantılar ekle
    if (toLink.length > 0) {
      await supabase
        .from('companies')
        .update({ signature_profile_id: profileId })
        .in('id', toLink)
    }

    toast.success(editingProfile ? 'Profil güncellendi' : 'Profil eklendi')
    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu profili silmek istediğinize emin misiniz?')) return

    // Önce bu profile bağlı firmaların bağlantısını kaldır
    await supabase
      .from('companies')
      .update({ signature_profile_id: null })
      .eq('signature_profile_id', id)

    const { error } = await supabase
      .from('signature_profiles')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Profil silinemedi')
      return
    }

    toast.success('Profil silindi')
    fetchData()
  }

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds(prev => 
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Kaşe Yönetimi</h1>
          <p className="mt-1 text-slate-400">Firma kaşe profillerinizi yönetin</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
          <Plus className="mr-2 h-4 w-4" />
          Kaşe Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : profiles.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <Stamp className="mb-4 h-12 w-12 text-slate-500" />
            <p className="text-lg text-slate-300">Henüz kaşe profili eklenmemiş</p>
            <p className="text-sm text-slate-500">PDF&apos;lerde görünecek kaşe için profil oluşturun</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const linkedCompanies = getLinkedCompanies(profile.id)
            return (
              <Card key={profile.id} className="border-slate-700 bg-slate-800/50">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">{profile.signer_name}</CardTitle>
                    <p className="text-sm text-slate-400">{profile.signer_title}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(profile)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(profile.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Kaşe Görseli */}
                  <div className="text-center">
                    <p className="mb-2 text-xs text-slate-500">Kaşe Görseli</p>
                    {profile.stamp_image_url ? (
                      <Image
                        src={profile.stamp_image_url}
                        alt="Kaşe"
                        width={80}
                        height={80}
                        className="mx-auto h-20 w-auto object-contain bg-white rounded p-2"
                      />
                    ) : (
                      <div className="flex h-20 items-center justify-center rounded bg-slate-700 mx-auto w-20">
                        <Stamp className="h-8 w-8 text-slate-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Bağlı Firmalar */}
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Bağlı Firmalar
                    </p>
                    {linkedCompanies.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">Henüz firma atanmadı</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {linkedCompanies.map(company => (
                          <Badge 
                            key={company.id} 
                            className="bg-emerald-500/20 text-emerald-400 text-xs max-w-full"
                            title={company.title}
                          >
                            <span className="truncate block max-w-[200px]">
                              {company.title}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-700 bg-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Kaşe Düzenle' : 'Yeni Kaşe Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="signerName">İmzalayan Adı *</Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  className="border-slate-600 bg-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signerTitle">Ünvanı *</Label>
                <Input
                  id="signerTitle"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  required
                  placeholder="Örn: Genel Müdür"
                  className="border-slate-600 bg-slate-700 text-white"
                />
              </div>

              {/* Stamp Upload */}
              <div className="space-y-2">
                <Label>Kaşe Görseli *</Label>
                <div className="flex items-center gap-4">
                  {stampImageUrl ? (
                    <Image
                      src={stampImageUrl}
                      alt="Kaşe"
                      width={80}
                      height={80}
                      className="h-20 w-auto object-contain bg-white rounded p-2"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-slate-700">
                      <Stamp className="h-8 w-8 text-slate-500" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" className="border-slate-600" disabled={uploadingStamp} asChild>
                      <span>
                        {uploadingStamp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Kaşe Yükle
                      </span>
                    </Button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleStampUpload} 
                    />
                  </label>
                </div>
              </div>

              {/* Firma Seçimi */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bu Kaşe Hangi Firmalarda Kullanılacak?
                </Label>
                {companies.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Henüz firma eklenmemiş</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-slate-600 p-3">
                    {companies.map(company => (
                      <label 
                        key={company.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedCompanyIds.includes(company.id)
                            ? 'bg-emerald-500/20 border border-emerald-500/50'
                            : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.includes(company.id)}
                          onChange={() => toggleCompanySelection(company.id)}
                          className="h-4 w-4 flex-shrink-0 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-white block truncate" title={company.title}>
                            {company.title}
                          </span>
                          {company.signature_profile_id && company.signature_profile_id !== editingProfile?.id && (
                            <span className="text-xs text-amber-400 block">(Başka profil atanmış)</span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                          company.multiplier === 1 
                            ? 'bg-slate-600 text-slate-300' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          x{company.multiplier}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Birden fazla firma seçebilirsiniz. Seçilen firmalarda bu kaşe kullanılacak.
                </p>
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
                {editingProfile ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


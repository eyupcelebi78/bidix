'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Upload, Stamp, Building2, X } from 'lucide-react'
import { StampImage } from '@/components/stamp-image'
import { isNonDisplayableStampUrl, stampFileToPngBlob, STAMP_ACCEPT } from '@/lib/stamp-file'

type SignatureProfile = Tables<'signature_profiles'>
type Company = Tables<'companies'>

export default function SignaturesPage() {
  const [profiles, setProfiles] = useState<SignatureProfile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<SignatureProfile | null>(null)
  const [uploadingStamp, setUploadingStamp] = useState(false)
  const [label, setLabel] = useState('')
  const [stampImageUrl, setStampImageUrl] = useState('')
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profilesRes, companiesRes] = await Promise.all([
      supabase.from('signature_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('title'),
    ])

    if (profilesRes.error) {
      toast.error('Kaşeler yüklenemedi')
      setLoading(false)
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
    setStampImageUrl('')
    setSelectedCompanyIds([])
    setEditingProfile(null)
    setLabel('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getLinkedCompanies = (profileId: string) => {
    return companies.filter((c) => c.signature_profile_id === profileId)
  }

  const profileTitle = (profile: SignatureProfile) => {
    const name = profile.signer_name?.trim()
    if (name && name !== 'Kaşe') return name
    return getLinkedCompanies(profile.id)[0]?.title || 'Kaşe'
  }

  const openCreateEditor = () => {
    resetForm()
    setEditorOpen(true)
  }

  const openEditEditor = (profile: SignatureProfile) => {
    setEditingProfile(profile)
    setStampImageUrl(profile.stamp_image_url || '')
    setLabel(profile.signer_name && profile.signer_name !== 'Kaşe' ? profile.signer_name : '')
    setSelectedCompanyIds(
      companies.filter((c) => c.signature_profile_id === profile.id).map((c) => c.id),
    )
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    resetForm()
  }

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingStamp(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Oturum bulunamadı')

      const png = await stampFileToPngBlob(file)
      const fileName = `${user.id}/${crypto.randomUUID()}.png`
      const { error: uploadError } = await supabase.storage
        .from('stamps')
        .upload(fileName, png, {
          contentType: 'image/png',
          upsert: true,
          cacheControl: '31536000',
        })

      if (uploadError) throw new Error(uploadError.message || 'Kaşe yüklenemedi')

      const { data: { publicUrl } } = supabase.storage
        .from('stamps')
        .getPublicUrl(fileName)

      setStampImageUrl(publicUrl)
      toast.success('Kaşe yüklendi')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kaşe yüklenemedi')
    } finally {
      setUploadingStamp(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Oturum bulunamadı')
      if (!stampImageUrl) throw new Error('Lütfen bir kaşe görseli yükleyin')
      if (isNonDisplayableStampUrl(stampImageUrl)) {
        throw new Error('Kayıtlı kaşe görsel değil. PNG veya JPG yükleyin.')
      }

      const signerName =
        label.trim() ||
        companies.find((c) => selectedCompanyIds.includes(c.id))?.title ||
        'Kaşe'

      const profileData = {
        signer_name: signerName,
        signer_title: '',
        signature_image_url: null,
        stamp_image_url: stampImageUrl,
        user_id: user.id,
      }

      let profileId: string

      if (editingProfile) {
        const { error } = await supabase
          .from('signature_profiles')
          .update(profileData)
          .eq('id', editingProfile.id)
        if (error) throw new Error('Kaşe güncellenemedi')
        profileId = editingProfile.id
      } else {
        const { data, error } = await supabase
          .from('signature_profiles')
          .insert(profileData)
          .select()
          .single()
        if (error || !data) throw new Error('Kaşe eklenemedi')
        profileId = data.id
      }

      const previouslyLinked = companies
        .filter((c) => c.signature_profile_id === profileId)
        .map((c) => c.id)
      const toUnlink = previouslyLinked.filter((id) => !selectedCompanyIds.includes(id))
      const toLink = selectedCompanyIds.filter((id) => !previouslyLinked.includes(id))

      if (toUnlink.length > 0) {
        const { error } = await supabase
          .from('companies')
          .update({ signature_profile_id: null })
          .in('id', toUnlink)
        if (error) throw new Error('Firma bağlantısı kaldırılamadı')
      }

      if (toLink.length > 0) {
        const { error } = await supabase
          .from('companies')
          .update({ signature_profile_id: profileId })
          .in('id', toLink)
        if (error) throw new Error('Firma kaşeye bağlanamadı')
      }

      toast.success(editingProfile ? 'Kaşe güncellendi' : 'Kaşe eklendi')
      closeEditor()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kaşe kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaşeyi silmek istediğinize emin misiniz?')) return

    const { error: unlinkError } = await supabase
      .from('companies')
      .update({ signature_profile_id: null })
      .eq('signature_profile_id', id)

    if (unlinkError) {
      toast.error('Firma bağlantısı kaldırılamadı')
      return
    }

    const { error } = await supabase
      .from('signature_profiles')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Kaşe silinemedi')
      return
    }

    toast.success('Kaşe silindi')
    if (editingProfile?.id === id) closeEditor()
    fetchData()
  }

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId],
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Kaşe Yönetimi</h1>
          <p className="mt-1 text-slate-400">
            Kaşeyi PNG veya JPG olarak yükleyin. PDF yüklemek teklifte görünmez.
          </p>
        </div>
        {!editorOpen && (
          <Button onClick={openCreateEditor} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
            <Plus className="mr-2 h-4 w-4" />
            Kaşe Ekle
          </Button>
        )}
      </div>

      {editorOpen && (
        <Card className="border-emerald-500/40 bg-slate-800/50">
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-white">
              {editingProfile ? 'Kaşe Düzenle' : 'Yeni Kaşe Ekle'}
            </CardTitle>
            <Button type="button" variant="ghost" size="icon" onClick={closeEditor} className="text-slate-400">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="space-y-2">
                <Label>Kaşe adı</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Örn. ORC Grup kaşesi"
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label>Kaşe görseli *</Label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="w-full max-w-[220px]">
                    <StampImage src={stampImageUrl} />
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-600"
                      disabled={uploadingStamp}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingStamp ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      PNG / JPG Yükle
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={STAMP_ACCEPT}
                      className="hidden"
                      onChange={handleStampUpload}
                    />
                    <p className="text-xs text-slate-500">
                      Telefon fotoğrafı veya tarama olabilir. PDF, Excel veya Word kabul edilmez.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bu kaşe hangi firmalarda kullanılacak?
                </Label>
                {companies.length === 0 ? (
                  <p className="text-sm italic text-slate-500">Henüz firma eklenmemiş</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-600 p-3">
                    {companies.map((company) => {
                      const otherStamp = company.signature_profile_id
                        && company.signature_profile_id !== editingProfile?.id
                      return (
                        <label
                          key={company.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors ${
                            selectedCompanyIds.includes(company.id)
                              ? 'border border-emerald-500/50 bg-emerald-500/20'
                              : 'border border-transparent bg-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCompanyIds.includes(company.id)}
                            onChange={() => toggleCompanySelection(company.id)}
                            className="h-4 w-4 flex-shrink-0 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white" title={company.title}>
                              {company.title}
                            </span>
                            {otherStamp && (
                              <span className="block text-xs text-amber-400">
                                Başka kaşesi var — seçerseniz bu kaşeye geçer
                              </span>
                            )}
                          </div>
                          <span
                            className={`flex-shrink-0 rounded px-2 py-0.5 text-xs ${
                              company.multiplier === 1
                                ? 'bg-slate-600 text-slate-300'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            x{company.multiplier}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeEditor} className="text-slate-300">
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={saving || uploadingStamp}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProfile ? 'Kaydet' : 'Ekle'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : profiles.length === 0 && !editorOpen ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <Stamp className="mb-4 h-12 w-12 text-slate-500" />
            <p className="text-lg text-slate-300">Henüz kaşe eklenmemiş</p>
            <p className="text-sm text-slate-500">PDF&apos;lerde görünecek kaşe için PNG veya JPG yükleyin</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const linkedCompanies = getLinkedCompanies(profile.id)
            const broken = isNonDisplayableStampUrl(profile.stamp_image_url)
            return (
              <Card key={profile.id} className="border-slate-700 bg-slate-800/50">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">{profileTitle(profile)}</CardTitle>
                    <p className="text-sm text-slate-400">
                      {broken
                        ? 'Görsel bozuk — yeniden yükleyin'
                        : linkedCompanies.length > 1
                          ? `${linkedCompanies.length} firmaya atanmış`
                          : 'Teklif formuna basılır'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditEditor(profile)}
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
                  <StampImage src={profile.stamp_image_url} alt={profileTitle(profile)} />

                  <div className="border-t border-slate-700 pt-3">
                    <p className="mb-2 flex items-center gap-1 text-xs text-slate-500">
                      <Building2 className="h-3 w-3" />
                      Bağlı Firmalar
                    </p>
                    {linkedCompanies.length === 0 ? (
                      <p className="text-xs italic text-slate-600">Henüz firma atanmadı</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {linkedCompanies.map((company) => (
                          <Badge
                            key={company.id}
                            className="max-w-full bg-emerald-500/20 text-xs text-emerald-400"
                            title={company.title}
                          >
                            <span className="block max-w-[200px] truncate">{company.title}</span>
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
    </div>
  )
}

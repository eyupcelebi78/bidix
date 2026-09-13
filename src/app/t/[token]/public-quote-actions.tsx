'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { QuoteStatus, STATUS_LABEL } from '@/lib/quote-share'

export function PublicQuoteActions({
  token,
  initialStatus,
}: {
  token: string
  initialStatus: QuoteStatus
}) {
  const [status, setStatus] = useState<QuoteStatus>(initialStatus)
  const [saving, setSaving] = useState(false)
  const locked = status === 'accepted' || status === 'rejected'

  const respond = async (action: 'accepted' | 'rejected') => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('respond_public_quote', {
        p_token: token,
        p_action: action,
      })
      if (error) throw error
      const payload = data as { ok?: boolean; status?: QuoteStatus } | null
      if (!payload?.ok) throw new Error('Yanıt kaydedilemedi')
      setStatus(payload.status || action)
      toast.success(action === 'accepted' ? 'Teklif onaylandı' : 'Teklif reddedildi')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yanıt gönderilemedi')
    } finally {
      setSaving(false)
    }
  }

  if (locked) {
    return (
      <p className={`text-center text-sm font-medium ${status === 'accepted' ? 'text-emerald-700' : 'text-red-700'}`}>
        Bu teklif {STATUS_LABEL[status].toLowerCase()}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        disabled={saving}
        onClick={() => respond('accepted')}
      >
        <Check className="mr-2 h-4 w-4" />
        Teklifi onayla
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        disabled={saving}
        onClick={() => respond('rejected')}
      >
        <X className="mr-2 h-4 w-4" />
        Reddet
      </Button>
    </div>
  )
}

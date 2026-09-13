'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { toast } from 'sonner'
import { Mail, MessageCircle } from 'lucide-react'
import {
  QuoteStatus,
  SentVia,
  quoteShareUrl,
  shareMessage,
  toWhatsAppNumber,
  whatsappShareUrl,
} from '@/lib/quote-share'

export interface ShareQuote {
  id: string
  share_token: string
  quote_no: string | null
  grand_total: number
  status: QuoteStatus
  customer_name: string | null
  customer_company: string | null
}

export interface ShareCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface QuoteShareButtonsProps {
  quote: ShareQuote
  customer: ShareCustomer | null
  companyTitle: string | null
  onSent?: () => void
}

export function QuoteShareButtons({ quote, customer, companyTitle, onSent }: QuoteShareButtonsProps) {
  const [open, setOpen] = useState<SentVia | null>(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const openChannel = (channel: SentVia) => {
    setPhone(customer?.phone || '')
    setEmail(customer?.email || '')
    setOpen(channel)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  }

  const fetchQuotePdf = async () => {
    const res = await fetch(`/api/quotes/${quote.id}/pdf`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'PDF alınamadı' }))
      throw new Error(err.error || 'PDF alınamadı')
    }
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="([^"]+)"/)
    const filename = match?.[1] || 'teklif.pdf'
    return { blob, filename, file: new File([blob], filename, { type: 'application/pdf' }) }
  }

  const markSent = async (channel: SentVia) => {
    const keepStatus = quote.status === 'viewed' || quote.status === 'accepted' || quote.status === 'rejected'
    const { error } = await supabase
      .from('quotes')
      .update({
        status: keepStatus ? quote.status : 'sent',
        sent_via: channel,
        sent_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    if (error) {
      toast.error('Gönderim kaydı yazılamadı')
      return
    }

    if (customer && (phone.trim() || email.trim())) {
      await supabase
        .from('customers')
        .update({
          phone: phone.trim() || customer.phone,
          email: email.trim() || customer.email,
        })
        .eq('id', customer.id)
    }

    onSent?.()
  }

  const handleSend = async () => {
    if (!open) return

    if (open === 'whatsapp' && phone.trim() && !toWhatsAppNumber(phone)) {
      toast.error('Geçerli bir WhatsApp numarası girin')
      return
    }
    if (open === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Geçerli bir e-posta girin')
      return
    }

    setSaving(true)
    try {
      const url = quoteShareUrl(quote.share_token)
      const body = shareMessage({
        customerName: customer?.name || quote.customer_company || quote.customer_name,
        companyTitle,
        quoteNo: quote.quote_no,
        grandTotal: quote.grand_total,
        url,
      })

      if (open === 'whatsapp') {
        const caption = `${body}\n\nTeklif PDF olarak eklenmiştir.`
        const { blob, filename, file } = await fetchQuotePdf()
        const payload = { files: [file], text: caption, title: filename }
        const canAttach = typeof navigator.canShare === 'function' && navigator.canShare(payload)

        if (canAttach) {
          try {
            await navigator.share(payload)
            await markSent(open)
            toast.success('PDF WhatsApp’a ek olarak paylaşıldı')
            setOpen(null)
            return
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return
          }
        }

        downloadBlob(blob, filename)
        window.open(whatsappShareUrl(phone, caption), '_blank', 'noopener,noreferrer')
        await markSent(open)
        toast.success('PDF indirildi. WhatsApp sohbetine ataş ile ekle.')
        setOpen(null)
        return
      }

      const res = await fetch('/api/quotes/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id, to: email.trim() }),
      })

      const mode = res.headers.get('X-Bidix-Email-Mode')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'E-posta hazırlanamadı' }))
        throw new Error(err.error || 'E-posta hazırlanamadı')
      }

      await markSent(open)

      if (mode === 'eml' || res.headers.get('Content-Type')?.includes('rfc822')) {
        const blob = await res.blob()
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const disposition = res.headers.get('Content-Disposition') || ''
        const match = disposition.match(/filename="([^"]+)"/)
        a.href = href
        a.download = match?.[1] || 'teklif.eml'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(href)
        toast.success('PDF ekli mail indirildi. Açıp Gönder’e basman yeterli.')
      } else {
        toast.success('E-posta PDF ekli olarak gönderildi')
      }

      setOpen(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'E-posta hazırlanamadı')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openChannel('whatsapp')}
          className="text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          title="WhatsApp ile gönder"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openChannel('email')}
          className="text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
          title="E-posta ile gönder"
        >
          <Mail className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="border-slate-700 bg-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {open === 'whatsapp' ? 'WhatsApp ile gönder' : 'E-posta ile gönder'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {open === 'whatsapp'
                ? 'Mümkünse PDF WhatsApp’a ek olarak gider. Desteklenmezse PDF iner, sohbete sen eklersin.'
                : 'Mailde hem teklif linki hem PDF ek olarak gider.'}
            </DialogDescription>
          </DialogHeader>

          {open === 'whatsapp' ? (
            <div className="space-y-2">
              <Label htmlFor="share-phone">WhatsApp numarası</Label>
              <Input
                id="share-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Telefonda paylaş menüsünden WhatsApp’ı seç; PDF ek gider. Bilgisayarda PDF iner, sohbete ataşla ekle.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="share-email">E-posta</Label>
              <Input
                id="share-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="musteri@firma.com"
                className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                PDF teklif e-postaya eklenir. Kendi mailinde açıp Gönder’e basman yeterli.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)} className="text-slate-300">
              Vazgeç
            </Button>
            <Button
              onClick={handleSend}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {open === 'whatsapp' ? 'PDF ekli WhatsApp' : 'PDF ekli mail hazırla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

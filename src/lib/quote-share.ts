export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
export type SentVia = 'whatsapp' | 'email'

export function quoteSharePath(token: string) {
  return `/t/${token}`
}

export function quoteShareUrl(token: string, origin?: string) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}${quoteSharePath(token)}`
}

export function formatTry(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function shareMessage(opts: {
  customerName?: string | null
  companyTitle?: string | null
  quoteNo?: string | null
  grandTotal: number
  url: string
}) {
  const who = opts.customerName ? `Merhaba ${opts.customerName},` : 'Merhaba,'
  return [
    who,
    '',
    opts.companyTitle ? `${opts.companyTitle} teklifiniz hazır.` : 'Teklifiniz hazır.',
    opts.quoteNo ? `Teklif no: ${opts.quoteNo}` : null,
    `Tutar: ${formatTry(opts.grandTotal)}`,
    '',
    'İncelemek ve yanıtlamak için:',
    opts.url,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `90${digits.slice(1)}`
  if (digits.length === 10) digits = `90${digits}`
  if (digits.length < 11) return null
  return digits
}

export function whatsappShareUrl(phone: string | null | undefined, text: string) {
  const num = phone ? toWhatsAppNumber(phone) : null
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}

export function mailtoShareUrl(email: string | null | undefined, subject: string, body: string) {
  const to = (email || '').trim()
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  viewed: 'Görüldü',
  accepted: 'Onaylandı',
  rejected: 'Reddedildi',
}

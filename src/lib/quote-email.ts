import { formatTry, shareMessage } from '@/lib/quote-share'

function rfc2047(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function wrapBase64(b64: string) {
  return b64.replace(/(.{76})/g, '$1\r\n')
}

export function emailSubject(companyTitle?: string | null) {
  return companyTitle ? `${companyTitle} — fiyat teklifi` : 'Fiyat teklifi'
}

export function emailBody(opts: {
  customerName?: string | null
  companyTitle?: string | null
  quoteNo?: string | null
  grandTotal: number
  url: string
  items?: Array<{ product_name: string; quantity: number; product_unit: string; line_total: number }>
}) {
  const lines = [shareMessage(opts), '', 'Teklif PDF olarak bu e-postaya eklenmiştir.']
  if (opts.items && opts.items.length > 0) {
    lines.push('', 'Kalemler:')
    for (const item of opts.items) {
      lines.push(
        `• ${item.product_name} — ${item.quantity} ${item.product_unit} — ${formatTry(item.line_total)}`,
      )
    }
  }
  return lines.join('\n')
}

export function buildQuoteEml(opts: {
  to: string
  subject: string
  body: string
  pdf: Buffer
  filename: string
  fromName?: string
}) {
  const boundary = `bidix_${Date.now().toString(16)}`
  const from = opts.fromName ? `${rfc2047(opts.fromName)}` : 'Bidix'
  const filename = opts.filename.replace(/"/g, '')

  return [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${rfc2047(opts.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(opts.body, 'utf8').toString('base64')),
    `--${boundary}`,
    'Content-Type: application/pdf',
    `Content-Disposition: attachment; filename="${filename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(opts.pdf.toString('base64')),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

function toAsciiName(value: string) {
  return value
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİiI]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function attachmentFileName(opts: {
  customerName?: string | null
  companyTitle?: string | null
  quoteNo?: string | null
}) {
  const raw = toAsciiName(
    [opts.customerName, opts.companyTitle, opts.quoteNo || 'teklif'].filter(Boolean).join('_'),
  ).slice(0, 80)
  return `${raw || 'teklif'}.pdf`
}

export function headerFileName(filename: string) {
  const ascii = toAsciiName(filename.replace(/\.pdf$/i, ''))
  return `${ascii || 'teklif'}.eml`
}

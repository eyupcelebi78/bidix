import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { quoteShareUrl } from '@/lib/quote-share'
import { attachmentFileName, buildQuoteEml, emailBody, emailSubject, headerFileName } from '@/lib/quote-email'

type CompanyRel = { title: string } | { title: string }[] | null

function companyTitle(company: CompanyRel): string | null {
  if (!company) return null
  if (Array.isArray(company)) return company[0]?.title || null
  return company.title
}

async function fetchPdf(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('PDF indirilemedi')
  return Buffer.from(await res.arrayBuffer())
}

async function sendWithResend(opts: {
  to: string
  subject: string
  body: string
  pdf: Buffer
  filename: string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) return false

  const from = process.env.MAIL_FROM || 'Bidix <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.body,
      attachments: [
        {
          filename: opts.filename,
          content: opts.pdf.toString('base64'),
        },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || 'E-posta gönderilemedi')
  }
  return true
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    const body = await request.json() as { quoteId?: string; to?: string }
    const quoteId = body.quoteId?.trim()
    const to = body.to?.trim() || ''

    if (!quoteId) {
      return NextResponse.json({ error: 'Teklif gerekli' }, { status: 400 })
    }
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta girin' }, { status: 400 })
    }

    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_no,
        share_token,
        customer_name,
        customer_company,
        grand_total,
        pdf_url,
        company:companies(title)
      `)
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: 'Teklif bulunamadı' }, { status: 404 })
    }
    if (!quote.pdf_url) {
      return NextResponse.json({ error: 'Bu teklifin PDF’i yok' }, { status: 400 })
    }

    const { data: items } = await supabase
      .from('quote_items')
      .select('product_name, quantity, product_unit, line_total')
      .eq('quote_id', quote.id)
      .order('sort_order')

    const title = companyTitle(quote.company as CompanyRel)
    const shareUrl = quoteShareUrl(quote.share_token, request.nextUrl.origin)
    const subject = emailSubject(title)
    const text = emailBody({
      customerName: quote.customer_company || quote.customer_name,
      companyTitle: title,
      quoteNo: quote.quote_no,
      grandTotal: quote.grand_total,
      url: shareUrl,
      items: (items || []).map((item) => ({
        product_name: item.product_name,
        quantity: Number(item.quantity),
        product_unit: item.product_unit,
        line_total: Number(item.line_total),
      })),
    })
    const filename = attachmentFileName({
      customerName: quote.customer_company || quote.customer_name,
      companyTitle: title,
      quoteNo: quote.quote_no,
    })
    const pdf = await fetchPdf(quote.pdf_url)

    const sent = await sendWithResend({ to, subject, body: text, pdf, filename })
    if (sent) {
      return NextResponse.json({ sent: true })
    }

    const eml = buildQuoteEml({
      to,
      subject,
      body: text,
      pdf,
      filename,
      fromName: title || 'Bidix',
    })

    const emlName = headerFileName(filename)
    return new NextResponse(eml, {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822',
        'Content-Disposition': `attachment; filename="${emlName}"`,
        'X-Bidix-Email-Mode': 'eml',
      },
    })
  } catch (error) {
    console.error('send-email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'E-posta hazırlanamadı' },
      { status: 500 },
    )
  }
}

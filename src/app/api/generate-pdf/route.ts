import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTemplate, QuoteData } from '@/lib/pdf-templates'
import { quotePdfFileName } from '@/lib/pdf-filename'
import { embedRemoteImage } from '@/lib/embed-remote-image'

export async function POST(request: NextRequest) {
  try {
    // Create authenticated Supabase client
    const supabase = await createClient()
    
    const body = await request.json()
    const { quoteId, quoteData } = body as { quoteId: string, quoteData: QuoteData }

    if (!quoteId || !quoteData) {
      return NextResponse.json({ error: 'Quote ID ve veri gerekli' }, { status: 400 })
    }

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    const origin = request.nextUrl.origin
    const [logoUrl, stampUrl, signatureUrl] = await Promise.all([
      embedRemoteImage(quoteData.company?.logo_url, origin),
      embedRemoteImage(quoteData.signature?.stamp_image_url, origin),
      embedRemoteImage(quoteData.signature?.signature_image_url, origin),
    ])
    const embeddedQuoteData: QuoteData = {
      ...quoteData,
      company: {
        ...quoteData.company,
        logo_url: logoUrl,
      },
      signature: quoteData.signature
        ? {
            ...quoteData.signature,
            stamp_image_url: stampUrl,
            signature_image_url: signatureUrl,
          }
        : null,
    }

    // Generate HTML
    const templateKey = body.templateKey || 'form'
    const html = generateTemplate(templateKey, embeddedQuoteData, origin)

    // Generate PDF using Playwright
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(async () => {
      const images = Array.from(document.images)
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          })
        }),
      )
    })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    const fileName = quotePdfFileName({
      userId: user.id,
      quoteId,
      customerName: quoteData.quote.customer_company || quoteData.quote.customer_name,
      companyTitle: quoteData.company.title,
    })
    
    const { error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'PDF yüklenemedi' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('quotes')
      .getPublicUrl(fileName)

    return NextResponse.json({ pdfUrl: publicUrl })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF oluşturulurken hata oluştu' },
      { status: 500 }
    )
  }
}

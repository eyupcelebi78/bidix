import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTemplate, QuoteData } from '@/lib/pdf-templates'

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

    // Generate HTML
    const templateKey = quoteData.quote.id ? 'modern' : 'modern' // Default to modern
    const html = generateTemplate(body.templateKey || templateKey, quoteData)

    // Try to generate PDF using Playwright
    let pdfBuffer: Buffer | null = null
    
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle' })
      
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })

      await browser.close()
    } catch (browserError) {
      console.error('Playwright error:', browserError)
      // Fallback: Return HTML preview URL
      const htmlBase64 = Buffer.from(html).toString('base64')
      return NextResponse.json({ 
        pdfUrl: `data:text/html;base64,${htmlBase64}`,
        isHtml: true,
        message: 'PDF oluşturulamadı, HTML önizleme döndürülüyor'
      })
    }

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'PDF buffer oluşturulamadı' }, { status: 500 })
    }

    // Upload PDF to Supabase Storage - use authenticated user's ID for the path
    const fileName = `${user.id}/${quoteId}.pdf`
    
    const { error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      // Return PDF as base64 if upload fails
      const pdfBase64 = pdfBuffer.toString('base64')
      return NextResponse.json({ 
        pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
        isBase64: true
      })
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

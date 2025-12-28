import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTemplate, QuoteData } from '@/lib/pdf-templates'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

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
    const templateKey = body.templateKey || 'modern'
    const html = generateTemplate(templateKey, quoteData)

    // Generate PDF using Puppeteer (works on Vercel)
    let pdfBuffer: Buffer | null = null
    
    try {
      // Determine if we're running locally or on Vercel
      const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL
      
      const browser = await puppeteer.launch({
        args: isLocal ? [] : chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: isLocal 
          ? process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : '/usr/bin/google-chrome'
          : await chromium.executablePath(),
        headless: chromium.headless,
      })
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })

      await browser.close()
    } catch (browserError) {
      console.error('PDF generation error:', browserError)
      
      // Fallback to HTML if PDF generation fails
      const htmlFileName = `${user.id}/${quoteId}.html`
      const htmlBuffer = Buffer.from(html, 'utf-8')
      
      const { error: htmlUploadError } = await supabase.storage
        .from('quotes')
        .upload(htmlFileName, htmlBuffer, {
          contentType: 'text/html; charset=utf-8',
          upsert: true,
        })

      if (htmlUploadError) {
        console.error('HTML upload error:', htmlUploadError)
        return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 500 })
      }

      const { data: { publicUrl: htmlPublicUrl } } = supabase.storage
        .from('quotes')
        .getPublicUrl(htmlFileName)

      return NextResponse.json({ 
        pdfUrl: htmlPublicUrl,
        isHtml: true,
        message: 'HTML önizleme oluşturuldu (yazdırmak için Ctrl+P kullanın)'
      })
    }

    // Upload PDF to Supabase Storage
    const fileName = `${user.id}/${quoteId}.pdf`
    
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

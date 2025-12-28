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
    const templateKey = body.templateKey || 'modern'
    const html = generateTemplate(templateKey, quoteData)

    // Generate PDF using PDFShift API (works on Vercel, 250 free PDFs/month)
    let pdfBuffer: Buffer | null = null
    
    const pdfShiftApiKey = process.env.PDFSHIFT_API_KEY
    
    if (pdfShiftApiKey && pdfShiftApiKey !== 'demo') {
      try {
        const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`api:${pdfShiftApiKey}`).toString('base64')}`
          },
          body: JSON.stringify({
            source: html,
            format: 'A4',
            margin: '0mm',
            print_background: true,
          })
        })

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          pdfBuffer = Buffer.from(arrayBuffer)
        } else {
          console.error('PDFShift error:', await response.text())
        }
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
      }
    }

    // If PDF was generated successfully, upload it
    if (pdfBuffer) {
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
    }

    // Fallback: Upload HTML for browser printing
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
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF oluşturulurken hata oluştu' },
      { status: 500 }
    )
  }
}

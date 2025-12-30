import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTemplate, QuoteData } from '@/lib/pdf-templates'

interface DemoItem {
  name: string
  quantity: number
  unitPrice: number
  vatRate: number
}

interface DemoRequest {
  companyName?: string
  customerName?: string
  stampImageBase64?: string | null
  selectedTemplates?: string[]
  items: DemoItem[]
}

export async function POST(request: NextRequest) {
  try {
    const body: DemoRequest = await request.json()
    const { companyName = 'Demo Firma', customerName = 'Demo Müşteri', stampImageBase64, selectedTemplates = ['modern', 'classic'], items } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'En az bir ürün gerekli' }, { status: 400 })
    }

    // Validate items
    for (const item of items) {
      if (!item.name || item.quantity <= 0 || item.unitPrice <= 0) {
        return NextResponse.json({ error: 'Geçersiz ürün bilgileri' }, { status: 400 })
      }
    }

    // Validate templates - only allow free templates in demo
    const freeTemplates = ['modern', 'classic']
    const validTemplates = selectedTemplates.filter(t => freeTemplates.includes(t))
    
    if (validTemplates.length === 0) {
      return NextResponse.json({ error: 'Geçerli şablon seçilmedi' }, { status: 400 })
    }

    // Define multipliers for each template
    const multipliers = [1.0, 1.1, 1.15]
    
    // Create offers config from selected templates
    const offersConfig = validTemplates.map((template, index) => ({
      template,
      multiplier: multipliers[index] || 1.0,
      offerNo: index + 1,
    }))

    const supabase = await createClient()
    
    let browser
    try {
      const { chromium } = await import('playwright')
      browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    } catch (launchError) {
      console.error('Browser launch error:', launchError)
      throw new Error('PDF oluşturucu başlatılamadı. Lütfen daha sonra tekrar deneyin.')
    }

    const generatedOffers = []

    for (const config of offersConfig) {
      // Calculate totals with multiplier
      const calculatedItems = items.map((item) => {
        const unitPriceEffective = item.unitPrice * config.multiplier
        const lineSubtotal = unitPriceEffective * item.quantity
        const lineVat = lineSubtotal * (item.vatRate / 100)
        const lineTotal = lineSubtotal + lineVat

        return {
          product_name: item.name,
          product_brand: null,
          product_unit: 'Adet',
          quantity: item.quantity,
          unit_price_effective: unitPriceEffective,
          vat_rate: item.vatRate,
          line_subtotal: lineSubtotal,
          line_vat: lineVat,
          line_total: lineTotal,
        }
      })

      const subtotal = calculatedItems.reduce((sum, item) => sum + item.line_subtotal, 0)
      const vatTotal = calculatedItems.reduce((sum, item) => sum + item.line_vat, 0)
      const grandTotal = subtotal + vatTotal

      // Prepare quote data
      const quoteData: QuoteData = {
        quote: {
          id: `demo-${Date.now()}-${config.offerNo}`,
          quote_no: `DEMO-${config.offerNo}-${Date.now().toString().slice(-6)}`,
          customer_name: customerName,
          customer_company: null,
          currency: 'TRY',
          subtotal,
          vat_total: vatTotal,
          grand_total: grandTotal,
          created_at: new Date().toISOString(),
        },
        company: {
          title: companyName,
          address: null,
          tax_office: null,
          tax_no: null,
          phone: null,
          email: null,
          iban: null,
          logo_url: null,
        },
        signature: stampImageBase64
          ? {
              signer_name: 'Demo Kullanıcı',
              signer_title: 'Yetkili',
              signature_image_url: null,
              stamp_image_url: stampImageBase64, // Use base64 directly in demo
            }
          : null,
        items: calculatedItems,
      }

      // Generate HTML with demo watermark
      const html = generateTemplate(config.template, quoteData, true)

      // Generate PDF
      let pdfBuffer: Buffer
      try {
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle' })

        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        })

        await page.close()
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        continue // Skip this offer and try next one
      }

      // Upload PDF to Supabase Storage
      const timestamp = Date.now()
      const fileName = `demo/offers/${timestamp}-${config.offerNo}-${config.template}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('quotes')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('PDF upload error:', uploadError)
        continue // Skip this offer if upload fails
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quotes')
        .getPublicUrl(fileName)

      generatedOffers.push({
        offerNo: config.offerNo,
        template: config.template,
        multiplier: config.multiplier,
        totals: {
          subtotal,
          vat_total: vatTotal,
          grand_total: grandTotal,
        },
        pdfUrl: publicUrl,
        previewUrl: publicUrl, // Same URL for preview
      })
    }

    await browser.close()

    // Track demo offer generation count in database
    try {
      const { error: insertError } = await supabase
        .from('demo_stats')
        .insert({
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.warn('Demo stats tracking error (non-critical):', insertError.message)
      }
    } catch (statsError) {
      console.warn('Demo stats tracking failed (non-critical):', statsError)
    }

    if (generatedOffers.length === 0) {
      return NextResponse.json({ error: 'Teklifler oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ offers: generatedOffers })
  } catch (error) {
    console.error('Generate offers error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Teklifler oluşturulurken hata oluştu'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Error stack:', errorStack)
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}


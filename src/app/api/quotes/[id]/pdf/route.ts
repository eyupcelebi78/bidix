import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { attachmentFileName } from '@/lib/quote-email'

type CompanyRel = { title: string } | { title: string }[] | null

function companyTitle(company: CompanyRel): string | null {
  if (!company) return null
  if (Array.isArray(company)) return company[0]?.title || null
  return company.title
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('id, quote_no, customer_name, customer_company, pdf_url, company:companies(title)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !quote?.pdf_url) {
      return NextResponse.json({ error: 'PDF bulunamadı' }, { status: 404 })
    }

    const pdfRes = await fetch(quote.pdf_url)
    if (!pdfRes.ok) {
      return NextResponse.json({ error: 'PDF indirilemedi' }, { status: 502 })
    }

    const pdf = Buffer.from(await pdfRes.arrayBuffer())
    const filename = attachmentFileName({
      customerName: quote.customer_company || quote.customer_name,
      companyTitle: companyTitle(quote.company as CompanyRel),
      quoteNo: quote.quote_no,
    })

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('quote pdf error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF alınamadı' },
      { status: 500 },
    )
  }
}

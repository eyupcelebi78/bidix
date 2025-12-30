import { generateModernTemplate } from './modern'
import { generateClassicTemplate } from './classic'
import { generateMinimalTemplate } from './minimal'
import { generateCorporateTemplate } from './corporate'
import { generateElegantTemplate } from './elegant'
import { generateBoldTemplate } from './bold'

export interface QuoteData {
  quote: {
    id: string
    quote_no: string | null
    customer_name: string | null
    customer_company: string | null
    currency: string
    subtotal: number
    vat_total: number
    grand_total: number
    created_at: string | null
  }
  company: {
    title: string
    address: string | null
    tax_office: string | null
    tax_no: string | null
    phone: string | null
    email: string | null
    iban: string | null
    logo_url: string | null
  }
  signature: {
    signer_name: string
    signer_title: string
    signature_image_url: string | null
    stamp_image_url: string | null
  } | null
  items: Array<{
    product_name: string
    product_brand: string | null
    product_unit: string
    quantity: number
    unit_price_effective: number
    vat_rate: number
    line_subtotal: number
    line_vat: number
    line_total: number
  }>
}

export function generateTemplate(templateKey: string, data: QuoteData, isDemo: boolean = false): string {
  switch (templateKey) {
    case 'classic':
      return generateClassicTemplate(data, isDemo)
    case 'minimal':
      return generateMinimalTemplate(data, isDemo)
    case 'corporate':
      return generateCorporateTemplate(data, isDemo)
    case 'elegant':
      return generateElegantTemplate(data, isDemo)
    case 'bold':
      return generateBoldTemplate(data, isDemo)
    case 'modern':
    default:
      return generateModernTemplate(data, isDemo)
  }
}


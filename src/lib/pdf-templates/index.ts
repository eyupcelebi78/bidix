import { generateModernTemplate } from './modern'
import { generateClassicTemplate } from './classic'
import { generateMinimalTemplate } from './minimal'
import { generateCorporateTemplate } from './corporate'
import { generateElegantTemplate } from './elegant'
import { generateBoldTemplate } from './bold'
import { generateFormTemplate } from './form'

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

function resolveAssetUrl(url: string | null, origin?: string): string | null {
  if (!url) return null
  if (/^(https?:|data:)/i.test(url)) return url
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  if (!base) return url
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function generateTemplate(templateKey: string, data: QuoteData, origin?: string): string {
  const resolved: QuoteData = {
    ...data,
    company: {
      ...data.company,
      logo_url: resolveAssetUrl(data.company.logo_url, origin),
    },
    signature: data.signature
      ? {
          ...data.signature,
          signature_image_url: resolveAssetUrl(data.signature.signature_image_url, origin),
          stamp_image_url: resolveAssetUrl(data.signature.stamp_image_url, origin),
        }
      : null,
  }
  data = resolved
  switch (templateKey) {
    case 'form':
      return generateFormTemplate(data)
    case 'classic':
      return generateClassicTemplate(data)
    case 'minimal':
      return generateMinimalTemplate(data)
    case 'corporate':
      return generateCorporateTemplate(data)
    case 'elegant':
      return generateElegantTemplate(data)
    case 'bold':
      return generateBoldTemplate(data)
    case 'modern':
    default:
      return generateModernTemplate(data)
  }
}


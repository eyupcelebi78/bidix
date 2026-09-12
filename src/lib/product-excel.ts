import * as XLSX from 'xlsx'

// Products page uses these; kept in sync with src/app/(dashboard)/products/page.tsx
export const PRODUCT_UNITS = ['adet', 'kg', 'mt', 'paket', 'kutu', 'litre', 'm²', 'm³']
export const PRODUCT_VAT_RATES = [0, 1, 8, 10, 18, 20]

export const TEMPLATE_HEADERS = [
  'Ürün Adı *',
  'Marka',
  'Birim',
  'Birim Fiyat (KDV Hariç) *',
  'KDV Oranı (%)',
] as const

export interface ParsedProductRow {
  rowNumber: number // 1-based row number in the sheet (header = 1)
  name: string
  brand: string | null
  unit: string
  unit_price: number
  vat_rate: number
}

export interface ParseError {
  rowNumber: number
  message: string
}

export interface ParseResult {
  valid: ParsedProductRow[]
  errors: ParseError[]
  totalRows: number
}

/**
 * Builds and triggers a download of a pre-formatted Excel template that the
 * user fills in and imports back. Includes example rows and an instructions
 * sheet listing the allowed units and VAT rates.
 */
export function downloadProductTemplate() {
  const headerRow = [...TEMPLATE_HEADERS]
  const exampleRows: (string | number)[][] = [
    ['Çelik Vida M8x50', 'Bosch', 'adet', 2.5, 20],
    ['Paslanmaz Somun M8', 'Fischer', 'adet', 1.8, 20],
    ['Elektrik Kablosu 2.5mm²', 'Prysmian', 'mt', 8.5, 20],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...exampleRows])
  ws['!cols'] = [
    { wch: 30 }, // Ürün Adı
    { wch: 18 }, // Marka
    { wch: 10 }, // Birim
    { wch: 22 }, // Birim Fiyat
    { wch: 14 }, // KDV
  ]

  const info = [
    ['bidix — Ürün İçe Aktarma Şablonu'],
    [],
    ['Nasıl kullanılır?'],
    ['1) "Ürünler" sayfasındaki başlık satırını DEĞİŞTİRMEYİN.'],
    ['2) Örnek satırların yerine kendi ürünlerinizi yazın (örnekleri silebilirsiniz).'],
    ['3) Dosyayı kaydedip "Excel’den İçe Aktar" ile yükleyin.'],
    [],
    ['Alan açıklamaları'],
    ['Ürün Adı *', 'Zorunlu. Ürünün adı.'],
    ['Marka', 'İsteğe bağlı.'],
    ['Birim', `İsteğe bağlı (boşsa "adet"). Önerilen: ${PRODUCT_UNITS.join(', ')}`],
    ['Birim Fiyat (KDV Hariç) *', 'Zorunlu. KDV hariç fiyat. Örn: 12,50 veya 12.50'],
    ['KDV Oranı (%)', `İsteğe bağlı (boşsa 18). Örn: ${PRODUCT_VAT_RATES.join(', ')}`],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(info)
  wsInfo['!cols'] = [{ wch: 26 }, { wch: 60 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler')
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Yönergeler')
  XLSX.writeFile(wb, 'bidix-urun-sablonu.xlsx')
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type FieldKey = 'name' | 'brand' | 'unit' | 'unit_price' | 'vat_rate'

function matchField(header: string): FieldKey | null {
  const h = normalizeHeader(header)
  if (!h) return null
  // Order matters: "birim fiyat" must be checked before bare "birim".
  if (h.includes('fiyat')) return 'unit_price'
  if (h.includes('kdv')) return 'vat_rate'
  if (h.includes('ürün ad') || h === 'ad' || h === 'ürün') return 'name'
  if (h.includes('marka')) return 'brand'
  if (h.includes('birim')) return 'unit'
  return null
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return isFinite(value) ? value : null
  // String: support Turkish decimals ("1.234,50") and plain ("1234.50").
  let s = String(value).trim().replace(/\s/g, '').replace(/₺|tl/gi, '')
  if (!s) return null
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // Assume dot = thousands separator, comma = decimal.
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return isFinite(n) ? n : null
}

/**
 * Reads an uploaded Excel/CSV file and returns validated product rows plus
 * per-row errors. Does not touch the database.
 */
export async function parseProductExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return { valid: [], errors: [{ rowNumber: 0, message: 'Sayfa bulunamadı' }], totalRows: 0 }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false })
  if (rows.length === 0) return { valid: [], errors: [{ rowNumber: 0, message: 'Dosya boş' }], totalRows: 0 }

  const headerCells = rows[0] as unknown[]
  const colMap: Partial<Record<FieldKey, number>> = {}
  headerCells.forEach((cell, idx) => {
    const field = matchField(cell as string)
    if (field && colMap[field] === undefined) colMap[field] = idx
  })

  if (colMap.name === undefined || colMap.unit_price === undefined) {
    return {
      valid: [],
      errors: [{ rowNumber: 1, message: 'Başlık satırı tanınamadı. Lütfen şablonu indirip kullanın (en az "Ürün Adı" ve "Birim Fiyat" sütunları gerekli).' }],
      totalRows: 0,
    }
  }

  const valid: ParsedProductRow[] = []
  const errors: ParseError[] = []
  let totalRows = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const cell = (field: FieldKey) => {
      const idx = colMap[field]
      return idx === undefined ? undefined : row[idx]
    }

    const rawName = String(cell('name') ?? '').trim()
    const rawPrice = cell('unit_price')

    // Skip fully empty rows silently.
    const isEmpty = !rawName && (rawPrice === undefined || rawPrice === '') &&
      !String(cell('brand') ?? '').trim() && !String(cell('unit') ?? '').trim() &&
      (cell('vat_rate') === undefined || cell('vat_rate') === '')
    if (isEmpty) continue

    totalRows++
    const rowNumber = i + 1 // 1-based, matching spreadsheet row number

    if (!rawName) {
      errors.push({ rowNumber, message: 'Ürün adı boş' })
      continue
    }

    const price = parseNumber(rawPrice)
    if (price === null) {
      errors.push({ rowNumber, message: `Geçersiz birim fiyat: "${String(rawPrice ?? '')}"` })
      continue
    }
    if (price < 0) {
      errors.push({ rowNumber, message: 'Birim fiyat negatif olamaz' })
      continue
    }

    const brandRaw = String(cell('brand') ?? '').trim()
    const unitRaw = String(cell('unit') ?? '').trim()
    const vatParsed = parseNumber(cell('vat_rate'))
    const vat = vatParsed === null ? 18 : vatParsed
    if (vat < 0 || vat > 100) {
      errors.push({ rowNumber, message: `Geçersiz KDV oranı: "${String(cell('vat_rate') ?? '')}"` })
      continue
    }

    valid.push({
      rowNumber,
      name: rawName,
      brand: brandRaw || null,
      unit: unitRaw || 'adet',
      unit_price: price,
      vat_rate: vat,
    })
  }

  return { valid, errors, totalRows }
}

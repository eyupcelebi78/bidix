interface QuoteData {
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

function formatDate(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function addDays(iso: string | null, days: number): string {
  const d = iso ? new Date(iso) : new Date()
  d.setDate(d.getDate() + days)
  return formatDate(d.toISOString())
}

function money(amount: number): string {
  return (
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ₺'
  )
}

function qty(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity)
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(quantity)
}

function vatGroups(items: QuoteData['items']): { rate: number; amount: number }[] {
  const map = new Map<number, number>()
  for (const item of items) {
    map.set(item.vat_rate, (map.get(item.vat_rate) || 0) + item.line_vat)
  }
  return [...map.entries()]
    .map(([rate, amount]) => ({ rate, amount }))
    .sort((a, b) => b.rate - a.rate)
}

export function generateFormTemplate(data: QuoteData): string {
  const { quote, company, signature, items } = data
  const date = formatDate(quote.created_at)
  const validUntil = addDays(quote.created_at, 15)
  const customer =
    quote.customer_company?.trim() || quote.customer_name?.trim() || ''
  const stampUrl = signature?.stamp_image_url || signature?.signature_image_url || ''

  const headerMeta = [company.email, company.phone].filter(Boolean).join('  ·  ')
  const vatLines = vatGroups(items)

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Teklif Formu - ${quote.quote_no || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      background: #fff;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 16mm 16mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    .brand { max-width: 70%; }
    .brand-logo { max-height: 52px; max-width: 220px; object-fit: contain; display: block; }
    .brand-name {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1.35;
      text-transform: uppercase;
    }
    .brand-meta {
      margin-top: 6px;
      font-size: 10px;
      color: #444;
    }
    .company-extra {
      margin-top: 6px;
      font-size: 9px;
      color: #555;
      line-height: 1.45;
    }
    .doc-title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 8px 0 18px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 14px;
    }
    .customer {
      flex: 1;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      line-height: 1.45;
    }
    .dates {
      text-align: right;
      font-size: 11px;
      white-space: nowrap;
      line-height: 1.7;
    }
    .intro, .closing {
      font-size: 11px;
      line-height: 1.55;
      margin: 10px 0 14px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    table.items th {
      text-align: left;
      font-weight: 700;
      font-size: 10px;
      border-bottom: 1px solid #111;
      padding: 6px 4px;
    }
    table.items td {
      padding: 7px 4px;
      border-bottom: 1px solid #e5e5e5;
      vertical-align: top;
    }
    table.items .num { width: 22px; color: #666; }
    table.items .qty, table.items .price, table.items .vat, table.items .tut {
      text-align: right;
      white-space: nowrap;
    }
    table.items .qty { width: 70px; }
    table.items .price { width: 90px; }
    table.items .vat { width: 70px; }
    table.items .tut { width: 110px; }
    .totals-wrap { display: flex; justify-content: flex-end; margin: 6px 0 18px; }
    .totals { width: 260px; }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
    }
    .totals .row.grand {
      font-weight: 700;
      border-top: 1px solid #111;
      margin-top: 4px;
      padding-top: 6px;
    }
    .footer-block { margin-top: 28px; }
    .stamp-row {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      margin-top: 10px;
    }
    .stamp-img { max-height: 120px; max-width: 220px; object-fit: contain; }
    .regards { font-size: 11px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        ${company.logo_url
          ? `<img class="brand-logo" src="${company.logo_url}" alt="" />`
          : `<div class="brand-name">${company.title || ''}</div>`}
        ${headerMeta ? `<div class="brand-meta">${headerMeta}</div>` : ''}
        ${company.address || company.tax_office || company.tax_no ? `
        <div class="company-extra">
          ${company.address ? `${company.address}<br/>` : ''}
          ${company.tax_office || company.tax_no
            ? `${[company.tax_office, company.tax_no].filter(Boolean).join(' / ')}`
            : ''}
        </div>` : ''}
      </div>
    </div>

    <div class="doc-title">TEKLİF FORMU</div>

    <div class="meta-row">
      <div class="customer">${customer}</div>
      <div class="dates">
        <div>Tarih: ${date}</div>
        <div>Geçerlilik: ${validUntil}</div>
      </div>
    </div>

    <p class="intro">Yapmış olduğumuz görüşmeler sonrasında hazırladığımız fiyat teklifini değerlendirmenize sunarız.</p>

    <table class="items">
      <thead>
        <tr>
          <th></th>
          <th>Açıklama</th>
          <th class="qty">Miktar</th>
          <th class="price">Fiyat</th>
          <th class="vat">KDV (%)</th>
          <th class="tut">Tutar (KDV Hariç)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${item.product_name}${item.product_brand ? ` — ${item.product_brand}` : ''}</td>
          <td class="qty">${qty(item.quantity)} ${item.product_unit}</td>
          <td class="price">${money(item.unit_price_effective)}</td>
          <td class="vat">%${item.vat_rate}</td>
          <td class="tut">${money(item.line_subtotal)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals">
        <div class="row"><span>Net</span><span>${money(quote.subtotal)}</span></div>
        ${vatLines.map((v) => `<div class="row"><span>KDV (%${v.rate})</span><span>${money(v.amount)}</span></div>`).join('')}
        <div class="row grand"><span>Toplam</span><span>${money(quote.grand_total)}</span></div>
      </div>
    </div>

    <p class="closing">Teklifimiz ile ilgili görüşlerinizi değerlendirmek üzere hazır olduğumuzu belirtir, çalışmalarınızda başarılar dileriz.</p>

    <div class="footer-block">
      ${stampUrl ? `<div class="stamp-row"><img class="stamp-img" src="${stampUrl}" alt="Kaşe" /></div>` : ''}
      <div class="regards">Saygılarımızla,</div>
    </div>
  </div>
</body>
</html>`
}

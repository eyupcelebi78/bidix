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

export function generateMinimalTemplate(data: QuoteData): string {
  const { quote, company, signature, items } = data
  const date = quote.created_at 
    ? new Date(quote.created_at).toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('tr-TR')

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teklif - ${quote.quote_no || quote.id.slice(0, 8)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'DM Sans', -apple-system, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 25mm 20mm;
      margin: 0 auto;
      position: relative;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    
    .company-info {
      max-width: 55%;
    }
    
    .company-logo {
      max-height: 50px;
      max-width: 150px;
      object-fit: contain;
      margin-bottom: 15px;
    }
    
    .company-name {
      font-size: 16px;
      font-weight: 700;
      color: #111;
      margin-bottom: 8px;
    }
    
    .company-details {
      font-size: 10px;
      color: #666;
      line-height: 1.7;
    }
    
    .quote-info {
      text-align: right;
    }
    
    .quote-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #999;
      margin-bottom: 5px;
    }
    
    .quote-number {
      font-size: 24px;
      font-weight: 700;
      color: #111;
      margin-bottom: 5px;
    }
    
    .quote-date {
      font-size: 11px;
      color: #666;
    }
    
    /* Customer */
    .customer-section {
      margin-bottom: 35px;
    }
    
    .section-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #999;
      margin-bottom: 8px;
    }
    
    .customer-name {
      font-size: 14px;
      font-weight: 500;
      color: #111;
    }
    
    .customer-company {
      font-size: 12px;
      color: #666;
    }
    
    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table thead tr {
      border-bottom: 2px solid #111;
    }
    
    .items-table th {
      font-weight: 500;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      padding: 0 0 12px 0;
      text-align: left;
    }
    
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table th:nth-child(5) {
      text-align: right;
    }
    
    .items-table tbody tr {
      border-bottom: 1px solid #eee;
    }
    
    .items-table td {
      padding: 15px 0;
      font-size: 11px;
      vertical-align: top;
    }
    
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(5) {
      text-align: right;
    }
    
    .product-name {
      font-weight: 500;
      color: #111;
      margin-bottom: 2px;
    }
    
    .product-meta {
      font-size: 10px;
      color: #999;
    }
    
    /* Totals */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    
    .totals-box {
      width: 260px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      font-size: 11px;
      color: #666;
    }
    
    .total-row.grand {
      border-bottom: none;
      border-top: 2px solid #111;
      padding-top: 15px;
      margin-top: 5px;
    }
    
    .total-row.grand span {
      font-size: 16px;
      font-weight: 700;
      color: #111;
    }
    
    /* Bank Info */
    .bank-info {
      margin-bottom: 40px;
    }
    
    .iban {
      font-family: 'SF Mono', 'Monaco', monospace;
      font-size: 11px;
      color: #333;
      letter-spacing: 0.5px;
    }
    
    /* Signature */
    .signature-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 50px;
      page-break-inside: avoid;
    }
    
    .signature-box {
      text-align: center;
      width: 180px;
    }
    
    .signature-images {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 10px;
      min-height: 200px;
      margin-bottom: 15px;
    }
    
    .signature-img {
      max-height: 40px;
      max-width: 100px;
      object-fit: contain;
    }
    
    .stamp-img {
      max-height: 200px;
      max-width: 200px;
      object-fit: contain;
    }
    
    .signature-line {
      border-top: 1px solid #111;
      padding-top: 10px;
    }
    
    .signer-name {
      font-weight: 500;
      font-size: 11px;
      color: #111;
    }
    
    .signer-title {
      font-size: 10px;
      color: #666;
    }
    
    /* Footer */
    .footer {
      position: absolute;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      font-size: 9px;
      color: #999;
    }
    
    @media print {
      .page {
        margin: 0;
        padding: 20mm 15mm;
      }
      
      thead {
        display: table-header-group;
      }
      
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.title}" class="company-logo" />` : ''}
        <div class="company-name">${company.title}</div>
        <div class="company-details">
          ${company.address ? `${company.address}<br>` : ''}
          ${company.phone ? `${company.phone}` : ''} ${company.email ? `/ ${company.email}` : ''}<br>
          ${company.tax_office && company.tax_no ? `VD: ${company.tax_office} / ${company.tax_no}` : ''}
        </div>
      </div>
      <div class="quote-info">
        <div class="quote-label">Teklif</div>
        <div class="quote-number">#${quote.quote_no || quote.id.slice(0, 8).toUpperCase()}</div>
        <div class="quote-date">${date}</div>
      </div>
    </div>
    
    <!-- Customer -->
    ${(quote.customer_name || quote.customer_company) ? `
    <div class="customer-section">
      <div class="section-label">Hazırlanan</div>
      ${quote.customer_name ? `<div class="customer-name">${quote.customer_name}</div>` : ''}
      ${quote.customer_company ? `<div class="customer-company">${quote.customer_company}</div>` : ''}
    </div>
    ` : ''}
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 45%;">Açıklama</th>
          <th style="width: 15%;">Miktar</th>
          <th style="width: 15%;">Birim Fiyat</th>
          <th style="width: 10%;">KDV</th>
          <th style="width: 15%;">Tutar</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
        <tr>
          <td>
            <div class="product-name">${item.product_name}</div>
            <div class="product-meta">${item.product_brand ? `${item.product_brand} • ` : ''}${item.product_unit}</div>
          </td>
          <td>${formatCurrency(item.quantity)}</td>
          <td>₺${formatCurrency(item.unit_price_effective)}</td>
          <td>%${item.vat_rate}</td>
          <td>₺${formatCurrency(item.line_total)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row">
          <span>Ara Toplam</span>
          <span>₺${formatCurrency(quote.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>KDV</span>
          <span>₺${formatCurrency(quote.vat_total)}</span>
        </div>
        <div class="total-row grand">
          <span>Toplam</span>
          <span>₺${formatCurrency(quote.grand_total)}</span>
        </div>
      </div>
    </div>
    
    <!-- Bank Info -->
    ${company.iban ? `
    <div class="bank-info">
      <div class="section-label">Ödeme Bilgileri</div>
      <div class="iban">${company.iban}</div>
    </div>
    ` : ''}
    
    <!-- Signature -->
    ${signature ? `
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-images">
          ${signature.signature_image_url ? `<img src="${signature.signature_image_url}" alt="İmza" class="signature-img" />` : ''}
          ${signature.stamp_image_url ? `<img src="${signature.stamp_image_url}" alt="Kaşe" class="stamp-img" />` : ''}
        </div>
        <div class="signature-line">
          <div class="signer-name">${signature.signer_name}</div>
          <div class="signer-title">${signature.signer_title}</div>
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      Bu teklif 15 gün geçerlidir. • ${date}
    </div>
  </div>
</body>
</html>
  `
}


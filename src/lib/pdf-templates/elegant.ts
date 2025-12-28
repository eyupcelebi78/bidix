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

export function generateElegantTemplate(data: QuoteData): string {
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
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Lato', -apple-system, sans-serif;
      font-size: 11px;
      line-height: 1.6;
      color: #3d3d3d;
      background: #fff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 25mm;
      margin: 0 auto;
      position: relative;
      background: linear-gradient(180deg, #fffef9 0%, #fff 100%);
    }
    
    /* Decorative Border */
    .page::before {
      content: '';
      position: absolute;
      top: 15mm;
      left: 15mm;
      right: 15mm;
      bottom: 15mm;
      border: 1px solid #d4af37;
      pointer-events: none;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 25px;
      border-bottom: 1px solid #d4af37;
    }
    
    .company-logo {
      max-height: 70px;
      max-width: 200px;
      object-fit: contain;
      margin-bottom: 15px;
    }
    
    .company-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 600;
      color: #2c2c2c;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .company-details {
      font-size: 10px;
      color: #666;
      letter-spacing: 1px;
    }
    
    /* Quote Info */
    .quote-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }
    
    .quote-title-section {
      text-align: center;
      flex: 1;
    }
    
    .quote-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 8px;
      text-transform: uppercase;
      color: #d4af37;
      margin-bottom: 5px;
    }
    
    .quote-subtitle {
      font-size: 10px;
      color: #888;
      letter-spacing: 2px;
    }
    
    /* Customer & Date */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 20px;
      background: rgba(212, 175, 55, 0.05);
      border-left: 3px solid #d4af37;
    }
    
    .info-block h4 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #d4af37;
      margin-bottom: 5px;
    }
    
    .info-block p {
      font-size: 13px;
      color: #3d3d3d;
    }
    
    .info-block .sub {
      font-size: 11px;
      color: #666;
    }
    
    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table thead tr {
      border-top: 2px solid #d4af37;
      border-bottom: 2px solid #d4af37;
    }
    
    .items-table th {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 15px 10px;
      text-align: left;
      color: #2c2c2c;
    }
    
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table th:nth-child(5),
    .items-table th:nth-child(6),
    .items-table th:nth-child(7) {
      text-align: right;
    }
    
    .items-table tbody tr {
      border-bottom: 1px solid #e8e4dc;
    }
    
    .items-table td {
      padding: 12px 10px;
      font-size: 10px;
      color: #3d3d3d;
    }
    
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(5),
    .items-table td:nth-child(6),
    .items-table td:nth-child(7) {
      text-align: right;
    }
    
    .product-name {
      font-weight: 400;
      color: #2c2c2c;
    }
    
    .product-brand {
      font-size: 9px;
      color: #999;
      font-style: italic;
    }
    
    /* Totals */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 35px;
    }
    
    .totals-table {
      width: 260px;
    }
    
    .totals-table tr {
      border-bottom: 1px solid #e8e4dc;
    }
    
    .totals-table td {
      padding: 10px 0;
      font-size: 11px;
    }
    
    .totals-table td:last-child {
      text-align: right;
      font-weight: 400;
    }
    
    .totals-table .label {
      font-family: 'Cormorant Garamond', serif;
      letter-spacing: 1px;
      color: #666;
    }
    
    .totals-table .grand-total {
      border-top: 2px solid #d4af37;
      border-bottom: 2px solid #d4af37;
    }
    
    .totals-table .grand-total td {
      font-size: 14px;
      padding: 15px 0;
    }
    
    .totals-table .grand-total .label {
      color: #d4af37;
      font-weight: 600;
    }
    
    .totals-table .grand-total td:last-child {
      font-weight: 700;
      color: #2c2c2c;
    }
    
    /* Bank Info */
    .bank-info {
      text-align: center;
      padding: 20px;
      margin-bottom: 30px;
      border-top: 1px solid #e8e4dc;
      border-bottom: 1px solid #e8e4dc;
    }
    
    .bank-info h4 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 8px;
    }
    
    .bank-info .iban {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      letter-spacing: 2px;
      color: #3d3d3d;
    }
    
    /* Signature */
    .signature-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 40px;
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
      margin-bottom: 10px;
    }
    
    .signature-img {
      max-height: 50px;
      max-width: 120px;
      object-fit: contain;
    }
    
    .stamp-img {
      max-height: 200px;
      max-width: 200px;
      object-fit: contain;
    }
    
    .signature-line {
      border-top: 1px solid #d4af37;
      padding-top: 10px;
    }
    
    .signer-name {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 600;
      font-size: 13px;
      color: #2c2c2c;
    }
    
    .signer-title {
      font-size: 10px;
      color: #888;
      letter-spacing: 1px;
    }
    
    /* Footer */
    .footer {
      position: absolute;
      bottom: 20mm;
      left: 25mm;
      right: 25mm;
      text-align: center;
      font-size: 9px;
      color: #888;
      letter-spacing: 1px;
    }
    
    .footer .ornament {
      color: #d4af37;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    @media print {
      .page {
        margin: 0;
        padding: 20mm;
      }
      
      .page::before {
        top: 10mm;
        left: 10mm;
        right: 10mm;
        bottom: 10mm;
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
      ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.title}" class="company-logo" /><br>` : ''}
      <div class="company-name">${company.title}</div>
      <div class="company-details">
        ${company.address || ''}
        ${company.phone ? ` • ${company.phone}` : ''}
        ${company.email ? ` • ${company.email}` : ''}
      </div>
    </div>
    
    <!-- Quote Title -->
    <div class="quote-header">
      <div class="quote-title-section">
        <div class="quote-title">Teklif</div>
        <div class="quote-subtitle">No: ${quote.quote_no || quote.id.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>
    
    <!-- Customer & Date -->
    <div class="info-section">
      <div class="info-block">
        <h4>Hazırlanan</h4>
        <p>${quote.customer_name || 'Sayın Müşterimiz'}</p>
        ${quote.customer_company ? `<p class="sub">${quote.customer_company}</p>` : ''}
      </div>
      <div class="info-block" style="text-align: right;">
        <h4>Tarih</h4>
        <p>${date}</p>
        <p class="sub">Geçerlilik: 15 gün</p>
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">No</th>
          <th style="width: 35%;">Ürün Açıklaması</th>
          <th style="width: 10%;">Miktar</th>
          <th style="width: 10%;">Birim</th>
          <th style="width: 12%;">Fiyat</th>
          <th style="width: 8%;">KDV</th>
          <th style="width: 15%;">Tutar</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="product-name">${item.product_name}</div>
            ${item.product_brand ? `<div class="product-brand">${item.product_brand}</div>` : ''}
          </td>
          <td>${formatCurrency(item.quantity)}</td>
          <td>${item.product_unit}</td>
          <td>₺${formatCurrency(item.unit_price_effective)}</td>
          <td>%${item.vat_rate}</td>
          <td>₺${formatCurrency(item.line_total)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">Ara Toplam</td>
          <td>₺${formatCurrency(quote.subtotal)}</td>
        </tr>
        <tr>
          <td class="label">KDV</td>
          <td>₺${formatCurrency(quote.vat_total)}</td>
        </tr>
        <tr class="grand-total">
          <td class="label">Genel Toplam</td>
          <td>₺${formatCurrency(quote.grand_total)}</td>
        </tr>
      </table>
    </div>
    
    <!-- Bank Info -->
    ${company.iban ? `
    <div class="bank-info">
      <h4>Ödeme Bilgileri</h4>
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
      <div class="ornament">❖</div>
      Bu teklif ${date} tarihinde hazırlanmıştır
      ${company.tax_office && company.tax_no ? `<br>VD: ${company.tax_office} / ${company.tax_no}` : ''}
    </div>
  </div>
</body>
</html>
  `
}


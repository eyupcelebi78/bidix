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

export function generateModernTemplate(data: QuoteData): string {
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1f2937;
      background: #fff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 0 auto;
      position: relative;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #10b981;
    }
    
    .company-info {
      max-width: 60%;
    }
    
    .company-logo {
      max-height: 60px;
      max-width: 180px;
      object-fit: contain;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 18px;
      font-weight: 700;
      color: #059669;
      margin-bottom: 5px;
    }
    
    .company-details {
      font-size: 10px;
      color: #6b7280;
      line-height: 1.6;
    }
    
    .quote-info {
      text-align: right;
    }
    
    .quote-title {
      font-size: 28px;
      font-weight: 700;
      color: #10b981;
      margin-bottom: 10px;
    }
    
    .quote-meta {
      font-size: 10px;
      color: #6b7280;
    }
    
    .quote-meta strong {
      color: #1f2937;
    }
    
    /* Customer */
    .customer-section {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border-left: 4px solid #10b981;
      padding: 15px 20px;
      margin-bottom: 25px;
      border-radius: 0 8px 8px 0;
    }
    
    .customer-section h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #059669;
      margin-bottom: 5px;
    }
    
    .customer-name {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .customer-company {
      font-size: 12px;
      color: #6b7280;
    }
    
    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    
    .items-table thead {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .items-table th {
      color: #fff;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 10px;
      text-align: left;
    }
    
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table th:nth-child(5),
    .items-table th:nth-child(6),
    .items-table th:nth-child(7) {
      text-align: right;
    }
    
    .items-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .items-table td {
      padding: 10px;
      font-size: 10px;
    }
    
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(5),
    .items-table td:nth-child(6),
    .items-table td:nth-child(7) {
      text-align: right;
    }
    
    .product-name {
      font-weight: 500;
      color: #1f2937;
    }
    
    .product-brand {
      font-size: 9px;
      color: #9ca3af;
    }
    
    /* Totals */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    
    .totals-table {
      width: 280px;
      border-collapse: collapse;
    }
    
    .totals-table tr {
      border-bottom: 1px solid #e5e7eb;
    }
    
    .totals-table td {
      padding: 8px 12px;
      font-size: 11px;
    }
    
    .totals-table td:last-child {
      text-align: right;
      font-weight: 500;
    }
    
    .totals-table .grand-total {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
    }
    
    .totals-table .grand-total td {
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      padding: 12px;
    }
    
    /* Bank Info */
    .bank-info {
      background: #f3f4f6;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .bank-info h4 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .iban {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #1f2937;
      letter-spacing: 1px;
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
      width: 200px;
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
      border-top: 2px solid #10b981;
      padding-top: 8px;
    }
    
    .signer-name {
      font-weight: 600;
      font-size: 11px;
      color: #1f2937;
    }
    
    .signer-title {
      font-size: 10px;
      color: #6b7280;
    }
    
    /* Footer */
    .footer {
      position: absolute;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
    
    @media print {
      .page {
        margin: 0;
        padding: 15mm;
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
          ${company.phone ? `Tel: ${company.phone}<br>` : ''}
          ${company.email ? `E-posta: ${company.email}<br>` : ''}
          ${company.tax_office && company.tax_no ? `Vergi D: ${company.tax_office} / ${company.tax_no}` : ''}
        </div>
      </div>
      <div class="quote-info">
        <div class="quote-title">TEKLİF</div>
        <div class="quote-meta">
          <strong>Teklif No:</strong> ${quote.quote_no || quote.id.slice(0, 8).toUpperCase()}<br>
          <strong>Tarih:</strong> ${date}
        </div>
      </div>
    </div>
    
    <!-- Customer -->
    ${(quote.customer_name || quote.customer_company) ? `
    <div class="customer-section">
      <h3>Sayın</h3>
      ${quote.customer_name ? `<div class="customer-name">${quote.customer_name}</div>` : ''}
      ${quote.customer_company ? `<div class="customer-company">${quote.customer_company}</div>` : ''}
    </div>
    ` : ''}
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 35%;">Ürün / Hizmet</th>
          <th style="width: 10%;">Miktar</th>
          <th style="width: 10%;">Birim</th>
          <th style="width: 12%;">Birim Fiyat</th>
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
          <td>Ara Toplam</td>
          <td>₺${formatCurrency(quote.subtotal)}</td>
        </tr>
        <tr>
          <td>KDV Toplam</td>
          <td>₺${formatCurrency(quote.vat_total)}</td>
        </tr>
        <tr class="grand-total">
          <td>GENEL TOPLAM</td>
          <td>₺${formatCurrency(quote.grand_total)}</td>
        </tr>
      </table>
    </div>
    
    <!-- Bank Info -->
    ${company.iban ? `
    <div class="bank-info">
      <h4>Banka Bilgileri</h4>
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
      Bu teklif ${date} tarihinde düzenlenmiştir. Geçerlilik süresi 15 gündür.
    </div>
  </div>
</body>
</html>
  `
}


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

export function generateClassicTemplate(data: QuoteData): string {
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
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=Source+Sans+Pro:wght@400;600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Source Sans Pro', Georgia, serif;
      font-size: 11px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 0 auto;
      position: relative;
      border: 1px solid #c9a962;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 2px double #c9a962;
    }
    
    .company-logo {
      max-height: 70px;
      max-width: 200px;
      object-fit: contain;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }
    
    .company-details {
      font-size: 10px;
      color: #555;
      line-height: 1.8;
    }
    
    /* Quote Title */
    .quote-title-section {
      text-align: center;
      margin: 25px 0;
    }
    
    .quote-title {
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 4px;
      border-top: 1px solid #c9a962;
      border-bottom: 1px solid #c9a962;
      padding: 10px 40px;
      display: inline-block;
    }
    
    .quote-meta {
      margin-top: 15px;
      font-size: 10px;
      color: #555;
    }
    
    /* Customer */
    .customer-section {
      margin-bottom: 25px;
      padding: 15px;
      border: 1px solid #e5e5e5;
      background: #fafafa;
    }
    
    .customer-section h3 {
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 12px;
      color: #888;
      margin-bottom: 5px;
    }
    
    .customer-name {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .customer-company {
      font-size: 12px;
      color: #555;
    }
    
    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    
    .items-table thead {
      background: #1a1a1a;
    }
    
    .items-table th {
      color: #c9a962;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 12px 8px;
      text-align: left;
      border: 1px solid #1a1a1a;
    }
    
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table th:nth-child(5),
    .items-table th:nth-child(6),
    .items-table th:nth-child(7) {
      text-align: right;
    }
    
    .items-table tbody tr {
      border-bottom: 1px solid #e5e5e5;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #fafafa;
    }
    
    .items-table td {
      padding: 10px 8px;
      font-size: 10px;
      border-left: 1px solid #e5e5e5;
      border-right: 1px solid #e5e5e5;
    }
    
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(5),
    .items-table td:nth-child(6),
    .items-table td:nth-child(7) {
      text-align: right;
    }
    
    .product-name {
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .product-brand {
      font-size: 9px;
      color: #888;
      font-style: italic;
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
      border: 1px solid #e5e5e5;
    }
    
    .totals-table td {
      padding: 10px 15px;
      font-size: 11px;
    }
    
    .totals-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    
    .totals-table .grand-total {
      background: #1a1a1a;
      border: 1px solid #1a1a1a;
    }
    
    .totals-table .grand-total td {
      color: #c9a962;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 15px;
    }
    
    /* Bank Info */
    .bank-info {
      border: 1px solid #e5e5e5;
      padding: 15px;
      margin-bottom: 30px;
    }
    
    .bank-info h4 {
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 11px;
      color: #888;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .iban {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
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
      gap: 15px;
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
      border-top: 1px solid #1a1a1a;
      padding-top: 10px;
    }
    
    .signer-name {
      font-weight: 600;
      font-size: 11px;
      color: #1a1a1a;
    }
    
    .signer-title {
      font-size: 10px;
      color: #888;
      font-style: italic;
    }
    
    /* Footer */
    .footer {
      position: absolute;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 9px;
      color: #888;
      font-style: italic;
    }
    
    @media print {
      .page {
        margin: 0;
        padding: 15mm;
        border: none;
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
      ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.title}" class="company-logo" />` : ''}
      <div class="company-name">${company.title}</div>
      <div class="company-details">
        ${company.address ? `${company.address}<br>` : ''}
        ${company.phone ? `Tel: ${company.phone}` : ''} ${company.email ? `• ${company.email}` : ''}<br>
        ${company.tax_office && company.tax_no ? `Vergi Dairesi: ${company.tax_office} / ${company.tax_no}` : ''}
      </div>
    </div>
    
    <!-- Quote Title -->
    <div class="quote-title-section">
      <div class="quote-title">TEKLİF</div>
      <div class="quote-meta">
        Teklif No: <strong>${quote.quote_no || quote.id.slice(0, 8).toUpperCase()}</strong> &nbsp;|&nbsp; 
        Tarih: <strong>${date}</strong>
      </div>
    </div>
    
    <!-- Customer -->
    ${(quote.customer_name || quote.customer_company) ? `
    <div class="customer-section">
      <h3>Müşteri Bilgileri</h3>
      ${quote.customer_name ? `<div class="customer-name">${quote.customer_name}</div>` : ''}
      ${quote.customer_company ? `<div class="customer-company">${quote.customer_company}</div>` : ''}
    </div>
    ` : ''}
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">No</th>
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


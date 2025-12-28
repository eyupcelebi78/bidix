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

export function generateBoldTemplate(data: QuoteData): string {
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
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Roboto', -apple-system, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
    }
    
    /* Accent Bar */
    .accent-bar {
      height: 8px;
      background: linear-gradient(90deg, #f97316 0%, #ea580c 50%, #c2410c 100%);
    }
    
    /* Header */
    .header {
      background: #1a1a1a;
      color: white;
      padding: 25px 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .company-section {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .company-logo {
      max-height: 50px;
      max-width: 140px;
      object-fit: contain;
    }
    
    .company-name {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      letter-spacing: 3px;
    }
    
    .quote-badge {
      background: #f97316;
      padding: 15px 25px;
      text-align: center;
      clip-path: polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%);
    }
    
    .quote-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 24px;
      letter-spacing: 4px;
    }
    
    .quote-number {
      font-size: 11px;
      opacity: 0.9;
    }
    
    /* Content */
    .content {
      padding: 30px 35px;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .info-box {
      background: #f5f5f5;
      padding: 18px;
      border-left: 4px solid #f97316;
    }
    
    .info-box.dark {
      background: #1a1a1a;
      color: white;
    }
    
    .info-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.6;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 14px;
      font-weight: 700;
    }
    
    .info-sub {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 3px;
    }
    
    /* Table */
    .table-header {
      background: #1a1a1a;
      color: white;
      padding: 12px 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 0;
    }
    
    .table-header h3 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 18px;
      letter-spacing: 2px;
    }
    
    .table-header .line {
      flex: 1;
      height: 2px;
      background: #f97316;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    
    .items-table thead {
      background: #f97316;
      color: white;
    }
    
    .items-table th {
      font-weight: 700;
      font-size: 9px;
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
      border-bottom: 1px solid #e5e5e5;
    }
    
    .items-table tbody tr:nth-child(odd) {
      background: #fafafa;
    }
    
    .items-table tbody tr:hover {
      background: #fff7ed;
    }
    
    .items-table td {
      padding: 12px 10px;
      font-size: 10px;
    }
    
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(5),
    .items-table td:nth-child(6),
    .items-table td:nth-child(7) {
      text-align: right;
    }
    
    .items-table td:first-child {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 14px;
      color: #f97316;
    }
    
    .product-name {
      font-weight: 500;
      color: #1a1a1a;
    }
    
    .product-brand {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Totals */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .bank-box {
      flex: 1;
      background: #f5f5f5;
      padding: 18px;
      border-left: 4px solid #1a1a1a;
    }
    
    .bank-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 8px;
    }
    
    .bank-value {
      font-family: 'Roboto Mono', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 1px;
    }
    
    .totals-box {
      width: 300px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      background: #f5f5f5;
      margin-bottom: 2px;
    }
    
    .total-row .label {
      font-size: 11px;
      color: #666;
    }
    
    .total-row .value {
      font-size: 11px;
      font-weight: 500;
    }
    
    .total-row.grand {
      background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
      color: white;
      padding: 15px;
    }
    
    .total-row.grand .label {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 16px;
      letter-spacing: 2px;
      color: white;
    }
    
    .total-row.grand .value {
      font-size: 18px;
      font-weight: 700;
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
      border-top: 3px solid #1a1a1a;
      padding-top: 10px;
    }
    
    .signer-name {
      font-weight: 700;
      font-size: 12px;
      color: #1a1a1a;
    }
    
    .signer-title {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Footer */
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
    
    .footer-content {
      background: #1a1a1a;
      color: white;
      padding: 12px 35px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
    }
    
    .footer-bar {
      height: 5px;
      background: linear-gradient(90deg, #f97316 0%, #ea580c 50%, #c2410c 100%);
    }
    
    .footer-contact span {
      margin-right: 20px;
      opacity: 0.8;
    }
    
    .footer-contact span::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #f97316;
      margin-right: 6px;
      vertical-align: middle;
    }
    
    @media print {
      .page {
        margin: 0;
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
    <!-- Accent Bar -->
    <div class="accent-bar"></div>
    
    <!-- Header -->
    <div class="header">
      <div class="company-section">
        ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.title}" class="company-logo" />` : ''}
        <div class="company-name">${company.title}</div>
      </div>
      <div class="quote-badge">
        <div class="quote-title">TEKLİF</div>
        <div class="quote-number">#${quote.quote_no || quote.id.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Info Grid -->
      <div class="info-grid">
        <div class="info-box dark">
          <div class="info-label">Müşteri</div>
          <div class="info-value">${quote.customer_name || 'Belirtilmedi'}</div>
          ${quote.customer_company ? `<div class="info-sub">${quote.customer_company}</div>` : ''}
        </div>
        <div class="info-box">
          <div class="info-label">Tarih</div>
          <div class="info-value">${date}</div>
          <div class="info-sub">Geçerlilik: 15 gün</div>
        </div>
        <div class="info-box">
          <div class="info-label">İletişim</div>
          <div class="info-value">${company.phone || '-'}</div>
          <div class="info-sub">${company.email || ''}</div>
        </div>
      </div>
      
      <!-- Table Header -->
      <div class="table-header">
        <h3>ÜRÜN LİSTESİ</h3>
        <div class="line"></div>
      </div>
      
      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 35%;">Ürün / Hizmet</th>
            <th style="width: 10%;">Adet</th>
            <th style="width: 10%;">Birim</th>
            <th style="width: 12%;">Fiyat</th>
            <th style="width: 8%;">KDV</th>
            <th style="width: 15%;">Toplam</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => `
          <tr>
            <td>${String(index + 1).padStart(2, '0')}</td>
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
      
      <!-- Bottom Section -->
      <div class="bottom-section">
        ${company.iban ? `
        <div class="bank-box">
          <div class="bank-label">Banka Hesap Bilgileri</div>
          <div class="bank-value">${company.iban}</div>
        </div>
        ` : '<div></div>'}
        
        <div class="totals-box">
          <div class="total-row">
            <span class="label">Ara Toplam</span>
            <span class="value">₺${formatCurrency(quote.subtotal)}</span>
          </div>
          <div class="total-row">
            <span class="label">KDV Toplam</span>
            <span class="value">₺${formatCurrency(quote.vat_total)}</span>
          </div>
          <div class="total-row grand">
            <span class="label">TOPLAM</span>
            <span class="value">₺${formatCurrency(quote.grand_total)}</span>
          </div>
        </div>
      </div>
      
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
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-content">
        <div class="footer-contact">
          ${company.phone ? `<span>${company.phone}</span>` : ''}
          ${company.email ? `<span>${company.email}</span>` : ''}
          ${company.address ? `<span>${company.address}</span>` : ''}
        </div>
        <div>
          ${company.tax_office && company.tax_no ? `VD: ${company.tax_office} / ${company.tax_no}` : ''}
        </div>
      </div>
      <div class="footer-bar"></div>
    </div>
  </div>
</body>
</html>
  `
}


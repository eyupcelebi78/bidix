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

export function generateCorporateTemplate(data: QuoteData): string {
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
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+Pro:wght@400;600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Source Sans Pro', -apple-system, sans-serif;
      font-size: 11px;
      line-height: 1.6;
      color: #1e293b;
      background: #fff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      margin: 0 auto;
      position: relative;
    }
    
    /* Header Banner */
    .header-banner {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      color: white;
      padding: 25px 30px;
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
      max-height: 55px;
      max-width: 150px;
      object-fit: contain;
      background: white;
      padding: 8px;
      border-radius: 6px;
    }
    
    .company-name {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    
    .quote-badge {
      text-align: right;
    }
    
    .quote-title {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 3px;
      margin-bottom: 5px;
    }
    
    .quote-number {
      font-size: 12px;
      opacity: 0.9;
      letter-spacing: 1px;
    }
    
    /* Content Area */
    .content {
      padding: 30px;
    }
    
    /* Info Cards */
    .info-row {
      display: flex;
      gap: 20px;
      margin-bottom: 25px;
    }
    
    .info-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px;
    }
    
    .info-card.highlight {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      color: white;
      border: none;
    }
    
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.7;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .info-value {
      font-size: 13px;
      font-weight: 600;
    }
    
    .info-value.large {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
    }
    
    .info-detail {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 3px;
    }
    
    /* Table */
    .items-section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
      font-weight: 600;
      color: #1e3a5f;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #1e3a5f;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .items-table thead {
      background: #1e3a5f;
    }
    
    .items-table th {
      color: white;
      font-weight: 600;
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
      border-bottom: 1px solid #e2e8f0;
      transition: background 0.2s;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #f8fafc;
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
    
    .product-name {
      font-weight: 600;
      color: #1e293b;
    }
    
    .product-brand {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    
    /* Totals */
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
      margin-bottom: 25px;
    }
    
    .bank-section {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px;
    }
    
    .bank-title {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .iban-value {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      letter-spacing: 1px;
    }
    
    .totals-box {
      width: 280px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      font-size: 11px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .total-row:last-child {
      border-bottom: none;
    }
    
    .total-row.grand {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      color: white;
      font-size: 14px;
      font-weight: 700;
      padding: 15px;
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
      border-top: 2px solid #1e3a5f;
      padding-top: 10px;
    }
    
    .signer-name {
      font-weight: 600;
      font-size: 12px;
      color: #1e293b;
    }
    
    .signer-title {
      font-size: 10px;
      color: #64748b;
    }
    
    /* Footer */
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      color: white;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
    }
    
    .footer-contact span {
      margin-right: 15px;
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
    <!-- Header Banner -->
    <div class="header-banner">
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
      <!-- Info Cards -->
      <div class="info-row">
        <div class="info-card highlight">
          <div class="info-label">Müşteri</div>
          <div class="info-value large">${quote.customer_name || 'Belirtilmedi'}</div>
          ${quote.customer_company ? `<div class="info-detail">${quote.customer_company}</div>` : ''}
        </div>
        <div class="info-card">
          <div class="info-label">Tarih</div>
          <div class="info-value large">${date}</div>
          <div class="info-detail">Geçerlilik: 15 gün</div>
        </div>
        <div class="info-card">
          <div class="info-label">Firma Bilgileri</div>
          <div class="info-value">${company.address || ''}</div>
          ${company.phone ? `<div class="info-detail">Tel: ${company.phone}</div>` : ''}
        </div>
      </div>
      
      <!-- Items Table -->
      <div class="items-section">
        <div class="section-title">Ürün / Hizmet Detayları</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 35%;">Açıklama</th>
              <th style="width: 10%;">Miktar</th>
              <th style="width: 10%;">Birim</th>
              <th style="width: 12%;">Birim Fiyat</th>
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
      </div>
      
      <!-- Totals Row -->
      <div class="totals-row">
        ${company.iban ? `
        <div class="bank-section">
          <div class="bank-title">Banka Hesap Bilgileri</div>
          <div class="iban-value">${company.iban}</div>
        </div>
        ` : '<div></div>'}
        
        <div class="totals-box">
          <div class="total-row">
            <span>Ara Toplam</span>
            <span>₺${formatCurrency(quote.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>KDV Toplam</span>
            <span>₺${formatCurrency(quote.vat_total)}</span>
          </div>
          <div class="total-row grand">
            <span>GENEL TOPLAM</span>
            <span>₺${formatCurrency(quote.grand_total)}</span>
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
      <div class="footer-contact">
        ${company.phone ? `<span>📞 ${company.phone}</span>` : ''}
        ${company.email ? `<span>✉️ ${company.email}</span>` : ''}
      </div>
      <div>
        ${company.tax_office && company.tax_no ? `VD: ${company.tax_office} / ${company.tax_no}` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `
}


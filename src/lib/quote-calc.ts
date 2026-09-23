export function quoteLineAmounts(unitPrice: number, quantity: number, vatRate: number) {
  const price = Number(unitPrice) || 0
  const qty = Number(quantity) || 0
  const vat = Number(vatRate) || 0
  const line_subtotal = price * qty
  const line_vat = line_subtotal * (vat / 100)
  const line_total = line_subtotal + line_vat
  return { unit_price_effective: price, line_subtotal, line_vat, line_total }
}

export function quoteHeaderTotals(
  lines: Array<{ line_subtotal: number; line_vat: number; line_total: number }>,
) {
  return lines.reduce(
    (acc, line) => {
      acc.subtotal += Number(line.line_subtotal) || 0
      acc.vat_total += Number(line.line_vat) || 0
      acc.grand_total += Number(line.line_total) || 0
      return acc
    },
    { subtotal: 0, vat_total: 0, grand_total: 0 },
  )
}

export function catalogBasePrice(effective: number, multiplier: number) {
  const mult = Number(multiplier) || 1
  if (mult === 0) return Number(effective) || 0
  return (Number(effective) || 0) / mult
}

export function formatMoney(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function istanbulDayKey(value: string | Date = new Date()) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
}

export function daysOutstanding(from: string, now = new Date()) {
  const start = new Date(`${istanbulDayKey(from)}T00:00:00`)
  const today = new Date(`${istanbulDayKey(now)}T00:00:00`)
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000))
}

/** Tutara göre ağırlıklı ortalama vade (gün). */
export function averageTermDays(
  items: Array<{ amount: number; from: string }>,
  now = new Date(),
) {
  const weighted = items.reduce(
    (acc, item) => {
      const amount = Number(item.amount) || 0
      if (amount <= 0) return acc
      acc.amount += amount
      acc.days += amount * daysOutstanding(item.from, now)
      return acc
    },
    { amount: 0, days: 0 },
  )
  if (weighted.amount <= 0) return 0
  return Math.round(weighted.days / weighted.amount)
}

export function formatDays(days: number) {
  return `${days} gün`
}

export function formatLedgerDate(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz']
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan']

function chunkToWords(n: number): string {
  if (n === 0) return ''
  const hundred = Math.floor(n / 100)
  const ten = Math.floor((n % 100) / 10)
  const one = n % 10
  const parts: string[] = []
  if (hundred === 1) parts.push('yüz')
  else if (hundred > 1) parts.push(`${ONES[hundred]} yüz`)
  if (ten) parts.push(TENS[ten])
  if (one) parts.push(ONES[one])
  return parts.join(' ')
}

export function amountToWords(amount: number): string {
  const safe = Math.max(0, Math.round(amount * 100) / 100)
  const lira = Math.floor(safe)
  const kurus = Math.round((safe - lira) * 100)

  if (lira === 0 && kurus === 0) return 'Sıfır Türk Lirası'

  const groups = [
    { value: 1_000_000_000, label: 'milyar' },
    { value: 1_000_000, label: 'milyon' },
    { value: 1000, label: 'bin' },
  ]

  let rest = lira
  const parts: string[] = []
  for (const group of groups) {
    const count = Math.floor(rest / group.value)
    if (count > 0) {
      const word = count === 1 && group.label === 'bin' ? 'bin' : `${chunkToWords(count)} ${group.label}`
      parts.push(word.trim())
      rest %= group.value
    }
  }
  if (rest > 0) parts.push(chunkToWords(rest))

  const liraText = lira > 0 ? `${parts.join(' ')} Türk Lirası` : ''
  const kurusText = kurus > 0 ? `${chunkToWords(kurus)} Kuruş` : ''
  return [liraText, kurusText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

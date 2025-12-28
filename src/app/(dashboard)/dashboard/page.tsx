import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Building2, FileText, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch counts
  const [productsRes, companiesRes, quotesRes] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('quotes').select('id, grand_total', { count: 'exact' }),
  ])

  const productCount = productsRes.count || 0
  const companyCount = companiesRes.count || 0
  const quoteCount = quotesRes.count || 0
  const totalRevenue = quotesRes.data?.reduce((sum, q) => sum + (q.grand_total || 0), 0) || 0

  const stats = [
    {
      title: 'Toplam Ürün',
      value: productCount,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Firma Sayısı',
      value: companyCount,
      icon: Building2,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Toplam Teklif',
      value: quoteCount,
      icon: FileText,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Toplam Tutar',
      value: `₺${totalRevenue.toLocaleString('tr-TR')}`,
      icon: TrendingUp,
      color: 'from-amber-500 to-amber-600',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-slate-400">Bidix teklif yönetim platformuna genel bakış</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-slate-700 bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg bg-gradient-to-br ${stat.color} p-2`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Hızlı Başlangıç</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-300">
          <p>👋 Bidix&apos;e hoş geldiniz! Başlamak için:</p>
          <ol className="list-inside list-decimal space-y-2 text-slate-400">
            <li><strong className="text-white">Ürünler</strong> sayfasından ürünlerinizi ekleyin</li>
            <li><strong className="text-white">Firmalar</strong> sayfasından firma bilgilerinizi girin</li>
            <li><strong className="text-white">Kaşe</strong> sayfasından kaşe profilinizi oluşturun</li>
            <li><strong className="text-white">Şablonlar</strong> sayfasından PDF şablonu seçin</li>
            <li><strong className="text-white">Teklif Oluştur</strong> sayfasından ilk teklifinizi verin!</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}


'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Zap, FileText, TrendingUp, Shield, Clock, Users, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { DemoBuilder } from '@/components/demo-builder'

const features = [
  { icon: Zap, title: 'Anında Oluştur', description: 'Tek tıkla 30 saniyede profesyonel teklifler hazırlayın', gradient: 'from-yellow-500 to-orange-500' },
  { icon: FileText, title: '6 Farklı Şablon', description: 'Modern, Klasik, Minimal ve daha fazlasıyla müşterilerinize seçenek sunun', gradient: 'from-blue-500 to-cyan-500' },
  { icon: TrendingUp, title: 'Akıllı Fiyatlandırma', description: 'Otomatik %10 ve %15 alternatifleriyle pazarlık gücünüzü artırın', gradient: 'from-green-500 to-emerald-500' },
  { icon: Shield, title: 'Profesyonel Görünüm', description: 'Kaşe, logo ve özel şablonlarla markanızı yansıtın', gradient: 'from-purple-500 to-pink-500' },
]

const steps = [
  { number: '01', title: 'Ürünlerini Yaz', description: 'Teklif vermek istediğin ürün veya hizmetleri ekle' },
  { number: '02', title: 'Şablonu Seç', description: 'Farklı tasarım ve fiyat alternatiflerini belirle' },
  { number: '03', title: 'PDF’ini İndir', description: 'Profesyonel tekliflerini anında PDF olarak al' },
]

const testimonials = [
  { name: 'Ahmet Yılmaz', role: 'Kurucu, TechSolutions', avatar: '👨‍💼', content: 'Bidix sayesinde teklif hazırlama sürem 2 saatten 5 dakikaya düştü. Müşterilerime aynı anda 3 farklı seçenek sunabiliyorum.' },
  { name: 'Zeynep Kaya', role: 'Satış Müdürü, DigitalPro', avatar: '👩‍💼', content: 'Profesyonel PDF şablonları ve otomatik fiyat alternatifleri gerçekten iş değiştirdi. Daha fazla müşteriye daha hızlı ulaşıyorum.' },
  { name: 'Mehmet Demir', role: 'Freelance Danışman', avatar: '👨‍💻', content: 'Kayıt olmadan denedim, çok beğendim ve hemen üye oldum. Müşteri memnuniyetim %30 arttı!' },
]

export default function HomePage() {
  const router = useRouter()

  // Non-blocking auth check: if already logged in, send to dashboard.
  // We never block rendering the landing/builder on this.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (active && user) router.replace('/dashboard')
      } catch {
        /* offline / auth unavailable — just show the public landing */
      }
    })()
    return () => {
      active = false
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero with instant builder */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10" />
          <div className="absolute top-0 right-1/4 h-[500px] w-[500px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] bg-purple-500/20 rounded-full blur-3xl animate-pulse animation-delay-1000" />
        </div>

        {/* Nav */}
        <nav className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bidix</div>
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Button variant="ghost" onClick={() => router.push('/login')}>Giriş Yap</Button>
              <Button onClick={() => router.push('/register')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Ücretsiz Başla
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero content */}
        <div className="container mx-auto px-4 pt-10 pb-20 sm:pt-14">
          <div className="mx-auto max-w-3xl text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-background/50 backdrop-blur-sm mb-6">
              <Sparkles className="size-4 text-yellow-500" />
              <span className="text-sm font-medium">Kayıt olmadan hemen dene</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Teklifini{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">30 saniyede</span>{' '}
              oluştur
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Ürünlerini yaz, şablonu seç, profesyonel PDF teklifini indir. Aşağıdan hemen başla —{' '}
              <strong className="text-foreground">giriş yapmana gerek yok.</strong>
            </p>
          </div>

          {/* The builder is the hero */}
          <DemoBuilder />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4"><Zap className="mr-1 size-3" /> Özellikler</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Neden <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bidix</span>?
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl border-2 bg-background/50 p-6 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}>
                  <f.icon className="size-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4"><Clock className="mr-1 size-3" /> Nasıl Çalışır?</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              3 Adımda <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Teklif Hazır</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl font-bold mb-5">{s.number}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4"><Users className="mr-1 size-3" /> Müşteri Yorumları</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Kullanıcılarımız <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ne Diyor</span>?
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border-2 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{t.avatar}</div>
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="size-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-muted-foreground text-sm italic">&ldquo;{t.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Hazır mısın?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">İlk teklifini yukarıda hemen oluştur, beğenirsen ücretsiz üye ol.</p>
          <Button size="lg" onClick={() => router.push('/register')} className="bg-white text-purple-600 hover:bg-white/90 h-12 px-8">
            <Sparkles className="mr-2 size-5" /> Ücretsiz Üye Ol
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bidix</div>
            <div className="text-sm text-muted-foreground text-center">© 2026 Bidix. Profesyonel teklif oluşturma platformu.</div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Gizlilik</Button>
              <Button variant="ghost" size="sm">Şartlar</Button>
              <Button variant="ghost" size="sm">İletişim</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

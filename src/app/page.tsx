'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Plus, Trash2, Eye, Download, Upload, X, Sparkles, Zap, FileText, TrendingUp, 
  ArrowRight, Check, Star, Users, Rocket, Clock, Shield, BarChart3, Lock, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'

interface ProductItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  vatRate: number
}

interface GeneratedOffer {
  offerNo: number
  template: string
  multiplier: number
  totals: {
    subtotal: number
    vat_total: number
    grand_total: number
  }
  pdfUrl: string
  previewUrl: string
}

const features = [
  {
    icon: Zap,
    title: 'Anında Oluştur',
    description: 'Tek tıkla 30 saniyede profesyonel teklifler hazırlayın',
    gradient: 'from-yellow-500 to-orange-500'
  },
  {
    icon: FileText,
    title: '6 Farklı Şablon',
    description: 'Modern, Klasik, Minimal ve daha fazlasıyla müşterilerinize seçenek sunun',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: TrendingUp,
    title: 'Akıllı Fiyatlandırma',
    description: 'Otomatik %10 ve %15 alternatifleriyle pazarlık gücünüzü artırın',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: Shield,
    title: 'Profesyonel Görünüm',
    description: 'Kaşe, logo ve özel şablonlarla markanızı yansıtın',
    gradient: 'from-purple-500 to-pink-500'
  }
]

const stats = [
  { value: '10K+', label: 'Oluşturulan Teklif' },
  { value: '500+', label: 'Mutlu Kullanıcı' },
  { value: '99%', label: 'Memnuniyet Oranı' },
  { value: '24/7', label: 'Erişilebilir' }
]

const testimonials = [
  {
    name: 'Ahmet Yılmaz',
    role: 'Kurucu, TechSolutions',
    avatar: '👨‍💼',
    content: 'Bidix sayesinde teklif hazırlama sürem 2 saatten 5 dakikaya düştü. Müşterilerime aynı anda 3 farklı seçenek sunabiliyorum.',
    rating: 5
  },
  {
    name: 'Zeynep Kaya',
    role: 'Satış Müdürü, DigitalPro',
    avatar: '👩‍💼',
    content: 'Profesyonel PDF şablonları ve otomatik fiyat alternatifleri gerçekten iş değiştirdi. Artık daha fazla müşteriye daha hızlı ulaşıyorum.',
    rating: 5
  },
  {
    name: 'Mehmet Demir',
    role: 'Freelance Danışman',
    avatar: '👨‍💻',
    content: 'Ücretsiz demo ile denedim, çok beğendim ve hemen abone oldum. Müşteri memnuniyetim %30 arttı!',
    rating: 5
  }
]

const steps = [
  { 
    number: '01', 
    title: 'Ürünlerinizi Ekleyin', 
    description: 'Teklif vermek istediğiniz ürün veya hizmetleri kolayca ekleyin'
  },
  { 
    number: '02', 
    title: 'Firma Bilgilerini Girin', 
    description: 'Firma ve müşteri bilgilerinizi doldurun, kaşe ekleyin'
  },
  { 
    number: '03', 
    title: 'Tekliflerinizi Alın', 
    description: 'Seçtiğiniz şablonlarda farklı fiyatlarla profesyonel PDF alın'
  }
]

const templates = [
  {
    id: 'modern',
    name: 'Modern Tasarım',
    description: 'Temiz çizgiler ve modern görünüm',
    preview: '🎨',
    free: true,
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Gradient başlıklar', 'Modern tablolar', 'QR kod desteği']
  },
  {
    id: 'classic',
    name: 'Klasik Kurumsal',
    description: 'Profesyonel ve güvenilir görünüm',
    preview: '📋',
    free: true,
    gradient: 'from-slate-500 to-slate-700',
    features: ['Geleneksel layout', 'Profesyonel tipografi', 'Net çizgiler']
  },
  {
    id: 'minimal',
    name: 'Minimal Sade',
    description: 'Minimalist ve şık tasarım',
    preview: '✨',
    free: false,
    gradient: 'from-purple-500 to-pink-500',
    features: ['Bol beyaz alan', 'Minimal tasarım', 'Elegant görünüm']
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Zarif ve sofistike',
    preview: '👔',
    free: false,
    gradient: 'from-amber-500 to-orange-500',
    features: ['Lüks tasarım', 'Özel fontlar', 'Premium görünüm']
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Cesur ve dikkat çekici',
    preview: '⚡',
    free: false,
    gradient: 'from-red-500 to-rose-500',
    features: ['Güçlü renkler', 'Cesur tipografi', 'Dikkat çekici']
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Kurumsal kimlik odaklı',
    preview: '🏢',
    free: false,
    gradient: 'from-indigo-500 to-violet-500',
    features: ['Kurumsal kimlik', 'Logo entegrasyonu', 'Marka uyumlu']
  }
]

export default function HomePage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [stampImage, setStampImage] = useState<File | null>(null)
  const [stampPreview, setStampPreview] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductItem[]>([
    { id: '1', name: 'Web Sitesi Tasarımı', quantity: 1, unitPrice: 5000, vatRate: 20 },
    { id: '2', name: 'Mobil Uygulama Geliştirme', quantity: 1, unitPrice: 15000, vatRate: 20 },
  ])
  const [loading, setLoading] = useState(false)
  const [offers, setOffers] = useState<GeneratedOffer[] | null>(null)
  const [previewOffer, setPreviewOffer] = useState<GeneratedOffer | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(['modern', 'classic'])
  const [previewingTemplate, setPreviewingTemplate] = useState<string | null>(null)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
        router.push('/dashboard')
  } else {
        setIsCheckingAuth(false)
      }
    }
    
    checkAuth()
  }, [router])

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now().toString(),
        name: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: 20,
      },
    ])
  }

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  const updateProduct = (id: string, field: keyof ProductItem, value: string | number) => {
    setProducts(
      products.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    )
  }

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Sadece JPEG, PNG, GIF ve WEBP formatlarını kabul et
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      
      if (allowedTypes.includes(file.type.toLowerCase())) {
        setStampImage(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setStampPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        toast.error('Desteklenmeyen dosya formatı. Lütfen PNG, JPG, GIF veya WEBP formatında bir resim seçin.')
      }
    }
  }

  const removeStamp = () => {
    setStampImage(null)
    setStampPreview(null)
  }

  const toggleTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    
    // Premium şablon kontrolü
    if (template && !template.free) {
      alert('⚠️ Bu şablon premium üyelere özeldir.\n\nTüm şablonları kullanmak için lütfen üye olunuz.')
      router.push('/register')
      return
    }

    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        // En az 1 şablon seçili olmalı
        if (prev.length === 1) {
          toast.error('En az bir şablon seçmelisiniz')
          return prev
        }
        return prev.filter(id => id !== templateId)
      } else {
        // Max 3 şablon
        if (prev.length >= 3) {
          toast.error('En fazla 3 şablon seçebilirsiniz')
          return prev
        }
        return [...prev, templateId]
      }
    })
  }

  const openTemplatePreview = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    
    // Premium şablon kontrolü
    if (template && !template.free) {
      alert('⚠️ Bu şablon premium üyelere özeldir.\n\nTüm şablonları kullanmak için lütfen üye olunuz.')
      router.push('/register')
      return
    }
    
    setPreviewingTemplate(templateId)
    setLoadingPreview(true)
    setPreviewPdfUrl(null)

    try {
      // Örnek verilerle PDF oluştur
      const sampleItems = [
        { name: 'Web Sitesi Tasarımı', quantity: 1, unitPrice: 5000, vatRate: 20 },
        { name: 'Mobil Uygulama', quantity: 1, unitPrice: 12000, vatRate: 20 },
        { name: 'SEO Optimizasyonu', quantity: 3, unitPrice: 1500, vatRate: 20 },
      ]

      const response = await fetch('/api/demo/generate-offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: 'Örnek Firma A.Ş.',
          customerName: 'Demo Müşteri Ltd.',
          selectedTemplates: [templateId],
          items: sampleItems,
        }),
      })

      if (!response.ok) {
        throw new Error('Önizleme oluşturulamadı')
      }

      const data = await response.json()
      if (data.offers && data.offers.length > 0) {
        setPreviewPdfUrl(data.offers[0].pdfUrl)
      }
    } catch (error) {
      console.error('Preview error:', error)
      toast.error('Önizleme yüklenemedi')
      setPreviewingTemplate(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const generateOffers = async () => {
    if (products.length === 0) {
      toast.error('En az bir ürün eklemelisiniz')
      return
    }

    const invalidProducts = products.filter(
      (p) => !p.name.trim() || p.quantity <= 0 || p.unitPrice <= 0
    )
    if (invalidProducts.length > 0) {
      toast.error('Lütfen tüm ürün bilgilerini doldurun')
      return
    }

    if (selectedTemplates.length === 0) {
      toast.error('En az bir şablon seçmelisiniz')
      return
    }

    setLoading(true)
    try {
      let stampBase64: string | null = null
      
      // Convert stamp image to base64 for demo (no storage needed)
      if (stampImage) {
        try {
          const reader = new FileReader()
          stampBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(stampImage)
          })
        } catch (uploadError) {
          console.error('Stamp conversion error:', uploadError)
          toast.error('Kaşe yüklenemedi. Kaşe olmadan devam ediliyor...')
          // Continue without stamp
        }
      }

      const response = await fetch('/api/demo/generate-offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName || 'Demo Firma',
          customerName: customerName || 'Demo Müşteri',
          stampImageBase64: stampBase64,
          selectedTemplates: selectedTemplates,
          items: products.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            vatRate: p.vatRate,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Teklifler oluşturulamadı')
      }

      const data = await response.json()
      setOffers(data.offers)
      toast.success(`✨ ${data.offers.length} farklı teklif otomatik oluşturuldu!`)
    } catch (error) {
      console.error('Error generating offers:', error)
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const openPreview = (offer: GeneratedOffer) => {
    setPreviewOffer(offer)
    setIsPreviewOpen(true)
  }

  const downloadPdf = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getTemplateName = (template: string) => {
    const names: Record<string, string> = {
      modern: 'Modern Tasarım',
      classic: 'Klasik Kurumsal',
      minimal: 'Minimal Sade',
    }
    return names[template] || template
  }

  const scrollToDemo = () => {
    setShowDemo(true)
    setTimeout(() => {
      document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Premium Design */}
      <section className="relative overflow-hidden border-b">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10" />
          <div className="absolute top-0 right-1/4 h-[500px] w-[500px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse animation-delay-1000" />
          <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] bg-pink-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        </div>

        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Bidix
              </div>
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" onClick={() => router.push('/login')}>
                Giriş Yap
              </Button>
              <Button onClick={scrollToDemo} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Ücretsiz Başla
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="container mx-auto px-4 py-20 sm:py-32">
          <div className="mx-auto max-w-5xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-background/50 backdrop-blur-sm mb-8 animate-fade-in">
              <Sparkles className="size-4 text-yellow-500" />
              <span className="text-sm font-medium">Kayıt olmadan hemen deneyin</span>
              <Badge variant="outline" className="text-xs">Ücretsiz</Badge>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 animate-fade-in-up">
              Tek Tıkla{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                3 Farklı Teklif
              </span>{' '}
              Oluştur
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
              Aynı ürünlerden otomatik olarak{' '}
              <strong className="text-foreground">farklı şablonlarda</strong> ve{' '}
              <strong className="text-foreground">fiyatlarda</strong> profesyonel PDF teklifler üretin.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up animation-delay-400">
              <Button 
                size="lg" 
                onClick={scrollToDemo}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg h-14 px-8 group"
              >
                <Rocket className="mr-2 size-5 group-hover:animate-bounce" />
                Hemen Dene - Ücretsiz
                <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-fade-in-up animation-delay-600">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path 
              fill="currentColor" 
              className="text-background"
              d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              <Zap className="mr-1 size-3" />
              Özellikler
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Neden <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bidix</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Teklif hazırlama sürecinizi hızlandıran ve profesyonelleştiren özellikler
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-background/50 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                    <feature.icon className="size-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              <Clock className="mr-1 size-3" />
              Nasıl Çalışır?
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              3 Basit Adımda <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Teklif Hazır</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-3xl font-bold mb-6">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-blue-600 to-purple-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              <Users className="mr-1 size-3" />
              Müşteri Yorumları
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Kullanıcılarımız <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ne Diyor</span>?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="border-2 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{testimonial.avatar}</div>
                    <div>
                      <div className="font-bold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      {showDemo && (
        <section id="demo-section" className="py-20 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="mr-1 size-3" />
                Canlı Demo
              </Badge>
              <h2 className="text-4xl font-bold mb-4">
                Hemen <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Deneyin</span>
              </h2>
              <p className="text-xl text-muted-foreground">Kayıt olmadan profesyonel teklifler oluşturun</p>
            </div>

            {!offers ? (
              <Card className="border-2 shadow-2xl">
                <CardHeader className="border-b bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Demo Modu Aktif
                    </span>
                  </div>
                  <CardTitle className="text-2xl">Teklif Bilgilerinizi Girin</CardTitle>
                  <CardDescription>
                    Şablonları seçin, ürünlerinizi ekleyin ve profesyonel teklifler oluşturun
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Company & Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Firma Adı (Opsiyonel)</Label>
                      <Input
                        id="companyName"
                        placeholder="Örn: ABC Teknoloji"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Müşteri Adı (Opsiyonel)</Label>
                      <Input
                        id="customerName"
                        placeholder="Örn: XYZ İnşaat"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Template Selection */}
                  <div className="space-y-3">
                    <Label>Şablon Seçimi (Max 3)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {templates.map((template) => (
                        <div key={template.id} className="relative">
                          <div
                            onClick={() => toggleTemplate(template.id)}
                            className={`relative p-4 rounded-lg border-2 transition-all ${
                              selectedTemplates.includes(template.id)
                                ? 'border-blue-500 bg-blue-500/10 shadow-lg cursor-pointer'
                                : template.free
                                ? 'border-border hover:border-blue-300 bg-card cursor-pointer'
                                : 'border-border bg-muted/50 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {!template.free && (
                              <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-center space-y-2">
                              <div className="text-3xl">{template.preview}</div>
                              <div>
                                <div className="font-semibold text-sm">{template.name}</div>
                                <div className="text-xs text-muted-foreground">{template.description}</div>
                              </div>
                              {selectedTemplates.includes(template.id) && (
                                <Check className="absolute top-2 left-2 h-5 w-5 text-blue-500" />
                              )}
                            </div>
                          </div>
                          
                          {/* Preview Button */}
                          <Button
                            type="button"
                            variant={template.free ? "outline" : "default"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openTemplatePreview(template.id)
                            }}
                            className="w-full mt-2"
                          >
                            {template.free ? (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Önizle
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 mr-1" />
                                Ücretsiz Üye Ol
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Önizle butonuna tıklayarak şablonları görün. Tüm şablonlar için{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/register')}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        ücretsiz kayıt olun
                      </button>
                    </p>
                  </div>

                  {/* Stamp Upload */}
                  <div className="space-y-2">
                    <Label>Kaşe/İmza (Opsiyonel)</Label>
                    {!stampPreview ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('stamp-upload')?.click()}
                        >
                          <Upload className="size-4 mr-2" />
                          Kaşe/İmza Ekle
                        </Button>
                        <input
                          id="stamp-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                          className="hidden"
                          onChange={handleStampUpload}
                        />
                        <span className="text-xs text-muted-foreground">PNG, JPG, GIF veya WEBP</span>
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <img
                          src={stampPreview}
                          alt="Kaşe önizleme"
                          className="h-20 w-20 object-contain border rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 size-6"
                          onClick={removeStamp}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Products List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Ürün / Hizmetler</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                        <Plus className="size-4 mr-2" />
                        Ürün Ekle
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="col-span-12 md:col-span-4">
                            <Label className="text-xs mb-1.5">Ürün Adı</Label>
                            <Input
                              value={product.name}
                              onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                              placeholder="Ürün veya hizmet adı"
                            />
                          </div>
                          <div className="col-span-6 md:col-span-2">
                            <Label className="text-xs mb-1.5">Miktar</Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={product.quantity}
                              onChange={(e) =>
                                updateProduct(product.id, 'quantity', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="col-span-6 md:col-span-3">
                            <Label className="text-xs mb-1.5">Birim Fiyat (₺)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.unitPrice}
                              onChange={(e) =>
                                updateProduct(product.id, 'unitPrice', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="col-span-8 md:col-span-2">
                            <Label className="text-xs mb-1.5">KDV (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={product.vatRate}
                              onChange={(e) =>
                                updateProduct(product.id, 'vatRate', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="col-span-4 md:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeProduct(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4 border-t pt-6">
                  <Button
                    onClick={generateOffers}
                    disabled={loading}
                    className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Teklifler Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 size-5" />
                        {selectedTemplates.length} Farklı Teklif Oluştur
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    🔒 Güvenli • ⚡ Anında • 🎨 {selectedTemplates.length} şablon seçildi
                  </p>
                </CardFooter>
              </Card>
            ) : (
              /* Results Section */
              <div className="space-y-8">
                {/* Success Message */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/20">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-500">
                      <Check className="size-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      Harika! {offers.length} farklı profesyonel teklif oluşturuldu
                    </span>
                  </div>
                  <p className="text-muted-foreground text-lg">
                    Her biri farklı şablon ve fiyatlandırma ile • Karşılaştırın ve en uygun olanı seçin
                  </p>
                </div>

                {/* Offers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {offers.map((offer) => (
                    <Card key={offer.offerNo} className="flex flex-col hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2">
                      <CardHeader className="border-b bg-gradient-to-br from-muted/50 to-muted/20">
                        <div className="flex items-center justify-between mb-3">
                          <Badge 
                            variant={offer.offerNo === 1 ? 'default' : 'secondary'}
                            className="text-sm px-3 py-1"
                          >
                            {offer.offerNo === 1
                              ? '⭐ Standart'
                              : offer.offerNo === 2
                              ? '+%10 Alternatif'
                              : '+%15 Alternatif'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTemplateName(offer.template)}
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl">Teklif {offer.offerNo}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 pt-6 space-y-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Ara Toplam:</span>
                            <span className="font-semibold">
                              ₺{offer.totals.subtotal.toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">KDV:</span>
                            <span className="font-semibold">
                              ₺{offer.totals.vat_total.toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t-2">
                            <span className="font-bold text-lg">Toplam:</span>
                            <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              ₺{offer.totals.grand_total.toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-2 border-t pt-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => openPreview(offer)}
                        >
                          <Eye className="size-4 mr-2" />
                          Önizle
                        </Button>
                        <Button
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          onClick={() =>
                            downloadPdf(
                              offer.pdfUrl,
                              `bidix-teklif-${offer.offerNo}.pdf`
                            )
                          }
                        >
                          <Download className="size-4 mr-2" />
                          PDF İndir
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {/* CTA Section */}
                <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 shadow-2xl">
                  <CardContent className="py-12 text-center space-y-6">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 mx-auto mb-4">
                      <Rocket className="size-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold">Teklifleri Kaydetmek İster misiniz?</h3>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                      Ücretsiz kayıt olun ve tüm tekliflerinizi saklayın, düzenleyin ve müşterilerinizle paylaşın.
                      Sınırsız teklif oluşturun, kendi şablonlarınızı ekleyin!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                      <Button 
                        size="lg" 
                        onClick={() => router.push('/register')} 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg h-14 px-8 group"
                      >
                        <Sparkles className="mr-2 size-5" />
                        Ücretsiz Kayıt Ol
                        <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => setOffers(null)}
                        className="h-14 px-8"
                      >
                        Yeni Teklif Oluştur
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Hazır mısınız?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Hemen başlayın ve ilk teklifinizi 30 saniyede oluşturun. Kayıt gerektirmez!
          </p>
          <Button 
            size="lg" 
            onClick={scrollToDemo}
            className="bg-white text-purple-600 hover:bg-white/90 text-lg h-14 px-8"
          >
            <Rocket className="mr-2 size-5" />
            Ücretsiz Deneyin
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Bidix
            </div>
            <div className="text-sm text-muted-foreground text-center">
              © 2024 Bidix. Tüm hakları saklıdır. Profesyonel teklif yönetimi platformu.
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm">Gizlilik</Button>
              <Button variant="ghost" size="sm">Şartlar</Button>
              <Button variant="ghost" size="sm">İletişim</Button>
            </div>
          </div>
        </div>
      </footer>

      {/* Offer Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Teklif Önizleme - {previewOffer && getTemplateName(previewOffer.template)}
              <Badge variant="outline">Demo</Badge>
            </DialogTitle>
          </DialogHeader>
          {previewOffer && (
            <div className="w-full h-[75vh]">
              <iframe
                src={previewOffer.previewUrl}
                className="w-full h-full border rounded"
                title="PDF Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewingTemplate} onOpenChange={(open) => {
        if (!open) {
          setPreviewingTemplate(null)
          setPreviewPdfUrl(null)
        }
      }}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 gap-0 overflow-hidden flex flex-col">
          {previewingTemplate && (() => {
            const template = templates.find(t => t.id === previewingTemplate)!
            return (
              <>
                <DialogHeader className="px-4 py-3 border-b shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="text-xl">{template.preview}</div>
                    <div>
                      <DialogTitle className="text-sm font-semibold">{template.name}</DialogTitle>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                </DialogHeader>

                {/* PDF Preview */}
                <div className="flex-1 min-h-0 bg-muted/10">
                  {loadingPreview ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-sm text-muted-foreground">PDF oluşturuluyor...</p>
                    </div>
                  ) : previewPdfUrl ? (
                    <iframe
                      src={previewPdfUrl}
                      className="w-full h-full"
                      title="Template Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground">Önizleme yüklenemedi</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t bg-muted/20 shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
                      {template.features.slice(0, 2).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-1 whitespace-nowrap">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => {
                        toggleTemplate(template.id)
                        setPreviewingTemplate(null)
                        setPreviewPdfUrl(null)
                      }}
                      size="sm"
                      disabled={selectedTemplates.includes(template.id) || loadingPreview}
                      className="shrink-0"
                    >
                      {selectedTemplates.includes(template.id) ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Seçildi
                        </>
                      ) : (
                        <>Şablonu Seç</>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileText, Loader2, ExternalLink, Trash2, Calendar, Building2, User, FilePlus } from 'lucide-react'
import Link from 'next/link'

interface CompanyInfo {
  id: string
  title: string
  multiplier: number
}

interface Quote {
  id: string
  quote_no: string | null
  customer_name: string | null
  customer_company: string | null
  subtotal: number
  vat_total: number
  grand_total: number
  pdf_url: string | null
  created_at: string
  company: CompanyInfo | CompanyInfo[] | null
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchQuotes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_no,
        customer_name,
        customer_company,
        subtotal,
        vat_total,
        grand_total,
        pdf_url,
        created_at,
        company:companies(id, title, multiplier)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      toast.error('Teklifler yüklenemedi')
      console.error(error)
      return
    }

    setQuotes(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return

    // Önce quote_items'ları sil
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', id)

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Teklif silinemedi')
      return
    }

    toast.success('Teklif silindi')
    fetchQuotes()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getRemainingDays = (createdAt: string) => {
    const created = new Date(createdAt)
    const expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const diffTime = expiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getRemainingBadge = (createdAt: string) => {
    const days = getRemainingDays(createdAt)
    if (days <= 1) {
      return <Badge className="bg-red-500/20 text-red-400 text-xs">Son gün!</Badge>
    } else if (days <= 3) {
      return <Badge className="bg-amber-500/20 text-amber-400 text-xs">{days} gün kaldı</Badge>
    } else {
      return <Badge className="bg-slate-600/50 text-slate-400 text-xs">{days} gün kaldı</Badge>
    }
  }

  const getMultiplierBadge = (multiplier: number) => {
    if (multiplier === 1) {
      return <Badge className="bg-slate-600 text-slate-200">Normal</Badge>
    }
    return (
      <Badge className="bg-purple-500/20 text-purple-400">
        +%{Math.round((multiplier - 1) * 100)}
      </Badge>
    )
  }

  // Helper to get company from array or object
  const getCompany = (company: CompanyInfo | CompanyInfo[] | null): CompanyInfo | null => {
    if (!company) return null
    if (Array.isArray(company)) return company[0] || null
    return company
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Teklifler</h1>
          <p className="mt-1 text-slate-400">Oluşturduğunuz tüm teklifleri görüntüleyin</p>
        </div>
        <Link href="/quotes/new">
          <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500">
            <FilePlus className="mr-2 h-4 w-4" />
            Yeni Teklif
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : quotes.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-500" />
            <p className="text-lg text-slate-300">Henüz teklif oluşturulmamış</p>
            <p className="text-sm text-slate-500 mb-4">İlk teklifinizi oluşturmak için başlayın</p>
            <Link href="/quotes/new">
              <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500">
                <FilePlus className="mr-2 h-4 w-4" />
                Teklif Oluştur
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Teklif No</TableHead>
                  <TableHead className="text-slate-300">Müşteri</TableHead>
                  <TableHead className="text-slate-300">Firma</TableHead>
                  <TableHead className="text-slate-300">Tarih</TableHead>
                  <TableHead className="text-right text-slate-300">Toplam</TableHead>
                  <TableHead className="text-center text-slate-300">PDF</TableHead>
                  <TableHead className="text-center text-slate-300">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id} className="border-slate-700 hover:bg-slate-700/30">
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-400" />
                        {quote.quote_no || quote.id.slice(0, 8).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {quote.customer_name && (
                          <div className="flex items-center gap-1 text-white">
                            <User className="h-3 w-3 text-slate-500" />
                            {quote.customer_name}
                          </div>
                        )}
                        {quote.customer_company && (
                          <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <Building2 className="h-3 w-3 text-slate-500" />
                            {quote.customer_company}
                          </div>
                        )}
                        {!quote.customer_name && !quote.customer_company && (
                          <span className="text-slate-500 italic">Belirtilmedi</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const company = getCompany(quote.company)
                        return company ? (
                          <div className="space-y-1">
                            <div className="text-white text-sm">{company.title}</div>
                            {getMultiplierBadge(company.multiplier)}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-slate-300 text-sm">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          {formatDate(quote.created_at)}
                        </div>
                        {getRemainingBadge(quote.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <div className="text-white font-semibold">
                          {formatCurrency(quote.grand_total)}
                        </div>
                        <div className="text-xs text-slate-500">
                          KDV: {formatCurrency(quote.vat_total)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {quote.pdf_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(quote.pdf_url!, '_blank')}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-slate-600 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(quote.id)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {quotes.length > 0 && (
        <div className="text-center space-y-1">
          <p className="text-sm text-slate-500">
            Son {quotes.length} teklif gösteriliyor
          </p>
          <p className="text-xs text-slate-600">
            ⏱️ Teklifler 7 gün sonra otomatik olarak silinir
          </p>
        </div>
      )}
    </div>
  )
}


export interface BuiltinTemplate {
  key: string
  name: string
  description: string
  premium: boolean
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  { key: 'form', name: 'Teklif Formu', description: 'Klasik teklif formu — kaşe ile basılır', premium: false },
  { key: 'modern', name: 'Modern', description: 'Minimalist ve çağdaş tasarım', premium: false },
  { key: 'classic', name: 'Klasik', description: 'Geleneksel ve profesyonel görünüm', premium: false },
  { key: 'minimal', name: 'Minimal', description: 'Sade ve temiz düzen', premium: true },
  { key: 'corporate', name: 'Kurumsal', description: 'Profesyonel iş görünümü', premium: true },
  { key: 'elegant', name: 'Zarif', description: 'Sofistike ve şık tasarım', premium: true },
  { key: 'bold', name: 'Cesur', description: 'Güçlü ve etkileyici tasarım', premium: true },
]

export const FREE_TEMPLATE_KEYS = BUILTIN_TEMPLATES.filter((t) => !t.premium).map((t) => t.key)

export function isTemplatePremium(key: string): boolean {
  return BUILTIN_TEMPLATES.find((t) => t.key === key)?.premium ?? false
}

export function getTemplateName(key: string): string {
  return BUILTIN_TEMPLATES.find((t) => t.key === key)?.name ?? key
}

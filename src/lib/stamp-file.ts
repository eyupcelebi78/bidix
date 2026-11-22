export const STAMP_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const MAX_BYTES = 8 * 1024 * 1024
const MAX_EDGE = 1600

export function isNonDisplayableStampUrl(url: string | null | undefined): boolean {
  if (!url) return true
  const path = url.split('?')[0].toLowerCase()
  return /\.(pdf|xls|xlsx|doc|docx|zip)$/.test(path)
}

function extensionOf(file: File) {
  return (file.name.split('.').pop() || '').toLowerCase()
}

export function stampUploadError(file: File): string | null {
  const ext = extensionOf(file)
  if (ext === 'pdf') {
    return 'PDF kaşe olarak kullanılamaz. Kaşeyi PNG veya JPG olarak kaydedip öyle yükleyin.'
  }
  if (['xls', 'xlsx', 'doc', 'docx'].includes(ext)) {
    return 'Bu dosya bir görsel değil. Kaşe için PNG veya JPG yükleyin.'
  }
  if (file.size > MAX_BYTES) {
    return 'Kaşe en fazla 8 MB olabilir.'
  }
  if (file.type && !ALLOWED_TYPES.has(file.type) && !['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return 'Kaşe görseli PNG, JPG, WEBP veya GIF olmalı.'
  }
  return null
}

export async function stampFileToPngBlob(file: File): Promise<Blob> {
  const error = stampUploadError(file)
  if (error) throw new Error(error)

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Kaşe görseli okunamadı. PNG veya JPG deneyin.')
  })

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kaşe dönüştürülemedi')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
  if (!blob) throw new Error('Kaşe PNG olarak kaydedilemedi')
  return blob
}

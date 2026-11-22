'use client'

import { useEffect, useState } from 'react'
import { Stamp } from 'lucide-react'
import { isNonDisplayableStampUrl } from '@/lib/stamp-file'
import { cn } from '@/lib/utils'

type StampImageProps = {
  src: string | null | undefined
  alt?: string
  className?: string
  frameClassName?: string
}

export function StampImage({
  src,
  alt = 'Kaşe',
  className,
  frameClassName,
}: StampImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const unusable = !src || failed || isNonDisplayableStampUrl(src)

  if (unusable) {
    return (
      <div
        className={cn(
          'flex h-24 w-full flex-col items-center justify-center rounded bg-slate-700 px-2 text-center',
          frameClassName,
        )}
      >
        <Stamp className="h-8 w-8 text-slate-500" />
        {src && isNonDisplayableStampUrl(src) && (
          <p className="mt-2 text-[11px] leading-snug text-amber-300">
            PDF/dosya kaşe görüntülenemez. PNG veya JPG yükleyin.
          </p>
        )}
      </div>
    )
  }

  return (
    // User-uploaded stamps are unreliable through next/image (PDF, optimizer, remote host).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn('mx-auto h-24 w-auto max-w-full object-contain bg-white rounded p-2', className)}
      onError={() => setFailed(true)}
    />
  )
}

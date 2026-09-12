'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * How many free demo quote generations a visitor gets before we ask them to
 * sign up. Kept intentionally small — the goal is "let them feel the value,
 * then convert". Adjust in one place.
 */
export const FREE_DEMO_LIMIT = 3

const STORAGE_KEY = 'bidix_demo_used_v1'

function readCount(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Browser-local free-usage limiter for the no-login demo.
 *
 * We keep this purely client-side (localStorage) so the demo stays instant and
 * backend-free. It is a soft gate for conversion, not a security boundary.
 */
export function useDemoLimit() {
  // Start at 0 on both server and first client render to avoid hydration
  // mismatch, then sync from localStorage after mount.
  const [used, setUsed] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUsed(readCount())
    setReady(true)
  }, [])

  const increment = useCallback(() => {
    setUsed((prev) => {
      const next = prev + 1
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setUsed(0)
  }, [])

  const remaining = Math.max(0, FREE_DEMO_LIMIT - used)

  return {
    /** True once localStorage has been read (avoid flashing wrong count). */
    ready,
    used,
    remaining,
    limit: FREE_DEMO_LIMIT,
    /** Whether the visitor may still generate for free. */
    canUse: remaining > 0,
    increment,
    reset,
  }
}

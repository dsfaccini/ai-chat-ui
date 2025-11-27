import { useEffect, useRef, useState } from 'react'

export function useHeartbeat(
  apiBase: string,
  {
    initialInterval = 5000,
    maxInterval = 5 * 60 * 1000, // 5 minutes
    failureThreshold = 2,
    timeout = 5000,
  }: {
    initialInterval?: number
    maxInterval?: number
    failureThreshold?: number
    timeout?: number
  } = {},
): boolean {
  const [serverReachable, setServerReachable] = useState(true)
  const intervalRef = useRef(initialInterval)
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failuresRef = useRef(0)

  useEffect(() => {
    // Clear any existing timer
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }
    failuresRef.current = 0
    intervalRef.current = initialInterval

    let cancelled = false

    async function check() {
      try {
        const res = await fetch(apiBase + '/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(timeout),
        })
        if (!res.ok) throw new Error('bad status')
        if (!serverReachable) {
          setServerReachable(true)
        }
        failuresRef.current = 0
      } catch {
        failuresRef.current += 1
        if (failuresRef.current >= failureThreshold && serverReachable) {
          setServerReachable(false)
        }
      }

      // Exponential backoff
      intervalRef.current = Math.min(intervalRef.current * 2, maxInterval)

      if (!cancelled) {
        timeoutIdRef.current = setTimeout(() => {
          check().catch(() => null)
        }, intervalRef.current)
      }
    }

    if (apiBase) {
      timeoutIdRef.current = setTimeout(() => {
        check().catch(() => null)
      }, intervalRef.current)
    }

    return () => {
      cancelled = true
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
    }
  }, [apiBase, failureThreshold, initialInterval, maxInterval, timeout, serverReachable])

  return serverReachable
}

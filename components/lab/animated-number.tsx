"use client"

import { useEffect, useRef, useState } from "react"

export function AnimatedNumber({
  value,
  duration = 900,
  format,
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    let raf = 0
    startRef.current = null
    fromRef.current = display
    const target = value
    const from = fromRef.current

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      const current = Math.round(from + (target - from) * eased)
      setDisplay(current)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return (
    <span className={className}>
      {format ? format(display) : display.toLocaleString()}
    </span>
  )
}
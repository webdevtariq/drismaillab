"use client"

import { useEffect } from "react"
import { getSettings, type PerformanceMode } from "@/lib/settings"

const CLASSES: Record<PerformanceMode, string> = {
  eco: "perf-eco",
  smooth: "perf-smooth",
  ultra: "perf-ultra",
}

function apply(mode: PerformanceMode) {
  const root = document.documentElement
  Object.values(CLASSES).forEach((c) => root.classList.remove(c))
  root.classList.add(CLASSES[mode])
  root.dataset.perf = mode
}

export function PerformanceController() {
  useEffect(() => {
    apply(getSettings().performanceMode)

    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.performanceMode) apply(detail.performanceMode)
    }
    window.addEventListener("lab-settings-changed", onChange)
    return () => window.removeEventListener("lab-settings-changed", onChange)
  }, [])

  return null
}
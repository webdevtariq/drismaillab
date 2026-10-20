"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollInputProps {
  value: string
  onChange: (v: string) => void
  options?: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ScrollInput({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: ScrollInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!options || options.length === 0) return
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()

    const idx = options.indexOf(value)
    let nextIdx: number
    if (e.key === "ArrowDown") {
      nextIdx = idx === -1 ? 0 : (idx + 1) % options.length
    } else {
      nextIdx = idx === -1 ? options.length - 1 : (idx - 1 + options.length) % options.length
    }
    onChange(options[nextIdx])
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-40 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-300",
        className
      )}
    />
  )
}
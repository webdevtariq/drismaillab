"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface NumericInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Numeric input:
 *  - Only digits and one dot are allowed.
 *  - Any letter or other character is rejected.
 *  - On blur: if the value is digits only (e.g. "5"), it auto-appends ".0" → "5.0".
 *  - If the value ends with "." (e.g. "5."), it becomes "5.0".
 */
export function NumericInput({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: NumericInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Allow empty, digits, and one dot
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      onChange(raw)
    }
  }

  const handleBlur = () => {
    if (!value) return
    // Already has a dot with digits after it → leave as is
    if (/^\d+\.\d+$/.test(value)) return
    // Ends with dot → append 0
    if (/^\d+\.$/.test(value)) {
      onChange(value + "0")
      return
    }
    // Whole number only → append ".0"
    if (/^\d+$/.test(value)) {
      onChange(value + ".0")
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-40 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-300",
        className
      )}
    />
  )
}
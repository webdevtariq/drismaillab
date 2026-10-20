"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Pen, Upload, Trash2, Image as ImageIcon, CheckCircle2 } from "lucide-react"
import SignaturePadLib from "signature_pad"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { playSound } from "@/lib/sounds"

export function SignatureSettings({
  value,
  onChange,
}: {
  value?: string
  onChange: (dataUrl: string | undefined) => void
}) {
  const [mode, setMode] = useState<"preview" | "draw">(value ? "preview" : "draw")
  const fileRef = useRef<HTMLInputElement>(null)

  function startDraw() {
    setMode("draw")
  }

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file")
      return
    }
    if (file.size > 500_000) {
      toast.error("Image too large (max 500 KB)")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      onChange(dataUrl)
      setMode("preview")
      toast.success("Signature uploaded")
      playSound("success")
    }
    reader.readAsDataURL(file)
  }

  function handleClear() {
    onChange(undefined)
    setMode("draw")
    toast.success("Signature cleared")
    playSound("delete")
  }

  return (
    <div className="space-y-4">
      {value && mode === "preview" ? (
        <>
          {/* Preview */}
          <div className="rounded-xl border border-border/60 bg-background p-6">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Active default signature
            </div>
            <div className="grid place-items-center rounded-lg border border-dashed border-border/60 bg-muted/20 py-6">
              <img
                src={value}
                alt="Signature"
                className="max-h-24 w-auto"
                style={{ objectFit: "contain" }}
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              This signature will appear on every printed report and PDF
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={startDraw} className="gap-2 bg-transparent">
              <Pen className="h-4 w-4" /> Draw again
            </Button>
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="gap-2 bg-transparent"
            >
              <Upload className="h-4 w-4" /> Replace with image
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              className="gap-2 bg-transparent text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </>
      ) : (
        <>
          <DrawSignature
            initial={value}
            onSave={(dataUrl) => {
              onChange(dataUrl)
              setMode("preview")
              toast.success("Signature saved")
              playSound("success")
            }}
            onCancel={value ? () => setMode("preview") : undefined}
          />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="w-full gap-2 bg-transparent"
          >
            <Upload className="h-4 w-4" /> Upload signature image (PNG with transparency)
          </Button>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleUpload(f)
          e.currentTarget.value = ""
        }}
      />
    </div>
  )
}

/* ─── Inline drawing canvas ─── */

function DrawSignature({
  initial,
  onSave,
  onCancel,
}: {
  initial?: string
  onSave: (dataUrl: string) => void
  onCancel?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    const canvas = canvasRef.current
    if (!canvas) return

    const dark = document.documentElement.classList.contains("dark")

    function resize() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width * ratio
      canvas!.height = rect.height * ratio
      canvas!.getContext("2d")?.scale(ratio, ratio)
      padRef.current?.clear()
      if (initial) loadInitial()
    }

    async function loadInitial() {
      if (!initial || !padRef.current) return
      try {
        await padRef.current.fromDataURL(initial)
        setEmpty(false)
      } catch { /* ignore */ }
    }

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: dark ? "#f1f5f9" : "#0f172a",
      minWidth: 0.6,
      maxWidth: 3.0,
      throttle: 8,
    })
    padRef.current = pad

    pad.addEventListener("endStroke", () => {
      setEmpty(pad.isEmpty())
    })

    resize()
    window.addEventListener("resize", resize)
    return () => {
      window.removeEventListener("resize", resize)
      pad.off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClear() {
    padRef.current?.clear()
    setEmpty(true)
    playSound("click")
  }

  function handleSave() {
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error("Please draw your signature first")
      playSound("error")
      return
    }
    const dataUrl = padRef.current.toDataURL("image/png")
    onSave(dataUrl)
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-background">
        <canvas
          ref={canvasRef}
          className="block h-[160px] w-full cursor-crosshair touch-none"
        />
        {empty && (
          <motion.div
            animate={{ opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div className="text-center text-muted-foreground">
              <Pen className="mx-auto mb-2 h-6 w-6" />
              <p className="text-sm font-medium">Draw your signature here</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={empty}
          className="gap-1.5 bg-transparent"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={empty}
            className={cn("gap-1.5", empty && "opacity-60")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Save Signature
          </Button>
        </div>
      </div>
    </div>
  )
}
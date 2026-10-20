"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Pen, Eraser, Undo2, Check, X } from "lucide-react"
import SignaturePadLib from "signature_pad"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { playSound } from "@/lib/sounds"

export function SignaturePad({
  onSave,
  onCancel,
  title = "Sign Here",
  hint = "Draw your signature with mouse or finger",
}: {
  onSave: (dataUrl: string) => void
  onCancel: () => void
  title?: string
  hint?: string
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
  }, [])

  function handleClear() {
    padRef.current?.clear()
    setEmpty(true)
    playSound("click")
  }

  function handleUndo() {
    const data = padRef.current?.toData()
    if (data && data.length > 1) {
      data.pop()
      padRef.current?.fromData(data)
      setEmpty(padRef.current?.isEmpty() ?? true)
    } else {
      padRef.current?.clear()
      setEmpty(true)
    }
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
    playSound("success")
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border-border/60 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Pen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{title}</h3>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative bg-muted/30 p-5">
          <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-background">
            <canvas
              ref={canvasRef}
              className="block h-[220px] w-full cursor-crosshair touch-none"
            />
            {empty && (
              <motion.div
                initial={{ opacity: 0.4 }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="pointer-events-none absolute inset-0 grid place-items-center"
              >
                <div className="text-center text-muted-foreground">
                  <Pen className="mx-auto mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Draw your signature here</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span className="uppercase tracking-widest">Signature Line</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={empty}
              className="gap-1.5 bg-transparent"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={empty}
              className="gap-1.5 bg-transparent"
            >
              <Eraser className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={empty} className={cn("gap-2", empty && "opacity-60")}>
              <Check className="h-4 w-4" /> Save Signature
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
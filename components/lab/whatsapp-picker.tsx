"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Smartphone, Globe, Check, Send, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { playSound } from "@/lib/sounds"
import type { WhatsAppMode } from "@/lib/whatsapp"

export function WhatsAppPicker({
  phoneFull, preview, onPick, onCancel,
}: {
  phoneFull: string
  preview: string
  onPick: (mode: WhatsAppMode, remember: boolean) => void
  onCancel: () => void
}) {
  const [remember, setRemember] = useState(false)

  function pick(mode: WhatsAppMode) {
    playSound("click")
    onPick(mode, remember)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl ring-1 ring-border/60"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#25D366] to-[#128C7E] px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Send via WhatsApp</h3>
              <p className="text-xs text-white/80">Choose how to open WhatsApp</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#25D366]/15 text-[#128C7E]">
              <Send className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sending to</p>
              <p className="truncate font-mono text-sm font-semibold">+{phoneFull}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Message preview
            </p>
            <p className="line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-foreground/80">
              {preview}
            </p>
          </div>

          <div className="grid gap-2">
            <OptionButton
              icon={Smartphone}
              title="Open in WhatsApp App"
              subtitle="Uses the desktop or mobile app"
              tone="primary"
              onClick={() => pick("app")}
            />
            <OptionButton
              icon={Globe}
              title="Continue on WhatsApp Web"
              subtitle="Opens web.whatsapp.com in a new tab"
              tone="neutral"
              onClick={() => pick("web")}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-border/60 px-3 py-2.5 transition-colors hover:bg-accent/40">
            <span
              className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                remember ? "border-[#25D366] bg-[#25D366] text-white" : "border-input bg-background",
              )}
            >
              {remember && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="sr-only"
            />
            <span className="flex-1 text-xs text-muted-foreground">
              Don&apos;t ask again — remember my choice
            </span>
          </label>
        </div>
      </motion.div>
    </motion.div>
  )
}

function OptionButton({
  icon: Icon, title, subtitle, tone, onClick,
}: {
  icon: typeof Smartphone
  title: string
  subtitle: string
  tone: "primary" | "neutral"
  onClick: () => void
}) {
  const wrap = tone === "primary"
    ? "border-[#25D366]/40 bg-[#25D366]/5 hover:border-[#25D366] hover:bg-[#25D366]/10"
    : "border-border/60 hover:border-primary/40 hover:bg-accent/40"
  const iconWrap = tone === "primary"
    ? "bg-[#25D366] text-white shadow-md shadow-[#25D366]/30"
    : "bg-primary/10 text-primary"

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn("flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors", wrap)}
    >
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", iconWrap)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </motion.button>
  )
}
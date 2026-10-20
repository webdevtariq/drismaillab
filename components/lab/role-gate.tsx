"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ShieldCheck, User, ArrowLeft, ArrowRight, Lock, Eye, EyeOff,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { LabLogo } from "./lab-logo"
import { cn } from "@/lib/utils"
import { login, type Role } from "@/lib/session"
import { playSound, unlockAudio } from "@/lib/sounds"

const EASE = [0.16, 1, 0.3, 1] as const

export function LoginGate({ onLogin }: { onLogin: (role: Role) => void }) {
  const [role, setRole] = useState<Role | null>(null)
  const [pin, setPin] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isAdmin = role === "admin"

  // Auto-focus input when moving to the PIN/Password screen
  useEffect(() => {
    if (role) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [role])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!role) return

    // Operator needs exactly 4 digits. Admin needs at least 4 chars.
    if (!isAdmin && pin.length !== 4) {
      setShake((s) => s + 1)
      playSound("error")
      toast.error("Operator PIN must be exactly 4 digits")
      return
    }
    if (isAdmin && pin.length < 4) {
      setShake((s) => s + 1)
      playSound("error")
      toast.error("Password must be at least 4 characters")
      return
    }

    setBusy(true)
    try {
      await Promise.race([
        unlockAudio(),
        new Promise<void>((r) => setTimeout(r, 200)),
      ])
    } catch { /* ignore */ }

    const success = login(role, pin)

    if (!success) {
      setBusy(false)
      setPin("")
      setShake((s) => s + 1)
      playSound("error")
      toast.error("Incorrect credentials", { description: "Please try again." })
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    setTimeout(() => onLogin(role), 250)
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-background p-4">
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 15% 20%, color-mix(in oklch, var(--primary) 12%, transparent) 0%, transparent 45%),
            radial-gradient(circle at 85% 80%, color-mix(in oklch, var(--chart-2) 10%, transparent) 0%, transparent 45%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklch, var(--primary) 15%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative w-full max-w-[420px]"
      >
        <Card className="overflow-hidden rounded-[32px] border-border/50 bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
          
          {/* Header */}
          <div className="relative px-8 pt-10 pb-8 text-center">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
              className="relative mx-auto w-fit"
            >
              <LabLogo size={96} intro={true} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
              className="mt-6 font-serif text-2xl font-bold tracking-[0.2em] text-foreground"
            >
              DR ISMAIL LAB
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-primary"
            >
              Health Care Center
            </motion.p>
          </div>

          {/* Body */}
          <div className="px-8 pb-10">
            <AnimatePresence mode="wait">
              
              {/* ── STATE 1: ROLE SELECTION ── */}
              {!role && (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground">Welcome</h2>
                    <p className="text-sm text-muted-foreground">Select your access level</p>
                  </div>
                  
                  <div className="space-y-3">
                    <RoleCard
                      icon={User}
                      title="Operator"
                      subtitle="Registration, Results, Collection"
                      tone="blue"
                      onClick={() => { setRole("operator"); playSound("click") }}
                    />
                    <RoleCard
                      icon={ShieldCheck}
                      title="Administrator"
                      subtitle="Full system access & settings"
                      tone="amber"
                      onClick={() => { setRole("admin"); playSound("click") }}
                    />
                  </div>
                </motion.div>
              )}

              {/* ── STATE 2: PIN / PASSWORD ENTRY ── */}
              {role && (
                <motion.form
                  key="pin"
                  onSubmit={submit}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => { setRole(null); setPin(""); playSound("click") }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <Badge variant="secondary" className="gap-1.5 text-[10px] uppercase tracking-wider">
                      {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isAdmin ? "Admin" : "Operator"}
                    </Badge>
                  </div>

                  <div className="text-center">
                    <div className={cn(
                      "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
                      isAdmin ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                    )}>
                      <Lock className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {isAdmin ? "Administrator Access" : "Enter your PIN"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin ? "High-security password required" : "Quick access for staff"}
                    </p>
                  </div>

                  <motion.div
                    key={shake}
                    animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                    transition={{ duration: 0.35 }}
                    className="relative"
                  >
                    {isAdmin ? (
                      /* ── ADMIN: ALPHANUMERIC PASSWORD FIELD ── */
                      <div className="relative">
                        <Input
                          ref={inputRef}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          maxLength={32}
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="Enter Admin Password"
                          className="h-14 w-full border-2 border-border bg-background px-12 text-center text-lg font-medium tracking-[0.2em] placeholder:tracking-normal placeholder:text-muted-foreground/40 focus-visible:border-amber-500 focus-visible:shadow-[0_0_0_4px_color-mix(in_oklch,#F59E0B_15%,transparent)]"
                        />
                        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    ) : (
                      /* ── OPERATOR: 4-DIGIT PIN BOXES ── */
                      <div className="relative">
                        <div className="flex justify-center gap-3">
                          {[0, 1, 2, 3].map((i) => {
                            const filled = i < pin.length
                            const focused = i === pin.length && pin.length < 4
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300",
                                  filled
                                    ? "border-primary bg-primary/5"
                                    : focused
                                      ? "border-primary bg-background shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_15%,transparent)]"
                                      : "border-border bg-background"
                                )}
                              >
                                {filled && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="h-3.5 w-3.5 rounded-full bg-primary"
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Hidden Input capturing keystrokes */}
                        <input
                          ref={inputRef}
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={4}
                          value={pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                            setPin(val)
                            if (val.length > pin.length) playSound("click")
                          }}
                          className="absolute inset-0 h-full w-full opacity-0 cursor-text"
                        />
                      </div>
                    )}
                  </motion.div>

                  <Button
                    type="submit"
                    disabled={busy || (isAdmin ? pin.length < 4 : pin.length !== 4)}
                    className={cn(
                      "h-12 w-full rounded-xl text-base font-semibold shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100",
                      isAdmin 
                        ? "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600" 
                        : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
                    )}
                  >
                    {busy ? "Authenticating..." : (isAdmin ? "Secure Login" : "Unlock System")}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

function RoleCard({ icon: Icon, title, subtitle, tone, onClick }: { icon: any, title: string, subtitle: string, tone: "blue" | "amber", onClick: () => void }) {
  const isBlue = tone === "blue"
  
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 p-4 text-left transition-colors",
        isBlue ? "border-primary/20 hover:border-primary/50 hover:bg-primary/5" : "border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5"
      )}
    >
      <div className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110",
        isBlue ? "bg-primary text-primary-foreground" : "bg-amber-500 text-white"
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border bg-background transition-colors",
        isBlue ? "border-primary/20 text-primary group-hover:border-primary" : "border-amber-500/20 text-amber-500 group-hover:border-amber-500"
      )}>
        <ArrowRight className="h-4 w-4" />
      </div>
    </motion.button>
  )
}

export function RoleBadge({ role }: { role: Role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100">
        <ShieldCheck className="h-3 w-3" /> Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
      <User className="h-3 w-3" /> Operator
    </span>
  )
}
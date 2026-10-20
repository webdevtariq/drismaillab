"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { LabHeader, type View } from "@/components/lab/lab-header"
import { Dashboard } from "@/components/lab/dashboard"
import { RegistrationForm } from "@/components/lab/registration-form"
import { ResultEntry } from "@/components/lab/result-entry"
import { CollectionQueue } from "@/components/lab/collection-queue"
import { BatchEntry } from "@/components/lab/batch-entry"
import { PatientHistory } from "@/components/lab/patient-history"
import { BillingPage } from "@/components/lab/billing-page"
import { AuditLog } from "@/components/lab/audit-log"
import { SettingsPage } from "@/components/lab/settings-page"
import { ReportsPage } from "@/components/lab/reports-page"
import { ReportsArchive } from "@/components/lab/reports-archive"
import { SplashScreen } from "@/components/lab/splash-screen"
import { LoginGate } from "@/components/lab/role-gate"
import { initDB, verifyAdminPin, type Patient } from "@/lib/lab-db"
import { undo as undoAction, undoCount } from "@/lib/undo"
import { useSession, canAccess, logout as sessionLogout } from "@/lib/session"
import { playSound } from "@/lib/sounds"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Lock, KeyRound } from "lucide-react"

// 🔑 Force fresh login on every full page load / app launch.
if (typeof window !== "undefined") {
  try {
    sessionStorage.removeItem("DrIsmailLab_Session")
  } catch {
    /* ignore */
  }
}

const HISTORY_IDLE_MS = 90_000

export default function Page() {
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<View>("register")
  const [active, setActive] = useState<Patient | null>(null)
  const [historyUnlocked, setHistoryUnlocked] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const [forceLoggedIn, setForceLoggedIn] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { mounted, role, isLoggedIn, isAdmin } = useSession()

  const loggedIn = isLoggedIn || forceLoggedIn
  const effectiveRole = role ?? (forceLoggedIn ? "operator" : null)

  useEffect(() => {
    initDB()
    setReady(true)
  }, [])

  useEffect(() => {
    if (isLoggedIn && forceLoggedIn) setForceLoggedIn(false)
  }, [isLoggedIn, forceLoggedIn])

  useEffect(() => {
    if (!loggedIn) setSplashDone(false)
  }, [loggedIn])

  useEffect(() => {
    if (!effectiveRole) return
    if (!canAccess(effectiveRole, view)) {
      setView(effectiveRole === "admin" ? "dashboard" : "register")
    }
  }, [effectiveRole, view])

  useEffect(() => {
    if (effectiveRole === "admin") setView("dashboard")
    else if (effectiveRole === "operator") setView("register")
  }, [effectiveRole])

  useEffect(() => {
    if (view !== "history") setHistoryUnlocked(false)
  }, [view])

  useEffect(() => {
    if (view !== "history" || !historyUnlocked) return
    function lock() { setHistoryUnlocked(false) }
    function reset() {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(lock, HISTORY_IDLE_MS)
    }
    reset()
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [view, historyUnlocked])

  useEffect(() => {
    function onBlur() { if (view === "history") setHistoryUnlocked(false) }
    window.addEventListener("blur", onBlur)
    return () => window.removeEventListener("blur", onBlur)
  }, [view])

  useEffect(() => {
    if (!effectiveRole) return
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return

      if (e.key.toLowerCase() === "o" && e.shiftKey && isAdmin) {
        e.preventDefault()
        sessionLogout()
        setForceLoggedIn(false)
        playSound("click")
        toast.success("Switched to Operator", { description: "Enter a PIN to sign back in." })
        return
      }

      const map: Record<string, View> = {
        "1": "dashboard", "2": "register", "3": "entry", "4": "collection",
        "5": "batch", "6": "archives", "7": "history", "8": "billing", "9": "reports",
      }
      if (map[e.key]) {
        e.preventDefault()
        const target = map[e.key]
        if (canAccess(effectiveRole!, target)) setView(target)
        else toast.error("Access denied", { description: "This section is admin-only." })
        return
      }

      if (e.key === ",") {
        e.preventDefault()
        if (isAdmin) setView("settings")
        else toast.error("Access denied", { description: "Settings is admin-only." })
        return
      }

      if (e.key.toLowerCase() === "l" && e.shiftKey) {
        e.preventDefault()
        setHistoryUnlocked(false)
        return
      }

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        const count = undoCount()
        if (count === 0) { toast.info("Nothing to undo"); return }
        const label = undoAction()
        if (label) {
          toast.success(`Undone: ${label}`, { description: "Refreshing…" })
          setTimeout(() => window.location.reload(), 400)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [effectiveRole, isAdmin])

  function goEntry(p: Patient) { setActive(p); setView("entry") }
  function editFromHistory(p: Patient) { setActive(p); setView("entry") }

  if (!mounted) {
    return <div className="min-h-screen bg-background" />
  }

  if (!loggedIn) {
    return <LoginGate onLogin={() => setForceLoggedIn(true)} />
  }

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />
  }

  return (
    <div className="min-h-screen bg-background">
      <LabHeader view={view} onChange={setView} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {!ready ? (
          <LoadingSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {view === "dashboard"  && effectiveRole === "admin" && <Dashboard onNavigate={setView} />}
              {view === "register"   && <RegistrationForm onRegistered={goEntry} />}
              {view === "entry"      && <ResultEntry patient={active} onPickPatient={setActive} />}
              {view === "collection" && <CollectionQueue onEdit={goEntry} />}
              {view === "batch"      && <BatchEntry />}
              {view === "archives"   && <ReportsArchive onEdit={editFromHistory} />}
              {view === "history" && effectiveRole === "admin" &&
                (historyUnlocked ? (
                  <PatientHistory onEdit={editFromHistory} />
                ) : (
                  <HistoryPinGate onUnlock={() => setHistoryUnlocked(true)} />
                ))}
              {view === "billing"  && effectiveRole === "admin" && <BillingPage />}
              {view === "reports"  && <ReportsPage />}
              {view === "audit"    && <AuditLog />}
              {view === "settings" && effectiveRole === "admin" && <SettingsPage />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        DR ISMAIL LAB — Health Care Center • Ctrl+1…9 tabs • Ctrl+Z undo • Ctrl+, settings (admin) • Ctrl+Shift+O switch to operator
      </footer>
    </div>
  )
}

/* ─── Second PIN gate for History ─── */

function HistoryPinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("")
  const [shake, setShake] = useState(0)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (verifyAdminPin(pin)) {
      playSound("success")
      onUnlock()
    } else {
      setShake((s) => s + 1)
      playSound("error")
      toast.error("Wrong PIN or password")
      setPin("")
    }
  }

  return (
    <div className="grid place-items-center py-16">
      <motion.div
        key={shake}
        animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-[360px] max-w-[92vw] border-border/70 p-7 text-center shadow-lg">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Confirm to open History</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Enter the admin PIN or password to view patient history.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <Input
              autoFocus
              type="password"
              maxLength={32}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter admin PIN or password"
              className="text-center text-lg tracking-widest font-semibold"
            />
            <Button type="submit" className="w-full gap-2">
              <KeyRound className="h-4 w-4" /> Unlock
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4 rounded-2xl border p-6">
        <div className="shimmer h-8 w-48 rounded-md" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-10 rounded-md" />
          ))}
        </div>
        <div className="shimmer h-11 rounded-md" />
      </div>
      <div className="shimmer h-64 rounded-2xl" />
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  UserPlus, ClipboardList, History, ScrollText, Settings, BarChart3, Layers,
  Wallet, LayoutDashboard, TestTube, LogOut, FolderOpen,
} from "lucide-react"
import { LiveClock } from "./live-clock"
import { DILogo } from "./di-logo"
import { cn } from "@/lib/utils"
import { getStatusCounts } from "@/lib/lab-db"
import { useSession, canAccess, type View } from "@/lib/session"
import { RoleBadge } from "@/components/lab/role-gate"
import { playSound } from "@/lib/sounds"

export type { View }

const TABS: { id: View; label: string; icon: typeof UserPlus }[] = [
  { id: "dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { id: "register",   label: "Register",     icon: UserPlus },
  { id: "entry",      label: "Result Entry", icon: ClipboardList },
  { id: "collection", label: "Collection",   icon: TestTube },
  { id: "batch",      label: "Batch Entry",  icon: Layers },
  { id: "archives",   label: "Archives",     icon: FolderOpen },
  { id: "history",    label: "History",      icon: History },
  { id: "billing",    label: "Billing",      icon: Wallet },
  { id: "reports",    label: "Reports",      icon: BarChart3 },
  { id: "audit",      label: "Audit Log",    icon: ScrollText },
]

export function LabHeader({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const { role, logout, isAdmin } = useSession()
  const [collectionBadge, setCollectionBadge] = useState(0)

  useEffect(() => {
    function refresh() {
      try {
        const c = getStatusCounts()
        setCollectionBadge(c.registered + c.collected + c["in-lab"])
      } catch { setCollectionBadge(0) }
    }
    refresh()
    const t = setInterval(refresh, 30_000)
    return () => clearInterval(t)
  }, [view])

  if (!role) return null

  const visibleTabs = TABS.filter((t) => canAccess(role, t.id))

  function handleLogout() {
    logout()
    playSound("click")
    toast.success("Logged out")
  }

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-chart-2 text-white shadow-lg shadow-primary/20">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand — DI monogram */}
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
          >
            <DILogo size={48} accent="#67E8F9" />
          </motion.div>
          <div>
            <h1 className="font-serif text-xl font-bold leading-none tracking-wide sm:text-2xl">
              DR ISMAIL LAB
            </h1>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/75">
              Health Care Center
            </p>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <RoleBadge role={role} />
          <div className="hidden sm:block"><LiveClock /></div>
          {isAdmin && (
            <button
              type="button"
              aria-label="Settings"
              title="Settings (Ctrl+,)"
              onClick={() => { playSound("click"); onChange("settings") }}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border transition-colors",
                view === "settings"
                  ? "border-white/50 bg-white/25 text-white"
                  : "border-white/25 bg-white/10 text-white hover:bg-white/20",
              )}
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            onClick={handleLogout}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="mx-auto max-w-7xl px-2 sm:px-6">
        <div className="no-scrollbar flex gap-1 overflow-x-auto pb-0">
          {visibleTabs.map((t) => {
            const active = view === t.id
            const showBadge = t.id === "collection" && collectionBadge > 0
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-primary" : "text-white/80 hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-t-xl bg-background"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <t.icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{t.label}</span>
                {showBadge && (
                  <span
                    className={cn(
                      "relative z-10 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                      active ? "bg-primary text-primary-foreground" : "bg-white/25 text-white",
                    )}
                  >
                    {collectionBadge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
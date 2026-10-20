"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users, ClipboardList, CheckCircle2, TrendingUp, Clock, ArrowRight,
  Activity, Sparkles, Zap, FileText, Wallet, ChevronRight, Circle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAllPatients, getPatientReports, type Patient } from "@/lib/lab-db"
import type { View } from "@/components/lab/lab-header"

function Counter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = display
    function step(ts: number) {
      const t = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <>{display.toLocaleString()}</>
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  if (h < 21) return "Good evening"
  return "Working late"
}

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const stats = useMemo(() => {
    const all = getAllPatients()
    const today = new Date().toISOString().slice(0, 10)
    const todaysVisits = all.filter((p) => p.date === today)
    const uniqueToday = new Set(todaysVisits.map((p) => p.mrn)).size

    let pending = 0
    let ready = 0
    const pendingVisits: Patient[] = []

    for (const v of todaysVisits) {
      const reports = getPatientReports(v.id)
      const hasValues = reports.some((r) =>
        Object.values(r.results).some((x) => (x ?? "").trim() !== ""),
      )
      if (hasValues) ready++
      else {
        pending++
        pendingVisits.push(v)
      }
    }

    // Also include visits from the previous 7 days that still have no results
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenIso = sevenDaysAgo.toISOString().slice(0, 10)
    for (const v of all) {
      if (v.date >= today) continue
      if (v.date < sevenIso) continue
      const reports = getPatientReports(v.id)
      const hasValues = reports.some((r) =>
        Object.values(r.results).some((x) => (x ?? "").trim() !== ""),
      )
      if (!hasValues) pendingVisits.push(v)
    }
    pendingVisits.sort((a, b) => a.createdAt - b.createdAt)

    const recent = all.slice(0, 6)

    const days: { day: string; count: number; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const count = all.filter((p) => p.date === iso).length
      days.push({
        day: iso,
        count,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 3),
      })
    }

    return {
      total: all.length,
      today: todaysVisits.length,
      uniqueToday,
      pending,
      ready,
      recent,
      days,
      maxDay: Math.max(...days.map((d) => d.count), 1),
      pendingVisits,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-chart-2 p-8 text-white shadow-xl shadow-primary/20"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="float-slow absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="float-med absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/8 blur-2xl" />
          <div className="float-fast absolute left-1/2 top-1/3 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-white/70"
            >
              <Sparkles className="h-3.5 w-3.5" /> {today}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Laboratory Overview
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-2 text-sm text-white/80"
            >
              {stats.today > 0
                ? `Real-time status · ${stats.today} patient${stats.today === 1 ? "" : "s"} today · ${stats.pending} pending · ${stats.ready} ready`
                : "Real-time status · No patients registered yet today"}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex gap-2"
          >
            <Button
              onClick={() => onNavigate("register")}
              className="gap-2 bg-white text-primary hover:bg-white/90"
            >
              <Users className="h-4 w-4" /> New Patient
            </Button>
            <Button
              onClick={() => onNavigate("batch")}
              variant="outline"
              className="gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              <Zap className="h-4 w-4" /> Batch Entry
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Users}        label="Total Patients"    value={stats.total}   tone="blue"    delay={0.05} />
        <KPI icon={ClipboardList} label="Today's Visits"    value={stats.today}   tone="violet"  delay={0.15} />
        <KPI icon={Clock}        label="Pending Reports"   value={stats.pending} tone="amber"   delay={0.25} />
        <KPI icon={CheckCircle2} label="Ready for Pickup"  value={stats.ready}   tone="emerald" delay={0.35} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2"
        >
          <Card className="relative overflow-hidden rounded-2xl border-border/60 p-5 shadow-sm">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-primary/10 to-chart-2/5 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-sm font-semibold tracking-tight">Weekly Activity</h3>
                <span className="text-[11px] text-muted-foreground">
                  {stats.days.reduce((s, d) => s + d.count, 0)} visits this week
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-600">
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                />
                Live
              </div>
            </div>

            <div className="relative mt-4 h-32">
              <svg viewBox="0 0 700 130" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="weeklyArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="weeklyLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={20 + i * 30}
                    x2="700"
                    y2={20 + i * 30}
                    stroke="currentColor"
                    strokeOpacity="0.06"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    className="text-foreground"
                  />
                ))}

                {(() => {
                  const pts = stats.days.map((d, i) => {
                    const x = 20 + (i / (stats.days.length - 1)) * 660
                    const y = 115 - (d.count / stats.maxDay) * 90
                    return { x, y, ...d }
                  })
                  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
                  const areaPath = `${linePath} L 680 120 L 20 120 Z`

                  return (
                    <g className="text-primary">
                      <motion.path
                        d={areaPath}
                        fill="url(#weeklyArea)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1.4 }}
                      />
                      <motion.path
                        d={linePath}
                        fill="none"
                        stroke="url(#weeklyLine)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                      {pts.map((p, i) => (
                        <motion.g key={p.day}>
                          <motion.circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill="white"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 1.0 + i * 0.08, type: "spring", stiffness: 300, damping: 18 }}
                            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                          />
                          {p.count > 0 && (
                            <motion.text
                              x={p.x}
                              y={p.y - 12}
                              textAnchor="middle"
                              className="fill-foreground text-[10px] font-bold"
                              initial={{ opacity: 0, y: p.y - 4 }}
                              animate={{ opacity: 1, y: p.y - 12 }}
                              transition={{ duration: 0.4, delay: 1.2 + i * 0.08 }}
                            >
                              {p.count}
                            </motion.text>
                          )}
                        </motion.g>
                      ))}
                    </g>
                  )
                })()}
              </svg>
            </div>

            <div className="mt-2 flex justify-between px-[8px]">
              {stats.days.map((d, i) => {
                const isToday = i === stats.days.length - 1
                return (
                  <div
                    key={d.day}
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors",
                      isToday ? "text-primary" : "text-muted-foreground/70",
                    )}
                  >
                    {d.label}
                    {isToday && <span className="ml-1 text-[8px]">●</span>}
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="overflow-hidden rounded-2xl border-border/60 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">Quick Actions</h3>
                <p className="text-xs text-muted-foreground">Jump to a task</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <QuickAction icon={Users}         label="Register Patient" sub="Add new visit"       onClick={() => onNavigate("register")} delay={0.1} />
              <QuickAction icon={ClipboardList} label="Enter Results"    sub="Fill report data"    onClick={() => onNavigate("entry")}    delay={0.15} />
              <QuickAction icon={Zap}           label="Batch Entry"      sub="Multiple patients"   onClick={() => onNavigate("batch")}    delay={0.2} />
              <QuickAction icon={FileText}      label="Patient History"  sub="Search & reprint"    onClick={() => onNavigate("history")}  delay={0.25} />
              <QuickAction icon={Wallet}        label="Billing"          sub="Payments & receipts" onClick={() => onNavigate("billing")}  delay={0.3} />
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">Recent Registrations</h3>
                <p className="text-xs text-muted-foreground">Last 6 patients</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("history")}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {stats.recent.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No patients registered yet.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {stats.recent.map((p, i) => (
                  <RecentRow key={p.id} patient={p} index={i} onClick={() => onNavigate("entry")} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">Pending Reports</h3>
                <p className="text-xs text-muted-foreground">Visits with no results entered (last 7 days)</p>
              </div>
            </div>
            <Badge
              className={cn(
                "gap-1 text-[10px]",
                stats.pendingVisits.length === 0
                  ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"
                  : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
              )}
            >
              {stats.pendingVisits.length === 0 ? "All caught up ✓" : `${stats.pendingVisits.length} waiting`}
            </Badge>
          </div>

          {stats.pendingVisits.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Every visit in the last 7 days has results entered.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {stats.pendingVisits.slice(0, 12).map((p, i) => {
                const daysOld = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(p.date + "T00:00:00").getTime()) / 86400000),
                )
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => onNavigate("entry")}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.8 + i * 0.03 }}
                    className="flex w-full items-center gap-4 px-6 py-3 text-left transition-colors hover:bg-amber-500/5"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 font-mono text-[10px] font-bold text-amber-700">
                      #{p.labNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.mrn} · {p.date} · Dr. {p.doctor || "—"}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        daysOld >= 3 && "bg-destructive/15 text-destructive hover:bg-destructive/15",
                        daysOld > 0 && daysOld < 3 && "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
                      )}
                    >
                      {daysOld === 0 ? "today" : daysOld === 1 ? "1 day" : `${daysOld} days`}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </motion.button>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-5 py-3 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block h-2 w-2 rounded-full bg-emerald-500"
          />
          <span className="font-medium">System Online</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Circle className="h-2 w-2 fill-primary text-primary" /> Ctrl+1…7 tabs
          </span>
          <span>Auto-refreshing every 30s</span>
        </div>
      </motion.div>
    </div>
  )
}

function KPI({
  icon: Icon, label, value, tone, delay,
}: {
  icon: typeof Users
  label: string
  value: number
  tone: "blue" | "violet" | "amber" | "emerald"
  delay: number
}) {
  const tones = {
    blue:    { bg: "from-blue-500 to-blue-600",    dot: "bg-blue-500" },
    violet:  { bg: "from-violet-500 to-violet-600",dot: "bg-violet-500" },
    amber:   { bg: "from-amber-500 to-amber-600",  dot: "bg-amber-500" },
    emerald: { bg: "from-emerald-500 to-emerald-600", dot: "bg-emerald-500" },
  }[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <Card className="relative overflow-hidden rounded-2xl border-border/60 p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className={cn("absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-10", tones.bg)} />
        <div className="flex items-center justify-between">
          <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", tones.bg)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className={cn("h-2 w-2 rounded-full", tones.dot)} />
        </div>
        <div className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold tabular-nums text-foreground">
          <Counter value={value} />
        </div>
      </Card>
    </motion.div>
  )
}

function QuickAction({
  icon: Icon, label, sub, onClick, delay,
}: {
  icon: typeof Users
  label: string
  sub: string
  onClick: () => void
  delay: number
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background px-3.5 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </motion.button>
  )
}

function RecentRow({
  patient, index, onClick,
}: {
  patient: Patient
  index: number
  onClick: () => void
}) {
  const reports = getPatientReports(patient.id)
  const hasValues = reports.some((r) =>
    Object.values(r.results).some((x) => (x ?? "").trim() !== ""),
  )

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.7 + index * 0.06 }}
      whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
      className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 font-mono text-[10px] font-bold text-white shadow-sm">
        #{patient.labNumber}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{patient.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{patient.mrn}</span>
          <span>·</span>
          <span>{patient.age || "—"} · {patient.gender}</span>
          <span>·</span>
          <span>Dr. {patient.doctor || "—"}</span>
        </div>
      </div>
      <div className="hidden text-xs text-muted-foreground sm:block">{patient.date}</div>
      <Badge
        className={cn(
          "gap-1 text-[10px]",
          hasValues
            ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"
            : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
        )}
      >
        {hasValues ? (
          <>
            <CheckCircle2 className="h-3 w-3" /> Ready
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" /> Pending
          </>
        )}
      </Badge>
    </motion.button>
  )
}
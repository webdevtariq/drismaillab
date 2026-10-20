"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  BarChart3, Users, ClipboardList, FlaskConical, Crown,
  Download, CalendarRange, Stethoscope, Activity, TrendingUp,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { computeStats, rangeFor, statsToCSV, type RangePreset } from "@/lib/stats"
import { AnimatedNumber } from "@/components/lab/animated-number"
import { playSound } from "@/lib/sounds"

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
]

export function ReportsPage() {
  const [preset, setPreset] = useState<RangePreset>("month")
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10))

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo }
    return rangeFor(preset)
  }, [preset, customFrom, customTo])

  const stats = useMemo(() => computeStats(range), [range])

  function exportCSV() {
    const csv = statsToCSV(stats, range)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `drismail-report-${range.from}_to_${range.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV downloaded")
    playSound("success")
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-white shadow-lg shadow-primary/25">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h2>
            <p className="text-sm text-muted-foreground">
              {range.from} → {range.to}
            </p>
          </div>
        </div>

        <Button onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPreset(p.id); playSound("click") }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                preset === p.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}

          {preset === "custom" && (
            <div className="ml-auto flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 w-[140px]"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 w-[140px]"
              />
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Users}         label="Unique Patients" value={stats.kpi.uniquePatients} tone="blue" />
        <KPI icon={ClipboardList} label="Visits"          value={stats.kpi.visits}         tone="violet" />
        <KPI icon={FlaskConical}  label="Tests Performed" value={stats.kpi.tests}          tone="emerald" />
        <KPI icon={Crown}         label="Top Doctor"      value={stats.kpi.topDoctor}      tone="amber" small={stats.kpi.topDoctor.length > 14} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold tracking-tight">
              <Stethoscope className="h-4 w-4 text-primary" /> Top Referring Doctors
            </h3>
            <Badge variant="secondary">{stats.doctors.length}</Badge>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {stats.doctors.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No referrals in this period.</p>
            )}
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Doctor</th>
                  <th className="px-2 py-2 text-right font-medium">Visits</th>
                  <th className="px-5 py-2 text-right font-medium">Patients</th>
                </tr>
              </thead>
              <tbody>
                {stats.doctors.slice(0, 20).map((d, i) => (
                  <tr key={d.doctor} className="border-t border-border/60">
                    <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-2.5 font-medium">{d.doctor}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{d.visits}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{d.patients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold tracking-tight">
              <TrendingUp className="h-4 w-4 text-primary" /> Top Tests / Panels
            </h3>
            <Badge variant="secondary">{stats.tests.length}</Badge>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {stats.tests.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No tests in this period.</p>
            )}
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Panel</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 text-right font-medium">Ordered</th>
                </tr>
              </thead>
              <tbody>
                {stats.tests.slice(0, 20).map((t, i) => (
                  <tr key={t.panel + i} className="border-t border-border/60">
                    <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-2.5 font-medium">{t.panel}</td>
                    <td className="px-2 py-2.5">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-primary">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold tracking-tight">
            <Activity className="h-4 w-4 text-primary" /> Daily Breakdown
          </h3>
          <Badge variant="secondary">{stats.days.length} day{stats.days.length === 1 ? "" : "s"}</Badge>
        </div>

        {stats.days.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No activity in this period.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 text-right font-medium">Visits</th>
                  <th className="px-2 py-2 text-right font-medium">Unique Patients</th>
                  <th className="px-5 py-2 text-right font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {stats.days.map((d) => {
                  const max = Math.max(...stats.days.map((x) => x.visits), 1)
                  const pct = (d.visits / max) * 100
                  return (
                    <tr key={d.date} className="border-t border-border/60">
                      <td className="px-5 py-2.5 font-medium tabular-nums">
                        {new Date(d.date).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-semibold">{d.visits}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{d.patients}</td>
                      <td className="px-5 py-2.5">
                        <div className="ml-auto h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function KPI({
  icon: Icon, label, value, tone, small,
}: {
  icon: typeof Users
  label: string
  value: string | number
  tone: "blue" | "violet" | "emerald" | "amber"
  small?: boolean
}) {
  const tones: Record<typeof tone, string> = {
    blue: "from-blue-500 to-blue-600",
    violet: "from-violet-500 to-violet-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden rounded-2xl border-border/60 p-5 shadow-sm">
        <div className={cn("absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-10", tones[tone])} />
        <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("mt-1 font-bold text-foreground", small ? "text-lg" : "text-3xl tabular-nums")}>
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </div>
      </Card>
    </motion.div>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  Search, ChevronRight, Check, ClipboardCheck, Beaker, TestTube,
  FileCheck2, Send, Users, ArrowRight, RefreshCw,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  getAllPatients, getPatientsByStatus, getStatusCounts, updatePatientStatus,
  updateManyPatientStatus, getPatientReports,
  STATUS_ORDER, STATUS_LABELS, nextStatus,
  type Patient, type VisitStatus,
} from "@/lib/lab-db"
import { playSound } from "@/lib/sounds"

const STATUS_ICONS: Record<VisitStatus, typeof Beaker> = {
  "registered": Users,
  "collected":  TestTube,
  "in-lab":     Beaker,
  "ready":      ClipboardCheck,
  "reported":   Send,
}

const STATUS_STYLES: Record<VisitStatus, { bar: string; chip: string; dot: string }> = {
  "registered": { bar: "from-blue-500 to-blue-600",     chip: "bg-blue-500/15 text-blue-700",     dot: "bg-blue-500" },
  "collected":  { bar: "from-violet-500 to-violet-600", chip: "bg-violet-500/15 text-violet-700", dot: "bg-violet-500" },
  "in-lab":     { bar: "from-cyan-500 to-cyan-600",     chip: "bg-cyan-500/15 text-cyan-700",     dot: "bg-cyan-500" },
  "ready":      { bar: "from-amber-500 to-amber-600",   chip: "bg-amber-500/15 text-amber-700",   dot: "bg-amber-500" },
  "reported":   { bar: "from-emerald-500 to-emerald-600", chip: "bg-emerald-500/15 text-emerald-700", dot: "bg-emerald-500" },
}

export function CollectionQueue({ onEdit }: { onEdit?: (p: Patient) => void }) {
  const [active, setActive] = useState<VisitStatus>("registered")
  const [q, setQ] = useState("")
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<"today" | "all">("today")

  const today = new Date().toISOString().slice(0, 10)

  const counts = useMemo(() => getStatusCounts(), [tick])

  const list = useMemo(() => {
    let rows = getPatientsByStatus(active)
    if (scope === "today") rows = rows.filter((p) => p.date === today)
    const t = q.trim().toLowerCase()
    if (t) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.labNumber.includes(t) ||
          p.mrn.toLowerCase().includes(t),
      )
    }
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, q, scope, tick])

  // Reset selection when tab changes
  useEffect(() => { setSelected(new Set()) }, [active])

  function refresh() { setTick((n) => n + 1) }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(on: boolean) {
    if (on) setSelected(new Set(list.map((p) => p.id)))
    else setSelected(new Set())
  }

  function advance(p: Patient) {
    const next = nextStatus(p.status ?? "registered")
    updatePatientStatus(p.id, next)
    toast.success(`${p.name} → ${STATUS_LABELS[next]}`)
    playSound("success")
    refresh()
  }

  function advanceSelected() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    updateManyPatientStatus(ids, nextStatus(active))
    toast.success(`Advanced ${ids.length} visit(s) to ${STATUS_LABELS[nextStatus(active)]}`)
    playSound("success")
    setSelected(new Set())
    refresh()
  }

  const allVisibleSelected = list.length > 0 && list.every((p) => selected.has(p.id))
  const activeStyle = STATUS_STYLES[active]
  const nextLabel = STATUS_LABELS[nextStatus(active)]

  return (
    <div className="space-y-4">
      {/* Stage tabs */}
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5">
          {STATUS_ORDER.map((s) => {
            const isActive = active === s
            const Icon = STATUS_ICONS[s]
            const style = STATUS_STYLES[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => { setActive(s); playSound("click") }}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/[0.06] shadow-md"
                    : "border-border/60 hover:border-primary/40 hover:bg-accent/30",
                )}
              >
                <div className={cn(
                  "grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                  style.bar,
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {STATUS_LABELS[s]}
                  </div>
                  <div className="mt-0.5 text-lg font-bold tabular-nums leading-none">
                    {counts[s]}
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="collection-tab"
                    className="absolute inset-0 rounded-xl ring-2 ring-primary/40"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Filter bar */}
      <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-border/60 p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, MRN, or lab number"
            className="pl-9"
          />
        </div>

        <div className="flex rounded-xl border border-border/60 p-1">
          {(["today", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                scope === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "today" ? "Today" : "All"}
            </button>
          ))}
        </div>

        <Badge variant="secondary" className="gap-1.5">
          <Users className="h-3.5 w-3.5" /> {list.length}
        </Badge>

        <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5 bg-transparent">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={(v) => toggleAll(Boolean(v))}
            disabled={list.length === 0}
          />
          Select all
        </label>
      </Card>

      {/* List */}
      {list.length === 0 ? (
        <Card className="grid place-items-center rounded-2xl border-dashed py-16 text-center">
          <div className={cn("mb-3 grid h-14 w-14 place-items-center rounded-2xl", activeStyle.chip)}>
            {(() => {
              const Icon = STATUS_ICONS[active]
              return <Icon className="h-6 w-6" />
            })()}
          </div>
          <p className="font-medium">Nothing in {STATUS_LABELS[active]}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {scope === "today" ? "Try switching to All." : "This queue is empty."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="divide-y divide-border/60">
            <AnimatePresence initial={false}>
              {list.map((p, i) => {
                const isSelected = selected.has(p.id)
                const reports = getPatientReports(p.id)
                const hasResults = reports.some((r) =>
                  Object.values(r.results).some((x) => (x ?? "").trim() !== ""),
                )
                const s = p.status ?? "registered"
                const style = STATUS_STYLES[s]
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
                      isSelected && "bg-primary/[0.04]",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(p.id)}
                      tabIndex={-1}
                    />

                    <span className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-[10px] font-bold text-white shadow-sm",
                      `bg-gradient-to-br ${style.bar}`,
                    )}>
                      #{p.labNumber}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">{p.name}</span>
                        <Badge variant="secondary" className="font-mono text-[10px] text-primary">
                          {p.mrn}
                        </Badge>
                        {hasResults && s !== "reported" && (
                          <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 text-[10px]">
                            results entered
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{p.age || "-"} · {p.gender}</span>
                        <span>·</span>
                        <span>Dr. {p.doctor || "—"}</span>
                        <span>·</span>
                        <span>{p.date}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={s === "reported" ? "outline" : "default"}
                      onClick={() => advance(p)}
                      disabled={s === "reported"}
                      className={cn(
                        "shrink-0 gap-1.5",
                        s === "reported" && "bg-transparent opacity-50",
                      )}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {s === "reported" ? "Done" : `Mark ${nextLabel}`}
                      </span>
                    </Button>

                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(p)}
                        className="shrink-0 gap-1.5 text-muted-foreground"
                      >
                        Open
                      </Button>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Sticky bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/30 bg-primary/[0.06] backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                {selected.size} selected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Advance all to <b>{nextLabel}</b>?
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set())} className="bg-transparent">
                  Clear
                </Button>
                <Button size="sm" onClick={advanceSelected} className="gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5" /> Advance {selected.size}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
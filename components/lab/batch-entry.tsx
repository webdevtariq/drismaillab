"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  Search, ArrowLeft, Users, Check, Save, ChevronDown, Printer,
  FileDown, ClipboardList, LayoutList,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  getAllPatients, getPatientReports, saveReport, logAction, type Patient,
} from "@/lib/lab-db"
import { PANELS, rangeFor, evaluate } from "@/lib/test-panels"
import { printReport, exportPDF } from "@/lib/report"

type Stage = "pick" | "enter"

interface BatchItem {
  patient: Patient
  selectedPanels: string[]
  results: Record<string, string>
  reportId?: string
  saved: boolean
  expanded: boolean
  busy: boolean
}

export function BatchEntry() {
  const [stage, setStage] = useState<Stage>("pick")
  const [q, setQ] = useState("")
  const [scope, setScope] = useState<"today" | "all">("today")
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [items, setItems] = useState<BatchItem[]>([])

  const allPatients = useMemo(() => getAllPatients(), [stage, items.length])
  const today = new Date().toISOString().slice(0, 10)

  const visible = useMemo(() => {
    let list = allPatients
    if (scope === "today") list = list.filter((p) => p.date === today)
    const t = q.trim().toLowerCase()
    if (t) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.labNumber.includes(t) ||
          p.mrn.toLowerCase().includes(t),
      )
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPatients, scope, q])

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function startBatch() {
    const picked = visible.filter((p) => checked.has(p.id))
    if (picked.length === 0) {
      toast.error("Select at least one patient")
      return
    }
    if (picked.length > 12) {
      toast.error("Maximum 12 patients per batch")
      return
    }
    const newItems: BatchItem[] = picked.map((p) => {
      const existing = getPatientReports(p.id)[0]
      const savedPanels = (existing?.panels ?? []).filter((id) => !id.startsWith("cbc-extra:"))
      return {
        patient: p,
        selectedPanels: savedPanels.length ? savedPanels : ["cbc"],
        results: existing?.results ?? {},
        reportId: existing?.id,
        saved: Boolean(existing),
        expanded: true,
        busy: false,
      }
    })
    setItems(newItems)
    setStage("enter")
  }

  function backToPick() {
    setStage("pick")
    setChecked(new Set())
    setItems([])
  }

  function updateItem(idx: number, patch: Partial<BatchItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function togglePanel(idx: number, panelId: string, on: boolean) {
    if (panelId === "cbc") return
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it
        const next = on
          ? Array.from(new Set([...it.selectedPanels, panelId]))
          : it.selectedPanels.filter((id) => id !== panelId)
        return { ...it, selectedPanels: next }
      }),
    )
  }

  function setResult(idx: number, key: string, val: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, results: { ...it.results, [key]: val } } : it)),
    )
  }

  function saveOne(idx: number, silent = false): boolean {
    const item = items[idx]
    if (item.selectedPanels.length === 0) {
      if (!silent) toast.error("Select at least one panel")
      return false
    }
    const saved = saveReport({
      patientId: item.patient.id,
      labNumber: item.patient.labNumber,
      panels: item.selectedPanels,
      results: item.results,
      id: item.reportId,
    })
    updateItem(idx, { reportId: saved.id, saved: true })
    logAction("SAVE", `Batch saved report for ${item.patient.name} (Lab #${item.patient.labNumber})`)
    if (!silent) toast.success(`Saved ${item.patient.name}`)
    return true
  }

  function saveAll() {
    let count = 0
    items.forEach((_, idx) => {
      if (!items[idx].saved && saveOne(idx, true)) count++
    })
    if (count > 0) toast.success(`Saved ${count} report${count === 1 ? "" : "s"}`)
    else toast.info("Nothing new to save")
  }

  function printOne(idx: number) {
    const item = items[idx]
    if (item.selectedPanels.length === 0) return toast.error("Select at least one panel")
    saveOne(idx, true)
    printReport(item.patient, [{
      id: item.reportId ?? "tmp",
      patientId: item.patient.id,
      labNumber: item.patient.labNumber,
      panels: item.selectedPanels,
      results: item.results,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])
    logAction("PRINT", `Batch printed ${item.patient.name} (Lab #${item.patient.labNumber})`)
  }

  async function pdfOne(idx: number) {
    const item = items[idx]
    if (item.selectedPanels.length === 0) return toast.error("Select at least one panel")
    saveOne(idx, true)
    updateItem(idx, { busy: true })
    try {
      await exportPDF(item.patient, [{
        id: item.reportId ?? "tmp",
        patientId: item.patient.id,
        labNumber: item.patient.labNumber,
        panels: item.selectedPanels,
        results: item.results,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }])
      logAction("PDF", `Batch exported PDF for ${item.patient.name} (Lab #${item.patient.labNumber})`)
      toast.success("PDF downloaded")
    } catch {
      toast.error("Could not generate PDF")
    } finally {
      updateItem(idx, { busy: false })
    }
  }

  /* ── STAGE 1 — Pick patients ── */
  if (stage === "pick") {
    return (
      <div className="space-y-4 pb-24">
        <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-border/60 p-4 shadow-sm">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, MRN or lab number"
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
                {s === "today" ? "Today" : "All patients"}
              </button>
            ))}
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> {visible.length}
          </Badge>
        </Card>

        {visible.length === 0 && (
          <Card className="grid place-items-center rounded-2xl border-dashed py-16 text-center text-muted-foreground">
            {scope === "today"
              ? "No patients registered today. Switch to \"All patients\"."
              : "No patients match the current search."}
          </Card>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map((p) => {
            const reports = getPatientReports(p.id)
            const on = checked.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleCheck(p.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-accent/30",
                  on && "border-primary/60 ring-1 ring-primary/25 bg-primary/[0.03]",
                )}
              >
                <Checkbox checked={on} onCheckedChange={() => toggleCheck(p.id)} />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono text-[10px] font-bold text-primary">
                  #{p.labNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.mrn} · {p.age || "-"} · {p.gender}
                  </span>
                </span>
                {reports.length > 0 ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                    ✓ saved
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                    pending
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Sticky footer */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="flex-1 text-sm text-muted-foreground">
              {checked.size} selected {checked.size > 0 && `· max 12 per batch`}
            </span>
            <Button onClick={startBatch} disabled={checked.size === 0} className="gap-2">
              <ClipboardList className="h-4 w-4" /> Start Batch ({checked.size})
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ── STAGE 2 — Enter results ── */
  const savedCount = items.filter((it) => it.saved).length

  return (
    <div className="space-y-4 pb-24">
      <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-border/60 p-4 shadow-sm">
        <Button variant="outline" size="sm" onClick={backToPick} className="gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <LayoutList className="h-4 w-4 text-primary" />
          <span className="font-medium">Batch of {items.length}</span>
        </div>
        <Badge variant="secondary" className="ml-auto gap-1.5">
          <Check className="h-3.5 w-3.5" /> {savedCount}/{items.length} saved
        </Badge>
      </Card>

      <div className="space-y-4">
        {items.map((item, idx) => {
          const activePanels = PANELS.filter((p) => item.selectedPanels.includes(p.id))
          const totalFields = activePanels.reduce((n, p) => n + p.tests.length, 0)
          const filled = activePanels.reduce(
            (n, p) =>
              n + p.tests.filter((t) => (item.results[`${p.id}:${t.id}`] ?? "").trim() !== "").length,
            0,
          )
          const pct = totalFields ? Math.round((filled / totalFields) * 100) : 0

          return (
            <motion.div key={item.patient.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={cn(
                  "overflow-hidden rounded-2xl border-border/60 shadow-sm",
                  item.saved && "border-emerald-500/40",
                )}
              >
                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-primary/8 to-transparent p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">
                    #{item.patient.labNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.patient.name}</span>
                      <Badge variant="secondary" className="font-mono text-[10px] text-primary">
                        {item.patient.mrn}
                      </Badge>
                      {item.saved && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                          ✓ saved
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.patient.age || "-"} · {item.patient.gender} · Dr. {item.patient.doctor || "—"} · {item.patient.date}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {filled}/{totalFields}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateItem(idx, { expanded: !item.expanded })}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 text-muted-foreground hover:bg-accent"
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", item.expanded && "rotate-180")}
                    />
                  </button>
                </div>

                {/* Progress */}
                <div className="h-1 overflow-hidden bg-muted">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-chart-2"
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {item.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className="space-y-4 border-t border-border/60 p-4">
                        {/* Panel pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {PANELS.map((p) => {
                            const on = item.selectedPanels.includes(p.id)
                            if (p.id === "cbc") {
                              return (
                                <span
                                  key={p.id}
                                  className="rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                                >
                                  ✓ CBC
                                </span>
                              )
                            }
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePanel(idx, p.id, !on)}
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                  on
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                )}
                              >
                                {p.name.split("(")[0].trim()}
                              </button>
                            )
                          })}
                        </div>

                        {/* Result fields */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {activePanels.flatMap((panel) =>
                            panel.tests.map((t) => {
                              const key = `${panel.id}:${t.id}`
                              const val = item.results[key] ?? ""
                              const range = rangeFor(t, item.patient.gender)
                              const flag = evaluate(val, range)
                              return (
                                <div key={key} className="space-y-1">
                                  <label className="flex items-baseline justify-between gap-2 text-[11px]">
                                    <span className="truncate font-medium text-foreground">{t.name}</span>
                                    <span className="shrink-0 text-muted-foreground">
                                      {t.unit ? `${t.unit} · ` : ""}
                                      {range || "—"}
                                    </span>
                                  </label>
                                  <Input
                                    value={val}
                                    onChange={(e) => setResult(idx, key, e.target.value)}
                                    placeholder="—"
                                    className={cn(
                                      "h-9 font-medium",
                                      flag === "high" && "border-destructive/60 text-destructive",
                                      flag === "low" && "border-amber-500/60 text-amber-700",
                                      flag === "normal" && "border-emerald-500/50",
                                    )}
                                  />
                                </div>
                              )
                            }),
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                          <Button size="sm" onClick={() => saveOne(idx)} className="gap-1.5">
                            <Save className="h-3.5 w-3.5" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => printOne(idx)} className="gap-1.5 bg-transparent">
                            <Printer className="h-3.5 w-3.5" /> Print
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pdfOne(idx)}
                            disabled={item.busy}
                            className="gap-1.5 bg-transparent"
                          >
                            <FileDown className="h-3.5 w-3.5" /> {item.busy ? "…" : "PDF"}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <span className="flex-1 text-sm text-muted-foreground">
            {savedCount}/{items.length} patients saved
          </span>
          <Button onClick={saveAll} className="gap-2">
            <Save className="h-4 w-4" /> Save All
          </Button>
        </div>
      </div>
    </div>
  )
}
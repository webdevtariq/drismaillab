"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  Search, Printer, FileDown, Pencil, Trash2, ChevronDown, Users,
  AlertTriangle, LayoutTemplate, FilterX, CalendarRange, Stethoscope, User2,
  UserRound, Undo2,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  getAllPatients, getPatientReports, deletePatient, deletePatients,
  deletePatientByMRN, deleteAllPatients, logAction, type Patient,
} from "@/lib/lab-db"
import { panelById, rangeFor, evaluate } from "@/lib/test-panels"
import { printReport, exportPDF } from "@/lib/report"
import { getSettings, TEMPLATE_OPTIONS, type ReportTemplate } from "@/lib/settings"
import { playSound } from "@/lib/sounds"
import { snapshot, undo as undoAction, undoCount, peekUndo } from "@/lib/undo"
import { enqueue, getQueueState, type QueueState } from "@/lib/print-queue"

const TEMPLATE_KEY = "DrIsmailLab_ReportTemplate"

interface PersonGroup {
  mrn: string
  name: string
  age: string
  gender: Patient["gender"]
  visits: Patient[]
  latest: Patient
}

export function PatientHistory({ onEdit }: { onEdit: (p: Patient) => void }) {
  const [q, setQ] = useState("")
  const [tick, setTick] = useState(0)
  const [openMRN, setOpenMRN] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [confirmPerson, setConfirmPerson] = useState<string | null>(null)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [template, setTemplate] = useState<ReportTemplate>("hospital")
  const [undoTick, setUndoTick] = useState(0)

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [doctorFilter, setDoctorFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState("all")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = window.localStorage.getItem(TEMPLATE_KEY) as ReportTemplate | null
    const valid = TEMPLATE_OPTIONS.some((t) => t.id === saved)
    setTemplate(valid && saved ? saved : getSettings().defaultTemplate)
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [q, dateFrom, dateTo, doctorFilter, genderFilter])

  /* listen for undo stack changes */
  useEffect(() => {
    function onUndoChange() { setUndoTick((n) => n + 1) }
    window.addEventListener("lab-undo-changed", onUndoChange)
    return () => window.removeEventListener("lab-undo-changed", onUndoChange)
  }, [])

  const allVisits = useMemo(() => getAllPatients(), [tick])

  const doctors = useMemo(() => {
    const set = new Set<string>()
    allVisits.forEach((p) => { if (p.doctor) set.add(p.doctor) })
    return Array.from(set).sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const filteredVisits = useMemo(() => {
    let list = allVisits
    const t = q.trim().toLowerCase()
    if (t) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.mrn.toLowerCase().includes(t) ||
          p.labNumber.includes(t),
      )
    }
    if (dateFrom) list = list.filter((p) => p.date >= dateFrom)
    if (dateTo) list = list.filter((p) => p.date <= dateTo)
    if (doctorFilter !== "all") list = list.filter((p) => (p.doctor || "") === doctorFilter)
    if (genderFilter !== "all") list = list.filter((p) => p.gender === genderFilter)
    return list
  }, [allVisits, q, dateFrom, dateTo, doctorFilter, genderFilter])

  const groups: PersonGroup[] = useMemo(() => {
    const map = new Map<string, Patient[]>()
    filteredVisits.forEach((v) => {
      if (!map.has(v.mrn)) map.set(v.mrn, [])
      map.get(v.mrn)!.push(v)
    })
    const list: PersonGroup[] = []
    map.forEach((visits, mrn) => {
      visits.sort((a, b) => b.createdAt - a.createdAt)
      const latest = visits[0]
      list.push({ mrn, name: latest.name, age: latest.age, gender: latest.gender, visits, latest })
    })
    return list.sort((a, b) => b.latest.createdAt - a.latest.createdAt)
  }, [filteredVisits])

  const filtersActive =
    dateFrom !== "" || dateTo !== "" || doctorFilter !== "all" || genderFilter !== "all"

  function clearFilters() {
    setDateFrom("")
    setDateTo("")
    setDoctorFilter("all")
    setGenderFilter("all")
    playSound("click")
  }

  function changeTemplate(v: ReportTemplate) {
    setTemplate(v)
    window.localStorage.setItem(TEMPLATE_KEY, v)
    playSound("click")
  }

  function refresh() { setTick((n) => n + 1) }

  function handleUndo() {
    const label = peekUndo()
    if (!label) {
      toast.info("Nothing to undo")
      return
    }
    const done = undoAction()
    if (done) {
      toast.success(`Undone: ${done}`)
      playSound("success")
      refresh()
      setSelectedIds(new Set())
      setUndoTick((n) => n + 1)
    }
  }

  function removeVisit(p: Patient) {
    snapshot(`Deleted visit #${p.labNumber}`)
    deletePatient(p.id)
    toast.success(`Deleted visit ${p.labNumber}`, {
      description: "Press Ctrl+Z to undo",
    })
    playSound("delete")
    refresh()
  }

  function removePerson(mrn: string) {
    const name = groups.find((g) => g.mrn === mrn)?.name ?? mrn
    snapshot(`Deleted ${name} (all visits)`)
    deletePatientByMRN(mrn)
    setConfirmPerson(null)
    toast.success(`Deleted ${name} and all visits`, {
      description: "Press Ctrl+Z to undo",
    })
    playSound("delete")
    refresh()
  }

  function removeAll() {
    snapshot("Deleted ALL patients")
    deleteAllPatients()
    setConfirmAll(false)
    setSelectedIds(new Set())
    toast.success("All records deleted", {
      description: "Press Ctrl+Z to undo",
    })
    playSound("delete")
    refresh()
  }

  function removeSelected() {
    const ids = Array.from(selectedIds)
    snapshot(`Deleted ${ids.length} visit(s)`)
    deletePatients(ids)
    setConfirmBulk(false)
    setSelectedIds(new Set())
    toast.success(`Deleted ${ids.length} visit${ids.length === 1 ? "" : "s"}`, {
      description: "Press Ctrl+Z to undo",
    })
    playSound("delete")
    refresh()
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function queueSelectedPrints() {
    const jobs = allVisits
      .filter((v) => selectedIds.has(v.id))
      .map((v) => ({ patient: v, reports: getPatientReports(v.id) }))
      .filter((j) => j.reports.length > 0)

    if (jobs.length === 0) {
      toast.error("Selected visits have no saved reports")
      return
    }
    enqueue(jobs)
    toast.success(`Queued ${jobs.length} report${jobs.length === 1 ? "" : "s"} for printing`, {
      description: "Printing one at a time…",
    })
    playSound("success")
  }

  const allVisibleVisits = useMemo(() => groups.flatMap((g) => g.visits), [groups])
  const allVisibleSelected =
    allVisibleVisits.length > 0 && allVisibleVisits.every((v) => selectedIds.has(v.id))

  function toggleSelectAll(on: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      allVisibleVisits.forEach((v) => (on ? next.add(v.id) : next.delete(v.id)))
      return next
    })
  }

  const undoAvailable = useMemo(() => undoCount(), [undoTick])

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, MRN, or lab number"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            <Select value={template} onValueChange={(v) => changeTemplate(v as ReportTemplate)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> {groups.length} patient{groups.length === 1 ? "" : "s"}
          </Badge>

          {undoAvailable > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="gap-1.5 border-amber-500/40 bg-transparent text-amber-700 hover:bg-amber-500/10"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo ({undoAvailable})
            </Button>
          )}

          <Button
            variant="outline"
            className="gap-2 border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmAll(true)}
            disabled={allVisits.length === 0}
          >
            <Trash2 className="h-4 w-4" /> Delete All
          </Button>
        </div>

        {/* Filters row */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[140px]" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[140px]" />
          </div>

          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <Select value={doctorFilter} onValueChange={(v) => setDoctorFilter(v as string)}>
              <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any doctor</SelectItem>
                {doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <User2 className="h-4 w-4 text-muted-foreground" />
            <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as string)}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any gender</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Child">Child</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <FilterX className="h-3.5 w-3.5" /> Clear filters
            </Button>
          )}

          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
              disabled={allVisibleVisits.length === 0}
            />
            Select all visible visits
          </label>
        </div>
      </Card>

      {/* ── Print queue progress ── */}
      <PrintQueueBar />

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-primary/30 bg-primary/5 p-3 shadow-sm">
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                {selectedIds.size} visit{selectedIds.size === 1 ? "" : "s"} selected
              </Badge>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-transparent"
                  onClick={queueSelectedPrints}
                >
                  <Printer className="h-3.5 w-3.5" /> Print {selectedIds.size}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setConfirmBulk(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete {selectedIds.size}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {groups.length === 0 && (
        <Card className="grid place-items-center rounded-2xl border-dashed py-16 text-center text-muted-foreground">
          {allVisits.length === 0 ? "No patient records found." : "No patients match the current filters."}
        </Card>
      )}

      {/* ── Grouped person cards ── */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {groups.map((g, i) => (
            <PersonGroupCard
              key={g.mrn}
              group={g}
              index={i}
              open={openMRN === g.mrn}
              template={template}
              selectedIds={selectedIds}
              onToggle={() => setOpenMRN((cur) => (cur === g.mrn ? null : g.mrn))}
              onSelectVisit={toggleSelect}
              onEditVisit={onEdit}
              onDeleteVisit={removeVisit}
              onDeletePerson={() => setConfirmPerson(g.mrn)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Delete All confirm */}
      <AnimatePresence>
        {confirmAll && (
          <Modal onClose={() => setConfirmAll(false)}>
            <ConfirmBody
              title="Delete all records?"
              body="This permanently removes every patient, visit, and report. Press Ctrl+Z right after to undo."
              confirmLabel="Delete All"
              onCancel={() => setConfirmAll(false)}
              onConfirm={removeAll}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete person confirm */}
      <AnimatePresence>
        {confirmPerson && (
          <Modal onClose={() => setConfirmPerson(null)}>
            <ConfirmBody
              title="Delete this patient?"
              body={`This removes ${groups.find((g) => g.mrn === confirmPerson)?.name ?? "this patient"} and ALL their visits and reports. Press Ctrl+Z to undo.`}
              confirmLabel="Delete patient"
              onCancel={() => setConfirmPerson(null)}
              onConfirm={() => removePerson(confirmPerson)}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* Bulk delete confirm */}
      <AnimatePresence>
        {confirmBulk && (
          <Modal onClose={() => setConfirmBulk(false)}>
            <ConfirmBody
              title={`Delete ${selectedIds.size} visit${selectedIds.size === 1 ? "" : "s"}?`}
              body="Reports attached to these visits will also be removed. Press Ctrl+Z to undo."
              confirmLabel={`Delete ${selectedIds.size}`}
              onCancel={() => setConfirmBulk(false)}
              onConfirm={removeSelected}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ Person Group Card ═══ */

function PersonGroupCard({
  group, index, open, template, selectedIds,
  onToggle, onSelectVisit, onEditVisit, onDeleteVisit, onDeletePerson,
}: {
  group: PersonGroup
  index: number
  open: boolean
  template: ReportTemplate
  selectedIds: Set<string>
  onToggle: () => void
  onSelectVisit: (id: string) => void
  onEditVisit: (p: Patient) => void
  onDeleteVisit: (p: Patient) => void
  onDeletePerson: () => void
}) {
  const visits = group.visits
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <button
          type="button"
          onClick={() => { playSound("click"); onToggle() }}
          className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/30"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-white shadow-md shadow-primary/20">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{group.name}</span>
              <Badge variant="secondary" className="font-mono text-[10px] text-primary">
                {group.mrn}
              </Badge>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {group.age || "-"} • {group.gender} • {visits.length} visit{visits.length === 1 ? "" : "s"} • last {group.latest.date}
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="border-t border-border/60 bg-muted/20 p-3">
                <div className="space-y-2">
                  {visits.map((v) => (
                    <VisitRow
                      key={v.id}
                      visit={v}
                      template={template}
                      selected={selectedIds.has(v.id)}
                      onSelect={() => onSelectVisit(v.id)}
                      onEdit={() => onEditVisit(v)}
                      onDelete={() => onDeleteVisit(v)}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <span className="text-xs text-muted-foreground">
                    Patient since {new Date(visits[visits.length - 1].createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 bg-transparent text-destructive hover:bg-destructive/10"
                    onClick={onDeletePerson}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete patient (all visits)
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

/* ═══ Visit Row ═══ */

function VisitRow({
  visit, template, selected, onSelect, onEdit, onDelete,
}: {
  visit: Patient
  template: ReportTemplate
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const reports = getPatientReports(visit.id)

  async function doPrint() {
    if (reports.length === 0) {
      toast.error("No saved reports to print")
      playSound("error")
      return
    }
    await printReport(visit, reports, template)
    playSound("click")
    logAction("PRINT", `Printed ${visit.name} · Lab #${visit.labNumber}`)
  }
  async function doPDF() {
    if (reports.length === 0) {
      toast.error("No saved reports to export")
      playSound("error")
      return
    }
    await exportPDF(visit, reports, template)
    playSound("success")
    logAction("PDF", `Exported PDF for ${visit.name} · Lab #${visit.labNumber}`)
    toast.success("PDF downloaded")
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-background transition-colors", selected && "border-primary/50 ring-1 ring-primary/25")}>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <Checkbox checked={selected} onCheckedChange={onSelect} />
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-[10px] font-bold text-primary">
          #{visit.labNumber}
        </span>
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-3 text-left">
          <span className="min-w-0">
            <span className="block text-sm font-medium">{visit.date}</span>
            <span className="block text-xs text-muted-foreground">
              Dr. {visit.doctor || "—"} • {reports.length} report{reports.length === 1 ? "" : "s"}
            </span>
          </span>
          <ChevronDown className={cn("ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <div className="flex items-center gap-1.5">
          <IconBtn label="Print" onClick={doPrint}><Printer className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="PDF" onClick={doPDF}><FileDown className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Edit" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Delete" danger onClick={() => setConfirm(true)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-border/60 bg-muted/30 p-3">
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports saved for this visit.</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) =>
                    r.panels.map((pid) => {
                      const panel = panelById(pid)
                      if (!panel) return null
                      const rows = panel.tests.filter((t) => (r.results[`${pid}:${t.id}`] ?? "").trim() !== "")
                      if (rows.length === 0) return null
                      return (
                        <div key={r.id + pid} className="overflow-hidden rounded-lg border bg-background">
                          <div className="bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">{panel.name}</div>
                          <table className="w-full text-sm">
                            <tbody>
                              {rows.map((t) => {
                                const val = r.results[`${pid}:${t.id}`]
                                const range = rangeFor(t, visit.gender)
                                const flag = evaluate(val, range)
                                return (
                                  <tr key={t.id} className="border-t">
                                    <td className="px-3 py-1.5">{t.name}</td>
                                    <td className={cn("px-3 py-1.5 font-semibold",
                                      flag === "high" && "text-destructive",
                                      flag === "low" && "text-amber-600",
                                    )}>
                                      {val} {t.unit}
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{range}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    }),
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirm && (
          <motion.div
            className="flex items-center justify-between gap-3 border-t bg-destructive/10 px-3 py-2 text-xs"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <span className="font-medium text-destructive">Delete this visit?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 bg-transparent" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button size="sm" variant="destructive" className="h-7" onClick={onDelete}>Delete</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══ Print queue progress bar ═══ */

function PrintQueueBar() {
  const [q, setQ] = useState<QueueState>(getQueueState())

  useEffect(() => {
    function onUpdate(e: Event) {
      setQ((e as CustomEvent).detail as QueueState)
    }
    window.addEventListener("lab-print-queue", onUpdate)
    return () => window.removeEventListener("lab-print-queue", onUpdate)
  }, [])

  if (!q.running) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className="flex items-center gap-3 rounded-2xl border-primary/30 bg-primary/5 p-3 shadow-sm">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary"
        >
          <Printer className="h-4 w-4" />
        </motion.div>
        <div className="flex-1">
          <div className="text-sm font-medium">
            Printing {q.done + 1} of {q.total}
            {q.current && <span className="text-muted-foreground"> · {q.current}</span>}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/15">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2"
              animate={{ width: `${(q.done / Math.max(q.total, 1)) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {q.done}/{q.total}
        </Badge>
      </Card>
    </motion.div>
  )
}

/* ═══ helpers ═══ */

function IconBtn({
  children, label, danger, onClick,
}: {
  children: React.ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-border/70 transition-colors",
        danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function ConfirmBody({
  title, body, confirmLabel, onCancel, onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Card className="w-[420px] max-w-[92vw] rounded-2xl p-6 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mb-5 text-sm text-muted-foreground">{body}</p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>Cancel</Button>
        <Button variant="destructive" className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Card>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  Search, RefreshCw, Printer, FileDown, Pencil, Trash2, MessageCircle,
  Undo2, Redo2, FileText, AlertTriangle, FolderOpen, Calendar,
  Phone, Send, X,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getAllPatients, getPatientReports, deleteReport, deletePatient, logAction,
  updatePayment,
  type Patient, type Report,
} from "@/lib/lab-db"
import { printReport, exportPDF } from "@/lib/report"
import { getSettings } from "@/lib/settings"
import {
  buildWhatsAppLinks, getWhatsAppPref, setWhatsAppPref,
  openWhatsAppApp, openWhatsAppWeb,
  type BuiltWhatsApp, type WhatsAppMode,
} from "@/lib/whatsapp"
import { WhatsAppPicker } from "@/components/lab/whatsapp-picker"
import {
  undo as undoAction, redo as redoAction,
  undoCount, redoCount, peekUndo, peekRedo,
} from "@/lib/undo"
import { playSound } from "@/lib/sounds"
import { useSession } from "@/lib/session"

type Range = "today" | "week" | "month" | "all"

interface Row {
  patient: Patient
  report: Report
  panelsCount: number
}

export function ReportsArchive({ onEdit }: { onEdit: (p: Patient) => void }) {
  const [tick, setTick] = useState(0)
  const [range, setRange] = useState<Range>("today")
  const [q, setQ] = useState("")
  const [waPending, setWaPending] = useState<{ links: BuiltWhatsApp; patient: Patient } | null>(null)
  const [phonePrompt, setPhonePrompt] = useState<Row | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null)
  const [undoTick, setUndoTick] = useState(0)
  const { isAdmin } = useSession()

  useEffect(() => {
    function onUndoChange() { setUndoTick((n) => n + 1) }
    window.addEventListener("lab-undo-changed", onUndoChange)
    return () => window.removeEventListener("lab-undo-changed", onUndoChange)
  }, [])

  const rows = useMemo<Row[]>(() => {
    const now = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const today = iso(now)
    const weekAgo = iso(new Date(now.getTime() - 6 * 86400000))
    const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1))

    const all = getAllPatients()
    const inRange = all.filter((p) => {
      if (range === "today") return p.date === today
      if (range === "week") return p.date >= weekAgo
      if (range === "month") return p.date >= monthStart
      return true
    })

    const out: Row[] = []
    for (const p of inRange) {
      const reports = getPatientReports(p.id)
      for (const r of reports) {
        out.push({ patient: p, report: r, panelsCount: Array.isArray(r.panels) ? r.panels.length : 0 })
      }
    }

    const t = q.trim().toLowerCase()
    const filtered = t
      ? out.filter((row) =>
          row.patient.name.toLowerCase().includes(t) ||
          row.patient.labNumber.includes(t) ||
          row.patient.mrn.toLowerCase().includes(t) ||
          row.patient.doctor.toLowerCase().includes(t))
      : out

    filtered.sort((a, b) => b.report.updatedAt - a.report.updatedAt)
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, range, q])

  function refresh() {
    setTick((n) => n + 1)
    playSound("click")
  }

  function handleEdit(row: Row) { playSound("click"); onEdit(row.patient) }

  async function handlePrint(row: Row) {
    try {
      await printReport(row.patient, [row.report])
      playSound("click")
      logAction("PRINT", `Archived print: ${row.patient.name} · Lab #${row.patient.labNumber}`)
    } catch { toast.error("Could not print") }
  }

  async function handlePDF(row: Row) {
    try {
      await exportPDF(row.patient, [row.report])
      playSound("success")
      logAction("PDF", `Archived PDF: ${row.patient.name} · Lab #${row.patient.labNumber}`)
      toast.success("PDF downloaded")
    } catch { toast.error("Could not generate PDF") }
  }

  /** Called when the WhatsApp button is clicked. */
  function handleWhatsApp(row: Row) {
    if (!row.patient.phone) {
      // Ask for a phone number first
      setPhonePrompt(row)
      playSound("click")
      return
    }
    launchWhatsAppFor(row.patient)
  }

  /** Build the links and open the picker (or the saved preference). */
  function launchWhatsAppFor(patient: Patient, forceReportId?: string) {
    const s = getSettings()
    const links = buildWhatsAppLinks({
      patientName: patient.name,
      labNumber: patient.labNumber,
      reportId: forceReportId,
      phone: patient.phone!,
      countryCode: s.countryCode,
      labName: s.labName,
    })
    if (!links) { toast.error("Could not build WhatsApp link"); return }
    const pref = getWhatsAppPref()
    if (pref) { launchWhatsApp(pref, links); return }
    setWaPending({ links, patient })
  }

  function launchWhatsApp(mode: WhatsAppMode, links: BuiltWhatsApp, remember = false) {
    if (remember) setWhatsAppPref(mode)
    if (mode === "web") openWhatsAppWeb(links.webUrl)
    else openWhatsAppApp(links.appUrl, links.webUrl)
    playSound("click")
    setWaPending(null)
  }

  /** Called by the phone prompt after a number was entered and saved. */
  function afterPhoneSaved(updated: Patient) {
    setPhonePrompt(null)
    refresh()
    // Now open the WhatsApp flow with the new number
    launchWhatsAppFor(updated)
  }

  function doUndo() {
    const label = peekUndo()
    if (!label) { toast.info("Nothing to undo"); return }
    const done = undoAction()
    if (done) { toast.success(`Undone: ${done}`); playSound("success"); refresh() }
  }

  function doRedo() {
    const label = peekRedo()
    if (!label) { toast.info("Nothing to redo"); return }
    const done = redoAction()
    if (done) { toast.success(`Redone: ${done}`); playSound("success"); refresh() }
  }

  function doDeleteReport(row: Row) {
    deleteReport(row.report.id)
    logAction("DELETE", `Deleted report: ${row.patient.name} · Lab #${row.patient.labNumber}`)
    toast.success("Report deleted")
    playSound("delete")
    setConfirmDelete(null)
    refresh()
  }

  function doDeleteVisit(row: Row) {
    deletePatient(row.patient.id)
    logAction("DELETE", `Deleted visit: ${row.patient.name} · Lab #${row.patient.labNumber}`)
    toast.success("Visit deleted")
    playSound("delete")
    setConfirmDelete(null)
    refresh()
  }

  const undoN = useMemo(() => undoCount(), [undoTick, tick])
  const redoN = useMemo(() => redoCount(), [undoTick, tick])

  return (
    <div className="space-y-4 pb-24">
      <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderOpen className="h-4 w-4 text-primary" />
            Report Archives
            <Badge variant="secondary" className="ml-1">{rows.length}</Badge>
          </div>

          <div className="relative ml-auto min-w-[240px] flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, MRN, lab #, doctor" className="pl-9" />
          </div>

          <Button variant="outline" size="sm" onClick={doUndo} disabled={undoN === 0} className="gap-1.5 bg-transparent">
            <Undo2 className="h-3.5 w-3.5" />
            Undo{undoN > 0 && ` (${undoN})`}
          </Button>
          <Button variant="outline" size="sm" onClick={doRedo} disabled={redoN === 0} className="gap-1.5 bg-transparent">
            <Redo2 className="h-3.5 w-3.5" />
            Redo{redoN > 0 && ` (${redoN})`}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5 bg-transparent">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {(["today", "week", "month", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRange(r); playSound("click") }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                range === r
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {r === "today" ? "Today" : r === "week" ? "Last 7 days" : r === "month" ? "This month" : "All"}
            </button>
          ))}
        </div>
      </Card>

      {rows.length === 0 && (
        <Card className="grid place-items-center rounded-2xl border-dashed py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">No reports in this range</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {range === "today" ? "Try switching to All." : "Nothing saved yet."}
          </p>
        </Card>
      )}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <motion.div
              key={row.report.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
            >
              <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-border/60 p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/[0.03]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 font-mono text-[10px] font-bold text-white shadow-sm">
                  #{row.patient.labNumber}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{row.patient.name}</span>
                    <Badge variant="secondary" className="font-mono text-[10px] text-primary">{row.patient.mrn}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {row.panelsCount} panel{row.panelsCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{row.patient.age || "—"} · {row.patient.gender}</span>
                    <span>·</span>
                    <span>Dr. {row.patient.doctor || "—"}</span>
                    <span>·</span>
                    <span>{row.patient.date}</span>
                    {row.patient.phone ? (
                      <>
                        <span>·</span>
                        <span className="font-mono">📱 {row.patient.phone}</span>
                      </>
                    ) : (
                      <>
                        <span>·</span>
                        <span className="font-mono text-amber-600">no phone</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <ActionBtn
                    label={row.patient.phone ? "WhatsApp" : "Add phone & send"}
                    icon={MessageCircle}
                    tone="emerald"
                    onClick={() => handleWhatsApp(row)}
                  />
                  <ActionBtn label="Edit" icon={Pencil} onClick={() => handleEdit(row)} />
                  <ActionBtn label="Print" icon={Printer} onClick={() => handlePrint(row)} />
                  <ActionBtn label="PDF" icon={FileDown} onClick={() => handlePDF(row)} />
                  {isAdmin && (
                    <ActionBtn label="Delete" icon={Trash2} tone="danger" onClick={() => { playSound("click"); setConfirmDelete(row) }} />
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* WhatsApp picker */}
      <AnimatePresence>
        {waPending && (
          <WhatsAppPicker
            phoneFull={waPending.links.phoneFull}
            preview={waPending.links.preview}
            onPick={(mode, remember) => launchWhatsApp(mode, waPending.links, remember)}
            onCancel={() => setWaPending(null)}
          />
        )}
      </AnimatePresence>

      {/* Add-phone prompt */}
      <AnimatePresence>
        {phonePrompt && (
          <AddPhoneModal
            row={phonePrompt}
            onCancel={() => setPhonePrompt(null)}
            onSaved={afterPhoneSaved}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-[440px] max-w-[92vw] rounded-2xl p-6">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-center text-lg font-semibold">
                  Delete {confirmDelete.patient.name}&apos;s report?
                </h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Lab #{confirmDelete.patient.labNumber} · {confirmDelete.patient.date}
                </p>

                <div className="mt-5 space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" onClick={() => doDeleteReport(confirmDelete)}>
                    <FileText className="h-4 w-4 text-amber-600" />
                    <span className="text-left">
                      <span className="block font-medium">Delete this report only</span>
                      <span className="block text-xs text-muted-foreground">Keeps the patient & other visits</span>
                    </span>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3 bg-transparent text-destructive hover:bg-destructive/10" onClick={() => doDeleteVisit(confirmDelete)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="text-left">
                      <span className="block font-medium">Delete the whole visit</span>
                      <span className="block text-xs text-muted-foreground">Removes patient + all their reports</span>
                    </span>
                  </Button>
                </div>

                <Button variant="ghost" className="mt-3 w-full" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Add phone modal ─── */

function AddPhoneModal({
  row, onCancel, onSaved,
}: {
  row: Row
  onCancel: () => void
  onSaved: (updated: Patient) => void
}) {
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = phone.trim()
    if (!cleaned) {
      setShake((s) => s + 1)
      playSound("error")
      toast.error("Please enter a phone number")
      return
    }
    // Basic sanity: at least 7 digits
    const digits = cleaned.replace(/\D/g, "")
    if (digits.length < 7) {
      setShake((s) => s + 1)
      playSound("error")
      toast.error("Phone number looks too short")
      return
    }

    setBusy(true)
    try {
      updatePayment(row.patient.id, { phone: cleaned })
      logAction("EDIT", `Added phone ${cleaned} for ${row.patient.name} · Lab #${row.patient.labNumber}`)
      playSound("success")
      toast.success(`Phone saved for ${row.patient.name}`)
      // Build the "updated" patient object locally — DB is already written
      const updated: Patient = { ...row.patient, phone: cleaned }
      onSaved(updated)
    } catch {
      toast.error("Could not save phone number")
      playSound("error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        key={shake}
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0, x: shake ? [0, -8, 8, -6, 6, 0] : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26, duration: shake ? 0.4 : undefined }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card className="overflow-hidden rounded-3xl shadow-2xl">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#25D366] to-[#128C7E] px-6 py-5 text-white">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
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
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Add phone number</h3>
                <p className="text-xs text-white/80">Required to send this report on WhatsApp</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sending report for
                </p>
                <p className="truncate text-sm font-semibold">
                  {row.patient.name} · Lab #{row.patient.labNumber}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Phone number
              </label>
              <Input
                autoFocus
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0300-1234567"
                className="h-12 font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Use local format (0300…) or international (+92 300…). We&apos;ll convert it automatically.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || !phone.trim()}
                className="flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#1fb857]"
              >
                <Send className="h-4 w-4" />
                {busy ? "Saving…" : "Save & Send"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}

/* ─── Small action button ─── */

function ActionBtn({
  icon: Icon, label, tone = "neutral", onClick, disabled,
}: {
  icon: typeof MessageCircle
  label: string
  tone?: "neutral" | "emerald" | "danger"
  onClick: () => void
  disabled?: boolean
}) {
  const palette = {
    neutral: "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
    emerald: "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10",
    danger:  "border-destructive/40 text-destructive hover:bg-destructive/10",
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        palette,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}
"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  ClipboardList, Printer, FileDown, Save, Search, ChevronDown,
  TrendingUp, TrendingDown, Wallet, Sparkles, Pen, MessageCircle,
  CheckCircle2, AlertCircle, RotateCcw,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  PANELS, EXTRA_TESTS, panelById, rangeFor, evaluate,
  type PanelDef, type TestDef,
} from "@/lib/test-panels"
import {
  getAllPatients, getPatientReports, saveReport, updatePayment,
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
import { playSound } from "@/lib/sounds"
import { SuccessCheck } from "@/components/lab/success-check"
import { getSinglePrice, getWholePrice, getBundles, formatPKR } from "@/lib/pricing"
import { saveDraft, clearDraft, timeAgo } from "@/lib/drafts"
import { SignaturePad } from "@/components/lab/signature-pad"
import { ScrollInput } from "@/components/lab/scroll-input"
import { NumericInput } from "@/components/lab/numeric-input"

const FORCE_PANELS = new Set<string>(["cbc", "urine", "stool", "semen"])

export function ResultEntry({
  patient, onPickPatient,
}: {
  patient: Patient | null
  onPickPatient: (p: Patient) => void
}) {
  if (!patient) return <PatientPicker onPick={onPickPatient} />
  return <Entry key={patient.id} patient={patient} />
}

/* ═══════════════════════════════════════════════════
   Patient picker
   ═══════════════════════════════════════════════════ */

function PatientPicker({ onPick }: { onPick: (p: Patient) => void }) {
  const [q, setQ] = useState("")
  const list = useMemo(() => {
    const all = getAllPatients()
    const t = q.trim().toLowerCase()
    return t
      ? all.filter((p) =>
          p.name.toLowerCase().includes(t) ||
          p.labNumber.includes(t) ||
          p.mrn.toLowerCase().includes(t))
      : all
  }, [q])

  return (
    <Card className="mx-auto max-w-2xl rounded-2xl border-border/60 p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">Select a Patient</h2>
      <p className="mb-4 text-sm text-muted-foreground">Choose a registered patient to enter or edit results.</p>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, MRN or lab number" className="pl-9" />
      </div>
      <div className="max-h-[420px] divide-y overflow-y-auto rounded-lg border">
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No patients found.</p>}
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => { playSound("click"); onPick(p) }}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/60"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.mrn} • {p.age || "-"} • {p.gender} • {p.date}</p>
            </div>
            <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
              #{p.labNumber}
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}

/* ═══════════════════════════════════════════════════
   Entry
   ═══════════════════════════════════════════════════ */

function Entry({ patient }: { patient: Patient }) {
  const existing = useMemo<Report | undefined>(
    () => getPatientReports(patient.id)[0],
    [patient.id],
  )

  const initialSelected = useMemo<string[]>(
    () => (existing?.panels ?? []).filter((id) => id !== "extra" && !id.startsWith("extra:")),
    [existing],
  )
  const initialExtras = useMemo<string[]>(() => {
    if (!existing?.panels) return []
    return existing.panels
      .filter((id) => id.startsWith("extra:"))
      .map((id) => id.replace("extra:", ""))
  }, [existing])

  const [selected, setSelected] = useState<string[]>(initialSelected)
  const [selectedExtras, setSelectedExtras] = useState<string[]>(initialExtras)
  const [enabledTests, setEnabledTests] = useState<Set<string>>(() => {
    if (existing?.activeTests && existing.activeTests.length > 0) return new Set(existing.activeTests)
    return new Set<string>()
  })
  const [results, setResults] = useState<Record<string, string>>(existing?.results ?? {})
  const [reportId, setReportId] = useState<string | undefined>(existing?.id)
  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    selected: [...initialSelected],
    selectedExtras: [...initialExtras],
    results: existing?.results ?? {},
    enabledTests: existing?.activeTests ?? [],
  }))

  const [busy, setBusy] = useState(false)
  const [showCheck, setShowCheck] = useState(false)
  const [checkMsg, setCheckMsg] = useState("Saved")
  const [extrasOpen, setExtrasOpen] = useState(true)
  const [showSign, setShowSign] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(patient.signatureDataUrl)
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0)
  const [ready, setReady] = useState(false)
  const [pricingTick, setPricingTick] = useState(0)
  const [waPending, setWaPending] = useState<BuiltWhatsApp | null>(null)

  useEffect(() => {
    function onPricingChange() { setPricingTick((n) => n + 1) }
    window.addEventListener("lab-pricing-changed", onPricingChange)
    return () => window.removeEventListener("lab-pricing-changed", onPricingChange)
  }, [])

  useEffect(() => { setReady(true) }, [])

  const isDirty = useMemo(() => {
    const a = JSON.stringify({
      s: [...selected].sort(), e: [...selectedExtras].sort(),
      r: results, t: [...enabledTests].sort(),
    })
    const b = JSON.stringify({
      s: [...savedSnapshot.selected].sort(),
      e: [...savedSnapshot.selectedExtras].sort(),
      r: savedSnapshot.results,
      t: [...savedSnapshot.enabledTests].sort(),
    })
    return a !== b
  }, [selected, selectedExtras, results, enabledTests, savedSnapshot])

  useEffect(() => {
    if (!ready) return
    setResults((prev) => {
      let changed = false
      const next = { ...prev }
      for (const panelId of selected) {
        const panel = panelById(panelId)
        if (!panel) continue
        const isForce = FORCE_PANELS.has(panelId)
        for (const t of panel.tests) {
          const key = `${panelId}:${t.id}`
          if (!isForce && !enabledTests.has(key)) continue
          if ((next[key] ?? "").trim() === "" && t.default) { next[key] = t.default; changed = true }
        }
      }
      for (const extraId of selectedExtras) {
        const t = EXTRA_TESTS.find((x) => x.id === extraId)
        if (!t?.default) continue
        const key = `extra:${t.id}`
        if ((next[key] ?? "").trim() === "") { next[key] = t.default; changed = true }
      }
      return changed ? next : prev
    })
  }, [selected, enabledTests, selectedExtras, ready])

  useEffect(() => {
    if (!ready) return
    if (selected.length === 0 && selectedExtras.length === 0 && Object.keys(results).length === 0) return
    const t = setTimeout(() => {
      saveDraft({ patientId: patient.id, results, selected, selectedCbcExtras: selectedExtras })
      setDraftSavedAt(Date.now())
    }, 800)
    return () => clearTimeout(t)
  }, [results, selected, selectedExtras, ready, patient.id])

  const totalPrice = useMemo(() => {
    let total = 0
    for (const panelId of selected) {
      const panel = panelById(panelId)
      if (!panel) continue
      const isForce = FORCE_PANELS.has(panelId)
      const filledTests = panel.tests.filter((t) => {
        const key = `${panelId}:${t.id}`
        if (!isForce && !enabledTests.has(key)) return false
        return (results[key] ?? "").trim() !== ""
      })
      if (filledTests.length === 0) continue
      if (isForce) { total += getWholePrice(panelId); continue }
      const nonOptional = panel.tests.filter((t) => !t.optional)
      const nonOptionalAllFilled =
        nonOptional.length > 0 &&
        nonOptional.every((t) => (results[`${panelId}:${t.id}`] ?? "").trim() !== "")
      if (nonOptionalAllFilled && !panel.wholeOnly) { total += getWholePrice(panelId); continue }
      const filledIds = filledTests.map((t) => t.id)
      const bundle = getBundles(panelId).find((b) => {
        if (b.tests.length !== filledIds.length) return false
        return b.tests.every((id) => filledIds.includes(id))
      })
      if (bundle) { total += bundle.price; continue }
      for (const t of filledTests) total += getSinglePrice(panelId, t.id)
    }
    for (const extraId of selectedExtras) total += getSinglePrice("extra", extraId)
    return Math.round(total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedExtras, results, enabledTests, pricingTick])

  useEffect(() => {
    if (patient.amount !== totalPrice) updatePayment(patient.id, { amount: totalPrice })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice])

  const allSelected = selected.length === PANELS.length

  function togglePanel(panelId: string, on: boolean) {
    const panel = panelById(panelId)
    if (!panel) return
    setSelected((prev) => on ? [...new Set([...prev, panelId])] : prev.filter((x) => x !== panelId))
    if (!on) {
      setEnabledTests((prev) => {
        const next = new Set(prev)
        for (const t of panel.tests) next.delete(`${panelId}:${t.id}`)
        return next
      })
      setResults((prev) => {
        const next = { ...prev }
        for (const t of panel.tests) delete next[`${panelId}:${t.id}`]
        return next
      })
    }
  }

  function toggleExtra(extraId: string, on: boolean) {
    setSelectedExtras((prev) =>
      on ? [...new Set([...prev, extraId])] : prev.filter((x) => x !== extraId)
    )
    if (on) {
      const t = EXTRA_TESTS.find((x) => x.id === extraId)
      if (t?.default) {
        const key = `extra:${extraId}`
        setResults((prev) => ((prev[key] ?? "").trim() === "" ? { ...prev, [key]: t.default! } : prev))
      }
    } else {
      setResults((prev) => {
        const next = { ...prev }
        delete next[`extra:${extraId}`]
        return next
      })
    }
  }

  function toggleTest(panelId: string, testId: string, on: boolean) {
    const key = `${panelId}:${testId}`
    setEnabledTests((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
    if (on) {
      const panel = panelById(panelId)
      const test = panel?.tests.find((t) => t.id === testId)
      if (test?.default) {
        setResults((prev) => ((prev[key] ?? "").trim() !== "" ? prev : { ...prev, [key]: test.default! }))
      }
    } else {
      setResults((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function toggleAllInPanel(panelId: string, on: boolean) {
    const panel = panelById(panelId)
    if (!panel) return
    setEnabledTests((prev) => {
      const next = new Set(prev)
      for (const t of panel.tests) {
        const key = `${panelId}:${t.id}`
        if (on) next.add(key)
        else next.delete(key)
      }
      return next
    })
    if (on) {
      setResults((prev) => {
        const next = { ...prev }
        for (const t of panel.tests) {
          const key = `${panelId}:${t.id}`
          if ((next[key] ?? "").trim() === "" && t.default) next[key] = t.default
        }
        return next
      })
    } else {
      setResults((prev) => {
        const next = { ...prev }
        for (const t of panel.tests) delete next[`${panelId}:${t.id}`]
        return next
      })
    }
  }

  function toggleAllPanels(on: boolean) {
    if (on) {
      setSelected(PANELS.map((p) => p.id))
      setEnabledTests(new Set())
    } else {
      setSelected([])
      setEnabledTests(new Set())
      setResults({})
    }
  }

  const activePanels = PANELS.filter((p) => selected.includes(p.id))
  const extrasTests = EXTRA_TESTS.filter((t) => selectedExtras.includes(t.id))
  const extrasPanel: PanelDef = {
    id: "extra",
    name: "Extra / Individual Tests",
    category: "Additional",
    tests: extrasTests,
  }
  const panelsForResults: PanelDef[] = [...activePanels]
  if (extrasPanel.tests.length) panelsForResults.push(extrasPanel)

  const totalSections = activePanels.length + (selectedExtras.length > 0 ? 1 : 0)

  const allActiveTests: { panelId: string; test: TestDef }[] = []
  for (const p of activePanels) {
    const isForce = FORCE_PANELS.has(p.id)
    for (const t of p.tests) {
      if (isForce || enabledTests.has(`${p.id}:${t.id}`)) allActiveTests.push({ panelId: p.id, test: t })
    }
  }
  for (const t of extrasTests) allActiveTests.push({ panelId: "extra", test: t })

  const totalFields = allActiveTests.length
  const filled = allActiveTests.filter(({ panelId, test }) =>
    (results[`${panelId}:${test.id}`] ?? "").trim() !== ""
  ).length
  const pct = totalFields ? Math.round((filled / totalFields) * 100) : 0

  function persist(): Report {
    const panelList: string[] = [...selected]
    for (const extraId of selectedExtras) panelList.push(`extra:${extraId}`)
    const activeTests = [...enabledTests]
    const saved = saveReport({
      patientId: patient.id,
      labNumber: patient.labNumber,
      panels: panelList,
      results,
      activeTests,
      id: reportId,
    })
    setReportId(saved.id)
    updatePayment(patient.id, { amount: totalPrice })
    setSavedSnapshot({
      selected: [...selected],
      selectedExtras: [...selectedExtras],
      results: { ...results },
      enabledTests: [...enabledTests],
    })
    return saved
  }

  function handleSave() {
    if (selected.length === 0 && selectedExtras.length === 0) {
      toast.error("Select at least one panel or extra"); playSound("error"); return
    }
    persist()
    clearDraft(patient.id)
    setDraftSavedAt(0)
    toast.success("Report saved")
    playSound("save")
    setCheckMsg("Report Saved")
    setShowCheck(true)
  }

  function handleRevert() {
    setSelected([...savedSnapshot.selected])
    setSelectedExtras([...savedSnapshot.selectedExtras])
    setResults({ ...savedSnapshot.results })
    setEnabledTests(new Set(savedSnapshot.enabledTests))
    playSound("click")
    toast.success("Reverted to last save")
  }

  async function handlePrint() {
    if (selected.length === 0 && selectedExtras.length === 0) {
      toast.error("Select at least one panel or extra"); playSound("error"); return
    }
    const saved = persist()
    await printReport(patient, [saved])
    playSound("click")
    toast.success("Opening print preview…")
  }

  async function handlePDF() {
    if (selected.length === 0 && selectedExtras.length === 0) {
      toast.error("Select at least one panel or extra"); playSound("error"); return
    }
    const saved = persist()
    setBusy(true)
    try {
      await exportPDF(patient, [saved])
      toast.success("PDF downloaded")
      playSound("success")
    } catch {
      toast.error("Could not generate PDF")
      playSound("error")
    } finally { setBusy(false) }
  }

  function handleSaveSignature(dataUrl: string) {
    setSignatureDataUrl(dataUrl)
    updatePayment(patient.id, { signatureDataUrl: dataUrl, signedAt: Date.now(), signedBy: "Ishaq" })
    setShowSign(false)
    toast.success("Signature saved")
  }

  function launchWhatsApp(mode: WhatsAppMode, links: BuiltWhatsApp, remember: boolean) {
    if (remember) setWhatsAppPref(mode)
    if (mode === "web") openWhatsAppWeb(links.webUrl)
    else openWhatsAppApp(links.appUrl, links.webUrl)
    setWaPending(null)
  }

  function handleWhatsApp() {
    if (!patient.phone) {
      toast.error("No phone number on file", { description: "Add one in Register, then try again." }); return
    }
    const saved = persist()
    const s = getSettings()
    const links = buildWhatsAppLinks({
      patientName: patient.name,
      labNumber: patient.labNumber,
      reportId: saved.id,
      phone: patient.phone,
      countryCode: s.countryCode,
      labName: s.labName,
    })
    if (!links) { toast.error("Could not build WhatsApp link"); return }
    const pref = getWhatsAppPref()
    if (pref) { launchWhatsApp(pref, links, false); return }
    setWaPending(links)
  }

  function PanelRow({ p }: { p: PanelDef }) {
    const on = selected.includes(p.id)
    return (
      <label className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        on ? "bg-primary/10" : "hover:bg-accent/60",
      )}>
        <Checkbox className="mt-0.5" checked={on} onCheckedChange={(v) => togglePanel(p.id, Boolean(v))} tabIndex={-1} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium leading-tight">{p.name}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatPKR(getWholePrice(p.id))}</span>
          </span>
          <span className="block text-[11px] text-muted-foreground">{p.category}</span>
        </span>
      </label>
    )
  }

  return (
    <div className="space-y-5 pb-40">
      <SuccessCheck show={showCheck} message={checkMsg} onDone={() => setShowCheck(false)} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border-border/60 bg-gradient-to-r from-primary/10 to-transparent px-5 py-4 shadow-sm">
          <Chip label="Patient" value={patient.name} strong />
          <Chip label="MRN" value={patient.mrn} mono />
          <Chip label="Age / Sex" value={`${patient.age || "-"} / ${patient.gender}`} />
          <Chip label="Lab No." value={`#${patient.labNumber}`} mono />
          <Chip label="Doctor" value={patient.doctor || "-"} />
          <Chip label="Date" value={patient.date} />

          <div className="ml-auto flex items-center gap-2">
            {isDirty ? (
              <Badge className="gap-1.5 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                <AlertCircle className="h-3 w-3" /> Unsaved changes
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                <CheckCircle2 className="h-3 w-3" /> All saved
              </Badge>
            )}
            {isDirty && (
              <Button variant="outline" size="sm" onClick={handleRevert} className="h-7 gap-1.5 bg-transparent text-xs">
                <RotateCcw className="h-3 w-3" /> Revert
              </Button>
            )}
            {signatureDataUrl && (
              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Signed</Badge>
            )}
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit rounded-2xl border-border/60 shadow-sm lg:sticky lg:top-32">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" /> Test Panels
            </h3>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAllPanels(Boolean(v))} tabIndex={-1} />
              All
            </label>
          </div>

          <div className="max-h-[460px] space-y-1 overflow-y-auto p-2">
            {(() => {
              const extrasBlock = (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50/60">
                  <button
                    type="button"
                    onClick={() => setExtrasOpen((o) => !o)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Extra / Individual Tests
                    </span>
                    {selectedExtras.length > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-800 hover:bg-amber-500/20 text-[10px]">
                        {selectedExtras.length}
                      </Badge>
                    )}
                    <ChevronDown className={cn("h-3.5 w-3.5 text-amber-600 transition-transform", extrasOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence initial={false}>
                    {extrasOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 px-2 pb-2">
                          {EXTRA_TESTS.map((t) => {
                            const on = selectedExtras.includes(t.id)
                            return (
                              <label
                                key={t.id}
                                className={cn(
                                  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                  on ? "bg-amber-500/20" : "hover:bg-amber-500/10",
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <Checkbox checked={on} onCheckedChange={(v) => toggleExtra(t.id, Boolean(v))} tabIndex={-1} />
                                  <span className="truncate">{t.name}</span>
                                </span>
                                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                  {formatPKR(getSinglePrice("extra", t.id))}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )

              let inserted = false
              return PANELS.map((p) => {
                const showAfter = p.id === "cbc"
                if (showAfter) inserted = true
                return (
                  <Fragment key={p.id}>
                    <PanelRow p={p} />
                    {showAfter && extrasBlock}
                  </Fragment>
                )
              }).concat(
                inserted ? [] : [<Fragment key="__extras__">{extrasBlock}</Fragment>],
              )
            })()}
          </div>
        </Card>

        <div className="space-y-4">
          {totalSections > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {totalSections} section{totalSections === 1 ? "" : "s"} will print
              </span>
              <span>·</span>
              <span>{activePanels.length} panel{activePanels.length === 1 ? "" : "s"}</span>
              <span>·</span>
              <span>{selectedExtras.length} extra{selectedExtras.length === 1 ? "" : "s"}</span>
            </div>
          )}

          {panelsForResults.length === 0 ? (
            <Card className="grid-bg grid place-items-center rounded-2xl border-dashed border-border/70 py-20 text-center shadow-sm">
              <div>
                <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No tests selected</p>
                <p className="text-sm text-muted-foreground">Pick panels on the left — or add extras.</p>
              </div>
            </Card>
          ) : (
            <AnimatePresence mode="popLayout">
              {panelsForResults.map((panel) => (
                <PanelBlock
                  key={panel.id}
                  panel={panel}
                  gender={patient.gender}
                  results={results}
                  enabledTests={enabledTests}
                  onChange={(key, val) => setResults((r) => ({ ...r, [key]: val }))}
                  onToggleTest={toggleTest}
                  onToggleAllInPanel={toggleAllInPanel}
                  accent={panel.id === "extra" ? "amber" : "primary"}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/85 backdrop-blur-md">
        <div className="border-b border-border/60 bg-amber-50/40">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <Wallet className="h-3.5 w-3.5" /> Live bill
            </span>
            <span className="text-xs text-muted-foreground">
              {filled} filled test{filled === 1 ? "" : "s"} across {totalSections} section{totalSections === 1 ? "" : "s"}
            </span>
            <span className="ml-auto text-base font-bold tabular-nums text-primary">
              Total: {formatPKR(totalPrice)}
            </span>
            {draftSavedAt > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Draft saved {timeAgo(draftSavedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-[180px] flex-1 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2"
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{filled}/{totalFields} filled</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" onClick={() => setShowSign(true)}
              className={cn("gap-2 bg-transparent", signatureDataUrl && "border-emerald-500/40 text-emerald-600")}
            >
              <Pen className="h-4 w-4" />
              {signatureDataUrl ? "Signed ✓" : "Sign"}
            </Button>
            <Button
              variant="outline" onClick={handleWhatsApp}
              className="gap-2 bg-transparent text-emerald-700 hover:bg-emerald-500/10"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2 bg-transparent">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handlePDF} disabled={busy} className="gap-2 bg-transparent">
              <FileDown className="h-4 w-4" /> {busy ? "Generating…" : "PDF"}
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> Save Report
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSign && (
          <SignaturePad
            title={`Sign report for ${patient.name}`}
            hint={`Lab #${patient.labNumber} · ${patient.date}`}
            onCancel={() => setShowSign(false)}
            onSave={handleSaveSignature}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {waPending && (
          <WhatsAppPicker
            phoneFull={waPending.phoneFull}
            preview={waPending.preview}
            onPick={(mode, remember) => launchWhatsApp(mode, waPending, remember)}
            onCancel={() => setWaPending(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Panel block
   ═══════════════════════════════════════════════════ */

function PanelBlock({
  panel, gender, results, enabledTests, onChange, onToggleTest, onToggleAllInPanel, accent = "primary",
}: {
  panel: PanelDef
  gender: Patient["gender"]
  results: Record<string, string>
  enabledTests: Set<string>
  onChange: (key: string, value: string) => void
  onToggleTest: (panelId: string, testId: string, on: boolean) => void
  onToggleAllInPanel: (panelId: string, on: boolean) => void
  accent?: "primary" | "amber"
}) {
  const isExtra = panel.id === "extra"
  const isForce = FORCE_PANELS.has(panel.id)
  const showCheckboxes = !isForce && !isExtra

  const [open, setOpen] = useState(true)
  const barClass = accent === "amber"
    ? "bg-gradient-to-r from-amber-500 to-orange-500"
    : "bg-gradient-to-r from-primary to-chart-2"

  const enabledCount = showCheckboxes
    ? panel.tests.filter((t) => enabledTests.has(`${panel.id}:${t.id}`)).length
    : panel.tests.length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn("flex w-full items-center justify-between px-4 py-3 text-left text-white", barClass)}
        >
          <span className="flex items-center gap-2 font-semibold">
            {accent === "amber" && <Sparkles className="h-4 w-4" />}
            {panel.name}
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {panel.category}
            </span>
            {showCheckboxes && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                {enabledCount}/{panel.tests.length}
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="divide-y">
                {showCheckboxes && (
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-1.5 text-xs">
                    <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                      <Checkbox
                        checked={enabledCount === panel.tests.length}
                        onCheckedChange={(v) => onToggleAllInPanel(panel.id, Boolean(v))}
                        tabIndex={-1}
                      />
                      Select all in this panel
                    </label>
                  </div>
                )}
                <div className={cn(
                  "hidden gap-3 bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid",
                  showCheckboxes ? "grid-cols-[28px_1.6fr_1.2fr_0.8fr_1fr]" : "grid-cols-[1.6fr_1.2fr_0.8fr_1fr]",
                )}>
                  {showCheckboxes && <span />}
                  <span>Test</span>
                  <span>Result</span>
                  <span>Unit</span>
                  <span>Reference</span>
                </div>
                {panel.tests.map((t) => (
                  <ResultRow
                    key={t.id}
                    panelId={panel.id}
                    test={t}
                    gender={gender}
                    value={results[`${panel.id}:${t.id}`] ?? ""}
                    enabled={isForce || isExtra || enabledTests.has(`${panel.id}:${t.id}`)}
                    onChange={(v) => onChange(`${panel.id}:${t.id}`, v)}
                    onToggleTest={(on) => onToggleTest(panel.id, t.id, on)}
                    hasCheckbox={showCheckboxes}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

function ResultRow({
  panelId, test, gender, value, enabled, onChange, onToggleTest, hasCheckbox,
}: {
  panelId: string
  test: TestDef
  gender: Patient["gender"]
  value: string
  enabled: boolean
  onChange: (v: string) => void
  onToggleTest: (on: boolean) => void
  hasCheckbox: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const range = rangeFor(test, gender)
  const flag = evaluate(value, range)

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !(e.nativeEvent as any).isComposing) {
      e.preventDefault()
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-result]"))
      const idx = inputs.indexOf(ref.current as HTMLInputElement)
      inputs[idx + 1]?.focus()
    }
  }

  const dim = hasCheckbox && !enabled

  return (
    <div className={cn(
      "grid grid-cols-1 items-center gap-2 px-4 py-2.5 transition-colors hover:bg-accent/40 sm:gap-3",
      hasCheckbox ? "sm:grid-cols-[28px_1.6fr_1.2fr_0.8fr_1fr]" : "sm:grid-cols-[1.6fr_1.2fr_0.8fr_1fr]",
      dim && "opacity-50",
    )}>
      {hasCheckbox && (
        <Checkbox checked={enabled} onCheckedChange={(v) => onToggleTest(Boolean(v))} tabIndex={-1} />
      )}
      <span className="text-sm font-medium">{test.name}</span>
      <div className="flex items-center gap-2">
        {test.options ? (
          <ScrollInput value={value} onChange={onChange} options={test.options} disabled={!enabled} className="h-9" />
        ) : test.numeric ? (
          <NumericInput value={value} onChange={onChange} disabled={!enabled} className="h-9" />
        ) : (
          <Input
            ref={ref}
            data-result
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="—"
            disabled={!enabled}
            className={cn(
              "h-9 font-medium transition-colors",
              // Normal values: default border + default black text (no green).
              // High / Low: red border + red text.
              flag === "high" && "border-destructive/60 text-destructive font-bold",
              flag === "low" && "border-destructive/60 text-destructive font-bold",
            )}
          />
        )}
        <FlagBadge flag={flag} />
      </div>
      <span className="text-xs text-muted-foreground sm:text-sm">{test.unit || "—"}</span>
      <span className="text-xs text-muted-foreground">{range || "—"}</span>
    </div>
  )
}

/** Shows a pill ONLY for high / low. Normal values get no badge. */
function FlagBadge({ flag }: { flag: ReturnType<typeof evaluate> }) {
  if (flag === "none" || flag === "normal") return null
  const map = {
    high: { icon: TrendingUp, cls: "bg-destructive/15 text-destructive", label: "High" },
    low: { icon: TrendingDown, cls: "bg-destructive/15 text-destructive", label: "Low" },
  } as const
  const { icon: Icon, cls, label } = map[flag]
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", cls)}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{label}</span>
    </motion.span>
  )
}

function Chip({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("text-sm", mono && "font-mono", strong ? "font-semibold" : "font-medium")}>{value}</span>
    </div>
  )
}
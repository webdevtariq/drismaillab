"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Save, Building2, PenSquare, Database, Download, Upload, RotateCcw, FileText,
  Cloud, CloudOff, RefreshCw, CheckCircle2, Volume2, VolumeX,
  Gauge, Trash2, AlertTriangle, Sparkles, Zap, Leaf, Wind, HardDrive,
  Banknote, ChevronRight, User, ShieldCheck, LogOut, KeyRound, Eye, EyeOff,
  Image as ImageIcon, Recycle, Undo2, FolderOpen, DownloadCloud, FileArchive,
  Search,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getSettings, saveSettings, DEFAULT_SETTINGS, TEMPLATE_OPTIONS, PERFORMANCE_OPTIONS,
  type LabSettings, type ReportTemplate, type PerformanceMode,
} from "@/lib/settings"
import { soundsEnabled, setSoundsEnabled, playSound } from "@/lib/sounds"
import {
  getStorageStats, clearSoftCache, clearSettingsAndCache, factoryReset,
  type StorageStats,
} from "@/lib/cleanup"
import {
  getPanelPricing, setSinglePrice, setWholePrice, setWholeTier2Price,
  setBundlePrice, setBundleEnabled, resetPricing, formatPKR,
} from "@/lib/pricing"
import { allPanelsForPricing, PANELS, EXTRA_TESTS } from "@/lib/test-panels"
import { SignatureSettings } from "@/components/lab/signature-settings"
import { UpdateChecker } from "@/components/lab/update-checker"
import { useSession, login } from "@/lib/session"
import {
  changeOperatorPin, changeAdminPin,
  getTrash, restoreTrashItem, purgeTrashItem, emptyTrash,
  daysUntilPurge, TRASH_TTL_MS,
  type TrashItem,
} from "@/lib/lab-db"
import {
  listPdfs, deletePdf, clearAllPdfs, formatBytes,
  type StoredPdf,
} from "@/lib/pdf-store"
import { cn } from "@/lib/utils"

const DB_KEY = "DrIsmailLabDB"
const SETTINGS_KEY = "DrIsmailLab_Settings"

type SectionId =
  | "account" | "pins" | "identity" | "report" | "signature"
  | "pricing" | "trash" | "pdfstore" | "performance" | "cloud" | "updates"
  | "sound" | "storage" | "backup"

const SECTIONS: { id: SectionId; label: string; icon: typeof User; group: string }[] = [
  { id: "account",     label: "Account",           icon: User,        group: "Security" },
  { id: "pins",        label: "Change PINs",       icon: KeyRound,    group: "Security" },

  { id: "identity",    label: "Lab Identity",      icon: Building2,   group: "Report" },
  { id: "report",      label: "Report Settings",   icon: PenSquare,   group: "Report" },
  { id: "signature",   label: "Default Signature", icon: ImageIcon,   group: "Report" },

  { id: "pricing",     label: "Test Pricing",      icon: Banknote,    group: "Lab" },
  { id: "trash",       label: "Recycle Bin",       icon: Recycle,     group: "Lab" },
  { id: "pdfstore",    label: "PDF Archive",       icon: FolderOpen,  group: "Lab" },

  { id: "performance", label: "Performance",       icon: Gauge,       group: "System" },
  { id: "cloud",       label: "Cloud Sync",        icon: Cloud,       group: "System" },
  { id: "updates",     label: "Software Updates",  icon: DownloadCloud, group: "System" },
  { id: "sound",       label: "Sound Effects",     icon: Volume2,     group: "System" },
  { id: "storage",     label: "Storage & Cleanup", icon: HardDrive,   group: "System" },
  { id: "backup",      label: "Backup & Restore",  icon: Database,    group: "System" },
]

export function SettingsPage() {
  const [s, setS] = useState<LabSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { isAdmin, logout } = useSession()
  const [switchOpen, setSwitchOpen] = useState(false)
  const [active, setActive] = useState<SectionId>("account")

  useEffect(() => { setS(getSettings()) }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof SECTIONS>()
    for (const sec of SECTIONS) {
      if (!map.has(sec.group)) map.set(sec.group, [])
      map.get(sec.group)!.push(sec)
    }
    return Array.from(map.entries())
  }, [])

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-600">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Admin access required</h2>
        <p className="text-sm text-muted-foreground">
          Only an admin can view or edit settings, pricing, and backups.
        </p>
      </div>
    )
  }

  function update<K extends keyof LabSettings>(key: K, value: LabSettings[K]) {
    setS((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function save() {
    saveSettings(s)
    setSaved(true)
    toast.success("Settings saved")
    playSound("save")
    setTimeout(() => setSaved(false), 1500)
  }

  function reset() {
    setS(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
    toast.success("Reset to defaults")
    playSound("delete")
  }

  function backup() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: window.localStorage.getItem(SETTINGS_KEY),
      db: window.localStorage.getItem(DB_KEY),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `drismail-lab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Backup downloaded")
    playSound("success")
  }

  async function restore(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.settings) window.localStorage.setItem(SETTINGS_KEY, data.settings)
      if (data.db) window.localStorage.setItem(DB_KEY, data.db)
      toast.success("Backup restored — reloading…")
      playSound("success")
      setTimeout(() => window.location.reload(), 700)
    } catch {
      toast.error("Invalid backup file")
      playSound("error")
    }
  }

  function handleLogout() {
    if (!confirm("Sign out? The other role will need their PIN to return.")) return
    logout()
    playSound("click")
    toast.success("Signed out")
  }

  const activeMeta = SECTIONS.find((x) => x.id === active)!

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-white shadow-lg shadow-primary/25">
            <Save className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
            <p className="text-xs text-muted-foreground">
              Configure your lab. Changes are saved when you press <b>Save</b>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {saved ? "✓ Saved" : "Unsaved changes"}
          </span>
          <Button onClick={save} className="gap-2">
            <FileText className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:hidden">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => { setActive(sec.id); playSound("click") }}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active === sec.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 text-muted-foreground hover:bg-accent",
                )}
              >
                <sec.icon className="h-3.5 w-3.5" />
                {sec.label}
              </button>
            ))}
          </div>

          <nav className="hidden lg:block">
            <Card className="overflow-hidden rounded-2xl border-border/60 p-2 shadow-sm">
              {grouped.map(([group, items]) => (
                <div key={group} className="mb-1 last:mb-0">
                  <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {group}
                  </div>
                  {items.map((sec) => {
                    const isActive = active === sec.id
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => { setActive(sec.id); playSound("click") }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground/80 hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <sec.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                        <span className="flex-1 text-left">{sec.label}</span>
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isActive ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60")} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </Card>
          </nav>
        </aside>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-6 py-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <activeMeta.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{activeMeta.label}</h3>
                    <p className="text-xs text-muted-foreground">{sectionHint(active)}</p>
                  </div>
                </div>

                <div className="p-6">
                  {active === "account" && (
                    <AccountSection
                      isAdmin={isAdmin}
                      onSwitch={() => setSwitchOpen(true)}
                      onLogout={handleLogout}
                    />
                  )}

                  {active === "pins" && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <PinChanger
                        tone="blue"
                        icon={User}
                        label="Operator PIN"
                        hint="Used by reception / day-to-day staff. Must be exactly 4 digits."
                        onUpdate={changeOperatorPin}
                        numeric
                        maxLength={4}
                      />
                      <PinChanger
                        tone="amber"
                        icon={ShieldCheck}
                        label="Admin PIN"
                        hint="Used by lab owner / manager. At least 4 characters — letters allowed."
                        onUpdate={changeAdminPin}
                        numeric={false}
                        maxLength={32}
                      />
                    </div>
                  )}

                  {active === "identity" && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Lab Name"><Input value={s.labName} onChange={(e) => update("labName", e.target.value)} /></Field>
                      <Field label="Subtitle"><Input value={s.labSub} onChange={(e) => update("labSub", e.target.value)} /></Field>
                      <Field label="Tagline" className="sm:col-span-2"><Input value={s.labTag} onChange={(e) => update("labTag", e.target.value)} /></Field>
                      <Field label="Phone"><Input value={s.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
                      <Field label="Email"><Input value={s.email} onChange={(e) => update("email", e.target.value)} /></Field>
                      <Field label="Address" className="sm:col-span-2"><Input value={s.address} onChange={(e) => update("address", e.target.value)} /></Field>
                    </div>
                  )}

                  {active === "report" && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Signatory Name"><Input value={s.signatory} onChange={(e) => update("signatory", e.target.value)} /></Field>
                      <Field label="Signatory Title"><Input value={s.signatoryTitle} onChange={(e) => update("signatoryTitle", e.target.value)} /></Field>
                      <Field label="Accent Color">
                        <div className="flex items-center gap-2">
                          <input type="color" value={s.accent} onChange={(e) => update("accent", e.target.value)} className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1" />
                          <Input value={s.accent} onChange={(e) => update("accent", e.target.value)} className="font-mono" />
                        </div>
                      </Field>
                      <Field label="Default Print Template">
                        <Select value={s.defaultTemplate} onValueChange={(v) => update("defaultTemplate", v as ReportTemplate)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_OPTIONS.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.label} — {t.description}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Public Report URL (for QR codes)
                        </Label>
                        <Input
                          value={s.publicBaseUrl}
                          onChange={(e) => update("publicBaseUrl", e.target.value)}
                          placeholder="https://your-lab.pages.dev"
                          className="font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          QR codes on printed reports point here. Set once after deploying
                          (see DEPLOYMENT.md). Leave empty to omit QR codes.
                        </p>
                      </div>
                    </div>
                  )}

                  {active === "signature" && (
                    <SignatureSettings
                      value={s.signatureDataUrl}
                      onChange={(dataUrl) => {
                        const next = { ...s, signatureDataUrl: dataUrl }
                        setS(next)
                        saveSettings(next)
                        setSaved(true)
                        setTimeout(() => setSaved(false), 1200)
                      }}
                    />
                  )}

                  {active === "pricing" && <PricingPanels />}
                  {active === "trash" && <TrashPanel />}
                  {active === "pdfstore" && <PdfArchivePanel />}

                  {active === "performance" && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {PERFORMANCE_OPTIONS.map((p) => (
                        <PerfCard
                          key={p.id}
                          id={p.id}
                          label={p.label}
                          description={p.description}
                          hint={p.hint}
                          active={s.performanceMode === p.id}
                          onPick={() => { update("performanceMode", p.id); playSound("click") }}
                        />
                      ))}
                    </div>
                  )}

                  {active === "cloud" && <CloudStatus />}
                  {active === "updates" && <UpdateChecker />}
                  {active === "sound" && <SoundToggle />}
                  {active === "storage" && <StoragePanel />}

                  {active === "backup" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={backup} className="gap-2"><Download className="h-4 w-4" /> Download Backup</Button>
                        <Button variant="outline" className="gap-2 bg-transparent" onClick={() => fileRef.current?.click()}>
                          <Upload className="h-4 w-4" /> Restore from Backup
                        </Button>
                        <Button variant="outline" className="gap-2 bg-transparent text-destructive hover:bg-destructive/10" onClick={reset}>
                          <RotateCcw className="h-4 w-4" /> Reset Settings
                        </Button>
                        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.currentTarget.value = "" }} />
                      </div>
                      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                        The backup contains every patient, report, and setting. Store it somewhere safe.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {switchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300]"
          >
            <SwitchAccountOverlay onCancel={() => setSwitchOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function sectionHint(id: SectionId): string {
  switch (id) {
    case "account":     return "Switch role or sign out of this device."
    case "pins":        return "Operator and Admin PINs are separate. Operator = 4 digits, Admin = letters allowed."
    case "identity":    return "Shown on every printed report."
    case "report":      return "Signatory, default print template, and QR codes."
    case "signature":   return "Applies to every report printed."
    case "pricing":     return "Expand a panel to edit its price. Extras mirror panel prices."
    case "trash":       return "Deleted records stay here for 30 days, then auto-delete."
    case "pdfstore":    return "Every PDF you generate is saved here. Download one or all as ZIP."
    case "performance": return "Control how much animation the app uses."
    case "cloud":       return "Backup and sync patients across all devices."
    case "updates":     return "Check for and install the latest version of DR ISMAIL LAB."
    case "sound":       return "Soft audio cues on save, error, and delete."
    case "storage":     return "See what's using space — and clear the junk."
    case "backup":      return "Save your data to a JSON file — or restore from one."
  }
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Account
   ═══════════════════════════════════════════════════ */

function AccountSection({
  isAdmin, onSwitch, onLogout,
}: {
  isAdmin: boolean
  onSwitch: () => void
  onLogout: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/30 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "grid h-12 w-12 place-items-center rounded-2xl shadow-sm",
            isAdmin
              ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white"
              : "bg-gradient-to-br from-blue-500 to-indigo-500 text-white",
          )}>
            {isAdmin ? <ShieldCheck className="h-6 w-6" /> : <User className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{isAdmin ? "Admin" : "Operator"}</span>
              <span className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                isAdmin
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-700"
                  : "border-blue-500/40 bg-blue-500/15 text-blue-700",
              )}>
                Active
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isAdmin
                ? "Full access · settings, pricing, backups, all tabs"
                : "Day-to-day · registration, results, collection, reports"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" className="h-11 w-full gap-2 bg-transparent" onClick={onSwitch}>
          <RefreshCw className="h-4 w-4" /> Switch account
        </Button>
        <Button
          variant="outline"
          className="h-11 w-full gap-2 bg-transparent text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </div>

      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        Tip: press{" "}
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>{" "}
        + <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">Shift</kbd>{" "}
        + <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">O</kbd>{" "}
        to instantly drop back to Operator without the PIN gate.
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Trash / Recycle Bin
   ═══════════════════════════════════════════════════ */

function TrashPanel() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [confirm, setConfirm] = useState<{ kind: "purge" | "empty"; item?: TrashItem } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  function refresh() { setItems(getTrash()) }
  useEffect(() => { refresh() }, [tick])

  function doRestore(item: TrashItem) {
    restoreTrashItem(item.id)
    playSound("success")
    toast.success("Restored", { description: item.label })
    setTick((n) => n + 1)
  }

  function doPurge(item: TrashItem) {
    purgeTrashItem(item.id)
    playSound("delete")
    toast.success("Permanently deleted", { description: item.label })
    setConfirm(null)
    setTick((n) => n + 1)
  }

  function doEmpty() {
    const count = items.length
    emptyTrash()
    playSound("delete")
    toast.success(`Emptied recycle bin — ${count} item(s) wiped`)
    setConfirm(null)
    setTick((n) => n + 1)
  }

  const patientCount = items.reduce((n, it) => n + it.patients.length, 0)
  const reportCount = items.reduce((n, it) => n + it.reports.length, 0)
  const oldest = items.length ? Math.min(...items.map((i) => i.deletedAt)) : 0

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="Trash items" value={items.length} tone="blue" />
        <MiniStat label="Patients" value={patientCount} tone="amber" />
        <MiniStat label="Reports" value={reportCount} tone="violet" />
        <MiniStat
          label="Auto-wipe in"
          value={items.length === 0 ? "—" : `${Math.max(0, daysUntilPurge(oldest))} days`}
          tone="rose"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Recycle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Deleted records sit here for 30 days</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 bg-transparent" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={items.length === 0}
            className="gap-1.5 bg-transparent text-destructive hover:bg-destructive/10"
            onClick={() => setConfirm({ kind: "empty" })}
          >
            <Trash2 className="h-3.5 w-3.5" /> Empty trash
          </Button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 bg-muted/10 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Recycle className="h-6 w-6" />
          </div>
          <p className="mt-3 font-medium">Recycle bin is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleted patients and reports will appear here.
          </p>
        </div>
      )}

      {items.map((item) => {
        const daysLeft = daysUntilPurge(item.deletedAt)
        const isExpanded = expanded === item.id
        return (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-border/60 bg-background">
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : item.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
            >
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.div>

              <div className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm",
                item.kind === "patient" ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                : item.kind === "report" ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                : "bg-gradient-to-br from-amber-500 to-orange-500",
              )}>
                {item.kind === "report" ? <FileText className="h-4 w-4" />
                  : item.kind === "bulk" ? <HardDrive className="h-4 w-4" />
                  : <User className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{item.label}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(item.deletedAt).toLocaleString("en-GB")}</span>
                  <span>·</span>
                  <span>{item.patients.length} patient{item.patients.length === 1 ? "" : "s"}</span>
                  <span>·</span>
                  <span>{item.reports.length} report{item.reports.length === 1 ? "" : "s"}</span>
                </div>
              </div>

              <Badge
                className={cn(
                  "shrink-0 text-[10px]",
                  daysLeft <= 3 ? "bg-destructive/15 text-destructive hover:bg-destructive/15"
                  : daysLeft <= 7 ? "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15"
                  : "bg-muted text-muted-foreground hover:bg-muted",
                )}
              >
                {daysLeft === 0 ? "auto-wipe today" : `${daysLeft}d left`}
              </Badge>

              <div className="hidden shrink-0 gap-1 sm:flex">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 bg-transparent text-emerald-700 hover:bg-emerald-500/10"
                  onClick={(e) => { e.stopPropagation(); doRestore(item) }}
                >
                  <Undo2 className="h-3.5 w-3.5" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 bg-transparent text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); setConfirm({ kind: "purge", item }) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-border/60"
                >
                  <div className="space-y-4 p-4">
                    <div className="flex gap-2 sm:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 bg-transparent text-emerald-700"
                        onClick={() => doRestore(item)}
                      >
                        <Undo2 className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 bg-transparent text-destructive"
                        onClick={() => setConfirm({ kind: "purge", item })}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Wipe
                      </Button>
                    </div>

                    {item.patients.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Patients
                        </div>
                        <div className="space-y-1">
                          {item.patients.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                              <span className="font-mono text-xs text-primary">#{p.labNumber}</span>
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {p.age || "—"} · {p.gender} · {p.date}
                              </span>
                              {p.amount ? (
                                <Badge variant="secondary" className="ml-auto text-[10px]">
                                  Rs. {p.amount}
                                </Badge>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.reports.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Reports ({item.reports.length})
                        </div>
                        <div className="space-y-1">
                          {item.reports.slice(0, 10).map((r) => (
                            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                              <span className="font-mono text-primary">#{r.labNumber}</span>
                              <span className="text-muted-foreground">
                                {Array.isArray(r.panels) ? r.panels.length : 0} panel(s)
                              </span>
                              <span className="ml-auto text-muted-foreground">
                                {new Date(r.updatedAt).toLocaleDateString("en-GB")}
                              </span>
                            </div>
                          ))}
                          {item.reports.length > 10 && (
                            <p className="pt-1 text-center text-xs text-muted-foreground">
                              + {item.reports.length - 10} more…
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      <AnimatePresence>
        {confirm && (
          <motion.div
            className="fixed inset-0 z-[300] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirm(null)}
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
                  {confirm.kind === "empty" ? "Permanently empty trash?" : "Permanently delete this item?"}
                </h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {confirm.kind === "empty"
                    ? `${items.length} item(s) — ${patientCount} patient(s) and ${reportCount} report(s) — will be wiped forever. This CANNOT be undone.`
                    : `"${confirm.item?.label}" will be wiped forever. This CANNOT be undone.`}
                </p>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setConfirm(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => confirm.kind === "empty" ? doEmpty() : confirm.item && doPurge(confirm.item)}
                  >
                    Wipe forever
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        Items older than {Math.round(TRASH_TTL_MS / (24 * 60 * 60 * 1000))} days are removed automatically when the app opens.
        Restoring brings back the full patient record — reports, billing, signature, everything.
      </p>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: number | string; tone: "blue" | "amber" | "violet" | "rose" }) {
  const tones = {
    blue:   "from-blue-500 to-indigo-500",
    amber:  "from-amber-500 to-orange-500",
    violet: "from-violet-500 to-fuchsia-500",
    rose:   "from-rose-500 to-pink-500",
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3">
      <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br shadow-sm", tones)} />
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PDF Archive
   ═══════════════════════════════════════════════════ */

function PdfArchivePanel() {
  const [items, setItems] = useState<StoredPdf[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listPdfs()
      .then((list) => { if (!cancelled) { setItems(list); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter((i) =>
      i.patientName.toLowerCase().includes(t) ||
      i.labNumber.includes(t) ||
      i.mrn.toLowerCase().includes(t),
    )
  }, [items, q])

  const totalBytes = useMemo(() => items.reduce((s, x) => s + x.size, 0), [items])

  function refresh() { setTick((n) => n + 1) }

  function filenameFor(item: StoredPdf) {
    const safe = item.patientName.replace(/[^a-z0-9]+/gi, "_")
    const dt = new Date(item.createdAt).toISOString().slice(0, 10)
    return `${safe}_${item.labNumber}_${dt}.pdf`
  }

  function openPdf(item: StoredPdf) {
    const url = URL.createObjectURL(item.blob)
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    playSound("click")
  }

  function downloadOne(item: StoredPdf) {
    const url = URL.createObjectURL(item.blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filenameFor(item)
    a.click()
    URL.revokeObjectURL(url)
    playSound("click")
  }

  async function downloadAll() {
    if (filtered.length === 0) return
    setBusy(true)
    try {
      const JSZipLib = require("jszip")
      const JSZipCtor = JSZipLib.default ?? JSZipLib
      const zip = new JSZipCtor()

      for (const item of filtered) {
        zip.file(filenameFor(item), item.blob)
      }
      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `drismail-lab-pdfs-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      playSound("success")
      toast.success(`Downloaded ${filtered.length} PDF${filtered.length === 1 ? "" : "s"}`)
    } catch (err) {
      console.error(err)
      toast.error("Could not create ZIP")
      playSound("error")
    } finally {
      setBusy(false)
    }
  }

  async function deleteOne(item: StoredPdf) {
    await deletePdf(item.id)
    playSound("delete")
    toast.success("PDF deleted")
    refresh()
  }

  async function clearAll() {
    setBusy(true)
    try {
      await clearAllPdfs()
      playSound("delete")
      toast.success("PDF archive cleared")
      setConfirmClear(false)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
        <FolderOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {items.length} PDF{items.length === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-muted-foreground">
          · {formatBytes(totalBytes)} total
        </span>

        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, MRN, lab #"
            className="h-8 pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={filtered.length === 0 || busy}
          onClick={downloadAll}
          className="gap-1.5 bg-transparent"
        >
          <FileArchive className="h-3.5 w-3.5" />
          {busy ? "Zipping…" : `Download all (${filtered.length})`}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={items.length === 0 || busy}
          onClick={() => setConfirmClear(true)}
          className="gap-1.5 bg-transparent text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear all
        </Button>
      </div>

      {!loading && items.length === 0 && (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 bg-muted/10 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <FolderOpen className="h-6 w-6" />
          </div>
          <p className="mt-3 font-medium">No PDFs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every PDF you generate from Result Entry or Archives will appear here.
          </p>
        </div>
      )}

      {loading && (
        <div className="grid place-items-center py-16 text-sm text-muted-foreground">
          Loading archive…
        </div>
      )}

      {!loading && items.length > 0 && filtered.length === 0 && (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 py-12 text-center">
          <p className="text-sm text-muted-foreground">No PDFs match "{q}"</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 transition-colors hover:border-primary/30 hover:bg-accent/[0.03]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-white shadow-sm">
                <FileText className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{item.patientName}</span>
                  <Badge variant="secondary" className="font-mono text-[10px] text-primary">
                    {item.mrn}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    #{item.labNumber}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {item.template}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{new Date(item.createdAt).toLocaleString("en-GB")}</span>
                  <span>·</span>
                  <span className="tabular-nums">{formatBytes(item.size)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openPdf(item)}
                  title="Open in new tab"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border/70 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Open</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadOne(item)}
                  title="Download"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteOne(item)}
                  title="Delete"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        PDFs are stored on this device in the browser's IndexedDB. They're not synced to
        cloud unless you also export a backup. Clearing browser data will remove them.
      </p>

      <AnimatePresence>
        {confirmClear && (
          <motion.div
            className="fixed inset-0 z-[300] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmClear(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-[420px] max-w-[92vw] rounded-2xl p-6">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-center text-lg font-semibold">Clear PDF archive?</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  All {items.length} PDF{items.length === 1 ? "" : "s"} ({formatBytes(totalBytes)})
                  will be permanently deleted. This cannot be undone.
                </p>
                <div className="mt-5 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={busy}
                    onClick={clearAll}
                  >
                    {busy ? "Clearing…" : "Delete all"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Change PIN
   ═══════════════════════════════════════════════════ */

function PinChanger({
  tone, icon: Icon, label, hint, onUpdate, numeric = true, maxLength = 8,
}: {
  tone: "blue" | "amber"
  icon: typeof User
  label: string
  hint: string
  onUpdate: (oldPin: string, newPin: string) => boolean
  numeric?: boolean
  maxLength?: number
}) {
  const [oldPin, setOldPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [flash, setFlash] = useState(0)

  const palette = tone === "amber"
    ? { bar: "from-amber-500 to-orange-500", ring: "ring-amber-500/20", icon: "bg-gradient-to-br from-amber-500 to-orange-500 text-white" }
    : { bar: "from-blue-500 to-indigo-500", ring: "ring-blue-500/20",  icon: "bg-gradient-to-br from-blue-500 to-indigo-500 text-white" }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!oldPin || !newPin || !confirmPin) {
      toast.error("All three fields are required"); playSound("error"); return
    }
    if (newPin.length < 4) {
      toast.error("New PIN must be at least 4 characters"); playSound("error"); return
    }
    if (newPin !== confirmPin) {
      toast.error("New PIN and confirmation do not match"); playSound("error"); return
    }
    if (newPin === oldPin) {
      toast.error("New PIN must differ from the current one"); playSound("error"); return
    }
    if (!onUpdate(oldPin, newPin)) {
      setFlash((f) => f + 1); playSound("error"); toast.error("Current PIN is incorrect"); return
    }
    playSound("success")
    toast.success(`${label} updated`)
    setOldPin(""); setNewPin(""); setConfirmPin("")
  }

  return (
    <motion.div
      key={flash}
      animate={flash ? { x: [0, -8, 8, -6, 6, 0] } : {}}
      transition={{ duration: 0.35 }}
      className={cn("overflow-hidden rounded-2xl border border-border/60 bg-background", palette.ring)}
    >
      <div className={cn("bg-gradient-to-r px-4 py-3 text-white", palette.bar)}>
        <div className="flex items-center gap-3">
          <div className={cn("grid h-9 w-9 place-items-center rounded-xl shadow-md", palette.icon)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold">{label}</div>
            <div className="text-[11px] opacity-90">{hint}</div>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3 p-4">
        <PinField label="Current PIN" value={oldPin} onChange={setOldPin} show={showOld} onToggleShow={() => setShowOld((s) => !s)} numeric={numeric} maxLength={maxLength} />
        <PinField label="New PIN" value={newPin} onChange={setNewPin} show={showNew} onToggleShow={() => setShowNew((s) => !s)} numeric={numeric} maxLength={maxLength} />
        <PinField label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} show={showNew} onToggleShow={() => setShowNew((s) => !s)} numeric={numeric} maxLength={maxLength} />
        <Button type="submit" disabled={!oldPin || !newPin || !confirmPin} className="w-full gap-2">
          <KeyRound className="h-4 w-4" /> Update PIN
        </Button>
      </form>
    </motion.div>
  )
}

function PinField({
  label, value, onChange, show, onToggleShow, numeric = true, maxLength = 8,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  numeric?: boolean
  maxLength?: number
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          inputMode={numeric ? "numeric" : "text"}
          maxLength={maxLength}
          value={value}
          onChange={(e) =>
            onChange(numeric ? e.target.value.replace(/\D/g, "") : e.target.value)
          }
          placeholder={numeric ? "••••" : "At least 4 characters"}
          className="h-10 pr-9 font-mono tracking-widest"
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Pricing
   ═══════════════════════════════════════════════════ */

function PricingPanels() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)

  const allPanels = useMemo(() => allPanelsForPricing(), [])

  const wholeOnlyIds = [
    "cbc", "urine", "stool", "semen", "crossmatch", "btct", "hpylori",
    "urine_pt", "vitamind", "hb", "beta_hcg",
  ]

  const groups: { title: string; tone: string; panels: typeof allPanels }[] = [
    { title: "Whole-panel tests",        tone: "bg-blue-500",    panels: allPanels.filter((p) =>  wholeOnlyIds.includes(p.id)) },
    { title: "Individual-priced panels", tone: "bg-emerald-500", panels: allPanels.filter((p) => !wholeOnlyIds.includes(p.id)) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
        <Banknote className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium">{allPanels.length} panels · {EXTRA_TESTS.length} extras</span>
        <span className="text-xs text-muted-foreground">· click any panel to edit</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setOpenId(null)}>
            Collapse all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 bg-transparent text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (!confirm("Reset all prices to defaults?")) return
              resetPricing()
              refresh()
              playSound("delete")
              toast.success("Pricing reset to defaults")
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.title} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", g.tone)} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {g.title}
            </h4>
            <span className="text-[10px] text-muted-foreground">({g.panels.length})</span>
          </div>
          <div className="space-y-2">
            {g.panels.map((p) => (
              <PanelRow
                key={p.id}
                panel={p}
                isOpen={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                onChanged={refresh}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Extras — individual tests
          </h4>
          <span className="text-[10px] text-muted-foreground">({EXTRA_TESTS.length})</span>
        </div>
        <ExtrasPricingRow onChanged={refresh} />
      </div>
    </div>
  )
}

function PanelRow({
  panel, isOpen, onToggle, onChanged,
}: {
  panel: ReturnType<typeof allPanelsForPricing>[number]
  isOpen: boolean
  onToggle: () => void
  onChanged: () => void
}) {
  const pricing = getPanelPricing(panel.id)
  const panelDef = PANELS.find((x) => x.id === panel.id)
  const tier2Tests = panelDef?.wholeTier2Tests ?? []
  const hasTier2 = tier2Tests.length > 0
  const isWholeOnly = panelDef?.wholeOnly === true

  const testsToPrice = (() => {
    if (hasTier2) return panel.tests.filter((t) => tier2Tests.includes(t.id))
    if (isWholeOnly) return []
    return panel.tests
  })()

  const showBundles = pricing.bundles.length > 0
  const showIndividual = testsToPrice.length > 0

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{panel.name}</span>
            <Badge variant="secondary" className="text-[10px]">{panel.category}</Badge>
            {isWholeOnly && (
              <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/15 text-[10px]">Whole only</Badge>
            )}
            {hasTier2 && (
              <Badge className="bg-violet-500/15 text-violet-700 hover:bg-violet-500/15 text-[10px]">2 tiers</Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {panel.tests.length} tests · {pricing.bundles.filter((b) => b.enabled).length} bundles
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-right">
          {pricing.whole > 0 && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Whole</span>
              <span className="text-sm font-bold tabular-nums text-primary">{formatPKR(pricing.whole)}</span>
            </div>
          )}
          {hasTier2 && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">With add-on</span>
              <span className="text-sm font-bold tabular-nums text-violet-600">{formatPKR(pricing.wholeTier2)}</span>
            </div>
          )}
          {!isWholeOnly && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sum</span>
              <span className="text-sm font-bold tabular-nums text-muted-foreground">
                {formatPKR(Object.values(pricing.singles).reduce((a, b) => a + b, 0))}
              </span>
            </div>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-primary">Whole panel price</div>
                    <div className="text-[11px] text-muted-foreground">
                      {isWholeOnly ? "This panel is always sold as a whole." : "Applied when all non-optional tests are selected."}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Rs.</span>
                    <Input
                      type="number"
                      value={pricing.whole}
                      onChange={(e) => { setWholePrice(panel.id, Number(e.target.value)); onChanged() }}
                      className="h-9 w-[130px] text-right font-mono tabular-nums"
                    />
                  </div>
                </div>

                {hasTier2 && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-violet-600">Whole + add-on price</div>
                      <div className="text-[11px] text-muted-foreground">
                        Applied when <b>{tier2Tests.join(", ")}</b> is also selected.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Rs.</span>
                      <Input
                        type="number"
                        value={pricing.wholeTier2}
                        onChange={(e) => { setWholeTier2Price(panel.id, Number(e.target.value)); onChanged() }}
                        className="h-9 w-[130px] text-right font-mono tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>

              {showBundles && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Bundle prices</span>
                    <span className="text-[10px] text-muted-foreground">applies when exact group is selected</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border/60">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Bundle</th>
                          <th className="px-3 py-2 font-medium">Includes</th>
                          <th className="px-3 py-2 text-right font-medium">Price</th>
                          <th className="px-3 py-2 text-center font-medium">On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricing.bundles.map((b) => (
                          <tr key={b.id} className={cn("border-t border-border/60", !b.enabled && "opacity-50")}>
                            <td className="px-3 py-2 font-medium">{b.label}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {b.tests.map((id) => panel.tests.find((t) => t.id === id)?.name ?? id).join(" + ")}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                type="number"
                                value={b.price}
                                onChange={(e) => { setBundlePrice(panel.id, b.id, Number(e.target.value)); onChanged() }}
                                className="ml-auto h-8 w-[120px] text-right font-mono tabular-nums"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={b.enabled}
                                onChange={(e) => { setBundleEnabled(panel.id, b.id, e.target.checked); onChanged() }}
                                className="h-4 w-4 cursor-pointer accent-primary"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {showIndividual && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {hasTier2 ? "Add-on test price" : "Individual test prices"}
                    </span>
                    {hasTier2 && (
                      <span className="text-[10px] text-muted-foreground">Only the add-on is charged individually.</span>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border/60">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Test</th>
                          <th className="px-3 py-2 font-medium">Section</th>
                          <th className="px-3 py-2 text-right font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testsToPrice.map((t) => (
                          <tr key={t.id} className="border-t border-border/60">
                            <td className="px-3 py-2">
                              <div className="font-medium">{t.name}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{t.id}</div>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{t.section || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                type="number"
                                value={pricing.singles[t.id] ?? 0}
                                onChange={(e) => { setSinglePrice(panel.id, t.id, Number(e.target.value)); onChanged() }}
                                className="ml-auto h-8 w-[120px] text-right font-mono tabular-nums"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {isWholeOnly && !hasTier2 && !showBundles && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  This panel is billed only as a whole. No per-test pricing needed.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ExtrasPricingRow({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const pricing = getPanelPricing("extra")
  const total = Object.values(pricing.singles).reduce((a, b) => a + b, 0)

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-500/10"
      >
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="font-semibold">Extra / Individual Tests</span>
            <Badge className="bg-amber-500/20 text-amber-800 hover:bg-amber-500/20 text-[10px]">
              {EXTRA_TESTS.length} tests
            </Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Standalone tests that don&apos;t fit inside a panel
          </div>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sum</span>
          <span className="text-sm font-bold tabular-nums text-amber-700">{formatPKR(total)}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-amber-500/20"
          >
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-amber-500/10 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Test</th>
                    <th className="px-4 py-2 font-medium">Section</th>
                    <th className="px-4 py-2 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {EXTRA_TESTS.map((t) => (
                    <tr key={t.id} className="border-t border-amber-500/10">
                      <td className="px-4 py-2">
                        <div className="font-medium">{t.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{t.id}</div>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{t.section || "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Input
                          type="number"
                          value={pricing.singles[t.id] ?? 0}
                          onChange={(e) => { setSinglePrice("extra", t.id, Number(e.target.value)); onChanged() }}
                          className="ml-auto h-8 w-[110px] text-right font-mono tabular-nums"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Performance / Cloud / Sound / Storage
   ═══════════════════════════════════════════════════ */

function PerfCard({
  id, label, description, hint, active, onPick,
}: {
  id: PerformanceMode
  label: string
  description: string
  hint: string
  active: boolean
  onPick: () => void
}) {
  const Icon = id === "eco" ? Leaf : id === "ultra" ? Sparkles : Wind
  const iconColor = id === "eco" ? "text-emerald-600" : id === "ultra" ? "text-violet-600" : "text-blue-600"
  const iconBg = id === "eco" ? "bg-emerald-500/15" : id === "ultra" ? "bg-violet-500/15" : "bg-blue-500/15"

  return (
    <motion.button
      type="button"
      onClick={onPick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-colors",
        active ? "border-primary bg-primary/[0.05] ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40 hover:bg-accent/30",
      )}
    >
      <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-xl", iconBg, iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{label}</span>
        {id === "smooth" && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">{hint}</p>
      {active && (
        <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" /> Active
        </div>
      )}
    </motion.button>
  )
}

function CloudStatus() {
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "error" | "syncing">("idle")
  const [lastSync, setLastSync] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void import("@/lib/lab-db").then((m) => setLastSync(m.getLastSyncTime()))
  }, [])

  async function runTest() {
    setStatus("testing"); setError(null)
    const m = await import("@/lib/supabase")
    const r = await m.testConnection()
    if (r.ok) { setStatus("ok"); playSound("success") }
    else { setStatus("error"); setError(r.error ?? "Unknown"); playSound("error") }
  }
  async function runSync() {
    setStatus("syncing"); setError(null)
    const m = await import("@/lib/lab-db")
    const r = await m.syncFromCloud()
    if (r.ok) { setStatus("ok"); setLastSync(Date.now()); toast.success(`Synced — ${r.pulled} records`); playSound("success") }
    else { setStatus("error"); setError(r.error ?? "Sync failed"); playSound("error") }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {status === "ok" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Connected
          </span>
        ) : status === "error" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-medium text-destructive">
            <CloudOff className="h-3.5 w-3.5" /> Error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Cloud className="h-3.5 w-3.5" /> Not tested
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {lastSync ? `Last sync: ${new Date(lastSync).toLocaleString("en-GB")}` : "Never synced"}
        </span>
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={runTest} disabled={status === "testing"} className="gap-2 bg-transparent">
          <Cloud className="h-4 w-4" /> {status === "testing" ? "Testing…" : "Test Connection"}
        </Button>
        <Button onClick={runSync} disabled={status === "syncing"} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${status === "syncing" ? "animate-spin" : ""}`} />
          {status === "syncing" ? "Syncing…" : "Sync Now"}
        </Button>
      </div>
    </div>
  )
}

function SoundToggle() {
  const [on, setOn] = useState(true)
  useEffect(() => { setOn(soundsEnabled()) }, [])

  function toggle() {
    const next = !on
    setOn(next)
    setSoundsEnabled(next)
    if (next) setTimeout(() => playSound("notify"), 40)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", on ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
          {on ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-medium">{on ? "Sounds on" : "Sounds muted"}</p>
          <p className="text-xs text-muted-foreground">Play a short tone on save, delete, or error.</p>
        </div>
      </div>
      <Button variant={on ? "outline" : "default"} onClick={toggle} className={on ? "bg-transparent" : ""}>
        {on ? "Mute" : "Enable"}
      </Button>
    </div>
  )
}

function StoragePanel() {
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [busy, setBusy] = useState<"soft" | "medium" | "hard" | null>(null)
  const [confirm, setConfirm] = useState<"soft" | "medium" | "hard" | null>(null)

  function refresh() { setStats(getStorageStats()) }
  useEffect(() => { refresh() }, [])

  function run(level: "soft" | "medium" | "hard") {
    setBusy(level)
    setTimeout(() => {
      try {
        if (level === "soft") {
          const r = clearSoftCache()
          toast.success(`Cache cleared — freed ${r.freedFormatted}`)
        } else if (level === "medium") {
          const r = clearSettingsAndCache()
          toast.success(`Settings reset — freed ${r.freedFormatted}`)
        } else {
          factoryReset()
          toast.success("Factory reset complete")
        }
        playSound(level === "soft" ? "success" : "delete")
        refresh()
        if (level !== "soft") setTimeout(() => window.location.reload(), 700)
      } catch {
        toast.error("Cleanup failed")
        playSound("error")
      } finally {
        setBusy(null)
        setConfirm(null)
      }
    }, 250)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Used in this browser</span>
          <span className="text-lg font-bold tabular-nums">{stats?.formatted ?? "…"}</span>
        </div>
        <div className="mt-3 space-y-2">
          {(stats?.items ?? []).map((it) => {
            const pct = stats && stats.totalBytes ? (it.bytes / stats.totalBytes) * 100 : 0
            return (
              <div key={it.key}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="truncate text-muted-foreground">{it.label}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                    {it.bytes < 1024 ? `${it.bytes} B` : `${(it.bytes / 1024).toFixed(1)} KB`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      it.key === "__foreign__" ? "bg-muted-foreground/40" : "bg-gradient-to-r from-primary to-chart-2",
                    )}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <CleanCard tone="safe" icon={Zap} title="Clear Cache" body="Temp files, sync markers, QR cache. Your data stays safe." cta="Clean now" busy={busy === "soft"} onClick={() => setConfirm("soft")} />
        <CleanCard tone="warn" icon={RotateCcw} title="Reset Preferences" body="Clears cache + resets lab settings to defaults. Keeps patients." cta="Reset" busy={busy === "medium"} onClick={() => setConfirm("medium")} />
        <CleanCard tone="danger" icon={Trash2} title="Factory Reset" body="Deletes EVERYTHING — patients, reports, settings, trash. Cannot be undone." cta="Wipe" busy={busy === "hard"} onClick={() => setConfirm("hard")} />
      </div>

      {confirm && <ConfirmDialog level={confirm} onCancel={() => setConfirm(null)} onConfirm={() => run(confirm)} />}
    </div>
  )
}

function CleanCard({
  tone, icon: Icon, title, body, cta, busy, onClick,
}: {
  tone: "safe" | "warn" | "danger"
  icon: typeof Zap
  title: string
  body: string
  cta: string
  busy: boolean
  onClick: () => void
}) {
  const styles = {
    safe:   { bar: "bg-emerald-500", pill: "bg-emerald-500/15 text-emerald-700", btn: "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10" },
    warn:   { bar: "bg-amber-500",   pill: "bg-amber-500/15 text-amber-700",     btn: "border-amber-500/40 text-amber-700 hover:bg-amber-500/10" },
    danger: { bar: "bg-destructive", pill: "bg-destructive/15 text-destructive", btn: "border-destructive/40 text-destructive hover:bg-destructive/10" },
  }[tone]

  return (
    <Card className="relative overflow-hidden rounded-2xl border-border/60 p-5 shadow-sm">
      <div className={cn("absolute left-0 top-0 h-full w-1", styles.bar)} />
      <div className={cn("mb-3 grid h-9 w-9 place-items-center rounded-xl", styles.pill)}>
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      <Button variant="outline" size="sm" onClick={onClick} disabled={busy} className={cn("mt-4 w-full bg-transparent", styles.btn)}>
        {busy ? "Working…" : cta}
      </Button>
    </Card>
  )
}

function ConfirmDialog({ level, onCancel, onConfirm }: { level: "soft" | "medium" | "hard"; onCancel: () => void; onConfirm: () => void }) {
  const meta = {
    soft:   { title: "Clear cache?", body: "Removes temp files and sync markers. Patients, reports, and settings stay untouched.", confirm: "Clean cache" },
    medium: { title: "Reset preferences?", body: "Cache is cleared AND settings return to defaults. Patients and reports are kept.", confirm: "Reset preferences" },
    hard:   { title: "Factory reset?", body: "This deletes EVERYTHING — every patient, report, setting, and the recycle bin. Cannot be undone.", confirm: "Wipe everything" },
  }[level]

  const [typed, setTyped] = useState("")
  const requireTyping = level === "hard"
  const ready = !requireTyping || typed.trim().toUpperCase() === "DELETE"

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="w-[420px] max-w-[92vw] rounded-2xl p-6">
          <div className={cn(
            "mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full",
            level === "hard" ? "bg-destructive/15 text-destructive" : level === "medium" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600",
          )}>
            {level === "hard" ? <AlertTriangle className="h-6 w-6" /> : level === "medium" ? <RotateCcw className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
          </div>
          <h3 className="text-center text-lg font-semibold">{meta.title}</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground">{meta.body}</p>
          {requireTyping && (
            <div className="mt-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type <b>DELETE</b> to confirm</Label>
              <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" className="mt-2 font-mono uppercase" />
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>Cancel</Button>
            <Button variant={level === "hard" ? "destructive" : "default"} className="flex-1" disabled={!ready} onClick={onConfirm}>
              {meta.confirm}
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   Switch account overlay
   ═══════════════════════════════════════════════════ */

function SwitchAccountOverlay({ onCancel }: { onCancel: () => void }) {
  const [role, setRole] = useState<"admin" | "operator" | null>(null)
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [shake, setShake] = useState(0)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    if (login(role, pin)) {
      playSound("success")
      toast.success(`Signed in as ${role === "admin" ? "Admin" : "Operator"}`)
      onCancel()
      setTimeout(() => window.location.reload(), 250)
    } else {
      setShake((s) => s + 1)
      playSound("error")
      toast.error("Wrong PIN")
      setPin("")
    }
  }

  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
      >
        <Card className="overflow-hidden rounded-3xl shadow-2xl">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-chart-2 px-5 py-5 text-white">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold leading-tight">Switch account</h3>
                <p className="text-[11px] text-white/80">
                  {role ? "Enter your credentials" : "Choose a role"}
                </p>
              </div>
            </div>
          </div>

          <motion.div key={shake} animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.35 }} className="p-5">
            {!role && (
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => { setRole("operator"); playSound("click") }}
                  className="flex items-center gap-3 rounded-2xl border-2 border-blue-500/30 px-4 py-3 text-left transition-colors hover:border-blue-500/60 hover:bg-blue-500/5"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Operator</div>
                    <div className="text-xs text-muted-foreground">Registration · Results · Collection</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole("admin"); playSound("click") }}
                  className="flex items-center gap-3 rounded-2xl border-2 border-amber-500/30 px-4 py-3 text-left transition-colors hover:border-amber-500/60 hover:bg-amber-500/5"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Admin</div>
                    <div className="text-xs text-muted-foreground">Everything + Settings, History, Billing</div>
                  </div>
                </button>
                <Button variant="ghost" className="mt-2" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            )}

            {role && (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setRole(null); setPin(""); playSound("click") }}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    ← Back
                  </button>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                      role === "admin"
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-700"
                        : "border-blue-500/40 bg-blue-500/15 text-blue-700",
                    )}
                  >
                    {role === "admin" ? "Admin" : "Operator"}
                  </span>
                </div>

                <div className="relative">
                  <Input
                    autoFocus
                    type={showPin ? "text" : "password"}
                    inputMode={role === "admin" ? "text" : "numeric"}
                    maxLength={role === "admin" ? 32 : 8}
                    value={pin}
                    onChange={(e) => {
                      const v = role === "admin" ? e.target.value : e.target.value.replace(/\D/g, "")
                      setPin(v)
                    }}
                    placeholder={role === "admin" ? "Enter password" : "Enter PIN"}
                    className="h-12 pr-10 font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((s) => !s)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pin.length < 4} className="flex-1 gap-2">
                    <KeyRound className="h-4 w-4" /> Switch
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}
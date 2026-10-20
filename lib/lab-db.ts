import type { Gender } from "./test-panels"
import { supabase, cloudEnabled } from "./supabase"

export type VisitStatus = "registered" | "collected" | "in-lab" | "ready" | "reported"

export interface Patient {
  id: string
  mrn: string
  name: string
  age: string
  gender: Gender
  doctor: string
  date: string
  labNumber: string
  createdAt: number
  status?: VisitStatus
  phone?: string
  amount?: number
  discount?: number
  paid?: number
  signatureDataUrl?: string
  signedAt?: number
  signedBy?: string
}

export interface Report {
  id: string
  patientId: string
  labNumber: string
  panels: string[]
  results: Record<string, string>
  activeTests?: string[]
  createdAt: number
  updatedAt: number
}

export interface AuditEntry {
  id: string
  timestamp: number
  action: string
  details: string
}

/** A single deleted item sitting in the recycle bin. */
export interface TrashItem {
  id: string
  kind: "patient" | "report" | "bulk"
  label: string
  deletedAt: number
  patients: Patient[]
  reports: Report[]
}

interface DB {
  patients: Patient[]
  reports: Report[]
  auditLogs: AuditEntry[]
  trash: TrashItem[]
  lastLabNumber: number
  lastMRN: number
  pin: string
  operatorPin?: string
  adminPin?: string
}

const KEY = "DrIsmailLabDB"
const SYNC_KEY = "DrIsmailLab_LastSync"
const DEFAULT_PIN = "1234"
const DEFAULT_OPERATOR_PIN = "0000"
export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

export const STATUS_ORDER: VisitStatus[] = ["registered", "collected", "in-lab", "ready", "reported"]

export const STATUS_LABELS: Record<VisitStatus, string> = {
  "registered": "Registered",
  "collected": "Sample Collected",
  "in-lab": "In Lab",
  "ready": "Ready for Verify",
  "reported": "Reported",
}

export function nextStatus(s: VisitStatus): VisitStatus {
  const i = STATUS_ORDER.indexOf(s)
  return STATUS_ORDER[Math.min(i + 1, STATUS_ORDER.length - 1)]
}

function emptyDB(): DB {
  return {
    patients: [], reports: [], auditLogs: [], trash: [],
    lastLabNumber: 1000, lastMRN: 0,
    pin: DEFAULT_PIN,
    operatorPin: DEFAULT_OPERATOR_PIN,
    adminPin: DEFAULT_PIN,
  }
}

function read(): DB {
  if (typeof window === "undefined") return emptyDB()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyDB()
    const parsed = JSON.parse(raw) as Partial<DB>
    const db: DB = { ...emptyDB(), ...parsed }
    if (!Array.isArray(db.trash)) db.trash = []
    let counter = db.lastMRN
    let migrated = false
    const mrnByName = new Map<string, string>()

    db.patients = db.patients.map((p) => {
      let next = p
      if (!p.mrn) {
        const key = `${p.name}|${p.age}|${p.gender}`.toLowerCase()
        let mrn = mrnByName.get(key)
        if (!mrn) {
          counter += 1
          mrn = `M-${String(counter).padStart(4, "0")}`
          mrnByName.set(key, mrn)
        }
        migrated = true
        next = { ...next, mrn }
      }
      if (!next.status) { migrated = true; next = { ...next, status: "registered" } }
      return next
    })

    if (!db.operatorPin) { db.operatorPin = DEFAULT_OPERATOR_PIN; migrated = true }
    if (!db.adminPin)    { db.adminPin = db.pin || DEFAULT_PIN; migrated = true }

    if (migrated) { db.lastMRN = counter; write(db) }
    return db
  } catch { return emptyDB() }
}

function write(db: DB) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(db))
  schedulePush()
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function fmtMRN(n: number) {
  return `M-${String(n).padStart(4, "0")}`
}

/* ─── Cloud sync ─── */

let pushTimer: ReturnType<typeof setTimeout> | null = null

function schedulePush() {
  if (!cloudEnabled || typeof window === "undefined") return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { void pushAllToCloud() }, 1200)
}

async function pushAllToCloud() {
  if (!supabase) return
  const db = read()
  try {
    if (db.patients.length) {
      const rows = db.patients.map((p) => ({
        id: p.id, mrn: p.mrn, name: p.name, age: p.age, gender: p.gender,
        doctor: p.doctor, date: p.date, lab_number: p.labNumber,
        phone: p.phone ?? null,
        created_at: p.createdAt, updated_at: Date.now(),
      }))
      await supabase.from("patients").upsert(rows)
    }
    if (db.reports.length) {
      const rows = db.reports.map((r) => ({
        id: r.id, patient_id: r.patientId, lab_number: r.labNumber,
        panels: r.panels, results: r.results,
        active_tests: r.activeTests ?? null,
        created_at: r.createdAt, updated_at: r.updatedAt,
      }))
      await supabase.from("reports").upsert(rows)
    }
    if (db.auditLogs.length) {
      const rows = db.auditLogs.slice(0, 500).map((a) => ({
        id: a.id, ts: a.timestamp, action: a.action, details: a.details,
      }))
      await supabase.from("audit_logs").upsert(rows)
    }
    window.localStorage.setItem(SYNC_KEY, String(Date.now()))
  } catch { /* silent */ }
}

export async function syncFromCloud(): Promise<{ ok: boolean; pulled: number; error?: string }> {
  if (!supabase) return { ok: false, pulled: 0, error: "Cloud not configured" }
  try {
    const [pRes, rRes, aRes] = await Promise.all([
      supabase.from("patients").select("*"),
      supabase.from("reports").select("*"),
      supabase.from("audit_logs").select("*").order("ts", { ascending: false }).limit(500),
    ])
    if (pRes.error) return { ok: false, pulled: 0, error: pRes.error.message }
    if (rRes.error) return { ok: false, pulled: 0, error: rRes.error.message }
    if (aRes.error) return { ok: false, pulled: 0, error: aRes.error.message }

    const local = read()

    const cloudPatients: Patient[] = (pRes.data ?? []).map((row: any) => ({
      id: row.id, mrn: row.mrn, name: row.name, age: row.age ?? "",
      gender: row.gender ?? "Male", doctor: row.doctor ?? "", date: row.date ?? "",
      labNumber: row.lab_number ?? "", phone: row.phone ?? undefined,
      status: row.status ?? "registered", createdAt: row.created_at ?? Date.now(),
    }))

    const cloudReports: Report[] = (rRes.data ?? []).map((row: any) => ({
      id: row.id, patientId: row.patient_id, labNumber: row.lab_number ?? "",
      panels: row.panels ?? [], results: row.results ?? {},
      activeTests: row.active_tests ?? undefined,
      createdAt: row.created_at ?? Date.now(), updatedAt: row.updated_at ?? Date.now(),
    }))

    const cloudAudit: AuditEntry[] = (aRes.data ?? []).map((row: any) => ({
      id: row.id, timestamp: row.ts ?? Date.now(),
      action: row.action ?? "", details: row.details ?? "",
    }))

    const pMap = new Map<string, Patient>()
    local.patients.forEach((p) => pMap.set(p.id, p))
    cloudPatients.forEach((p) => pMap.set(p.id, p))
    const mergedPatients = Array.from(pMap.values())

    const rMap = new Map<string, Report>()
    local.reports.forEach((r) => rMap.set(r.id, r))
    cloudReports.forEach((r) => rMap.set(r.id, r))
    const mergedReports = Array.from(rMap.values())

    const aMap = new Map<string, AuditEntry>()
    local.auditLogs.forEach((a) => aMap.set(a.id, a))
    cloudAudit.forEach((a) => aMap.set(a.id, a))
    const mergedAudit = Array.from(aMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 500)

    const lastLab = mergedPatients.reduce((max, p) => {
      const n = Number.parseInt(p.labNumber, 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, local.lastLabNumber)
    const lastMRN = mergedPatients.reduce((max, p) => {
      const m = /^M-(\d+)$/.exec(p.mrn)
      return m ? Math.max(max, Number.parseInt(m[1], 10)) : max
    }, local.lastMRN)

    const next: DB = {
      ...local, patients: mergedPatients, reports: mergedReports,
      auditLogs: mergedAudit, lastLabNumber: lastLab, lastMRN,
    }
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.localStorage.setItem(SYNC_KEY, String(Date.now()))
    return { ok: true, pulled: mergedPatients.length + mergedReports.length + mergedAudit.length }
  } catch (e) {
    return { ok: false, pulled: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

export function getLastSyncTime(): number {
  if (typeof window === "undefined") return 0
  const v = window.localStorage.getItem(SYNC_KEY)
  return v ? Number.parseInt(v, 10) : 0
}

/* ─── DB API ─── */

export function generateMRN(): string {
  return fmtMRN(read().lastMRN + 1)
}

/** Purges trash items older than TRASH_TTL_MS (30 days). Called on app start. */
export function purgeOldTrash(): number {
  const db = read()
  const cutoff = Date.now() - TRASH_TTL_MS
  const before = db.trash.length
  db.trash = db.trash.filter((t) => t.deletedAt >= cutoff)
  const removed = before - db.trash.length
  if (removed > 0) {
    logInternal(db, "DELETE", `Auto-purged ${removed} trash item(s) older than 30 days`)
    write(db)
  }
  return removed
}

export function initDB() {
  if (typeof window === "undefined") return

  const raw = window.localStorage.getItem(KEY)
  purgeOldTrash()

  // Handle the "just reset" flag
  const resetKey = "DrIsmailLab_ResetEmpty"
  const isReset = window.localStorage.getItem(resetKey) === "1"
  if (isReset) {
    window.localStorage.removeItem(resetKey)
    window.localStorage.removeItem("DrIsmailLab_SkipCloudOnce")
    const db = emptyDB()
    window.localStorage.setItem(KEY, JSON.stringify(db))
    return
  }

  const skipKey = "DrIsmailLab_SkipCloudOnce"
  const skipSync = window.localStorage.getItem(skipKey) === "1"
  if (skipSync) window.localStorage.removeItem(skipKey)

  if (raw) {
    if (cloudEnabled && !skipSync) setTimeout(() => { void syncFromCloud() }, 800)
    return
  }

  // ── First install → seed the 2 demo patients ──
  const db = emptyDB()
  const today = new Date().toISOString().slice(0, 10)
  const p1: Patient = {
    id: uid(), mrn: "M-0001", name: "Ayesha Khan", age: "29", gender: "Female",
    doctor: "Dr. Ismail", date: today, labNumber: "1001",
    createdAt: Date.now() - 86400000, status: "registered",
  }
  const p2: Patient = {
    id: uid(), mrn: "M-0002", name: "Bilal Ahmed", age: "42", gender: "Male",
    doctor: "Dr. Ismail", date: today, labNumber: "1002",
    createdAt: Date.now() - 3600000, status: "registered",
  }
  db.patients = [p1, p2]
  db.reports = [{
    id: uid(), patientId: p1.id, labNumber: "1001", panels: ["cbc"],
    results: { "cbc:hb": "11.2", "cbc:rbc": "4.4", "cbc:hct": "38", "cbc:wbc": "8200", "cbc:plt": "260000" },
    activeTests: ["cbc:hb", "cbc:rbc", "cbc:hct", "cbc:wbc", "cbc:plt"],
    createdAt: Date.now() - 86000000, updatedAt: Date.now() - 86000000,
  }]
  db.lastLabNumber = 1002
  db.lastMRN = 2
  db.auditLogs = [
    { id: uid(), timestamp: Date.now() - 86400000, action: "REGISTER", details: "Registered Ayesha Khan (Lab #1001)" },
    { id: uid(), timestamp: Date.now() - 3600000, action: "REGISTER", details: "Registered Bilal Ahmed (Lab #1002)" },
  ]
  window.localStorage.setItem(KEY, JSON.stringify(db))
  if (cloudEnabled) setTimeout(() => { void pushAllToCloud() }, 800)
}

export function reserveLabNumber(): string {
  const db = read()
  db.lastLabNumber += 1
  write(db)
  return String(db.lastLabNumber)
}

export function generateLabNumber(): string {
  return String(read().lastLabNumber + 1)
}

export function getAllPatients(): Patient[] {
  return read().patients.slice().sort((a, b) => b.createdAt - a.createdAt)
}

export function getPatientById(id: string): Patient | undefined {
  return read().patients.find((p) => p.id === id)
}

export function getVisitsByMRN(mrn: string): Patient[] {
  return read().patients.filter((p) => p.mrn === mrn).sort((a, b) => b.createdAt - a.createdAt)
}

export function searchPatients(q: string): Patient[] {
  const term = q.trim().toLowerCase()
  const all = getAllPatients()
  if (!term) return all
  return all.filter((p) =>
    p.name.toLowerCase().includes(term) ||
    p.labNumber.toLowerCase().includes(term) ||
    p.mrn.toLowerCase().includes(term),
  )
}

export function savePatient(
  input: Omit<Patient, "id" | "createdAt" | "mrn"> & { mrn?: string },
): Patient {
  const db = read()
  let mrn = input.mrn?.trim() || ""
  if (!mrn) {
    db.lastMRN += 1
    mrn = fmtMRN(db.lastMRN)
  }
  const patient: Patient = {
    ...input, mrn, status: input.status ?? "registered",
    id: uid(), createdAt: Date.now(),
  }
  db.patients.push(patient)
  const num = Number.parseInt(input.labNumber, 10)
  if (!Number.isNaN(num) && num > db.lastLabNumber) db.lastLabNumber = num
  db.auditLogs.unshift({
    id: uid(), timestamp: Date.now(), action: "REGISTER",
    details: `Registered ${patient.name} (${patient.mrn} · Lab #${patient.labNumber})`,
  })
  write(db)
  return patient
}

export function getPatientReports(patientId: string): Report[] {
  return read().reports.filter((r) => r.patientId === patientId).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function saveReport(input: {
  patientId: string
  labNumber: string
  panels: string[]
  results: Record<string, string>
  activeTests?: string[]
  id?: string
}): Report {
  const db = read()
  const now = Date.now()

  const pIdx = db.patients.findIndex((p) => p.id === input.patientId)
  if (pIdx >= 0) {
    const cur = db.patients[pIdx].status ?? "registered"
    if (cur === "registered" || cur === "collected" || cur === "in-lab") {
      db.patients[pIdx] = { ...db.patients[pIdx], status: "ready" }
      logInternal(db, "STATUS", `${db.patients[pIdx].name} → Ready`)
    }
  }

  if (input.id) {
    const idx = db.reports.findIndex((r) => r.id === input.id)
    if (idx >= 0) {
      db.reports[idx] = {
        ...db.reports[idx],
        panels: input.panels, results: input.results,
        activeTests: input.activeTests, updatedAt: now,
      }
      logInternal(db, "EDIT", `Updated report for Lab #${input.labNumber}`)
      write(db)
      return db.reports[idx]
    }
  }
  const report: Report = {
    id: uid(), patientId: input.patientId, labNumber: input.labNumber,
    panels: input.panels, results: input.results,
    activeTests: input.activeTests, createdAt: now, updatedAt: now,
  }
  db.reports.push(report)
  logInternal(db, "SAVE", `Saved report for Lab #${input.labNumber} (${input.panels.length} panel(s))`)
  write(db)
  return report
}

export function updatePatientStatus(id: string, status: VisitStatus) {
  const db = read()
  const idx = db.patients.findIndex((p) => p.id === id)
  if (idx < 0) return
  const p = db.patients[idx]
  const cur = p.status ?? "registered"
  if (cur === status) return
  db.patients[idx] = { ...p, status }
  logInternal(db, "STATUS", `${p.name}: ${STATUS_LABELS[cur]} → ${STATUS_LABELS[status]}`)
  write(db)
}

export function updateManyPatientStatus(ids: string[], status: VisitStatus) {
  const db = read()
  const idSet = new Set(ids)
  let changed = 0
  db.patients = db.patients.map((p) => {
    if (!idSet.has(p.id)) return p
    if ((p.status ?? "registered") === status) return p
    changed += 1
    return { ...p, status }
  })
  if (changed > 0) {
    logInternal(db, "STATUS", `Advanced ${changed} visit(s) to ${STATUS_LABELS[status]}`)
    write(db)
  }
}

export function getPatientsByStatus(status: VisitStatus): Patient[] {
  return read().patients
    .filter((p) => (p.status ?? "registered") === status)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function getStatusCounts(): Record<VisitStatus, number> {
  const db = read()
  const counts: Record<VisitStatus, number> = {
    "registered": 0, "collected": 0, "in-lab": 0, "ready": 0, "reported": 0,
  }
  for (const p of db.patients) {
    const s = (p.status ?? "registered") as VisitStatus
    counts[s] = (counts[s] ?? 0) + 1
  }
  return counts
}

/* ═══════════════════════════════════════════════════
   DELETE — always goes to trash
   ═══════════════════════════════════════════════════ */

/** Delete a single report only — moves it to trash. */
export function deleteReport(reportId: string) {
  const db = read()
  const report = db.reports.find((r) => r.id === reportId)
  if (!report) return
  const patient = db.patients.find((p) => p.id === report.patientId)

  db.trash.unshift({
    id: uid(),
    kind: "report",
    label: patient ? `${patient.name} · Lab #${report.labNumber} (single report)` : `Lab #${report.labNumber}`,
    deletedAt: Date.now(),
    patients: patient ? [patient] : [],
    reports: [report],
  })

  db.reports = db.reports.filter((r) => r.id !== reportId)
  logInternal(db, "DELETE", `Moved report to trash for Lab #${report.labNumber}`)
  write(db)
  if (supabase) void supabase.from("reports").delete().eq("id", reportId)
}

/** Delete a whole visit — moves patient + all their reports to trash. */
export function deletePatient(id: string) {
  const db = read()
  const patient = db.patients.find((p) => p.id === id)
  if (!patient) return
  const reports = db.reports.filter((r) => r.patientId === id)

  db.trash.unshift({
    id: uid(),
    kind: "patient",
    label: `${patient.name} · Lab #${patient.labNumber}`,
    deletedAt: Date.now(),
    patients: [patient],
    reports,
  })

  db.patients = db.patients.filter((p) => p.id !== id)
  db.reports = db.reports.filter((r) => r.patientId !== id)
  logInternal(db, "DELETE", `Moved to trash: ${patient.mrn} · Lab #${patient.labNumber} (${patient.name})`)
  write(db)
  if (supabase) {
    void supabase.from("patients").delete().eq("id", id)
    void supabase.from("reports").delete().eq("patient_id", id)
  }
}

/** Delete multiple visits — moves them to trash as one entry. */
export function deletePatients(ids: string[]) {
  const db = read()
  const idSet = new Set(ids)
  const removedPatients = db.patients.filter((p) => idSet.has(p.id))
  const removedReports = db.reports.filter((r) => idSet.has(r.patientId))

  if (removedPatients.length === 0) return

  db.trash.unshift({
    id: uid(),
    kind: "bulk",
    label: `${removedPatients.length} visit${removedPatients.length === 1 ? "" : "s"} deleted`,
    deletedAt: Date.now(),
    patients: removedPatients,
    reports: removedReports,
  })

  db.patients = db.patients.filter((p) => !idSet.has(p.id))
  db.reports = db.reports.filter((r) => !idSet.has(r.patientId))
  logInternal(db, "DELETE", `Moved ${removedPatients.length} visit(s) to trash`)
  write(db)
  if (supabase && ids.length) {
    void supabase.from("patients").delete().in("id", ids)
    void supabase.from("reports").delete().in("patient_id", ids)
  }
}

/** Delete every visit of a person (by MRN) — moves to trash. */
export function deletePatientByMRN(mrn: string) {
  const db = read()
  const visits = db.patients.filter((p) => p.mrn === mrn)
  if (visits.length === 0) return
  const ids = visits.map((v) => v.id)
  const reports = db.reports.filter((r) => ids.includes(r.patientId))
  const name = visits[0]?.name ?? mrn

  db.trash.unshift({
    id: uid(),
    kind: "patient",
    label: `${name} · ${mrn} · ${visits.length} visit${visits.length === 1 ? "" : "s"}`,
    deletedAt: Date.now(),
    patients: visits,
    reports,
  })

  db.patients = db.patients.filter((p) => p.mrn !== mrn)
  db.reports = db.reports.filter((r) => !ids.includes(r.patientId))
  logInternal(db, "DELETE", `Moved ${name} (${mrn}) to trash — ${visits.length} visit(s)`)
  write(db)
  if (supabase && ids.length) {
    void supabase.from("patients").delete().in("id", ids)
    void supabase.from("reports").delete().in("patient_id", ids)
  }
}

/** Delete every patient — moves the entire DB to trash as one entry. */
export function deleteAllPatients() {
  const db = read()
  if (db.patients.length === 0 && db.reports.length === 0) return

  db.trash.unshift({
    id: uid(),
    kind: "bulk",
    label: `All patients · ${db.patients.length} record${db.patients.length === 1 ? "" : "s"}`,
    deletedAt: Date.now(),
    patients: db.patients.slice(),
    reports: db.reports.slice(),
  })

  db.patients = []
  db.reports = []
  logInternal(db, "DELETE_ALL", "Moved all patients to trash")
  write(db)
  if (supabase) {
    void supabase.from("patients").delete().neq("id", "___never___")
    void supabase.from("reports").delete().neq("id", "___never___")
  }
}

/* ═══════════════════════════════════════════════════
   TRASH API
   ═══════════════════════════════════════════════════ */

export function getTrash(): TrashItem[] {
  const db = read()
  return db.trash.slice().sort((a, b) => b.deletedAt - a.deletedAt)
}

export function getTrashCount(): number {
  return read().trash.length
}

/** Restore everything from a trash entry back to the live DB. */
export function restoreTrashItem(trashId: string) {
  const db = read()
  const idx = db.trash.findIndex((t) => t.id === trashId)
  if (idx < 0) return
  const item = db.trash[idx]

  // Restore patients (skip if the same id already exists)
  const existingP = new Set(db.patients.map((p) => p.id))
  for (const p of item.patients) {
    if (!existingP.has(p.id)) db.patients.push(p)
  }
  // Restore reports
  const existingR = new Set(db.reports.map((r) => r.id))
  for (const r of item.reports) {
    if (!existingR.has(r.id)) db.reports.push(r)
  }

  db.trash.splice(idx, 1)
  logInternal(db, "RESTORE", `Restored from trash: ${item.label}`)
  write(db)
}

/** Permanently delete one trash entry — cannot be undone. */
export function purgeTrashItem(trashId: string) {
  const db = read()
  const idx = db.trash.findIndex((t) => t.id === trashId)
  if (idx < 0) return
  const item = db.trash[idx]
  db.trash.splice(idx, 1)
  logInternal(db, "DELETE", `Permanently deleted: ${item.label}`)
  write(db)
}

/** Permanently empty the entire trash. */
export function emptyTrash() {
  const db = read()
  const count = db.trash.length
  if (count === 0) return
  db.trash = []
  logInternal(db, "DELETE", `Emptied trash — ${count} item(s) permanently removed`)
  write(db)
}

/** Days remaining before a trash item is auto-purged. */
export function daysUntilPurge(deletedAt: number): number {
  const expiresAt = deletedAt + TRASH_TTL_MS
  const msLeft = Math.max(0, expiresAt - Date.now())
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000))
}

/* ─── Billing / misc ─── */

export function updatePayment(
  patientId: string,
  payment: {
    amount?: number; discount?: number; paid?: number
    signatureDataUrl?: string; signedAt?: number; signedBy?: string; phone?: string
  },
) {
  const db = read()
  const idx = db.patients.findIndex((p) => p.id === patientId)
  if (idx < 0) return
  db.patients[idx] = { ...db.patients[idx], ...payment }
  const p = db.patients[idx]
  logInternal(db, "PAYMENT", `Updated payment for ${p.name}: charged ${p.amount ?? 0}, paid ${p.paid ?? 0}`)
  write(db)
}

export function markPaid(patientId: string) {
  const db = read()
  const idx = db.patients.findIndex((p) => p.id === patientId)
  if (idx < 0) return
  const p = db.patients[idx]
  const net = Math.max(0, (p.amount ?? 0) - (p.discount ?? 0))
  db.patients[idx] = { ...p, paid: net }
  logInternal(db, "PAYMENT", `Marked fully paid: ${p.name} (Rs. ${net})`)
  write(db)
}

export function logAction(action: string, details: string) {
  const db = read()
  logInternal(db, action, details)
  write(db)
}

function logInternal(db: DB, action: string, details: string) {
  db.auditLogs.unshift({ id: uid(), timestamp: Date.now(), action, details })
  if (db.auditLogs.length > 500) db.auditLogs = db.auditLogs.slice(0, 500)
}

export function getAuditLogs(): AuditEntry[] {
  return read().auditLogs
}

/* ─── PIN API ─── */

export function verifyPin(pin: string): boolean {
  const db = read()
  return (db.adminPin ?? db.pin) === pin
}
export function verifyAdminPin(pin: string): boolean {
  const db = read()
  return (db.adminPin ?? db.pin) === pin
}
export function verifyOperatorPin(pin: string): boolean {
  const db = read()
  return (db.operatorPin ?? DEFAULT_OPERATOR_PIN) === pin
}
export function changePin(oldPin: string, newPin: string): boolean {
  return changeAdminPin(oldPin, newPin)
}
export function changeAdminPin(oldPin: string, newPin: string): boolean {
  const db = read()
  const current = db.adminPin ?? db.pin
  if (current !== oldPin) return false
  db.adminPin = newPin
  db.pin = newPin
  logInternal(db, "PIN", "Admin PIN changed")
  write(db)
  return true
}
export function changeOperatorPin(oldPin: string, newPin: string): boolean {
  const db = read()
  const current = db.operatorPin ?? DEFAULT_OPERATOR_PIN
  if (current !== oldPin) return false
  db.operatorPin = newPin
  logInternal(db, "PIN", "Operator PIN changed")
  write(db)
  return true
}
export function resetPin(): void {
  const db = read()
  db.adminPin = DEFAULT_PIN
  db.pin = DEFAULT_PIN
  logInternal(db, "PIN", "Admin PIN reset to default")
  write(db)
}
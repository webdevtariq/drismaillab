import { getAllPatients, getPatientReports, type Patient, type Report } from "./lab-db"
import { panelById } from "./test-panels"

export type RangePreset = "today" | "week" | "month" | "lastMonth" | "all" | "custom"

export interface StatsInput {
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
}

export interface KPI {
  uniquePatients: number
  visits: number
  tests: number
  topDoctor: string
}

export interface DoctorRow {
  doctor: string
  visits: number
  patients: number
}

export interface TestRow {
  panel: string
  category: string
  count: number
}

export interface DayRow {
  date: string
  visits: number
  patients: number
}

export interface StatsResult {
  kpi: KPI
  doctors: DoctorRow[]
  tests: TestRow[]
  days: DayRow[]
  visitsInRange: Patient[]
}

export function rangeFor(preset: RangePreset): StatsInput {
  const now = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLast = new Date(now.getFullYear(), now.getMonth(), 0)
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 6)

  switch (preset) {
    case "today":
      return { from: iso(now), to: iso(now) }
    case "week":
      return { from: iso(weekAgo), to: iso(now) }
    case "month":
      return { from: iso(startOfMonth), to: iso(endOfMonth) }
    case "lastMonth":
      return { from: iso(startOfLast), to: iso(endOfLast) }
    case "all":
      return { from: "1900-01-01", to: "2999-12-31" }
    case "custom":
    default:
      return { from: iso(startOfMonth), to: iso(now) }
  }
}

export function computeStats({ from, to }: StatsInput): StatsResult {
  const all = getAllPatients()
  const visitsInRange = all.filter((p) => p.date >= from && p.date <= to)

  // Unique patients by MRN
  const uniqueMRNs = new Set(visitsInRange.map((p) => p.mrn))
  const uniquePatients = uniqueMRNs.size

  // Gather reports for visits in range
  const reportByPatient = new Map<string, Report[]>()
  let tests = 0
  const panelCounter = new Map<string, number>()

  for (const v of visitsInRange) {
    const reports = getPatientReports(v.id)
    reportByPatient.set(v.id, reports)
    for (const r of reports) {
      for (const pid of r.panels) {
        // Skip extra CBC pseudo-panels for cleaner reporting
        const realId = pid.startsWith("cbc-extra:") ? "cbc" : pid
        panelCounter.set(realId, (panelCounter.get(realId) ?? 0) + 1)
        const panel = panelById(realId)
        if (panel) {
          tests += panel.tests.filter((t) => (r.results[`${pid}:${t.id}`] ?? "").trim() !== "").length
        }
      }
    }
  }

  // Doctors
  const doctorMap = new Map<string, { visits: number; mrnSet: Set<string> }>()
  for (const v of visitsInRange) {
    const d = v.doctor || "—"
    if (!doctorMap.has(d)) doctorMap.set(d, { visits: 0, mrnSet: new Set() })
    const entry = doctorMap.get(d)!
    entry.visits += 1
    entry.mrnSet.add(v.mrn)
  }
  const doctors: DoctorRow[] = Array.from(doctorMap.entries())
    .map(([doctor, v]) => ({ doctor, visits: v.visits, patients: v.mrnSet.size }))
    .sort((a, b) => b.visits - a.visits)

  // Top tests (panels)
  const testsRows: TestRow[] = Array.from(panelCounter.entries())
    .map(([id, count]) => {
      const panel = panelById(id)
      return { panel: panel?.name ?? id, category: panel?.category ?? "—", count }
    })
    .sort((a, b) => b.count - a.count)

  // Daily breakdown
  const dayMap = new Map<string, { visits: number; mrnSet: Set<string> }>()
  for (const v of visitsInRange) {
    if (!dayMap.has(v.date)) dayMap.set(v.date, { visits: 0, mrnSet: new Set() })
    const entry = dayMap.get(v.date)!
    entry.visits += 1
    entry.mrnSet.add(v.mrn)
  }
  const days: DayRow[] = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, visits: v.visits, patients: v.mrnSet.size }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return {
    kpi: {
      uniquePatients,
      visits: visitsInRange.length,
      tests,
      topDoctor: doctors[0]?.doctor ?? "—",
    },
    doctors,
    tests: testsRows,
    days,
    visitsInRange,
  }
}

export function statsToCSV(result: StatsResult, range: StatsInput): string {
  const lines: string[] = []
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`

  lines.push("DR ISMAIL LAB — REPORT EXPORT")
  lines.push(`Range,${esc(range.from)} to ${esc(range.to)}`)
  lines.push(`Generated,${esc(new Date().toLocaleString("en-GB"))}`)
  lines.push("")

  lines.push("SUMMARY")
  lines.push("Metric,Value")
  lines.push(`Unique Patients,${result.kpi.uniquePatients}`)
  lines.push(`Total Visits,${result.kpi.visits}`)
  lines.push(`Tests Performed,${result.kpi.tests}`)
  lines.push(`Top Doctor,${esc(result.kpi.topDoctor)}`)
  lines.push("")

  lines.push("DOCTORS")
  lines.push("Doctor,Visits,Patients")
  result.doctors.forEach((d) => lines.push(`${esc(d.doctor)},${d.visits},${d.patients}`))
  lines.push("")

  lines.push("TOP TESTS")
  lines.push("Panel,Category,Times Ordered")
  result.tests.forEach((t) => lines.push(`${esc(t.panel)},${esc(t.category)},${t.count}`))
  lines.push("")

  lines.push("DAILY BREAKDOWN")
  lines.push("Date,Visits,Unique Patients")
  result.days.forEach((d) => lines.push(`${d.date},${d.visits},${d.patients}`))

  return lines.join("\n")
}
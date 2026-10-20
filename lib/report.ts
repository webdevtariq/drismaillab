import type { Patient, Report } from "./lab-db"
import { PANELS, panelById, rangeFor, evaluate, EXTRA_TESTS } from "./test-panels"
import { getSettings, type ReportTemplate } from "./settings"
import QRCode from "qrcode"

export type { ReportTemplate } from "./settings"

type Flag = "high" | "low" | "normal" | "none"

interface TestRow {
  id: string
  name: string
  value: string
  unit: string
  range: string
  flag: Flag
  section?: string
}

interface ReportSection {
  id: string
  name: string
  category: string
  tests: TestRow[]
  layout?: "urine" | "stool" | "semen"
}

interface Ctx {
  p: Patient
  sections: ReportSection[]
  printedDay: string
  printedAt: string
  qrDataUrl: string
  tpl: ReportTemplate
}

/* ═══════════════════════════════════════════════════
   LOGOS
   ═══════════════════════════════════════════════════ */

function professionalLogo(): string {
  return `<svg viewBox="0 0 120 130" width="48" height="52" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0e5f6b"/>
        <stop offset="100%" stop-color="#082f38"/>
      </linearGradient>
    </defs>
    <path d="M60 4 L112 22 V60 Q112 100 60 126 Q8 100 8 60 V22 Z" fill="url(#shieldBg)"/>
    <path d="M60 14 L102 30 V60 Q102 94 60 116 Q18 94 18 60 V30 Z" fill="none" stroke="#f5c542" stroke-width="1.6"/>
    <path d="M44 26 L48 36 L54 28 L60 36 L66 28 L72 36 L76 26 L74 42 H46 Z" fill="#f5c542"/>
    <path d="M54 50 H66 V54 H64 V64 L76 86 a3 3 0 0 1 -2.6 4.5 H46.6 a3 3 0 0 1 -2.6 -4.5 L56 64 V54 H54 Z" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M50 80 L70 80 L76 88 a3 3 0 0 1 -2.6 2.5 H46.6 a3 3 0 0 1 -2.6 -2.5 Z" fill="#f5c542"/>
    <circle cx="56" cy="76" r="1.5" fill="#ffffff"/>
    <circle cx="64" cy="74" r="1.2" fill="#ffffff"/>
    <path d="M30 108 L60 96 L90 108 L90 118 L60 108 L30 118 Z" fill="#b8935a"/>
    <text x="60" y="116" text-anchor="middle" font-family="Georgia, serif" font-size="7" font-weight="800" fill="#0b1f3a" letter-spacing="1">LAB</text>
  </svg>`
}

function vijayaLogo(): string {
  return `<svg viewBox="0 0 260 48" width="220" height="42" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 24 H14 L18 12 L26 38 L32 20 L36 28 L42 24 H52" fill="none" stroke="#dc2626" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="64" y="24" font-family="Georgia, serif" font-weight="800" font-size="16" fill="#0f172a">DR ISMAIL LAB</text>
    <text x="65" y="40" font-family="'Segoe UI', Arial, sans-serif" font-weight="500" font-size="7.5" fill="#64748b" letter-spacing="2.4">HEALTH CARE CENTER</text>
  </svg>`
}

function obsidianLogo(): string {
  return `<svg viewBox="0 0 120 100" width="96" height="80" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#8b0000" stroke-width="1.8">
      <line x1="60" y1="50" x2="60" y2="20"/>
      <line x1="60" y1="50" x2="60" y2="80"/>
      <line x1="60" y1="50" x2="30" y2="50"/>
      <line x1="60" y1="50" x2="90" y2="50"/>
      <line x1="60" y1="50" x2="38" y2="28"/>
      <line x1="60" y1="50" x2="82" y2="28"/>
      <line x1="60" y1="50" x2="38" y2="72"/>
      <line x1="60" y1="50" x2="82" y2="72"/>
    </g>
    <g fill="#c8102e">
      <circle cx="60" cy="20" r="8"/>
      <circle cx="60" cy="80" r="8"/>
      <circle cx="30" cy="50" r="8"/>
      <circle cx="90" cy="50" r="8"/>
      <circle cx="38" cy="28" r="6"/>
      <circle cx="82" cy="28" r="6"/>
      <circle cx="38" cy="72" r="6"/>
      <circle cx="82" cy="72" r="6"/>
    </g>
    <circle cx="60" cy="50" r="12" fill="#8b0000"/>
    <circle cx="60" cy="50" r="6" fill="#c8102e"/>
  </svg>`
}

function maccaLogo(): string {
  return `<svg viewBox="0 0 260 48" width="220" height="42" xmlns="http://www.w3.org/2000/svg">
    <text x="2" y="38" font-family="Georgia, serif" font-weight="900" font-style="italic" font-size="28" fill="#b8935a">Dil</text>
    <text x="58" y="20" font-family="Georgia, serif" font-weight="800" font-size="12" fill="#5b1a4a" letter-spacing="1.5">DR ISMAIL LAB</text>
    <line x1="58" y1="26" x2="150" y2="26" stroke="#b8935a" stroke-width="0.8"/>
    <text x="58" y="40" font-family="'Segoe UI', Arial, sans-serif" font-weight="500" font-size="7" fill="#8a5b7a" letter-spacing="2.6">HEALTH CARE CENTER</text>
  </svg>`
}

function patnaLogo(): string {
  return `<svg viewBox="0 0 260 48" width="220" height="42" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="22" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="17" fill="#1e40af">DR ISMAIL LAB</text>
    <line x1="0" y1="28" x2="100" y2="28" stroke="#1e40af" stroke-width="2"/>
    <text x="0" y="42" font-family="'Segoe UI', Arial, sans-serif" font-weight="500" font-size="7" fill="#475569" letter-spacing="2.8">HEALTH CARE CENTER</text>
  </svg>`
}

function eurofinsLogo(): string {
  return `<svg viewBox="0 0 260 48" width="220" height="42" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="6" width="42" height="9" fill="#1e3a8a"/>
    <rect x="0" y="19" width="30" height="9" fill="#1e3a8a" opacity="0.7"/>
    <rect x="0" y="32" width="18" height="9" fill="#1e3a8a" opacity="0.4"/>
    <text x="54" y="24" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="14" fill="#0f172a">DR ISMAIL LAB</text>
    <text x="55" y="40" font-family="'Segoe UI', Arial, sans-serif" font-weight="500" font-size="7.5" fill="#64748b" letter-spacing="2.5">HEALTH CARE CENTER</text>
  </svg>`
}

function fakeBarcode(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  const bars: number[] = []
  for (let i = 0; i < 62; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    bars.push((h % 3) + 1)
  }
  let x = 0
  let svg = ""
  bars.forEach((w, i) => {
    if (i % 2 === 0) svg += `<rect x="${x}" y="0" width="${w}" height="26" fill="#0b1f3a"/>`
    x += w + 1
  })
  return `<svg viewBox="0 0 ${x} 26" preserveAspectRatio="none" class="th-barcode-svg" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

/**
 * Public URL for a report. Used inside QR codes.
 *
 * Priority:
 *   1. settings.publicBaseUrl  (recommended)
 *   2. window.location.origin  (web only)
 * Returns "" when neither is usable (Electron without publicBaseUrl).
 *
 * Route format: `${base}/r?id=<reportId>`
 */
function publicReportUrl(id: string): string {
  const s = getSettings()
  if (s.publicBaseUrl && s.publicBaseUrl.trim()) {
    return `${s.publicBaseUrl.trim().replace(/\/+$/, "")}/r?id=${encodeURIComponent(id)}`
  }
  if (typeof window === "undefined") return ""
  const origin = window.location.origin
  if (!origin || !/^https?:\/\//i.test(origin)) return ""
  return `${origin}/r?id=${encodeURIComponent(id)}`
}

export function reportPublicUrl(reportId: string): string {
  return publicReportUrl(reportId)
}

async function makeQr(text: string): Promise<string> {
  if (!text) return ""
  try {
    return await QRCode.toDataURL(text, {
      width: 300,
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1f3a", light: "#ffffff" },
    })
  } catch { return "" }
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtAt(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true })
}

function flagClass(f: Flag): string {
  if (f === "high") return "hi"
  if (f === "low") return "hi"
  return ""
}

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */

const FORCE_ALL_PANELS = new Set<string>(["urine", "stool", "semen", "cbc"])
const EXTRA_PANEL_ID = "extra"

function sectionsData(patient: Patient, reports: Report[]): ReportSection[] {
  const merged: Record<string, string> = {}
  reports.forEach((r) => {
    Object.entries(r.results || {}).forEach(([k, v]) => {
      if ((v ?? "").trim() !== "") merged[k] = v
    })
  })

  const panelIds = new Set<string>()
  const extraIds = new Set<string>()
  reports.forEach((r) => {
    if (!Array.isArray(r.panels)) return
    r.panels.forEach((pid) => {
      if (pid === "extra") return
      if (pid.startsWith("extra:")) extraIds.add(pid.slice(6))
      else panelIds.add(pid)
    })
  })

  const out: ReportSection[] = []

  panelIds.forEach((pid) => {
    const panel = panelById(pid)
    if (!panel) return
    const isForce = FORCE_ALL_PANELS.has(pid)

    const tests: TestRow[] = panel.tests
      .filter((t) => {
        const key = `${pid}:${t.id}`
        if (isForce) return true
        return (merged[key] ?? "").trim() !== ""
      })
      .map((t) => {
        const key = `${pid}:${t.id}`
        const raw = (merged[key] ?? "").trim()
        const value = raw !== "" ? raw : (t.default ?? "")
        const range = rangeFor(t, patient.gender)
        return {
          id: t.id, name: t.name, value,
          unit: t.unit || "", range,
          flag: evaluate(value, range),
          section: t.section,
        }
      })

    if (!tests.length) return

    const layout: ReportSection["layout"] =
      pid === "urine" ? "urine"
      : pid === "stool" ? "stool"
      : pid === "semen" ? "semen"
      : undefined

    out.push({ id: pid, name: panel.name, category: panel.category, tests, layout })
  })

  const extraRows: TestRow[] = []
  extraIds.forEach((id) => {
    const t = EXTRA_TESTS.find((x) => x.id === id)
    if (!t) return
    const key = `extra:${id}`
    const raw = (merged[key] ?? "").trim()
    const value = raw !== "" ? raw : (t.default ?? "")
    const range = rangeFor(t, patient.gender)
    extraRows.push({
      id: t.id, name: t.name, value,
      unit: t.unit || "", range,
      flag: evaluate(value, range),
      section: t.section,
    })
  })

  if (extraRows.length > 0) {
    extraRows.sort((a, b) => (a.section ?? "").localeCompare(b.section ?? ""))
    out.push({
      id: EXTRA_PANEL_ID,
      name: "Extra / Individual Tests",
      category: "Additional",
      tests: extraRows,
    })
  }

  const cbc = out.find((s) => s.id === "cbc")
  const extras = out.find((s) => s.id === EXTRA_PANEL_ID)
  const others = out.filter((s) => s.id !== "cbc" && s.id !== EXTRA_PANEL_ID)

  if (cbc && extras) return [cbc, extras, ...others]
  if (cbc) return [cbc, ...others]
  if (extras) return [extras, ...others]
  return others
}

/* ═══════════════════════════════════════════════════
   TABLE RENDERERS
   ═══════════════════════════════════════════════════ */

function renderStdTable(tests: TestRow[]): string {
  const rows = tests.map((t) => `
    <tr>
      <td class="c-name">${esc(t.name)}</td>
      <td class="c-val ${flagClass(t.flag)}">${esc(t.value || "—")}${t.unit ? " " + esc(t.unit) : ""}</td>
      <td class="c-range">${esc(t.range) || "—"}</td>
    </tr>`).join("")
  return `<table class="report-table">
      <thead><tr><th>Test</th><th>Result</th><th>Normal Range</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
}

function renderTwoColTable(title: string, leftTests: TestRow[], rightTests: TestRow[]): string {
  const max = Math.max(leftTests.length, rightTests.length)
  let rows = ""
  for (let i = 0; i < max; i++) {
    const l = leftTests[i]
    const r = rightTests[i]
    const lVal = l ? `${esc(l.value || "—")}${l.unit ? " " + esc(l.unit) : ""}` : ""
    const rVal = r ? `${esc(r.value || "—")}${r.unit ? " " + esc(r.unit) : ""}` : ""
    rows += `<tr>
      <td class="c-name">${l ? esc(l.name) : ""}</td>
      <td class="c-val ${l ? flagClass(l.flag) : ""}">${lVal}</td>
      <td class="c-name">${r ? esc(r.name) : ""}</td>
      <td class="c-val ${r ? flagClass(r.flag) : ""}">${rVal}</td>
    </tr>`
  }
  return `<h4 class="section-heading">${esc(title)}</h4><table class="report-table two-col"><tbody>${rows}</tbody></table>`
}

function renderUrineBody(sec: ReportSection): string {
  const t = (id: string) => sec.tests.find((x) => x.id === id)
  const pick = (ids: string[]) => ids.map(t).filter((x): x is TestRow => !!x)
  return renderTwoColTable("PHYSICAL EXAMINATION",
      pick(["u_quantity", "u_colour", "u_sg", "u_ph", "u_blood", "u_nitrite"]),
      pick(["u_protein", "u_sugar", "u_ketone", "u_bilirubin", "u_urobilinogen", "u_leucocytes"]))
    + renderTwoColTable("MICROSCOPIC EXAMINATION",
      pick(["u_pus_cells", "u_red_cells", "u_epithelial_cells", "u_yeast_cells", "u_uric_acid_crystals", "u_calcium_oxalate", "u_calcium_carbonate", "u_mucus_threads"]),
      pick(["u_spermatozoa", "u_rbc_cast", "u_granular_cast", "u_cocco_bacteria", "u_amorphous", "u_wbc_cast", "u_calcium_phosphate"]))
}

function renderStoolBody(sec: ReportSection): string {
  const t = (id: string) => sec.tests.find((x) => x.id === id)
  const pick = (ids: string[]) => ids.map(t).filter((x): x is TestRow => !!x)
  return renderTwoColTable("PHYSICAL EXAMINATION",
      pick(["stool_color", "stool_consistency", "stool_blood", "stool_worms"]),
      pick(["stool_ph", "stool_occult_blood", "stool_mucus"]))
    + renderTwoColTable("MICROSCOPIC EXAMINATION",
      pick(["stool_pus_cells", "stool_rbc", "stool_epithelial_cells", "stool_bacteria"]),
      pick(["stool_ova_cysts", "stool_parasites", "stool_fat_globules", "stool_yeast_cells", "stool_trophozoites", "stool_granular_cast", "stool_fat_bodies", "stool_undigested_food", "stool_hpylori", "stool_culture"]))
}

function renderSemenBody(sec: ReportSection): string {
  const groups: { title: string; ids: string[] }[] = [
    { title: "Semen Examination", ids: ["sem_days"] },
    { title: "Physical and Chemical Exam", ids: ["sem_color", "sem_volume", "sem_ph"] },
    { title: "Motility", ids: ["sem_active", "sem_sluggish", "sem_dead"] },
    { title: "Morphology", ids: ["sem_normal", "sem_abnormal", "sem_pus"] },
    { title: "Total Count", ids: ["sem_total"] },
  ]
  return groups.map((g) => {
    const tests = g.ids.map((id) => sec.tests.find((x) => x.id === id)).filter((x): x is TestRow => !!x)
    if (!tests.length) return ""
    return `<h4 class="section-heading compact">${esc(g.title.toUpperCase())}</h4>${renderStdTable(tests)}`
  }).join("")
}

function renderGenericBody(sec: ReportSection): string {
  const DEFAULT_KEY = "__no_section__"
  const map = new Map<string, TestRow[]>()
  sec.tests.forEach((t) => {
    const s = t.section || DEFAULT_KEY
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(t)
  })
  return Array.from(map.entries())
    .map(([title, tests]) => {
      if (title === DEFAULT_KEY) return renderStdTable(tests)
      return `<h4 class="section-heading">${esc(title.toUpperCase())}</h4>${renderStdTable(tests)}`
    })
    .join("")
}

function renderObsidianBody(sec: ReportSection): string {
  const DEFAULT_KEY = "__no_section__"
  const map = new Map<string, TestRow[]>()
  sec.tests.forEach((t) => {
    const s = t.section || DEFAULT_KEY
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(t)
  })

  let rows = ""
  for (const [section, tests] of map.entries()) {
    if (section !== DEFAULT_KEY) {
      rows += `<tr class="ob-sub"><td colspan="3">${esc(section.toUpperCase())}</td></tr>`
    }
    for (const t of tests) {
      rows += `<tr>
        <td class="c-name">${esc(t.name)}</td>
        <td class="c-val ${flagClass(t.flag)}">${esc(t.value || "—")}${t.unit ? " " + esc(t.unit) : ""}</td>
        <td class="c-range">${esc(t.range) || "—"}</td>
      </tr>`
    }
  }

  return `
    <h4 class="section-heading">${esc(sec.name.toUpperCase())}</h4>
    <table class="report-table ob-table">
      <thead><tr><th>TEST</th><th>RESULT</th><th>REFERENCE RANGE</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

function renderExtrasBody(sec: ReportSection): string {
  const map = new Map<string, TestRow[]>()
  sec.tests.forEach((t) => {
    const s = t.section || "Additional Tests"
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(t)
  })
  return Array.from(map.entries())
    .map(
      ([title, tests]) =>
        `<h4 class="section-heading">${esc(title.toUpperCase())}</h4>${renderStdTable(tests)}`,
    )
    .join("")
}

function renderPanel(sec: ReportSection): string {
  if (sec.layout === "urine") return renderUrineBody(sec)
  if (sec.layout === "stool") return renderStoolBody(sec)
  if (sec.layout === "semen") return renderSemenBody(sec)
  if (sec.id === EXTRA_PANEL_ID) return renderExtrasBody(sec)
  return `<h4 class="section-heading">${esc(sec.name.toUpperCase())}</h4>${renderGenericBody(sec)}`
}

function renderPanelObsidian(sec: ReportSection): string {
  if (sec.layout === "urine") return renderUrineBody(sec)
  if (sec.layout === "stool") return renderStoolBody(sec)
  if (sec.layout === "semen") return renderSemenBody(sec)
  if (sec.id === EXTRA_PANEL_ID) return renderExtrasBody(sec)
  return renderObsidianBody(sec)
}

/* ═══════════════════════════════════════════════════
   HEADERS
   ═══════════════════════════════════════════════════ */

function headerClinical(p: Patient): string {
  return `
    <div class="vj-top"><div class="vj-logo-wrap">${vijayaLogo()}</div></div>
    <div class="vj-report-box">TEST REPORT</div>
    <table class="vj-info">
      <tr>
        <td class="vj-lbl">Name</td><td class="vj-colon">:</td><td class="vj-val vj-name">${esc(p.name)}</td>
        <td class="vj-lbl">Registered on</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.date)}</td>
      </tr>
      <tr>
        <td class="vj-lbl">Age/Gender</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.age || "—")} Years / ${esc(p.gender)}</td>
        <td class="vj-lbl">Collected on</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.date)}</td>
      </tr>
      <tr>
        <td class="vj-lbl">Patient ID</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.mrn)}</td>
        <td class="vj-lbl">Released on</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.date)}</td>
      </tr>
      <tr>
        <td class="vj-lbl">Ref. By</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.doctor || "Self")}</td>
        <td class="vj-lbl">Printed on</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.date)}</td>
      </tr>
      <tr>
        <td class="vj-lbl">Sample Type</td><td class="vj-colon">:</td><td class="vj-val">Blood/Serum</td>
        <td class="vj-lbl">Lab No.</td><td class="vj-colon">:</td><td class="vj-val">${esc(p.labNumber)}</td>
      </tr>
    </table>`
}

function headerObsidian(p: Patient, qrDataUrl: string): string {
  const s = getSettings()
  return `
    <div class="ob-top">
      <div class="ob-logo">${obsidianLogo()}</div>
      <div class="ob-address">
        <div class="ob-line"><b>${esc(s.address || "Plot # 100, Wing-3, DHA, Karachi")}</b></div>
        <div class="ob-line">Ph: ${esc(s.phone || "0300-0000000")}</div>
        <div class="ob-line">Email: ${esc(s.email || "info@drismaillab.com")}</div>
        <div class="ob-line">Website: drismaillab.com</div>
      </div>
      <div class="ob-qr">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ""}
      </div>
    </div>

    <div class="ob-mid">
      <div class="ob-mid-left">
        <div class="ob-mid-title">DR ISMAIL LAB</div>
        <div class="ob-mid-sub">${esc(s.labTag || "DIAGNOSTIC & RESEARCH LABORATORY")}</div>
      </div>
      <div class="ob-mid-right">
        <div class="ob-phone-badge">
          <b>Phone:</b> ${esc(s.phone || "0300-0000000")}
        </div>
      </div>
    </div>

    <div class="ob-bar">${esc(s.labName || "DR ISMAIL LAB")}</div>

    <table class="ob-info">
      <tr>
        <td class="ob-lbl">Lab. No.</td>
        <td class="ob-val ob-mono ob-strong">${esc(p.labNumber)}</td>
        <td class="ob-lbl">Date</td>
        <td class="ob-val">${esc(p.date)}</td>
      </tr>
      <tr>
        <td class="ob-lbl">Patient Name</td>
        <td class="ob-val ob-strong">${esc(p.name)}</td>
        <td class="ob-lbl">Sex</td>
        <td class="ob-val">${esc(p.gender)}</td>
      </tr>
      <tr>
        <td class="ob-lbl">Ref. By</td>
        <td class="ob-val">${esc(p.doctor || "SELF")}</td>
        <td class="ob-lbl">Age</td>
        <td class="ob-val">${esc(p.age || "—")} Years</td>
      </tr>
      <tr>
        <td class="ob-lbl">Sample Coll. At</td>
        <td class="ob-val" colspan="3">${esc(s.labName || "DR ISMAIL LAB")}</td>
      </tr>
    </table>`
}

function headerBoutique(p: Patient, qrDataUrl: string): string {
  const s = getSettings()
  const domain = s.email && s.email.includes("@") ? s.email.split("@")[1] : "drismailab.com"
  return `
    <div class="th-header">
      <div class="th-brand">
        <div class="th-logo">${professionalLogo()}</div>
        <div class="th-brand-text">
          <div class="th-title">DR ISMAIL LAB</div>
          <div class="th-subtitle">Final Laboratory Report</div>
          <div class="th-tagline">Accuracy Deserve Trust&nbsp; | &nbsp;Phone: ${esc(s.phone || "—")}&nbsp; | &nbsp;Email: ${esc(s.email || "—")}</div>
          <div class="th-address">Main Branch, Health Care District</div>
        </div>
      </div>
    </div>
    <div class="th-bar">
      <div class="th-bar-stripes"><span class="s1"></span><span class="s2"></span><span class="s3"></span></div>
      <div class="th-bar-right">${esc(domain)}</div>
    </div>
    <div class="th-patient">
      <div class="th-pcol th-pcol-1">
        <div class="th-pname">${esc(p.name)}</div>
        <div class="th-pmeta">Age : ${esc(p.age || "—")} years</div>
        <div class="th-pmeta">Sex : ${esc(p.gender)}</div>
        <div class="th-pmeta">Lab No : ${esc(p.labNumber)}</div>
      </div>
      <div class="th-pcol th-pcol-qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" class="th-qr" />` : ""}</div>
      <div class="th-pcol th-pcol-2">
        <div class="th-plabel">Sample Collected At:</div>
        <div class="th-pvalue">Laboratory</div>
        <div class="th-plabel" style="margin-top:6px;">Ref. By:</div>
        <div class="th-pvalue">${esc(p.doctor || "—")}</div>
      </div>
      <div class="th-pcol th-pcol-3">
        <div class="th-barcode">${fakeBarcode(String(p.labNumber) + p.mrn)}</div>
        <div class="th-labno">DR-ISMAIL-LAB-${esc(p.labNumber)}</div>
        <div class="th-ptime"><b>Registered on:</b> ${esc(p.date)}</div>
        <div class="th-ptime"><b>Collected on:</b> ${esc(p.date)}</div>
        <div class="th-ptime"><b>Reported on:</b> ${esc(p.date)}</div>
      </div>
    </div>`
}

function headerEditorial(p: Patient): string {
  return `
    <div class="pt-top"><div class="pt-top-left">${patnaLogo()}</div></div>
    <div class="pt-info">
      <div class="pt-info-col">
        <div class="pt-row"><span>Name:</span><b>${esc(p.name)}</b></div>
        <div class="pt-row"><span>Age:</span><b>${esc(p.age || "—")}</b></div>
        <div class="pt-row"><span>Sex:</span><b>${esc(p.gender)}</b></div>
        <div class="pt-row"><span>Patient ID:</span><b>${esc(p.mrn)}</b></div>
      </div>
      <div class="pt-info-col pt-info-center">
        <div class="pt-row"><span>Lab No:</span><b>${esc(p.labNumber)}</b></div>
        <div class="pt-row"><span>Ref. By:</span><b class="pt-blue">${esc(p.doctor || "—")}</b></div>
        <div class="pt-row"><span>Specimen:</span><b>Blood/Serum</b></div>
      </div>
      <div class="pt-info-col pt-info-right">
        <div class="pt-row"><span>Collected on:</span><b>${esc(p.date)}</b></div>
        <div class="pt-row"><span>Reported on:</span><b>${esc(p.date)}</b></div>
        <div class="pt-row"><span>Status:</span><b>FINAL</b></div>
      </div>
    </div>`
}

function headerChart(p: Patient): string {
  return `
    <header class="eu-top"><div class="eu-brand">${eurofinsLogo()}</div></header>
    <div class="eu-hr"></div>
    <table class="eu-meta">
      <tr><td class="eu-ml">Patient Name:</td><td class="eu-mv eu-mv-strong">${esc(p.name)}</td><td class="eu-ml">Patient ID:</td><td class="eu-mv">${esc(p.mrn)}</td></tr>
      <tr><td class="eu-ml">Age / Sex:</td><td class="eu-mv">${esc(p.age || "—")} / ${esc(p.gender)}</td><td class="eu-ml">Requested by:</td><td class="eu-mv">${esc(p.doctor || "—")}</td></tr>
      <tr><td class="eu-ml">Specimen:</td><td class="eu-mv">Blood/Serum</td><td class="eu-ml">Sample date:</td><td class="eu-mv">${esc(p.date)}</td></tr>
      <tr><td class="eu-ml">Lab No:</td><td class="eu-mv">${esc(p.labNumber)}</td><td class="eu-ml">Reported:</td><td class="eu-mv">${esc(p.date)}</td></tr>
    </table>`
}

/* ═══════════════════════════════════════════════════
   SIGNATURE / FOOTER BLOCKS
   ═══════════════════════════════════════════════════ */

function signatureBlock(p: Patient): string {
  const s = getSettings()
  const sig = p.signatureDataUrl || s.signatureDataUrl || ""
  const sigImg = sig
    ? `<img src="${sig}" alt="signature" style="max-height:40px;max-width:150px;display:block;margin:0 auto 3px;object-fit:contain;" />`
    : `<div style="width:140px;border-top:1px solid #64748b;margin:0 auto 3px;height:0;"></div>`
  return `
  <div class="sig-row">
    <div class="sig sig-primary">
      <div class="sig-line"></div>
      <div class="sig-name">Dr. Ismail</div>
      <div class="sig-cred">MBBS, MCPS RADIOLOGY, SIUT KARACHI, FRC R1 UK</div>
      <div class="sig-spec">SPECIALIST IN (Consultant Radiologist and ULTRA SOUND SPECIALIST)</div>
    </div>
    <div class="sig sig-owner">
      ${sigImg}
      <div class="sig-name">(Lab owner Signature: Ishaq)</div>
    </div>
  </div>`
}

function obsidianSignatureBlock(p: Patient): string {
  const s = getSettings()
  const sig = p.signatureDataUrl || s.signatureDataUrl || ""
  const sigImg = sig
    ? `<img src="${sig}" alt="signature" class="ob-sig-img" />`
    : `<div class="ob-sig-line"></div>`

  return `
    <div class="ob-sig-row">
      <div class="ob-sig-block">
        <div class="ob-sig-line"></div>
        <div class="ob-sig-name">Dr. Ismail</div>
        <div class="ob-sig-cred">MBBS, MCPS RADIOLOGY, SIUT KARACHI, FRC R1 UK</div>
        <div class="ob-sig-spec">SPECIALIST IN (Consultant Radiologist and ULTRA SOUND SPECIALIST)</div>
      </div>
      <div class="ob-sig-block">
        <div class="ob-sig-note">
          Printed through Value Indicator: Abnormal<br/>
          Reported by: ${esc(s.labName || "DR ISMAIL LAB")} — <i>www.drismaillab.com</i>
        </div>
      </div>
      <div class="ob-sig-block">
        ${sigImg}
        <div class="ob-sig-name">(Lab owner Signature: Ishaq)</div>
      </div>
    </div>`
}

function reportFooter(): string {
  const s = getSettings()
  return `<div class="report-footer">
    <span>Ph: ${esc(s.phone)}</span>
    <span>${esc(s.email || "")}</span>
  </div>`
}

function boutiqueInFlowFooter(p: Patient): string {
  const s = getSettings()
  const sig = p.signatureDataUrl || s.signatureDataUrl || ""
  const sigImg = sig
    ? `<img src="${sig}" alt="signature" style="max-height:36px;max-width:140px;display:block;margin:0 auto 2px;object-fit:contain;" />`
    : `<div style="width:130px;border-top:1px solid #64748b;margin:0 auto 2px;height:0;"></div>`
  return `
    <div class="th-footer-block">
      <div class="th-note">Physical, chemical, and microscopic findings should be correlated with sample quality and clinical context.</div>
      <div class="th-sig-row">
        <div class="th-sig th-sig-primary">
          <div class="th-sig-line"></div>
          <div class="th-sig-name">Dr. Ismail</div>
          <div class="th-sig-cred">MBBS, MCPS RADIOLOGY, SIUT KARACHI, FRC R1 UK</div>
          <div class="th-sig-spec">SPECIALIST IN (Consultant Radiologist and ULTRA SOUND SPECIALIST)</div>
        </div>
        <div class="th-sig th-sig-owner">
          ${sigImg}
          <div class="th-sig-name">(Lab owner Signature: Ishaq)</div>
        </div>
      </div>
    </div>`
}

function boutiqueFixedFooter(): string {
  return `
    <div class="fixed-footer">
      <div class="th-footer-note">
        <span>To verify this report, scan the QR code above.</span>
        <span>Generated by DR ISMAIL LAB LIS</span>
      </div>
      <div class="th-footer-bar">
        <span class="s1"></span><span class="s2"></span><span class="s3"></span><span class="s4"></span><span class="s5"></span><span class="s6"></span>
      </div>
    </div>`
}

/* ═══════════════════════════════════════════════════
   TEMPLATE RENDERERS
   ═══════════════════════════════════════════════════ */

function hospitalHTML(ctx: Ctx): string {
  const { p, sections } = ctx
  return `${headerClinical(p)}
    ${sections.map((sec) => renderPanel(sec)).join("")}
    <div class="vj-end">---- End of Report -----</div>`
}

function maccaHTML(ctx: Ctx): string {
  const { p, sections, qrDataUrl } = ctx
  return `${headerObsidian(p, qrDataUrl)}
    ${sections.map((sec) => renderPanelObsidian(sec)).join("")}
    <div class="ob-end">----- End of Report -----</div>
    ${obsidianSignatureBlock(p)}`
}

function chughtaiHTML(ctx: Ctx): string {
  const { p, sections, qrDataUrl } = ctx
  return `${headerBoutique(p, qrDataUrl)}
    ${sections.map((sec) => renderPanel(sec)).join("")}
    ${boutiqueInFlowFooter(p)}
    ${boutiqueFixedFooter()}`
}

function patnaHTML(ctx: Ctx): string {
  const { p, sections } = ctx
  return `${headerEditorial(p)}
    ${sections.map((sec) => renderPanel(sec)).join("")}
    ${signatureBlock(p)}`
}

function eurofinsHTML(ctx: Ctx): string {
  const { p, sections } = ctx
  return `${headerChart(p)}
    ${sections.map((sec) => renderPanel(sec)).join("")}
    ${signatureBlock(p)}`
}

/* ═══════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════ */

const BASE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    color: #1e2b4f; font-size: 11px; line-height: 1.32;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  .hi { color: #dc2626 !important; font-weight: 800; }
  .lo { color: #dc2626 !important; font-weight: 800; }

  .qr-box { position: fixed; top: 8mm; right: 8mm; width: 16mm; height: 16mm; z-index: 50; }
  .qr-box img { width: 100%; height: auto; display: block; }

  .report-footer {
    position: fixed; bottom: 3mm; left: 10mm; right: 10mm; z-index: 40;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 8px; color: #5a6e8a;
    border-top: 1px solid #cbd5e1;
    padding-top: 2px; background: #ffffff; height: 6mm;
  }

  h4.section-heading {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12.5px; font-weight: 700; color: #1e2b4f;
    border-bottom: 1.5px solid #2a3f6e;
    padding-bottom: 2px; margin: 10px 0 5px;
    text-transform: uppercase; letter-spacing: 0.2px;
    page-break-after: avoid; break-after: avoid;
  }
  h4.section-heading.compact { margin: 7px 0 3px; }

  table.report-table {
    width: 100%; border-collapse: collapse;
    font-size: 11px; font-weight: 500; margin-bottom: 6px;
    page-break-inside: avoid; break-inside: avoid;
    table-layout: fixed;
  }
  table.report-table thead th {
    background: #eef2f7; padding: 4px 6px; text-align: left;
    font-weight: 700; color: #1e2b4f;
    border-bottom: 1px solid #b0c0d0; font-size: 10.5px;
  }
  table.report-table thead th:nth-child(1) { width: 46%; }
  table.report-table thead th:nth-child(2) { width: 30%; }
  table.report-table thead th:nth-child(3) { width: 24%; }
  table.report-table td {
    padding: 3px 6px; border-bottom: 1px solid #e0e6ed;
    font-weight: 500; vertical-align: top;
    overflow: hidden; text-overflow: ellipsis;
  }
  table.report-table td.c-name { color: #1e2b4f; font-weight: 600; }
  table.report-table td.c-val { font-weight: 700; color: #0b1f3a; }
  table.report-table td.c-range { color: #475569; font-size: 10.5px; }

  table.report-table.two-col { table-layout: fixed; }
  table.report-table.two-col td:nth-child(1) { width: 30%; color: #1e2b4f; font-weight: 600; }
  table.report-table.two-col td:nth-child(2) { width: 20%; font-weight: 700; color: #0b1f3a; }
  table.report-table.two-col td:nth-child(3) { width: 30%; color: #1e2b4f; font-weight: 600; border-left: 1px solid #e0e6ed; padding-left: 10px; }
  table.report-table.two-col td:nth-child(4) { width: 20%; font-weight: 700; color: #0b1f3a; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; margin-top: 6px; break-inside: avoid; page-break-inside: avoid; }
  .sig-line { width: 170px; border-top: 1px solid #0f172a; margin-bottom: 4px; }
  .sig-primary .sig-line { border-color: #1e3a8a; }
  .sig-name { font-size: 11px; font-weight: 800; color: #0f172a; }
  .sig-cred { font-size: 8.5px; color: #334155; margin-top: 1px; font-weight: 600; }
  .sig-spec { font-size: 8px; color: #64748b; margin-top: 1px; font-style: italic; max-width: 260px; }
  .sig-owner .sig-name { font-size: 10.5px; color: #334155; }
  .sig-owner .sig-line { border-color: #64748b; width: 145px; }
`

const CSS_CLINICAL = BASE + `
  @page { size: A4; margin: 10mm 10mm 12mm 10mm; }
  .vj-top { display: flex; justify-content: flex-start; align-items: center; padding-bottom: 6px; border-bottom: 1.5px solid #8b1a3d; margin-bottom: 8px; }
  .vj-report-box { display: block; border: 1.5px solid #0f172a; padding: 3px 24px; font-size: 12px; font-weight: 800; letter-spacing: 2px; margin: 6px auto 8px; text-align: center; width: fit-content; }
  table.vj-info { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
  table.vj-info td { padding: 2px 6px; vertical-align: top; }
  .vj-lbl { color: #334155; font-weight: 500; width: 90px; }
  .vj-colon { width: 8px; color: #64748b; }
  .vj-val { color: #0f172a; font-weight: 700; width: 200px; }
  .vj-name { font-weight: 800; }
  table.vj-info td:nth-child(4) { width: 110px; padding-left: 14px; }
  .vj-end { text-align: center; font-size: 10px; color: #94a3b8; letter-spacing: 1px; margin: 8px 0 4px; }
  h4.section-heading { background: #4a1259; color: #fff; border: none; padding: 4px 10px; border-radius: 2px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; letter-spacing: 1.2px; margin: 8px 0 4px; }
  table.report-table thead th { background: #f8f4fa; color: #4a1259; border-bottom: 1px solid #4a1259; }
`

const CSS_OBSIDIAN = BASE + `
  @page { size: A4; margin: 8mm 10mm 12mm 10mm; }

  .ob-top {
    display: grid;
    grid-template-columns: 110px 1fr 90px;
    gap: 10px;
    align-items: center;
    padding-bottom: 6px;
    border-bottom: 2px solid #0b1f3a;
    margin-bottom: 0;
  }
  .ob-logo { display: flex; align-items: center; justify-content: flex-start; }
  .ob-address {
    text-align: center;
    font-size: 9px;
    line-height: 1.5;
    color: #0b1f3a;
  }
  .ob-address .ob-line { margin: 0; }

  .ob-qr {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .ob-qr img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    display: block;
  }

  .ob-mid {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #e8e8e8;
    padding: 8px 12px;
    margin-bottom: 0;
  }
  .ob-mid-left { flex: 1; }
  .ob-mid-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-weight: 900;
    color: #0b1f3a;
    letter-spacing: -0.5px;
    line-height: 1.05;
  }
  .ob-mid-sub {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 8.5px;
    font-weight: 800;
    color: #c8102e;
    letter-spacing: 2.8px;
    margin-top: 2px;
    text-transform: uppercase;
  }
  .ob-mid-right { flex-shrink: 0; }
  .ob-phone-badge {
    background: #c8102e;
    color: #ffffff;
    padding: 5px 10px;
    font-size: 8.5px;
    font-weight: 700;
    line-height: 1.4;
    border-radius: 4px;
    text-align: left;
    max-width: 240px;
    white-space: nowrap;
  }

  .ob-bar {
    background: #0b1f3a;
    color: #ffffff;
    text-align: center;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 3px;
    padding: 3px 8px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }

  table.ob-info {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    border: 1px solid #94a3b8;
    font-size: 10px;
  }
  table.ob-info td {
    padding: 4px 8px;
    border: 1px solid #cbd5e1;
    vertical-align: middle;
  }
  .ob-lbl {
    background: #f1f5f9;
    color: #0b1f3a;
    font-weight: 700;
    font-size: 9px;
    letter-spacing: 0.4px;
    width: 18%;
    text-transform: uppercase;
  }
  .ob-val { color: #0f172a; font-weight: 600; width: 32%; }
  .ob-strong { font-weight: 800; }
  .ob-mono { font-family: 'Courier New', monospace; letter-spacing: 0.5px; }

  h4.section-heading {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    font-weight: 800;
    color: #1e40af;
    text-align: center;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 0;
    margin: 14px 0 6px;
    letter-spacing: 0.6px;
    border: none;
    text-transform: uppercase;
  }
  h4.section-heading.compact { margin: 8px 0 4px; font-size: 11px; }

  table.report-table.ob-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #cbd5e1;
    margin-bottom: 4px;
    table-layout: fixed;
    font-size: 10.5px;
  }
  table.report-table.ob-table thead th {
    background: #f1f5f9;
    color: #0b1f3a;
    border-bottom: 1px solid #94a3b8;
    border-right: 1px solid #cbd5e1;
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 4px 8px;
    text-align: left;
  }
  table.report-table.ob-table thead th:last-child { border-right: none; }
  table.report-table.ob-table td {
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    padding: 4px 8px;
    font-size: 10.5px;
    vertical-align: top;
  }
  table.report-table.ob-table td:last-child { border-right: none; }
  table.report-table.ob-table td.c-name { color: #0f172a; font-weight: 600; }
  table.report-table.ob-table td.c-val { color: #0b1f3a; font-weight: 800; }
  table.report-table.ob-table td.c-range { color: #475569; }
  table.report-table.ob-table tr:last-child td { border-bottom: none; }

  table.report-table.ob-table tr.ob-sub td {
    background: #f8fafc;
    font-weight: 800;
    color: #0b1f3a;
    font-size: 10px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 5px 8px;
  }

  table.report-table.two-col { border: 1px solid #cbd5e1; }
  table.report-table.two-col td { border-bottom: 1px solid #e2e8f0; }

  .ob-end {
    text-align: center;
    font-size: 10px;
    color: #0b1f3a;
    letter-spacing: 1px;
    margin: 12px 0 6px;
    font-weight: 600;
  }

  .ob-sig-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: end;
    gap: 12px;
    margin-top: 28px;
    padding-top: 16px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .ob-sig-block { text-align: center; }
  .ob-sig-img {
    max-height: 38px;
    max-width: 140px;
    display: block;
    margin: 0 auto 4px;
    object-fit: contain;
  }
  .ob-sig-line {
    width: 130px;
    border-top: 1px solid #0b1f3a;
    margin: 0 auto 4px;
    height: 0;
  }
  .ob-sig-name {
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
  }
  .ob-sig-cred {
    font-size: 8px;
    color: #334155;
    margin-top: 1px;
    font-weight: 600;
    line-height: 1.3;
  }
  .ob-sig-spec {
    font-size: 7px;
    color: #64748b;
    margin-top: 2px;
    font-style: italic;
    line-height: 1.35;
    max-width: 200px;
    margin-left: auto;
    margin-right: auto;
  }
  .ob-sig-note {
    font-size: 7px;
    color: #64748b;
    text-align: center;
    line-height: 1.5;
    font-style: italic;
    padding-bottom: 6px;
  }
`

const CSS_BOUTIQUE = BASE + `
  @page { size: A4; margin: 10mm 10mm 20mm 10mm; }

  .th-header { padding-bottom: 4px; margin-top: -4px; }
  .th-brand { display: flex; align-items: flex-start; gap: 12px; }
  .th-logo { flex-shrink: 0; }
  .th-brand-text { flex: 1; }
  .th-title {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 24px; font-weight: 900; letter-spacing: -0.5px;
    color: #1f7a8c; line-height: 1.05;
  }
  .th-subtitle { font-size: 11.5px; font-weight: 800; color: #0f172a; margin-top: 2px; }
  .th-tagline { font-size: 8.5px; color: #475569; margin-top: 2px; }
  .th-address { font-size: 8.5px; color: #475569; font-weight: 600; margin-top: 1px; }

  .th-bar {
    display: flex; align-items: stretch; height: 20px; margin: 6px 0 8px;
    background: #0b1f3a;
  }
  .th-bar-stripes { flex: 1; display: flex; align-items: stretch; overflow: hidden; }
  .th-bar-stripes span { display: inline-block; height: 100%; }
  .th-bar-stripes .s1 { width: 12px; background: #0b1f3a; transform: skewX(-25deg); margin-right: 5px; }
  .th-bar-stripes .s2 { width: 20px; background: #0b1f3a; transform: skewX(-25deg); margin-right: 5px; }
  .th-bar-stripes .s3 { width: 130px; background: #1f7a8c; transform: skewX(-25deg); }
  .th-bar-right {
    background: #1f7a8c; color: #fff; padding: 3px 14px;
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px;
    display: flex; align-items: center;
  }

  .th-patient {
    display: grid; grid-template-columns: 1.4fr 82px 1.3fr 1.5fr;
    gap: 8px; padding: 8px 10px;
    border: 1px solid #cbd5e1; border-radius: 2px;
    margin-bottom: 10px; background: #fff;
    page-break-inside: avoid; break-inside: avoid;
  }
  .th-pcol { min-width: 0; }
  .th-pname { font-size: 16px; font-weight: 900; color: #0b1f3a; margin-bottom: 3px; }
  .th-pmeta { font-size: 9.5px; color: #334155; margin-top: 1px; }
  .th-pcol-qr { display: flex; align-items: flex-start; justify-content: center; }
  .th-qr { width: 74px; height: 74px; object-fit: contain; }
  .th-plabel { font-size: 8.5px; color: #64748b; }
  .th-pvalue { font-size: 10px; color: #0f172a; font-weight: 700; }
  .th-barcode { display: flex; justify-content: flex-end; margin-bottom: 3px; }
  .th-barcode-svg { width: 130px; height: 26px; display: block; }
  .th-labno { font-size: 9px; font-weight: 800; color: #0b1f3a; text-align: right; margin-bottom: 3px; letter-spacing: 0.3px; }
  .th-ptime { font-size: 8.5px; color: #334155; text-align: right; margin-top: 1px; }
  .th-ptime b { color: #0f172a; }

  h4.section-heading {
    background: #0b1f3a; color: #ffffff;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px; font-weight: 800;
    letter-spacing: 1px;
    padding: 4px 10px;
    border: none; border-radius: 0;
    margin: 10px 0 4px;
    text-transform: uppercase;
    page-break-after: avoid; break-after: avoid;
  }
  h4.section-heading.compact { margin: 6px 0 3px; padding: 3px 10px; }

  table.report-table thead th {
    background: #f1f5f9; color: #0b1f3a;
    border-bottom: 1px solid #cbd5e1;
    font-size: 10px; font-weight: 800; letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  table.report-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  table.report-table td.c-name { color: #0b1f3a; font-weight: 600; }
  table.report-table td.c-val { color: #0b1f3a; font-weight: 800; }
  table.report-table td.c-range { color: #475569; }

  .th-footer-block {
    margin-top: 12px;
    page-break-inside: avoid; break-inside: avoid;
  }
  .th-note {
    border: 1px solid #cbd5e1; border-left: 3px solid #1f7a8c;
    background: #f0f9fb; padding: 4px 10px;
    font-size: 8.5px; color: #334155;
    margin-bottom: 6px;
  }
  .th-sig-row { display: flex; justify-content: space-between; align-items: flex-end; padding: 2px 0 6px; }
  .th-sig { min-width: 0; }
  .th-sig-primary .th-sig-line { width: 150px; border-top: 1px solid #1e3a8a; margin-bottom: 2px; }
  .th-sig-owner .th-sig-line { width: 130px; border-top: 1px solid #64748b; margin-bottom: 2px; }
  .th-sig-name { font-size: 10px; font-weight: 800; color: #0f172a; }
  .th-sig-cred { font-size: 7.5px; color: #334155; margin-top: 1px; font-weight: 600; }
  .th-sig-spec { font-size: 7px; color: #64748b; margin-top: 1px; font-style: italic; max-width: 240px; }
  .th-sig-owner { text-align: right; }
  .th-sig-owner .th-sig-name { font-size: 9.5px; color: #334155; }

  .fixed-footer {
    position: fixed;
    bottom: 0;
    left: 10mm;
    right: 10mm;
    background: #ffffff;
    padding: 0 0 4mm 0;
    box-sizing: border-box;
    z-index: 55;
  }
  .th-footer-note {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 24px;
    border-top: 1px solid #cbd5e1;
    padding: 3px 0 2px;
    font-size: 7.5px;
    color: #475569;
  }
  .th-footer-bar {
    display: flex;
    align-items: center;
    height: 9px;
    margin-top: 4px;
    background: #0b1f3a;
  }
  .th-footer-bar span {
    display: inline-block;
    height: 100%;
    background: #1f7a8c;
    transform: skewX(-25deg);
    margin-right: 6px;
  }
  .th-footer-bar .s1 { width: 12px; }
  .th-footer-bar .s2 { width: 18px; }
  .th-footer-bar .s3 { width: 55px; }
  .th-footer-bar .s4 { width: 90px; }
  .th-footer-bar .s5 { width: 35px; }
  .th-footer-bar .s6 { width: 180px; }
`

const CSS_EDITORIAL = BASE + `
  @page { size: A4; margin: 10mm 10mm 12mm 10mm; }
  .pt-top { background: #fff; padding: 6px 0 4px; display: flex; justify-content: flex-start; align-items: center; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; }
  .pt-top-left { display: flex; align-items: center; gap: 12px; }
  .pt-info { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 0 16px; padding: 8px 0; border-bottom: 1px dashed #94a3b8; margin-bottom: 8px; }
  .pt-row { font-size: 10.5px; padding: 1px 0; }
  .pt-row span { color: #334155; font-weight: 600; margin-right: 4px; }
  .pt-row b { color: #0f172a; font-weight: 700; }
  .pt-blue { color: #1e3a8a !important; }
  .pt-info-center { text-align: center; }
  .pt-info-right { text-align: right; }
  h4.section-heading { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12.5px; color: #1e3a8a; border: none; padding: 4px 0 2px; margin: 10px 0 4px; text-align: center; letter-spacing: 0.5px; background: transparent; }
  table.report-table thead th { background: #eff6ff; color: #1e40af; border-bottom: 2px solid #1e40af; font-size: 10px; letter-spacing: 0.4px; }
  table.report-table td { border-bottom: 1px dotted #cbd5e1; }
`

const CSS_CHART = BASE + `
  @page { size: A4; margin: 10mm 10mm 12mm 10mm; }
  .eu-top { display: flex; justify-content: flex-start; align-items: flex-start; gap: 20px; padding-bottom: 4px; }
  .eu-brand { display: flex; align-items: flex-start; gap: 14px; }
  .eu-hr { border-top: 1px solid #cbd5e1; margin: 6px 0 8px; }
  table.eu-meta { width: 100%; border-collapse: collapse; margin: 0 0 8px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
  table.eu-meta td { padding: 3px 8px; font-size: 10px; border-bottom: 0.5px solid #eef2f7; }
  table.eu-meta tr:last-child td { border-bottom: none; }
  .eu-ml { background: #f8fafc; color: #475569; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; font-size: 8.5px; width: 16%; }
  .eu-mv { color: #0f172a; font-weight: 600; width: 34%; }
  .eu-mv-strong { font-weight: 800; }
  h4.section-heading { background: #1e40af; color: #fff; border: none; padding: 4px 10px; margin: 8px 0 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.4px; }
  table.report-table { border: 1px solid #dbeafe; border-top: none; margin-bottom: 8px; }
  table.report-table thead th { background: #eff6ff; color: #1e40af; border-bottom: 1px solid #93c5fd; font-size: 10px; }
  table.report-table td { border-bottom: 1px solid #eef2f7; }
`

const CSS: Record<ReportTemplate, string> = {
  hospital: CSS_CLINICAL,
  obsidian: CSS_OBSIDIAN,
  boutique: CSS_BOUTIQUE,
  editorial: CSS_EDITORIAL,
  chart: CSS_CHART,
  slate: CSS_CLINICAL,
  cards: CSS_OBSIDIAN,
}

const RENDERERS: Record<ReportTemplate, (c: Ctx) => string> = {
  hospital: hospitalHTML,
  obsidian: maccaHTML,
  boutique: chughtaiHTML,
  editorial: patnaHTML,
  chart: eurofinsHTML,
  slate: hospitalHTML,
  cards: maccaHTML,
}

function qrBlock(d: string): string {
  if (!d) return ""
  return `<div class="qr-box"><img src="${d}" alt="Scan to verify report"/></div>`
}

/* ═══════════════════════════════════════════════════
   PDF GENERATOR
   ═══════════════════════════════════════════════════ */

async function generatePdfBlob(html: string, tpl: ReportTemplate): Promise<Blob> {
  const s = getSettings()

  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;"
  document.body.appendChild(iframe)

  const idoc = iframe.contentDocument!
  idoc.open()
  idoc.write(html)
  idoc.close()

  await new Promise((r) => setTimeout(r, 400))

  const override = idoc.createElement("style")
  override.textContent = `
    body { padding: 10mm 10mm 22mm 10mm !important; }
    .fixed-footer, .report-footer, .qr-box { display: none !important; }
  `
  idoc.head.appendChild(override)
  await new Promise((r) => setTimeout(r, 200))

  const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ])
  const html2canvas = html2canvasMod.default

  try {
    const target = idoc.body
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      width: target.scrollWidth,
      height: target.scrollHeight,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    })

    const img = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()
    const imgHmm = (canvas.height * pw) / canvas.width
    const footerH = 18
    const contentH = ph - footerH
    const pageCount = Math.max(1, Math.ceil(imgHmm / contentH))

    for (let i = 0; i < pageCount; i++) {
      if (i > 0) pdf.addPage()
      pdf.addImage(img, "PNG", 0, -i * contentH, pw, imgHmm)

      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, ph - footerH, pw, footerH, "F")

      pdf.setDrawColor(203, 213, 225)
      pdf.setLineWidth(0.2)
      pdf.line(10, ph - footerH + 3, pw - 10, ph - footerH + 3)

      pdf.setFontSize(7)
      pdf.setTextColor(90, 110, 138)
      if (tpl === "boutique") {
        pdf.text("To verify this report, scan the QR code above.", 10, ph - footerH + 8)
        pdf.text("Generated by DR ISMAIL LAB LIS", pw - 10, ph - footerH + 8, { align: "right" })
      } else {
        pdf.text(`Ph: ${s.phone}`, 10, ph - footerH + 8)
        pdf.text(s.email || "", pw - 10, ph - footerH + 8, { align: "right" })
      }
      pdf.setFontSize(6)
      pdf.setTextColor(148, 163, 184)
      pdf.text(`Page ${i + 1} of ${pageCount}`, pw / 2, ph - footerH + 13, { align: "center" })
    }

    return pdf.output("blob")
  } finally {
    document.body.removeChild(iframe)
  }
}

async function archivePdf(
  patient: Patient,
  reports: Report[],
  tpl: ReportTemplate,
  blob: Blob,
): Promise<void> {
  try {
    const { savePdf } = await import("./pdf-store")
    await savePdf({
      patientId: patient.id,
      patientName: patient.name,
      mrn: patient.mrn,
      labNumber: patient.labNumber,
      reportId: reports[0]?.id ?? "",
      template: tpl,
      blob,
    })
  } catch (err) {
    console.warn("[pdf-archive] could not save PDF:", err)
  }
}

/* ═══════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════ */

export async function buildReportHTML(
  patient: Patient,
  reports: Report[],
  template?: ReportTemplate,
): Promise<string> {
  const s = getSettings()
  const tpl = template ?? s.defaultTemplate
  const firstId = reports[0]?.id ?? ""
  const publicUrl = firstId ? publicReportUrl(firstId) : ""
  const qrDataUrl = publicUrl ? await makeQr(publicUrl) : ""

  const ctx: Ctx = {
    p: patient,
    sections: sectionsData(patient, reports),
    printedAt: fmtAt(Date.now()),
    printedDay: fmtDay(Date.now()),
    qrDataUrl,
    tpl,
  }
  const inner = (RENDERERS[tpl] ?? RENDERERS.hospital)(ctx)
  const css = CSS[tpl] ?? CSS_CLINICAL

  const SELF_QR_TEMPLATES: ReportTemplate[] = ["boutique", "obsidian", "cards"]
  const useFloatingQr = !SELF_QR_TEMPLATES.includes(tpl)
  const useStickyFooter = tpl !== "boutique"
  const footer = useStickyFooter ? reportFooter() : ""

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(patient.name)} - Lab #${esc(patient.labNumber)}</title><style>${css}</style></head><body data-tpl="${tpl}">${useFloatingQr ? qrBlock(qrDataUrl) : ""}${inner}${footer}</body></html>`
}

export async function printReport(
  patient: Patient,
  reports: Report[],
  template?: ReportTemplate,
) {
  const s = getSettings()
  const tpl = template ?? s.defaultTemplate
  const html = await buildReportHTML(patient, reports, tpl)

  try {
    const blob = await generatePdfBlob(html, tpl)
    await archivePdf(patient, reports, tpl, blob)
  } catch (err) {
    console.warn("[print] PDF archive failed:", err)
  }

  const w = window.open("", "_blank", "width=900,height=720")
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 500)
}

export async function exportPDF(
  patient: Patient,
  reports: Report[],
  template?: ReportTemplate,
) {
  const s = getSettings()
  const tpl = template ?? s.defaultTemplate
  const html = await buildReportHTML(patient, reports, tpl)

  const blob = await generatePdfBlob(html, tpl)

  await archivePdf(patient, reports, tpl, blob)

  const filename = `${patient.name.replace(/\s+/g, "_")}_Lab${patient.labNumber}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export { PANELS, EXTRA_TESTS }
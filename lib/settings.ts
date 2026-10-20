export type ReportTemplate =
  | "hospital"
  | "obsidian"
  | "boutique"
  | "editorial"
  | "chart"
  | "slate"
  | "cards"

export type PerformanceMode = "smooth" | "ultra" | "eco"

export interface LabSettings {
  labName: string
  labSub: string
  labTag: string
  phone: string
  address: string
  email: string
  signatory: string
  signatoryTitle: string
  accent: string
  defaultTemplate: ReportTemplate
  performanceMode: PerformanceMode
  signatureDataUrl?: string
  countryCode: string
  doctors: string[]
  /**
   * Optional absolute base URL used for QR codes and WhatsApp report links.
   * Example: "https://lab.example.com"
   *
   * When set, this takes priority over `window.location.origin`. Required
   * for the Electron desktop build, where `file://` origins cannot be
   * resolved by phones scanning the QR code.
   */
  publicBaseUrl: string
}

const KEY = "DrIsmailLab_Settings"

export const DEFAULT_SETTINGS: LabSettings = {
  labName: "DR ISMAIL LAB",
  labSub: "Health Care Center",
  labTag: "Diagnostic & Research Laboratory",
  phone: "0300-0000000",
  address: "Main Road, City",
  email: "info@drismaillab.com",
  signatory: "Ishaq",
  signatoryTitle: "Authorized Signatory",
  accent: "#2459D6",
  defaultTemplate: "hospital",
  performanceMode: "smooth",
  signatureDataUrl: undefined,
  countryCode: "92",
  doctors: ["Dr. Ismail", "Dr. Ali", "Dr. Sarah"],
  publicBaseUrl: "",
}

export function getSettings(): LabSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<LabSettings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: LabSettings) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(s))
  window.dispatchEvent(new CustomEvent("lab-settings-changed", { detail: s }))
}

export const TEMPLATE_OPTIONS: { id: ReportTemplate; label: string; description: string }[] = [
  { id: "hospital",  label: "Clinical",  description: "Default · clean medical layout" },
  { id: "obsidian",  label: "Columns",   description: "Two tests per row · most compact" },
  { id: "boutique",  label: "Compact",   description: "Dense — fits many panels on one page" },
  { id: "editorial", label: "Modern",    description: "Accent rail beside each panel" },
  { id: "chart",     label: "Minimal",   description: "Hairlines only · quietest" },
]

export const PERFORMANCE_OPTIONS: {
  id: PerformanceMode
  label: string
  description: string
  hint: string
}[] = [
  { id: "eco",    label: "Eco",    description: "No animations · Flat design · Fastest", hint: "Best for old PCs, low-end laptops, or when running on battery." },
  { id: "smooth", label: "Smooth", description: "Balanced motion · Spring physics · Recommended", hint: "The sweet spot — feels alive without being heavy." },
  { id: "ultra",  label: "Ultra",  description: "Extra motion · Slower floaters · Prettiest", hint: "For modern hardware. Requires a decent GPU." },
]
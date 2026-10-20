import { getSettings } from "./settings"

const PREF_KEY = "DrIsmailLab_WhatsAppPref"

export type WhatsAppMode = "app" | "web"

export function getWhatsAppPref(): WhatsAppMode | null {
  if (typeof window === "undefined") return null
  const v = window.localStorage.getItem(PREF_KEY)
  return v === "app" || v === "web" ? v : null
}

export function setWhatsAppPref(mode: WhatsAppMode | null) {
  if (typeof window === "undefined") return
  if (mode === null) window.localStorage.removeItem(PREF_KEY)
  else window.localStorage.setItem(PREF_KEY, mode)
}

/**
 * Resolve a public URL for the given report.
 *
 * Order of precedence:
 *   1. `settings.publicBaseUrl` (recommended — required for Electron)
 *   2. `window.location.origin` — only when it's an absolute http(s) origin
 *
 * Returns "" when no usable URL is available (e.g. running inside Electron
 * without a configured publicBaseUrl). Callers should fall back to a
 * "please collect it from the lab" message in that case.
 */
function reportPublicUrl(id: string): string {
  const s = getSettings()
  if (s.publicBaseUrl && s.publicBaseUrl.trim()) {
    return `${s.publicBaseUrl.trim().replace(/\/+$/, "")}/r/${id}`
  }
  if (typeof window === "undefined") return ""
  const origin = window.location.origin
  if (!origin || !/^https?:\/\//i.test(origin)) return ""
  return `${origin}/r/${id}`
}

export interface WhatsAppPayload {
  patientName: string
  labNumber: string
  reportId?: string
  phone: string
  countryCode?: string
  labName?: string
}

export interface BuiltWhatsApp {
  webUrl: string
  appUrl: string
  phoneFull: string
  preview: string
}

export function buildWhatsAppLinks(opts: WhatsAppPayload): BuiltWhatsApp | null {
  const digits = (opts.phone ?? "").replace(/\D/g, "")
  if (!digits) return null

  const cc = (opts.countryCode ?? "92").replace(/\D/g, "")
  let full = digits
  if (full.startsWith("0")) full = cc + full.slice(1)
  else if (!full.startsWith(cc)) full = cc + full

  const link = opts.reportId ? reportPublicUrl(opts.reportId) : ""
  const lines = [
    `Dear ${opts.patientName},`,
    "",
    `Your lab report (Lab #${opts.labNumber}) is ready.`,
    link ? `View / download: ${link}` : "Please collect it from the lab.",
    "",
    `— ${opts.labName ?? "DR ISMAIL LAB"}`,
  ]
  const preview = lines.join("\n")
  const enc = encodeURIComponent(preview)

  return {
    webUrl: `https://web.whatsapp.com/send?phone=${full}&text=${enc}`,
    appUrl: `whatsapp://send?phone=${full}&text=${enc}`,
    phoneFull: full,
    preview,
  }
}

export function openWhatsAppWeb(url: string) {
  window.open(url, "_blank", "noopener,noreferrer")
}

export function openWhatsAppApp(appUrl: string, fallbackWebUrl: string) {
  const iframe = document.createElement("iframe")
  iframe.style.display = "none"
  iframe.src = appUrl
  document.body.appendChild(iframe)

  let fellBack = false
  const removeIframe = () => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe)
  }
  const onVisibility = () => {
    if (document.hidden) {
      fellBack = true
      document.removeEventListener("visibilitychange", onVisibility)
      setTimeout(removeIframe, 800)
    }
  }
  document.addEventListener("visibilitychange", onVisibility)

  setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibility)
    if (!fellBack && !document.hidden) {
      removeIframe()
      window.open(fallbackWebUrl, "_blank", "noopener,noreferrer")
    }
  }, 1400)
}
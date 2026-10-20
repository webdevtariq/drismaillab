import { DEFAULT_SETTINGS } from "./settings"

const DB_KEY = "DrIsmailLabDB"
const SETTINGS_KEY = "DrIsmailLab_Settings"
const SYNC_KEY = "DrIsmailLab_LastSync"
const TEMPLATE_KEY = "DrIsmailLab_ReportTemplate"
const SOUND_KEY = "DrIsmailLab_SoundsOn"

/* ─── All known localStorage keys owned by the app ─── */
const OWNED_KEYS = [DB_KEY, SETTINGS_KEY, SYNC_KEY, TEMPLATE_KEY, SOUND_KEY]

export interface StorageStats {
  totalBytes: number
  formatted: string
  items: { key: string; bytes: number; label: string }[]
}

const LABELS: Record<string, string> = {
  [DB_KEY]: "Patient & report data",
  [SETTINGS_KEY]: "Lab settings",
  [SYNC_KEY]: "Last sync marker",
  [TEMPLATE_KEY]: "Print template preference",
  [SOUND_KEY]: "Sound preference",
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

export function getStorageStats(): StorageStats {
  const items: { key: string; bytes: number; label: string }[] = []
  let total = 0

  if (typeof window === "undefined") {
    return { totalBytes: 0, formatted: "0 B", items: [] }
  }

  for (const k of OWNED_KEYS) {
    const raw = window.localStorage.getItem(k)
    const bytes = raw ? new Blob([raw]).size : 0
    items.push({ key: k, bytes, label: LABELS[k] ?? k })
    total += bytes
  }

  // Include any foreign keys created by Next.js / browser extensions
  let foreign = 0
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && !OWNED_KEYS.includes(k)) {
        const raw = window.localStorage.getItem(k) ?? ""
        foreign += new Blob([raw]).size
      }
    }
  } catch { /* ignore */ }

  if (foreign > 0) {
    items.push({ key: "__foreign__", bytes: foreign, label: "Other (browser, extensions)" })
    total += foreign
  }

  return { totalBytes: total, formatted: fmtBytes(total), items }
}

/* ═══════════════════════════════════════════════════
   THREE LEVELS OF CLEANUP
   ═══════════════════════════════════════════════════ */

/** SAFE — clears temp files, sync markers, caches. No data lost. */
export function clearSoftCache(): { freedBytes: number; freedFormatted: string } {
  if (typeof window === "undefined") return { freedBytes: 0, freedFormatted: "0 B" }

  let freed = 0
  const snapshot = (k: string) => {
    const raw = window.localStorage.getItem(k)
    return raw ? new Blob([raw]).size : 0
  }

  // Sync marker
  freed += snapshot(SYNC_KEY)
  window.localStorage.removeItem(SYNC_KEY)

  // Clear in-memory caches on next navigation (QR, audio context)
  try {
    // @ts-expect-error — global hook we set in lib/qr.ts / lib/sounds.ts
    if (typeof window.__lab_clearInMemory === "function") {
      // @ts-expect-error
      window.__lab_clearInMemory()
    }
  } catch { /* ignore */ }

  return { freedBytes: freed, freedFormatted: fmtBytes(freed) }
}

/** MEDIUM — soft cache + reset settings/preferences. Keeps patients & reports. */
export function clearSettingsAndCache(): { freedBytes: number; freedFormatted: string } {
  if (typeof window === "undefined") return { freedBytes: 0, freedFormatted: "0 B" }

  let freed = 0
  const remove = (k: string) => {
    const raw = window.localStorage.getItem(k)
    if (raw) freed += new Blob([raw]).size
    window.localStorage.removeItem(k)
  }

  remove(SETTINGS_KEY)
  remove(TEMPLATE_KEY)
  remove(SOUND_KEY)
  remove(SYNC_KEY)

  try {
    // @ts-expect-error
    if (typeof window.__lab_clearInMemory === "function") {
      // @ts-expect-error
      window.__lab_clearInMemory()
    }
  } catch { /* ignore */ }

  // Restore default settings
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))

  return { freedBytes: freed, freedFormatted: fmtBytes(freed) }
}

/** DANGER — wipes EVERYTHING including all patients and reports. */
export function factoryReset(): void {
  if (typeof window === "undefined") return

  // 1. Wipe every app key FIRST.
  for (const k of OWNED_KEYS) window.localStorage.removeItem(k)
  try {
    const toDelete: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith("DrIsmailLab")) toDelete.push(k)
    }
    toDelete.forEach((k) => window.localStorage.removeItem(k))
  } catch { /* ignore */ }

  // 2. NOW write the flags — after the wipe, so they survive.
  window.localStorage.setItem("DrIsmailLab_ResetEmpty", "1")
  window.localStorage.setItem("DrIsmailLab_SkipCloudOnce", "1")

  // 3. Best-effort cloud wipe.
  void (async () => {
    try {
      const { supabase } = await import("./supabase")
      if (!supabase) return
      await supabase.from("reports").delete().neq("id", "___never___")
      await supabase.from("patients").delete().neq("id", "___never___")
      await supabase.from("audit_logs").delete().neq("id", "___never___")
    } catch { /* ignore */ }
  })()
}

export { fmtBytes }
const PREFIX = "DrIsmailLab_Draft_"

export interface Draft {
  patientId: string
  results: Record<string, string>
  selected: string[]
  selectedCbcExtras: string[]
  savedAt: number
}

export function saveDraft(draft: Omit<Draft, "savedAt">) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      PREFIX + draft.patientId,
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    )
  } catch { /* ignore */ }
}

export function loadDraft(patientId: string): Draft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(PREFIX + patientId)
    if (!raw) return null
    return JSON.parse(raw) as Draft
  } catch {
    return null
  }
}

export function clearDraft(patientId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(PREFIX + patientId)
}

export function listDrafts(): Draft[] {
  if (typeof window === "undefined") return []
  const out: Draft[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k && k.startsWith(PREFIX)) {
      try {
        const d = JSON.parse(window.localStorage.getItem(k) ?? "") as Draft
        if (d?.patientId) out.push(d)
      } catch { /* ignore */ }
    }
  }
  return out.sort((a, b) => b.savedAt - a.savedAt)
}

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 5) return "just now"
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}
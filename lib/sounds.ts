let ctx: AudioContext | null = null

export function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch { return null }
  }
  return ctx
}

export function isAudioUnlocked(): boolean {
  return getCtx()?.state === "running"
}

export async function unlockAudio(): Promise<void> {
  const c = getCtx()
  if (!c) return
  if (c.state !== "running") {
    try { await c.resume() } catch { /* ignore */ }
  }
}

if (typeof window !== "undefined") {
  const unlock = () => { void unlockAudio() }
  ;["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, unlock, { once: true, capture: true }),
  )
}

function scheduleTone(
  c: AudioContext, freq: number, start: number, dur: number,
  type: OscillatorType = "sine", vol = 0.10,
) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(vol, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/**
 * 🎬 Cinematic boot chime.
 *
 * Guarded by a 2.5s throttle — prevents React StrictMode's double-mount
 * from firing the chime twice (which sounds like an echo).
 *
 * Timing matches petal bloom:
 *   0.20s → petal 1  / C5
 *   0.35s → petal 2  / E5
 *   0.50s → petal 3  / G5
 *   0.65s → petal 4  / C6
 *   0.80s → petal 5  / E6
 *   0.95s → petal 6  / G6
 *   (12 total petals × 12 notes, ~0.15s apart)
 */
let bootLastPlayedAt = 0

export async function soundBoot(): Promise<void> {
  const c = getCtx()
  if (!c) return

  // 🛑 Throttle — only one boot chime per 2.5 seconds
  const now = Date.now()
  if (now - bootLastPlayedAt < 2500) return
  bootLastPlayedAt = now

  if (c.state !== "running") {
    try { await c.resume() } catch { return }
  }

  const t0 = c.currentTime + 0.03

  // Background pad
  scheduleTone(c, 146.83, t0 + 0.00, 2.2, "sine", 0.026)
  scheduleTone(c, 220.00, t0 + 0.00, 2.2, "sine", 0.022)

  // 6 outer petals
  scheduleTone(c, 523.25, t0 + 0.20, 0.30, "sine", 0.046)
  scheduleTone(c, 659.25, t0 + 0.35, 0.30, "sine", 0.046)
  scheduleTone(c, 783.99, t0 + 0.50, 0.32, "sine", 0.050)
  scheduleTone(c, 1046.50, t0 + 0.65, 0.32, "sine", 0.046)
  scheduleTone(c, 1318.51, t0 + 0.80, 0.32, "sine", 0.042)
  scheduleTone(c, 1567.98, t0 + 0.95, 0.34, "sine", 0.036)

  // 6 inner petals
  scheduleTone(c, 1046.50, t0 + 1.10, 0.28, "sine", 0.036)
  scheduleTone(c, 1318.51, t0 + 1.25, 0.28, "sine", 0.032)
  scheduleTone(c, 1567.98, t0 + 1.40, 0.30, "sine", 0.028)
  scheduleTone(c, 2093.00, t0 + 1.55, 0.26, "sine", 0.024)
  scheduleTone(c, 2637.02, t0 + 1.70, 0.26, "sine", 0.020)
  scheduleTone(c, 3135.96, t0 + 1.85, 0.28, "sine", 0.016)

  // Jewel pop
  scheduleTone(c, 2093.00, t0 + 1.55, 0.14, "sine", 0.048)
  scheduleTone(c, 2637.02, t0 + 1.58, 0.16, "sine", 0.030)

  // Wordmark resolve — C major chord
  scheduleTone(c, 261.63, t0 + 2.20, 1.5, "sine", 0.044)
  scheduleTone(c, 329.63, t0 + 2.20, 1.5, "sine", 0.038)
  scheduleTone(c, 392.00, t0 + 2.20, 1.5, "sine", 0.038)
  scheduleTone(c, 523.25, t0 + 2.25, 1.5, "sine", 0.030)
  scheduleTone(c, 783.99, t0 + 2.30, 1.5, "sine", 0.026)
}

export function soundSuccess() {
  const c = getCtx(); if (!c) return
  scheduleTone(c, 880, c.currentTime, 0.09, "sine", 0.10)
  scheduleTone(c, 1320, c.currentTime + 0.08, 0.14, "sine", 0.09)
}
export function soundClick() {
  const c = getCtx(); if (!c) return
  scheduleTone(c, 1400, c.currentTime, 0.03, "square", 0.04)
}
export function soundError() {
  const c = getCtx(); if (!c) return
  scheduleTone(c, 220, c.currentTime, 0.12, "sawtooth", 0.08)
  scheduleTone(c, 180, c.currentTime + 0.10, 0.18, "sawtooth", 0.08)
}
export function soundDelete() {
  const c = getCtx(); if (!c) return
  scheduleTone(c, 600, c.currentTime, 0.08, "triangle", 0.09)
  scheduleTone(c, 360, c.currentTime + 0.07, 0.14, "triangle", 0.08)
}
export function soundNotify() {
  const c = getCtx(); if (!c) return
  scheduleTone(c, 660, c.currentTime, 0.10, "sine", 0.09)
  scheduleTone(c, 880, c.currentTime + 0.10, 0.10, "sine", 0.09)
  scheduleTone(c, 1320, c.currentTime + 0.20, 0.16, "sine", 0.08)
}
export function soundSave() {
  const c = getCtx(); if (!c) return
  scheduleTone(c, 520, c.currentTime, 0.06, "triangle", 0.09)
  scheduleTone(c, 780, c.currentTime + 0.05, 0.10, "triangle", 0.09)
}

const SOUND_KEY = "DrIsmailLab_SoundsOn"
export function soundsEnabled(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(SOUND_KEY) !== "off"
}
export function setSoundsEnabled(on: boolean) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SOUND_KEY, on ? "on" : "off")
}

export function playSound(
  kind: "success" | "click" | "error" | "delete" | "notify" | "save" | "boot",
) {
  if (!soundsEnabled()) return
  switch (kind) {
    case "boot":    void soundBoot(); break
    case "success": soundSuccess(); break
    case "click":   soundClick();   break
    case "error":   soundError();   break
    case "delete":  soundDelete();  break
    case "notify":  soundNotify();  break
    case "save":    soundSave();    break
  }
}
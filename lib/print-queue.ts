import type { Patient, Report } from "./lab-db"
import { printReport } from "./report"

type Job = { patient: Patient; reports: Report[] }

let queue: Job[] = []
let running = false

export interface QueueState {
  total: number
  done: number
  current: string
  running: boolean
}

let state: QueueState = { total: 0, done: 0, current: "", running: false }

function emit() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("lab-print-queue", { detail: { ...state } }))
}

export function getQueueState(): QueueState {
  return { ...state }
}

export function enqueue(jobs: Job[]) {
  queue.push(...jobs)
  state.total += jobs.length
  emit()
  void run()
}

/** Sequential printer — opens one window at a time. */
async function run() {
  if (running) return
  running = true
  state.running = true
  emit()

  while (queue.length > 0) {
    const job = queue.shift()!
    state.current = `${job.patient.name} · #${job.patient.labNumber}`
    emit()

    try {
      await printReport(job.patient, job.reports)
      // Wait for user to close the print window or ~1.6s
      await new Promise((r) => setTimeout(r, 1600))
    } catch { /* skip */ }

    state.done++
    emit()
  }

  running = false
  state.running = false
  state.current = ""
  emit()
  // reset counter after a pause
  setTimeout(() => {
    state = { total: 0, done: 0, current: "", running: false }
    emit()
  }, 4000)
}
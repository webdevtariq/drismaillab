const DB_KEY = "DrIsmailLabDB"
const STACK_KEY = "DrIsmailLab_UndoStack"
const REDO_KEY = "DrIsmailLab_RedoStack"
const MAX_STACK = 20

export interface UndoSnapshot {
  id: string
  label: string
  db: string
  at: number
}

function readStack(key: string): UndoSnapshot[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as UndoSnapshot[]) : []
  } catch { return [] }
}

function writeStack(key: string, s: UndoSnapshot[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(s.slice(0, MAX_STACK)))
  window.dispatchEvent(new CustomEvent("lab-undo-changed"))
}

export function snapshot(label: string) {
  if (typeof window === "undefined") return
  const db = window.localStorage.getItem(DB_KEY)
  if (!db) return
  const stack = readStack(STACK_KEY)
  stack.unshift({
    id: Math.random().toString(36).slice(2, 10),
    label, db, at: Date.now(),
  })
  writeStack(STACK_KEY, stack)
  writeStack(REDO_KEY, [])
}

export function undo(): string | null {
  if (typeof window === "undefined") return null
  const stack = readStack(STACK_KEY)
  if (!stack.length) return null
  const [top, ...rest] = stack
  const current = window.localStorage.getItem(DB_KEY)
  if (current) {
    const redo = readStack(REDO_KEY)
    redo.unshift({
      id: Math.random().toString(36).slice(2, 10),
      label: top.label, db: current, at: Date.now(),
    })
    writeStack(REDO_KEY, redo)
  }
  window.localStorage.setItem(DB_KEY, top.db)
  writeStack(STACK_KEY, rest)
  window.dispatchEvent(new CustomEvent("lab-db-restored"))
  return top.label
}

export function redo(): string | null {
  if (typeof window === "undefined") return null
  const stack = readStack(REDO_KEY)
  if (!stack.length) return null
  const [top, ...rest] = stack
  const current = window.localStorage.getItem(DB_KEY)
  if (current) {
    const undoStack = readStack(STACK_KEY)
    undoStack.unshift({
      id: Math.random().toString(36).slice(2, 10),
      label: top.label, db: current, at: Date.now(),
    })
    writeStack(STACK_KEY, undoStack)
  }
  window.localStorage.setItem(DB_KEY, top.db)
  writeStack(REDO_KEY, rest)
  window.dispatchEvent(new CustomEvent("lab-db-restored"))
  return top.label
}

export function undoCount(): number { return readStack(STACK_KEY).length }
export function redoCount(): number { return readStack(REDO_KEY).length }
export function peekUndo(): string | null { return readStack(STACK_KEY)[0]?.label ?? null }
export function peekRedo(): string | null { return readStack(REDO_KEY)[0]?.label ?? null }

export function clearUndo() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STACK_KEY)
  window.localStorage.removeItem(REDO_KEY)
  window.dispatchEvent(new CustomEvent("lab-undo-changed"))
}
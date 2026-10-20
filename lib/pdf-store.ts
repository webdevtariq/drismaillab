/**
 * PDF Storage — IndexedDB-backed PDF archive.
 *
 * Every PDF generated for a patient is auto-saved here. It survives page
 * reloads, tab closes, browser restarts. Only clearing browser data or
 * Factory Reset removes it.
 *
 * IndexedDB limits: modern browsers allow up to ~60% of free disk space,
 * so thousands of PDFs fit comfortably.
 */

const DB_NAME = "DrIsmailLab_PDFStore"
const STORE = "pdfs"
const VERSION = 1

export interface StoredPdf {
  id: string
  patientId: string
  patientName: string
  mrn: string
  labNumber: string
  reportId: string
  template: string
  createdAt: number
  size: number
  blob: Blob
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No IndexedDB on server"))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("patientId", "patientId", { unique: false })
        store.createIndex("createdAt", "createdAt", { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function savePdf(input: {
  patientId: string
  patientName: string
  mrn: string
  labNumber: string
  reportId: string
  template: string
  blob: Blob
}): Promise<StoredPdf> {
  const db = await openDb()
  const item: StoredPdf = {
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    createdAt: Date.now(),
    size: input.blob.size,
    ...input,
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return item
}

export async function listPdfs(): Promise<StoredPdf[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const list = (req.result as StoredPdf[]).sort((a, b) => b.createdAt - a.createdAt)
      resolve(list)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getPdf(id: string): Promise<StoredPdf | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as StoredPdf) || null)
    req.onerror = () => reject(req.error)
  })
}

export async function deletePdf(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllPdfs(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function pdfStats(): Promise<{ count: number; totalBytes: number }> {
  const list = await listPdfs()
  return {
    count: list.length,
    totalBytes: list.reduce((s, x) => s + x.size, 0),
  }
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}
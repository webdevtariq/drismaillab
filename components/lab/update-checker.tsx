"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  DownloadCloud, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  Sparkles, Rocket, Info,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type UpdateStatus =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "up-to-date"; version: string }
  | { type: "available"; version: string; releaseNotes?: string; releaseDate?: string }
  | { type: "downloading"; percent: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string }

declare global {
  interface Window {
    electronAPI?: {
      isDesktop: true
      getVersion: () => Promise<string>
      checkForUpdates: () => Promise<unknown>
      downloadUpdate: () => Promise<unknown>
      installUpdate: () => Promise<unknown>
      onUpdateStatus: (cb: (s: UpdateStatus) => void) => () => void
    }
  }
}

export function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>({ type: "idle" })
  const [version, setVersion] = useState<string>("—")
  const [busy, setBusy] = useState(false)
  const isDesktop = typeof window !== "undefined" && !!window.electronAPI

  useEffect(() => {
    if (!isDesktop) return
    window.electronAPI!.getVersion().then(setVersion)
    const unsubscribe = window.electronAPI!.onUpdateStatus((s) => {
      setStatus(s)
      if (s.type === "up-to-date" || s.type === "downloaded" || s.type === "available") {
        setBusy(false)
      }
    })
    return unsubscribe
  }, [isDesktop])

  async function handleCheck() {
    if (!isDesktop) return
    setBusy(true)
    setStatus({ type: "checking" })
    await window.electronAPI!.checkForUpdates()
  }

  async function handleDownload() {
    if (!isDesktop) return
    setBusy(true)
    setStatus({ type: "downloading", percent: 0 })
    await window.electronAPI!.downloadUpdate()
  }

  function handleInstall() {
    if (!isDesktop) return
    window.electronAPI!.installUpdate()
  }

  /* ── Web version: updates not available ── */
  if (!isDesktop) {
    return (
      <Card className="rounded-2xl border-border/60 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Updates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Automatic updates are available in the desktop application only.
              This browser version always runs the latest release automatically.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-white shadow-md">
            <DownloadCloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">Software Updates</h3>
            <p className="text-xs text-muted-foreground">
              Current version: <span className="font-mono">{version}</span>
            </p>
          </div>
        </div>

        {status.type === "available" && (
          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
            <Sparkles className="h-3 w-3" /> New version ready
          </Badge>
        )}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* IDLE / UP TO DATE */}
          {(status.type === "idle" || status.type === "up-to-date") && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">You&apos;re up to date</p>
                  <p className="text-xs text-muted-foreground">
                    {status.type === "up-to-date"
                      ? `Latest version ${status.version} is installed.`
                      : "Check for the latest features and fixes."}
                  </p>
                </div>
              </div>
              <Button onClick={handleCheck} disabled={busy} className="gap-2">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Check for updates
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* CHECKING */}
          {status.type === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Looking for updates…</p>
            </motion.div>
          )}

          {/* AVAILABLE */}
          {status.type === "available" && (
            <motion.div
              key="available"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                    Version {status.version} is available
                  </p>
                </div>
                {status.releaseNotes && (
                  <div
                    className="mt-2 text-xs leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: status.releaseNotes as string }}
                  />
                )}
              </div>
              <Button onClick={handleDownload} disabled={busy} className="w-full gap-2">
                <DownloadCloud className="h-4 w-4" /> Download & install
              </Button>
            </motion.div>
          )}

          {/* DOWNLOADING */}
          {status.type === "downloading" && (
            <motion.div
              key="downloading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Downloading update…</span>
                <span className="tabular-nums text-muted-foreground">
                  {status.percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2"
                  animate={{ width: `${status.percent}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The app will restart automatically once the download is complete.
              </p>
            </motion.div>
          )}

          {/* DOWNLOADED — ready to install */}
          {status.type === "downloaded" && (
            <motion.div
              key="downloaded"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                    Update {status.version} ready
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click below to restart and finish installing.
                  </p>
                </div>
              </div>
              <Button onClick={handleInstall} className="w-full gap-2">
                <Rocket className="h-4 w-4" /> Restart & install now
              </Button>
            </motion.div>
          )}

          {/* ERROR */}
          {status.type === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    Could not check for updates
                  </p>
                  <p className="text-xs text-muted-foreground">{status.message}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleCheck}
                disabled={busy}
                className="w-full gap-2 bg-transparent"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
}
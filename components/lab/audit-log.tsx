"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Search, ScrollText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getAuditLogs } from "@/lib/lab-db"
import { cn } from "@/lib/utils"

const COLORS: Record<string, string> = {
  REGISTER: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  SAVE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  EDIT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DELETE: "bg-destructive/15 text-destructive",
  DELETE_ALL: "bg-destructive/15 text-destructive",
  PRINT: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  PDF: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  PIN: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
}

export function AuditLog() {
  const [q, setQ] = useState("")
  const logs = useMemo(() => getAuditLogs(), [])
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return logs
    return logs.filter((l) => l.action.toLowerCase().includes(t) || l.details.toLowerCase().includes(t))
  }, [q, logs])

  return (
    <div className="space-y-4">
      <Card className="flex flex-row flex-wrap items-center gap-3 border-border/70 p-4 shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <ScrollText className="h-4 w-4 text-primary" /> Audit Trail
        </div>
        <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter actions…" className="pl-9" />
        </div>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <div className="max-h-[600px] divide-y overflow-y-auto">
          {filtered.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No log entries.</p>}
          {filtered.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Badge className={cn("shrink-0 font-mono text-[10px]", COLORS[l.action] ?? "bg-muted text-foreground")}>
                {l.action}
              </Badge>
              <span className="flex-1 text-sm">{l.details}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {new Date(l.timestamp).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Wallet, TrendingUp, AlertCircle, CheckCircle2, Search, Printer,
  Receipt, CalendarRange, BadgeCheck,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getAllPatients, markPaid, updatePayment, type Patient } from "@/lib/lab-db"

type Preset = "today" | "week" | "month" | "all" | "custom"
type Status = "all" | "paid" | "partial" | "unpaid"

/* ─── Local formatting (no external file needed) ─── */
function formatPKR(n: number): string {
  return `Rs. ${(n || 0).toLocaleString("en-PK")}`
}

/* ─── Local receipt printer (no external file needed) ─── */
function printReceipt(p: Patient) {
  const amount = p.amount ?? 0
  const discount = p.discount ?? 0
  const paid = p.paid ?? 0
  const net = Math.max(0, amount - discount)
  const balance = Math.max(0, net - paid)

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Receipt ${p.labNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; color: #000; padding: 4px; }
    .center { text-align: center; }
    .big { font-size: 16px; font-weight: 800; letter-spacing: 2px; }
    .sub { font-size: 10px; color: #444; line-height: 1.5; }
    .hr { border-top: 1px dashed #000; margin: 8px 0; }
    table { width: 100%; font-size: 12px; border-collapse: collapse; }
    td { padding: 3px 0; vertical-align: top; }
    .right { text-align: right; }
    .tot { font-weight: 800; font-size: 14px; }
    .foot { text-align: center; font-size: 10px; margin-top: 12px; line-height: 1.6; }
    .badge { display: inline-block; border: 1px solid #000; padding: 1px 8px; font-size: 10px; letter-spacing: 1px; }
  </style></head><body>
    <div class="center">
      <div class="big">DR ISMAIL LAB</div>
      <div class="sub">Health Care Center</div>
    </div>
    <div class="hr"></div>
    <table>
      <tr><td>Receipt #</td><td class="right">${p.labNumber}</td></tr>
      <tr><td>Date</td><td class="right">${p.date}</td></tr>
      <tr><td>Patient</td><td class="right">${p.name}</td></tr>
      <tr><td>MRN</td><td class="right">${p.mrn}</td></tr>
    </table>
    <div class="hr"></div>
    <table>
      <tr><td>Subtotal</td><td class="right">${formatPKR(amount)}</td></tr>
      ${discount > 0 ? `<tr><td>Discount</td><td class="right">- ${formatPKR(discount)}</td></tr>` : ""}
      <tr class="tot"><td>Net</td><td class="right">${formatPKR(net)}</td></tr>
      <tr><td>Paid</td><td class="right">${formatPKR(paid)}</td></tr>
      <tr class="tot"><td>Balance</td><td class="right">${formatPKR(balance)}</td></tr>
    </table>
    <div class="hr"></div>
    <div class="foot">
      ${balance === 0 ? '<div class="badge">PAID</div>' : '<div class="badge">UNPAID</div>'}
      <br/><br/>
      Thank you.
      <br/>
      ${new Date().toLocaleString("en-GB")}
    </div>
  </body></html>`

  const w = window.open("", "_blank", "width=400,height=650")
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

/* ═══════════════════════════════════════════════════════ */

export function BillingPage() {
  const [tick, setTick] = useState(0)
  const [preset, setPreset] = useState<Preset>("today")
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<Status>("all")

  const range = useMemo(() => {
    const now = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    if (preset === "custom") return { from, to }
    if (preset === "today") return { from: iso(now), to: iso(now) }
    if (preset === "week") {
      const w = new Date(now); w.setDate(now.getDate() - 6)
      return { from: iso(w), to: iso(now) }
    }
    if (preset === "month") {
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    }
    return { from: "1900-01-01", to: "2999-12-31" }
  }, [preset, from, to])

  const visits = useMemo(() => {
    let list = getAllPatients().filter((p) => p.date >= range.from && p.date <= range.to)
    const t = q.trim().toLowerCase()
    if (t) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.labNumber.includes(t) ||
          p.mrn.toLowerCase().includes(t),
      )
    }
    if (status !== "all") list = list.filter((p) => paymentStatus(p) === status)
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, range, q, status])

  const kpi = useMemo(() => {
    let billed = 0, collected = 0, outstanding = 0
    for (const p of visits) {
      const amount = p.amount ?? 0
      const discount = p.discount ?? 0
      const paid = p.paid ?? 0
      const net = Math.max(0, amount - discount)
      billed += net
      collected += paid
      outstanding += Math.max(0, net - paid)
    }
    return { billed, collected, outstanding, count: visits.length }
  }, [visits])

  function refresh() { setTick((n) => n + 1) }

  function payAll(p: Patient) {
    markPaid(p.id)
    toast.success(`Marked paid: ${p.name}`)
    refresh()
  }

  function setPaidAmount(p: Patient, value: number) {
    updatePayment(p.id, { paid: Math.max(0, value) })
    refresh()
  }

  function setDiscount(p: Patient, value: number) {
    updatePayment(p.id, { discount: Math.max(0, value) })
    refresh()
  }

  function doPrint(p: Patient) {
    printReceipt(p)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-white shadow-lg shadow-primary/25">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Billing & Payments</h2>
            <p className="text-sm text-muted-foreground">
              {range.from} → {range.to}
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["today", "Today"],
            ["week", "Last 7 days"],
            ["month", "This month"],
            ["all", "All time"],
            ["custom", "Custom"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreset(id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                preset === id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}

          {preset === "custom" && (
            <div className="ml-auto flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px]" />
              <span className="text-xs text-muted-foreground">→</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px]" />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, lab no. or MRN" className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid only</SelectItem>
              <SelectItem value="partial">Partial only</SelectItem>
              <SelectItem value="unpaid">Unpaid only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Receipt}      label="Total Billed"  value={kpi.billed}      tone="blue" />
        <KPI icon={CheckCircle2} label="Collected"     value={kpi.collected}   tone="emerald" />
        <KPI icon={AlertCircle}  label="Outstanding"   value={kpi.outstanding} tone="amber" />
        <KPI icon={TrendingUp}   label="Visits"        value={kpi.count}       tone="violet" numeric />
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h3 className="font-semibold tracking-tight">Visits</h3>
          <Badge variant="secondary">{visits.length}</Badge>
        </div>

        {visits.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No visits in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Lab #</th>
                  <th className="px-2 py-2 font-medium">Patient</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                  <th className="px-2 py-2 text-right font-medium">Discount</th>
                  <th className="px-2 py-2 text-right font-medium">Paid</th>
                  <th className="px-2 py-2 text-right font-medium">Balance</th>
                  <th className="px-2 py-2 text-center font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((p) => {
                  const amount = p.amount ?? 0
                  const discount = p.discount ?? 0
                  const paid = p.paid ?? 0
                  const net = Math.max(0, amount - discount)
                  const balance = Math.max(0, net - paid)
                  const st = paymentStatus(p)
                  return (
                    <tr key={p.id} className="border-t border-border/60 hover:bg-accent/30">
                      <td className="px-4 py-2.5 whitespace-nowrap">{p.date}</td>
                      <td className="px-2 py-2.5 font-mono text-xs text-primary">#{p.labNumber}</td>
                      <td className="px-2 py-2.5">
                        <div className="font-medium">{p.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{p.mrn}</div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{formatPKR(amount)}</td>
                      <td className="px-2 py-2.5 text-right">
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(p, Number(e.target.value))}
                          className="ml-auto h-7 w-[80px] text-right tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <Input
                          type="number"
                          value={paid}
                          onChange={(e) => setPaidAmount(p, Number(e.target.value))}
                          className="ml-auto h-7 w-[90px] text-right tabular-nums"
                        />
                      </td>
                      <td className={cn(
                        "px-2 py-2.5 text-right tabular-nums font-semibold",
                        balance > 0 ? "text-destructive" : "text-emerald-600",
                      )}>
                        {formatPKR(balance)}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <StatusBadge status={st} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          {balance > 0 && (
                            <Button size="sm" variant="outline" onClick={() => payAll(p)} className="h-7 gap-1 bg-transparent">
                              <BadgeCheck className="h-3.5 w-3.5" /> Paid
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => doPrint(p)} className="h-7 gap-1 bg-transparent">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ─── helpers ─── */

function paymentStatus(p: Patient): "paid" | "partial" | "unpaid" {
  const amount = p.amount ?? 0
  const discount = p.discount ?? 0
  const paid = p.paid ?? 0
  const net = Math.max(0, amount - discount)
  if (net === 0 && amount === 0) return "unpaid"
  if (paid >= net && net > 0) return "paid"
  if (paid > 0) return "partial"
  return "unpaid"
}

function StatusBadge({ status }: { status: "paid" | "partial" | "unpaid" }) {
  const map = {
    paid:    "bg-emerald-500/15 text-emerald-700",
    partial: "bg-amber-500/15 text-amber-700",
    unpaid:  "bg-destructive/15 text-destructive",
  }
  return (
    <Badge className={cn("font-medium capitalize", map[status])}>
      {status}
    </Badge>
  )
}

function KPI({
  icon: Icon, label, value, tone, numeric,
}: {
  icon: typeof Wallet
  label: string
  value: number
  tone: "blue" | "emerald" | "amber" | "violet"
  numeric?: boolean
}) {
  const tones = {
    blue:    "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber:   "from-amber-500 to-amber-600",
    violet:  "from-violet-500 to-violet-600",
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden rounded-2xl border-border/60 p-5 shadow-sm">
        <div className={cn("absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-10", tones[tone])} />
        <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {numeric ? value.toLocaleString() : `Rs. ${value.toLocaleString("en-PK")}`}
        </div>
      </Card>
    </motion.div>
  )
}
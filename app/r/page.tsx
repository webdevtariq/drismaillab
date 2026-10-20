"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ShieldAlert, Loader2, FlaskConical, Printer } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { panelById, rangeFor, evaluate } from "@/lib/test-panels"

interface PublicReport {
  id: string
  patientId: string
  labNumber: string
  panels: string[]
  results: Record<string, string>
}

interface PublicPatient {
  id: string
  mrn: string
  name: string
  age: string
  gender: "Male" | "Female" | "Child"
  doctor: string
  date: string
  labNumber: string
}

export default function PublicReportPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReportReader />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Loading report…</p>
      </div>
    </div>
  )
}

function ReportReader() {
  const search = useSearchParams()
  const code = search.get("id") ?? ""
  const [state, setState] = useState<"loading" | "ok" | "missing" | "offline">("loading")
  const [report, setReport] = useState<PublicReport | null>(null)
  const [patient, setPatient] = useState<PublicPatient | null>(null)

  useEffect(() => {
    async function load() {
      if (!code) { setState("missing"); return }
      if (!supabase) { setState("offline"); return }

      const { data: r, error: rErr } = await supabase
        .from("reports").select("*").eq("id", code).maybeSingle()
      if (rErr || !r) { setState("missing"); return }

      const { data: p } = await supabase
        .from("patients").select("*").eq("id", r.patient_id).maybeSingle()
      if (!p) { setState("missing"); return }

      setReport({
        id: r.id,
        patientId: r.patient_id,
        labNumber: r.lab_number ?? "",
        panels: r.panels ?? [],
        results: r.results ?? {},
      })
      setPatient({
        id: p.id,
        mrn: p.mrn,
        name: p.name,
        age: p.age ?? "",
        gender: p.gender ?? "Male",
        doctor: p.doctor ?? "",
        date: p.date ?? "",
        labNumber: p.lab_number ?? "",
      })
      setState("ok")
    }
    void load()
  }, [code])

  if (state === "loading") return <Loading />
  if (state === "offline") {
    return <Empty icon={ShieldAlert} title="Report service unavailable" body="Please contact the lab to receive your report." />
  }
  if (state === "missing" || !report || !patient) {
    return <Empty icon={ShieldAlert} title="Report not found" body="This QR code doesn't match any report in our records. Please contact the lab." danger />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-background to-background pb-12 print:bg-white">
      <div className="mx-auto max-w-md space-y-4 px-4 pt-4 pb-10">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-chart-2 p-5 text-white shadow-lg shadow-primary/20 print:rounded-none print:shadow-none">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/25">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none tracking-wide">DR ISMAIL LAB</h1>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/80">Health Care Center</p>
            </div>
          </div>
          <Badge className="mt-4 gap-1.5 bg-white/20 text-white hover:bg-white/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified report
          </Badge>
        </div>

        <Card className="rounded-2xl border-border/60 p-5 shadow-sm print:shadow-none">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Patient" value={patient.name} strong />
            <Info label="Lab No." value={`#${patient.labNumber}`} mono />
            <Info label="MRN" value={patient.mrn} mono />
            <Info label="Age / Sex" value={`${patient.age || "-"} · ${patient.gender}`} />
            <Info label="Doctor" value={patient.doctor || "-"} />
            <Info label="Date" value={patient.date} />
          </div>
        </Card>

        {report.panels.map((pid) => {
          if (pid.startsWith("extra:")) return null
          const panel = panelById(pid)
          if (!panel) return null
          const rows = panel.tests
            .map((t) => ({ test: t, value: (report.results[`${pid}:${t.id}`] ?? "").trim() }))
            .filter((x) => x.value !== "")
          if (!rows.length) return null
          return (
            <Card key={pid} className="overflow-hidden rounded-2xl border-border/60 shadow-sm print:break-inside-avoid print:shadow-none">
              <div className="bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary print:bg-gray-100 print:text-black">
                {panel.name}
              </div>
              <div className="divide-y divide-border/60">
                {rows.map(({ test, value }) => {
                  const range = rangeFor(test, patient.gender)
                  const flag = evaluate(value, range)
                  return (
                    <div key={test.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{test.name}</span>
                      <span className="shrink-0 text-right">
                        <span className={"font-semibold tabular-nums " + (flag === "high" ? "text-destructive" : flag === "low" ? "text-amber-600" : "text-foreground")}>
                          {value}
                        </span>
                        {test.unit && <span className="ml-1 text-xs text-muted-foreground">{test.unit}</span>}
                        {range && <span className="ml-2 block text-[10px] text-muted-foreground">Ref: {range}</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}

        <div className="flex flex-col gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" /> Save as PDF
          </button>
        </div>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Verified on {new Date().toLocaleString("en-GB")} · Computer-generated report.
        </p>
      </div>
    </div>
  )
}

function Info({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={"mt-0.5 " + (mono ? "font-mono text-xs " : "") + (strong ? "font-semibold" : "")}>{value}</span>
    </div>
  )
}

function Empty({ icon: Icon, title, body, danger }: { icon: typeof ShieldAlert; title: string; body: string; danger?: boolean }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-sm text-center">
        <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl ${danger ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  UserPlus, Hash, Stethoscope, CalendarDays, ArrowRight, User2,
  Users, Search, IdCard, RotateCcw, Sparkles, Phone,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  reserveLabNumber, generateMRN, savePatient, getAllPatients,
  type Patient,
} from "@/lib/lab-db"
import type { Gender } from "@/lib/test-panels"
import { cn } from "@/lib/utils"
import { playSound } from "@/lib/sounds"
import { SuccessCheck } from "@/components/lab/success-check"

const today = () => new Date().toISOString().slice(0, 10)

type Mode = "new" | "returning"

const SPRING = { type: "spring" as const, stiffness: 260, damping: 24, mass: 0.7 }
const SPRING_SOFT = { type: "spring" as const, stiffness: 180, damping: 22 }

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: SPRING },
}

function AnimatedTitle({ text, keyId }: { text: string; keyId: string }) {
  const words = text.split(" ")
  return (
    <span className="inline-flex flex-wrap gap-x-[0.35em]">
      {words.map((word, i) => (
        <motion.span
          key={`${keyId}-${i}`}
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.3 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

export function RegistrationForm({ onRegistered }: { onRegistered: (p: Patient) => void }) {
  const [mode, setMode] = useState<Mode>("new")

  const [mrn, setMrn] = useState("")
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState<Gender>("Male")
  const [doctor, setDoctor] = useState("Dr. Ismail")
  const [date, setDate] = useState(today())
  const [labNumber, setLabNumber] = useState("")
  const [phone, setPhone] = useState("")
  const [recent, setRecent] = useState<Patient[]>([])

  const [searchQ, setSearchQ] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<Patient | null>(null)

  const [showCheck, setShowCheck] = useState(false)
  const [checkMsg, setCheckMsg] = useState("Registered")

  useEffect(() => {
    // Reserve a fresh lab number ONCE per mount so concurrent registrations
    // can never collide. Abandoning the form skips the number (audit-safe).
    setLabNumber(reserveLabNumber())
    setMrn(generateMRN())
    setRecent(getAllPatients().slice(0, 5))
  }, [])

  useEffect(() => {
    if (mode === "new") setMrn(generateMRN())
    setSelectedPerson(null)
    setSearchQ("")
    setName("")
    setAge("")
    setGender("Male")
    setPhone("")
  }, [mode])

  const uniquePeople = useMemo(() => {
    const all = getAllPatients()
    const latest = new Map<string, Patient>()
    for (const p of all) {
      if (!latest.has(p.mrn)) latest.set(p.mrn, p)
    }
    const list = Array.from(latest.values())
    const t = searchQ.trim().toLowerCase()
    if (!t) return list.slice(0, 8)
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.mrn.toLowerCase().includes(t) ||
          p.labNumber.toLowerCase().includes(t),
      )
      .slice(0, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, mode])

  function pickPerson(p: Patient) {
    setSelectedPerson(p)
    setName(p.name)
    setAge(p.age)
    setGender(p.gender)
    setDoctor(p.doctor || doctor)
    setMrn(p.mrn)
    setPhone(p.phone ?? "")
    playSound("click")
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Patient name is required")
      playSound("error")
      return
    }
    if (mode === "returning" && !selectedPerson) {
      toast.error("Pick an existing patient — or switch to New Patient")
      playSound("error")
      return
    }
    const patient = savePatient({
      mrn: mode === "new" ? mrn : selectedPerson!.mrn,
      name: name.trim(),
      age,
      gender,
      doctor,
      date,
      labNumber,
      phone: phone.trim() || undefined,
    })
    toast.success(`Registered ${patient.name} — Lab #${patient.labNumber}`)
    playSound("success")
    setCheckMsg(`Registered · #${patient.labNumber}`)
    setShowCheck(true)
    setTimeout(() => onRegistered(patient), 700)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <SuccessCheck show={showCheck} message={checkMsg} onDone={() => setShowCheck(false)} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING_SOFT, delay: 0.05 }}
        className="will-animate"
      >
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg shadow-primary/10">
          <div className="animated-gradient relative overflow-hidden bg-gradient-to-br from-primary via-primary to-chart-2 px-6 py-5 text-white">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="float-slow absolute -left-6 top-3 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <div className="float-med absolute right-4 top-8 h-16 w-16 rounded-full bg-white/15 blur-lg" />
              <div className="float-fast absolute left-1/3 bottom-0 h-12 w-12 rounded-full bg-white/10 blur-md" />
            </div>

            <div className="relative flex flex-wrap items-center gap-3">
              <motion.div
                key={mode}
                initial={{ rotate: -25, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ ...SPRING, delay: 0.1 }}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30"
              >
                {mode === "new" ? <UserPlus className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode + "-title"}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                  className="min-w-0"
                >
                  <h2 className="text-lg font-semibold tracking-tight">
                    <AnimatedTitle
                      text={mode === "new" ? "New Patient Registration" : "Returning Patient Visit"}
                      keyId={mode}
                    />
                  </h2>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    className="text-xs text-white/85"
                  >
                    {mode === "new" ? "Create a permanent patient record" : "Continue an existing patient — new visit"}
                  </motion.p>
                </motion.div>
              </AnimatePresence>

              <div className="ml-auto flex rounded-xl bg-white/15 p-1 backdrop-blur ring-1 ring-white/20">
                {(["new", "returning"] as const).map((m) => {
                  const active = mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); playSound("click") }}
                      className={cn(
                        "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        active ? "text-primary" : "text-white/90 hover:text-white",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="mode-pill"
                          className="absolute inset-0 rounded-lg bg-white shadow-sm"
                          transition={SPRING}
                        />
                      )}
                      <span className="relative z-10 capitalize">{m}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex items-center justify-between gap-3 border-b border-border/60 bg-primary/5 px-6 py-3"
          >
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
              >
                <IdCard className="h-4 w-4 text-primary" />
              </motion.div>
              <span className="font-medium uppercase tracking-wide text-muted-foreground">Patient ID</span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode === "new" ? mrn : selectedPerson?.mrn ?? "empty"}
                  initial={{ opacity: 0, scale: 0.85, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 4 }}
                  transition={SPRING}
                >
                  <Badge variant="secondary" className="font-mono text-primary">
                    {mode === "new" ? mrn : selectedPerson?.mrn ?? "—"}
                  </Badge>
                </motion.div>
              </AnimatePresence>
              {mode === "new" && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                </motion.div>
              )}
            </div>
            {mode === "returning" && selectedPerson && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-muted-foreground"
              >
                Existing patient · returning for a new visit
              </motion.span>
            )}
          </motion.div>

          <AnimatePresence initial={false}>
            {mode === "returning" && !selectedPerson && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-b border-border/60"
              >
                <div className="p-6 pb-4">
                  <Label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Search className="h-3.5 w-3.5" /> Find existing patient
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Search by name, MRN (M-0001) or lab number"
                      className="h-11 pl-9"
                    />
                  </div>

                  <div className="mt-3 max-h-[260px] divide-y divide-border/60 overflow-y-auto rounded-xl border border-border/60 bg-background">
                    {uniquePeople.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No match — switch to <b>New Patient</b> to register them.
                      </p>
                    )}
                    <AnimatePresence initial={false}>
                      {uniquePeople.map((p, i) => (
                        <motion.button
                          key={p.mrn}
                          type="button"
                          onClick={() => pickPerson(p)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, ...SPRING }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-[10px] font-bold text-primary">
                            {p.mrn}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{p.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {p.age || "-"} • {p.gender} • last visit {p.date}
                            </span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {(mode === "new" || selectedPerson) && (
              <motion.form
                key={mode === "new" ? "form-new" : "form-returning"}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                onSubmit={submit}
                className="grid gap-5 p-6 sm:p-8 sm:grid-cols-2"
              >
                {mode === "returning" && selectedPerson && (
                  <motion.div
                    variants={itemVariants}
                    className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 font-mono text-[10px] font-bold text-primary">
                        {selectedPerson.mrn}
                      </span>
                      <span className="text-sm">
                        <span className="font-medium">{selectedPerson.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {selectedPerson.age || "-"} • {selectedPerson.gender}
                        </span>
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => setSelectedPerson(null)}
                    >
                      Change patient
                    </Button>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="sm:col-span-2">
                  <Field label="Patient Name" htmlFor="name" icon={User2}>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      autoFocus
                      className="h-11"
                    />
                  </Field>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Field label="Age" htmlFor="age" icon={User2}>
                    <Input
                      id="age"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 34 / 6 months"
                      className="h-11"
                    />
                  </Field>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gender</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                    <SelectTrigger className="mt-2 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Field label="Referring Doctor" htmlFor="doctor" icon={Stethoscope}>
                    <Input
                      id="doctor"
                      value={doctor}
                      onChange={(e) => setDoctor(e.target.value)}
                      placeholder="Dr. name"
                      className="h-11"
                    />
                  </Field>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Field label="Phone (for WhatsApp reports)" htmlFor="phone" icon={Phone}>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="h-11"
                    />
                  </Field>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Field label="Visit Date" htmlFor="date" icon={CalendarDays}>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-11"
                    />
                  </Field>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Field label="Lab Number" htmlFor="lab" icon={Hash}>
                    <Input
                      id="lab"
                      value={labNumber}
                      onChange={(e) => setLabNumber(e.target.value)}
                      className="h-11 font-mono font-semibold tracking-wider"
                    />
                  </Field>
                </motion.div>

                <motion.div variants={itemVariants} className="sm:col-span-2 pt-1">
                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} transition={SPRING}>
                    <Button
                      type="submit"
                      size="lg"
                      className="group relative h-12 w-full gap-2 overflow-hidden rounded-xl text-base shadow-lg shadow-primary/25"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative flex items-center gap-2">
                        {mode === "new" ? "Register & Enter Results" : "Add New Visit & Enter Results"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING_SOFT, delay: 0.15 }}
        className="will-animate"
      >
        <Card className="h-full overflow-hidden rounded-2xl border-border/60 shadow-lg shadow-primary/5">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold tracking-tight">
              <Users className="h-4 w-4 text-primary" /> Recent Registrations
            </h3>
            <span className="text-xs text-muted-foreground">{recent.length} shown</span>
          </div>
          <div className="divide-y divide-border/60">
            {recent.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No patients yet.</p>
            )}
            <AnimatePresence initial={false}>
              {recent.map((p, i) => (
                <motion.button
                  key={p.id}
                  type="button"
                  onClick={() => { playSound("click"); onRegistered(p) }}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 + i * 0.1, ...SPRING }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.985 }}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.08, rotate: -3 }}
                      transition={SPRING}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 font-mono text-[10px] font-bold text-primary"
                    >
                      #{p.labNumber}
                    </motion.div>
                    <div>
                      <p className="font-medium leading-tight">{p.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{p.mrn}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

function Field({
  label, htmlFor, icon: Icon, children,
}: {
  label: string
  htmlFor: string
  icon: typeof User2
  children: React.ReactNode
}) {
  return (
    <>
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div className="mt-2">{children}</div>
    </>
  )
}
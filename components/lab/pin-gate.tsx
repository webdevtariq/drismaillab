"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Lock, KeyRound, ShieldQuestion } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { verifyPin, changePin, resetPin } from "@/lib/lab-db"

export function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("")
  const [shake, setShake] = useState(0)
  const [mode, setMode] = useState<"enter" | "change">("enter")
  const [oldPin, setOldPin] = useState("")
  const [newPin, setNewPin] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (verifyPin(pin)) {
      onUnlock()
    } else {
      setShake((s) => s + 1)
      toast.error("Incorrect PIN")
      setPin("")
    }
  }

  function doChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPin.length < 4) return toast.error("New PIN must be at least 4 digits")
    if (changePin(oldPin, newPin)) {
      toast.success("PIN updated")
      setMode("enter")
      setOldPin("")
      setNewPin("")
    } else {
      setShake((s) => s + 1)
      toast.error("Old PIN is incorrect")
    }
  }

  function forgot() {
    resetPin()
    toast.success("PIN reset to default: 1234")
  }

  return (
    <div className="grid place-items-center py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
        <Card className="w-[360px] max-w-[92vw] border-border/70 p-7 text-center shadow-lg">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Lock className="h-7 w-7" />
          </div>

          {mode === "enter" ? (
            <>
              <h2 className="text-lg font-semibold">Protected Section</h2>
              <p className="mb-5 text-sm text-muted-foreground">Enter the 4-digit PIN to view patient history.</p>
              <form onSubmit={submit} className="space-y-4">
                <Input
                  autoFocus
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[0.5em] font-semibold"
                />
                <Button type="submit" className="w-full gap-2">
                  <KeyRound className="h-4 w-4" /> Unlock
                </Button>
              </form>
              <div className="mt-4 flex justify-between text-xs">
                <button onClick={() => setMode("change")} className="text-primary hover:underline">
                  Change PIN
                </button>
                <button onClick={forgot} className="flex items-center gap-1 text-muted-foreground hover:underline">
                  <ShieldQuestion className="h-3.5 w-3.5" /> Forgot PIN?
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Change PIN</h2>
              <p className="mb-5 text-sm text-muted-foreground">Verify your current PIN, then set a new one.</p>
              <form onSubmit={doChange} className="space-y-3">
                <Input
                  inputMode="numeric"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Current PIN"
                  className="text-center tracking-widest"
                />
                <Input
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="New PIN"
                  className="text-center tracking-widest"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setMode("enter")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Update
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

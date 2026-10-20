"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { playSound } from "@/lib/sounds"
import { LabLogo } from "./lab-logo"

const EASE = [0.32, 0.72, 0, 1] as const

export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(true)
  return (
    <AnimatePresence>
      {show && (
        <Splash
          onDone={() => {
            setShow(false)
            onDone?.()
          }}
        />
      )}
    </AnimatePresence>
  )
}

function Splash({ onDone }: { onDone: () => void }) {
  // 🛑 Ref guard — prevents StrictMode double-mount from firing the sound twice
  const bootPlayedRef = useRef(false)
  // 🛑 Guard so double-click / click-during-exit doesn't fire onDone twice
  const doneRef = useRef(false)

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    if (!bootPlayedRef.current) {
      bootPlayedRef.current = true
      playSound("boot")
    }
    const t = setTimeout(finish, 5500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE } }}
      transition={{ duration: 0.4, ease: EASE }}
      onClick={finish}
      onKeyDown={finish}
      role="button"
      tabIndex={0}
      aria-label="Skip splash"
      className="fixed inset-0 z-[9999] grid cursor-pointer place-items-center overflow-hidden bg-background"
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        style={{
          background:
            "radial-gradient(circle at 50% 42%, color-mix(in oklch, var(--primary) 20%, transparent) 0%, color-mix(in oklch, var(--primary) 6%, transparent) 35%, transparent 65%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklch, var(--primary) 20%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <motion.div
        animate={{ y: [0, -18, 0], x: [0, 8, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-[10%] top-[15%] h-72 w-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--primary) 28%, transparent) 0%, color-mix(in oklch, var(--primary) 8%, transparent) 40%, transparent 70%)",
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute right-[8%] bottom-[12%] h-80 w-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--chart-2) 24%, transparent) 0%, color-mix(in oklch, var(--chart-2) 6%, transparent) 40%, transparent 70%)",
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
        >
          <LabLogo size={176} intro={true} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 2.0, ease: EASE }}
          className="mt-11 font-serif text-4xl font-bold tracking-[0.2em] text-foreground sm:text-[54px]"
          style={{ willChange: "transform, opacity" }}
        >
          DR ISMAIL LAB
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 2.6, ease: EASE }}
          className="mt-5 h-px w-64 origin-center bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ willChange: "transform, opacity" }}
        />

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 3.0, ease: EASE }}
          className="mt-5 text-[11px] font-semibold uppercase tracking-[0.55em] text-primary"
          style={{ willChange: "transform, opacity" }}
        >
          MEDICAL LABORATORY
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 3.4, ease: EASE }}
          className="mt-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60"
        >
          Tap anywhere to continue
        </motion.p>
      </div>
    </motion.div>
  )
}
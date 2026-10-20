"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect } from "react"

export function SuccessCheck({
  show,
  message = "Saved",
  onDone,
  duration = 1100,
}: {
  show: boolean
  message?: string
  onDone?: () => void
  duration?: number
}) {
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => onDone?.(), duration)
    return () => clearTimeout(t)
  }, [show, duration, onDone])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed inset-0 z-[100] grid place-items-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col items-center gap-4 rounded-3xl bg-background/95 p-8 shadow-2xl ring-1 ring-border/60 backdrop-blur"
          >
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
              <motion.circle
                cx="44"
                cy="44"
                r="40"
                stroke="currentColor"
                strokeWidth="3"
                className="text-emerald-500"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <motion.path
                d="M26 46 L40 60 L64 32"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-500"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.4, ease: "easeOut" }}
                fill="none"
              />
            </svg>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="text-base font-semibold tracking-tight"
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
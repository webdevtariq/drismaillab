"use client"

import { useEffect, useState } from "react"
import { verifyAdminPin, verifyOperatorPin } from "./lab-db"

const KEY = "DrIsmailLab_Session"

export type Role = "admin" | "operator"

export type View =
  | "dashboard" | "register" | "entry" | "collection" | "batch"
  | "archives" | "history" | "billing" | "reports" | "audit" | "settings"

/** Views that only Admin can access. */
export const ADMIN_ONLY_VIEWS: View[] = ["dashboard", "history", "billing", "settings"]

export function canAccess(role: Role, view: View): boolean {
  if (role === "admin") return true
  return !ADMIN_ONLY_VIEWS.includes(view)
}

interface Session {
  role: Role
  at: number
}

function readSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch { return null }
}

function writeSession(s: Session | null) {
  if (typeof window === "undefined") return
  if (s === null) window.sessionStorage.removeItem(KEY)
  else window.sessionStorage.setItem(KEY, JSON.stringify(s))
  window.dispatchEvent(new CustomEvent("lab-session-changed"))
}

export function getRole(): Role | null {
  return readSession()?.role ?? null
}

export function isLoggedIn(): boolean {
  return readSession() !== null
}

export function isAdmin(): boolean {
  return readSession()?.role === "admin"
}

export function login(role: Role, pin: string): boolean {
  const ok = role === "admin" ? verifyAdminPin(pin) : verifyOperatorPin(pin)
  if (!ok) return false
  writeSession({ role, at: Date.now() })
  return true
}

export function logout() {
  writeSession(null)
}

export function useSession() {
  const [role, setRole] = useState<Role | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setRole(getRole())
    function onChange() { setRole(getRole()) }
    window.addEventListener("lab-session-changed", onChange)
    return () => window.removeEventListener("lab-session-changed", onChange)
  }, [])

  return {
    mounted,
    role,
    isLoggedIn: role !== null,
    isAdmin: role === "admin",
    isOperator: role === "operator",
    login,
    logout,
  }
}
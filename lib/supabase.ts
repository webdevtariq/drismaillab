import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const cloudEnabled = Boolean(URL && KEY)
export const cloudUrl = URL ?? ""

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(URL!, KEY!, { auth: { persistSession: false } })
  : null

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured — check .env.local" }
  try {
    const { error } = await supabase.from("patients").select("id", { count: "exact", head: true })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
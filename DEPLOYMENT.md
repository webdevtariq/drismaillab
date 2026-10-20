# DR ISMAIL LAB — Deployment Guide

Complete setup for live QR-code report delivery. Time: ~20 minutes. Cost: **$0/month**.

---

## 1. Supabase project (5 min, free)

1. https://supabase.com → Sign up.
2. **New project** → `drismail-lab` → pick region → create.
3. **Settings → API** → copy:
   - `Project URL`         → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` API key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Create tables (2 min)

1. Open **SQL Editor**.
2. Paste `supabase/schema.sql` → **Run**.

Verify under **Database → Tables**: `patients`, `reports`.

## 3. Local env vars (2 min)

Copy `.env.example` to `.env.local` in `lb/`, fill in the two Supabase values.

```bash
cd lb
pnpm dev
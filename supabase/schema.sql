-- ─────────────────────────────────────────────
-- DR ISMAIL LAB — Supabase Schema
-- Run once in Supabase → SQL Editor.
-- ─────────────────────────────────────────────

create table if not exists public.patients (
  id          text primary key,
  mrn         text not null,
  name        text not null,
  age         text default '',
  gender      text default 'Male',
  doctor      text default '',
  date        text default '',
  lab_number  text default '',
  phone       text,
  status      text default 'registered',
  created_at  bigint not null,
  updated_at  bigint not null
);
create index if not exists patients_mrn_idx on public.patients (mrn);

create table if not exists public.reports (
  id            text primary key,
  patient_id    text not null references public.patients(id) on delete cascade,
  lab_number    text default '',
  panels        jsonb default '[]'::jsonb,
  results       jsonb default '{}'::jsonb,
  active_tests  jsonb,
  created_at    bigint not null,
  updated_at    bigint not null
);
create index if not exists reports_patient_idx on public.reports (patient_id);

alter table public.patients enable row level security;
alter table public.reports  enable row level security;

drop policy if exists "anon read patients by id" on public.patients;
create policy "anon read patients by id" on public.patients for select using (true);

drop policy if exists "anon read reports by id" on public.reports;
create policy "anon read reports by id" on public.reports for select using (true);

drop policy if exists "anon write patients" on public.patients;
create policy "anon write patients" on public.patients for all using (true) with check (true);

drop policy if exists "anon write reports" on public.reports;
create policy "anon write reports" on public.reports for all using (true) with check (true);
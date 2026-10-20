import {
  PANELS, EXTRA_TESTS, allPanelsForPricing,
  type PanelDef, type TestDef,
} from "./test-panels"

const KEY = "DrIsmailLab_Pricing_v6"

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface BundleDef {
  id: string
  label: string
  tests: string[]
  price: number
  enabled: boolean
}

export interface PanelPricing {
  whole: number
  wholeTier2: number
  singles: Record<string, number>
  hidden: string[]
  bundles: BundleDef[]
}

export interface PricingStore {
  panels: Record<string, PanelPricing>
  extras: {
    singles: Record<string, number>
    hidden: string[]
    bundles: BundleDef[]
  }
}

/* ═══════════════════════════════════════════════════════════════
   DEFAULT PRICES
   ═══════════════════════════════════════════════════════════════ */

const PANEL_WHOLE_DEFAULTS: Record<string, number> = {
  cbc: 1000, urine: 300, stool: 300, semen: 1000, crossmatch: 1500,
  btct: 400, hpylori: 1000, lft: 0, biochemistry: 0, lipid_profile: 0,
  electrolytes: 0, thyroid: 0, coagulation: 0, serology: 0, immunology: 0,
  miscellaneous: 0, urine_pt: 400, vitamind: 2500, hb: 200, beta_hcg: 1200,
}

const PANEL_WHOLE_TIER2_DEFAULTS: Record<string, number> = {
  cbc: 1200,
}

const SINGLE_DEFAULTS: Record<string, number> = {
  "cbc:hb": 100, "cbc:rbc": 100, "cbc:hct": 80, "cbc:mcv": 80, "cbc:mch": 80,
  "cbc:mchc": 80, "cbc:plt": 100, "cbc:wbc": 100, "cbc:esr": 150,
  "cbc:neut": 60, "cbc:lymp": 60, "cbc:mono": 60, "cbc:eos": 60, "cbc:baso": 60,

  "lft:total_bilirubin": 150, "lft:direct_bilirubin": 150, "lft:indirect_bilirubin": 150,
  "lft:alt": 200, "lft:alk_phos": 200, "lft:ggt": 200, "lft:total_protein": 150,
  "lft:albumin": 150, "lft:globulin": 150, "lft:ag_ratio": 150,

  "biochemistry:glucose_f": 200, "biochemistry:glucose_r": 200,
  "biochemistry:hba1c": 800, "biochemistry:uric_acid": 250,
  "biochemistry:amylase": 300, "biochemistry:urea": 200,
  "biochemistry:creatinine": 200, "biochemistry:calcium": 200,
  "biochemistry:ldh": 300, "biochemistry:phosphorus": 250,
  "biochemistry:magnesium": 250, "biochemistry:iron": 300,
  "biochemistry:tibc": 350, "biochemistry:ferritin": 500,

  "lipid_profile:cholesterol": 200, "lipid_profile:triglyceride": 200,
  "lipid_profile:hdl": 200, "lipid_profile:ldl": 200,
  "lipid_profile:vldl": 200, "lipid_profile:non_hdl": 200,
  "lipid_profile:tc_hdl_ratio": 200,

  "serology:hbsag": 400, "serology:anti_hcv": 400, "serology:anti_hiv": 500,
  "serology:aso_titre": 400, "serology:ra_factor": 400,
  "serology:widal_to": 200, "serology:widal_th": 200,
  "serology:typhidot_igg": 500, "serology:typhidot_igm": 500,
  "serology:mp_pf": 300, "serology:mp_pv": 300, "serology:dengue_ns1": 600,
  "serology:hpylori": 500, "serology:stool_hpylori": 500,
  "serology:vdrl": 350, "serology:tpha": 500,

  "immunology:crp": 400, "immunology:ra_factor": 400, "immunology:ra_factor_titer": 400,
  "immunology:ana": 900, "immunology:anti_dsdna": 1200,
  "immunology:c3": 900, "immunology:c4": 900,

  "electrolytes:na": 250, "electrolytes:k": 250, "electrolytes:cl": 250,
  "electrolytes:hco3": 250, "electrolytes:anion_gap": 250,
  "electrolytes:calcium_ionized": 300, "electrolytes:magnesium": 250,
  "electrolytes:phosphorus": 250,

  "thyroid:tsh": 500, "thyroid:t3": 500, "thyroid:t4": 500,
  "thyroid:free_t3": 600, "thyroid:free_t4": 600,
  "thyroid:t3_uptake": 500, "thyroid:t7": 500,
  "thyroid:anti_tg": 800, "thyroid:anti_tpo": 800,

  "coagulation:pt": 300, "coagulation:aptt": 300, "coagulation:inr": 250,
  "coagulation:fibrinogen": 400, "coagulation:d_dimer": 800,
  "coagulation:thrombin_time": 350, "coagulation:bleeding_time": 200,
  "coagulation:clotting_time": 200,

  "urine:u_quantity": 0, "urine:u_colour": 0, "urine:u_sg": 0, "urine:u_ph": 0,
  "urine:u_blood": 0, "urine:u_nitrite": 0, "urine:u_protein": 0, "urine:u_sugar": 0,
  "urine:u_ketone": 0, "urine:u_bilirubin": 0, "urine:u_urobilinogen": 0,
  "urine:u_leucocytes": 0, "urine:u_pus_cells": 0, "urine:u_red_cells": 0,
  "urine:u_epithelial_cells": 0, "urine:u_yeast_cells": 0,
  "urine:u_uric_acid_crystals": 0, "urine:u_calcium_oxalate": 0,
  "urine:u_calcium_carbonate": 0, "urine:u_mucus_threads": 0,
  "urine:u_spermatozoa": 0, "urine:u_rbc_cast": 0, "urine:u_granular_cast": 0,
  "urine:u_cocco_bacteria": 0, "urine:u_amorphous": 0, "urine:u_wbc_cast": 0,
  "urine:u_calcium_phosphate": 0,

  "stool:stool_color": 0, "stool:stool_consistency": 0, "stool:stool_blood": 0,
  "stool:stool_worms": 0, "stool:stool_ph": 0, "stool:stool_occult_blood": 0,
  "stool:stool_mucus": 0, "stool:stool_pus_cells": 0, "stool:stool_rbc": 0,
  "stool:stool_epithelial_cells": 0, "stool:stool_bacteria": 0,
  "stool:stool_ova_cysts": 0, "stool:stool_parasites": 0,
  "stool:stool_fat_globules": 0, "stool:stool_yeast_cells": 0,
  "stool:stool_trophozoites": 0, "stool:stool_granular_cast": 0,
  "stool:stool_fat_bodies": 0, "stool:stool_undigested_food": 0,
  "stool:stool_hpylori": 0, "stool:stool_culture": 0,

  "semen:sem_days": 0, "semen:sem_color": 0, "semen:sem_volume": 0,
  "semen:sem_ph": 0, "semen:sem_active": 0, "semen:sem_sluggish": 0,
  "semen:sem_dead": 0, "semen:sem_normal": 0, "semen:sem_abnormal": 0,
  "semen:sem_pus": 0, "semen:sem_total": 0,

  "btct:bt": 0, "btct:ct": 0,
  "hb:hb_only": 200,
  "urine_pt:urine_pregnancy": 400,
  "vitamind:vitamin_d": 2500,
  "beta_hcg:beta_hcg": 1200,
  "hpylori:stool_hpylori": 0, "hpylori:hpylori": 0,

  "miscellaneous:blood_group": 100, "miscellaneous:hba1c": 800,
  "miscellaneous:semen_analysis": 500, "miscellaneous:sputum_afb": 300,
  "miscellaneous:occult_blood": 200, "miscellaneous:peripheral_smear": 400,
  "miscellaneous:reticulocyte_count": 400,

  "crossmatch:patient_blood_group": 0, "crossmatch:patient_rh": 0,
  "crossmatch:donor_blood_group": 0, "crossmatch:donor_rh": 0,
  "crossmatch:bag_no": 0, "crossmatch:hbsag": 0,
  "crossmatch:anti_hcv": 0, "crossmatch:hiv": 0, "crossmatch:cross_match": 0,

  "extra:crp": 400,
  "extra:typhidot_igg": 500, "extra:typhidot_igm": 500,
  "extra:mp_pf": 300, "extra:mp_pv": 300,
  "extra:stool_hpylori": 500, "extra:hpylori": 500,
  "extra:widal_to": 200, "extra:widal_th": 200,
  "extra:aso_titre": 400,
  "extra:ra_factor": 400, "extra:ra_factor_titer": 400,
  "extra:hbsag": 400, "extra:anti_hcv": 400, "extra:anti_hiv": 500,
  "extra:dengue_ns1": 600,
  "extra:glucose_r": 200, "extra:glucose_f": 200,
  "extra:hba1c": 800,
  "extra:amylase": 300, "extra:urea": 200, "extra:creatinine": 200,
  "extra:calcium": 200, "extra:ldh": 300,
  "extra:total_bilirubin": 150, "extra:alt": 150, "extra:alk_phos": 150,
  "extra:direct_bilirubin": 150, "extra:indirect_bilirubin": 150,
  "extra:cholesterol": 200, "extra:triglyceride": 200, "extra:hdl": 200, "extra:ldl": 200,
}

const DEFAULT_BUNDLES: Record<string, Omit<BundleDef, "price">[]> = {
  lft: [
    { id: "bilirubin-trio", label: "Bilirubin (T/D/I)", tests: ["total_bilirubin", "direct_bilirubin", "indirect_bilirubin"], enabled: true },
    { id: "liver-enzymes",  label: "ALT + ALP + GGT",   tests: ["alt", "alk_phos", "ggt"], enabled: true },
  ],
  biochemistry: [
    { id: "renal-trio",   label: "Urea + Creatinine + Uric Acid", tests: ["urea", "creatinine", "uric_acid"], enabled: true },
    { id: "mineral-trio", label: "Ca + Phos + Mg",                tests: ["calcium", "phosphorus", "magnesium"], enabled: true },
    { id: "iron-panel",   label: "Iron + TIBC + Ferritin",        tests: ["iron", "tibc", "ferritin"], enabled: true },
  ],
  lipid_profile: [
    { id: "lipid-4", label: "Chol + TG + HDL + LDL", tests: ["cholesterol", "triglyceride", "hdl", "ldl"], enabled: true },
    { id: "lipid-3", label: "Chol + HDL + LDL",      tests: ["cholesterol", "hdl", "ldl"], enabled: true },
  ],
  serology: [
    { id: "hepatitis-trio", label: "HBsAg + Anti-HCV + Anti-HIV", tests: ["hbsag", "anti_hcv", "anti_hiv"], enabled: true },
    { id: "widal-pair",     label: "Widal TO + TH",               tests: ["widal_to", "widal_th"], enabled: true },
    { id: "typhidot-pair",  label: "Typhidot IgG + IgM",          tests: ["typhidot_igg", "typhidot_igm"], enabled: true },
    { id: "mp-pair",        label: "MP Pf + Pv",                  tests: ["mp_pf", "mp_pv"], enabled: true },
  ],
}

const EXTRAS_BUNDLES: Omit<BundleDef, "price">[] = [
  { id: "typhidot-pair", label: "Typhidot IgG + IgM", tests: ["typhidot_igg", "typhidot_igm"], enabled: true },
  { id: "mp-pair",       label: "MP Pf + Pv",         tests: ["mp_pf", "mp_pv"],             enabled: true },
  { id: "widal-pair",    label: "Widal TO + TH",      tests: ["widal_to", "widal_th"],       enabled: true },
]

/* ═══════════════════════════════════════════════════════════════
   STORE
   ═══════════════════════════════════════════════════════════════ */

function buildDefaultStore(): PricingStore {
  const panels: Record<string, PanelPricing> = {}
  for (const p of PANELS) {
    const singles: Record<string, number> = {}
    for (const t of p.tests) singles[t.id] = SINGLE_DEFAULTS[`${p.id}:${t.id}`] ?? 0
    const bundles = (DEFAULT_BUNDLES[p.id] ?? []).map((b) => ({
      ...b,
      price: Math.round(b.tests.reduce((s, id) => s + (singles[id] ?? 0), 0) * 0.85),
    }))
    panels[p.id] = {
      whole: PANEL_WHOLE_DEFAULTS[p.id] ?? 0,
      wholeTier2: PANEL_WHOLE_TIER2_DEFAULTS[p.id] ?? 0,
      singles, hidden: [], bundles,
    }
  }
  const extrasSingles: Record<string, number> = {}
  for (const t of EXTRA_TESTS) extrasSingles[t.id] = SINGLE_DEFAULTS[`extra:${t.id}`] ?? 300
  const extrasBundles: BundleDef[] = EXTRAS_BUNDLES.map((b) => ({
    ...b,
    price: Math.round(b.tests.reduce((s, id) => s + (extrasSingles[id] ?? 0), 0) * 0.85),
  }))
  return {
    panels,
    extras: { singles: extrasSingles, hidden: [], bundles: extrasBundles },
  }
}

let cache: PricingStore | null = null

function load(): PricingStore {
  if (typeof window === "undefined") return buildDefaultStore()
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      const fresh = buildDefaultStore()
      window.localStorage.setItem(KEY, JSON.stringify(fresh))
      cache = fresh
      return fresh
    }
    cache = mergeWithDefaults(JSON.parse(raw) as PricingStore)
    return cache
  } catch {
    cache = buildDefaultStore()
    return cache
  }
}

function mergeWithDefaults(stored: PricingStore): PricingStore {
  const fresh = buildDefaultStore()
  const out: PricingStore = { panels: {}, extras: fresh.extras }
  for (const p of PANELS) {
    const storedPanel = stored.panels?.[p.id]
    if (!storedPanel) { out.panels[p.id] = fresh.panels[p.id]; continue }
    const singles = { ...fresh.panels[p.id].singles, ...storedPanel.singles }
    const bundles = (storedPanel.bundles ?? fresh.panels[p.id].bundles).map((b) => ({
      ...b, price: b.price ?? 0,
    }))
    out.panels[p.id] = {
      whole: storedPanel.whole ?? fresh.panels[p.id].whole,
      wholeTier2: storedPanel.wholeTier2 ?? fresh.panels[p.id].wholeTier2,
      singles, hidden: storedPanel.hidden ?? [], bundles,
    }
  }
  if (stored.extras) {
    const singles = { ...fresh.extras.singles, ...stored.extras.singles }
    for (const t of EXTRA_TESTS) {
      if (singles[t.id] === undefined) singles[t.id] = fresh.extras.singles[t.id] ?? 300
    }
    out.extras = {
      singles,
      hidden: stored.extras.hidden ?? [],
      bundles: stored.extras.bundles ?? fresh.extras.bundles,
    }
  }
  return out
}

function persist(next: PricingStore) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(next))
  cache = null
  window.dispatchEvent(new CustomEvent("lab-pricing-changed"))
}

/* ═══════════════════════════════════════════════════════════════
   READ
   ═══════════════════════════════════════════════════════════════ */

export function getStore(): PricingStore { return load() }

export function getPanelPricing(panelId: string): PanelPricing {
  const s = load()
  if (panelId === "extra") {
    return {
      whole: Object.values(s.extras.singles).reduce((a, b) => a + b, 0),
      wholeTier2: 0,
      singles: s.extras.singles,
      hidden: s.extras.hidden,
      bundles: s.extras.bundles,
    }
  }
  return s.panels[panelId] ?? { whole: 0, wholeTier2: 0, singles: {}, hidden: [], bundles: [] }
}

export function getSinglePrice(panelId: string, testId: string): number {
  return getPanelPricing(panelId).singles[testId] ?? 0
}

export function getWholePrice(panelId: string, activeKeys?: string[]): number {
  const p = getPanelPricing(panelId)
  const panelDef = PANELS.find((x) => x.id === panelId)
  const tier2Tests = panelDef?.wholeTier2Tests ?? []
  if (tier2Tests.length > 0 && activeKeys) {
    const hasAny = tier2Tests.some((t) => activeKeys.includes(`${panelId}:${t}`))
    if (hasAny) return p.wholeTier2 || p.whole
  }
  return p.whole
}

export function isHidden(panelId: string, testId: string): boolean {
  return getPanelPricing(panelId).hidden.includes(testId)
}

export function getBundles(panelId: string): BundleDef[] {
  return getPanelPricing(panelId).bundles.filter((b) => b.enabled)
}

/* ═══════════════════════════════════════════════════════════════
   WRITE
   ═══════════════════════════════════════════════════════════════ */

export function setWholePrice(panelId: string, price: number) {
  if (panelId === "extra") return
  const s = { ...load() }
  s.panels[panelId] = { ...s.panels[panelId], whole: Math.max(0, Math.round(price) || 0) }
  persist(s)
}

export function setWholeTier2Price(panelId: string, price: number) {
  if (panelId === "extra") return
  const s = { ...load() }
  s.panels[panelId] = { ...s.panels[panelId], wholeTier2: Math.max(0, Math.round(price) || 0) }
  persist(s)
}

export function setSinglePrice(panelId: string, testId: string, price: number) {
  const s = { ...load() }
  const val = Math.max(0, Math.round(price) || 0)
  if (panelId === "extra") {
    s.extras = { ...s.extras, singles: { ...s.extras.singles, [testId]: val } }
  } else {
    s.panels[panelId] = {
      ...s.panels[panelId],
      singles: { ...s.panels[panelId].singles, [testId]: val },
    }
  }
  persist(s)
}

export function hideTest(panelId: string, testId: string, hide: boolean) {
  const s = { ...load() }
  if (panelId === "extra") {
    const next = new Set(s.extras.hidden)
    hide ? next.add(testId) : next.delete(testId)
    s.extras = { ...s.extras, hidden: [...next] }
  } else {
    const p = s.panels[panelId]
    const next = new Set(p.hidden)
    hide ? next.add(testId) : next.delete(testId)
    s.panels[panelId] = { ...p, hidden: [...next] }
  }
  persist(s)
}

export function setBundlePrice(panelId: string, bundleId: string, price: number) {
  const s = { ...load() }
  const target = panelId === "extra" ? s.extras : s.panels[panelId]
  const bundles = target.bundles.map((b) =>
    b.id === bundleId ? { ...b, price: Math.max(0, Math.round(price) || 0) } : b,
  )
  if (panelId === "extra") s.extras = { ...s.extras, bundles }
  else s.panels[panelId] = { ...s.panels[panelId], bundles }
  persist(s)
}

export function setBundleEnabled(panelId: string, bundleId: string, enabled: boolean) {
  const s = { ...load() }
  const target = panelId === "extra" ? s.extras : s.panels[panelId]
  const bundles = target.bundles.map((b) => b.id === bundleId ? { ...b, enabled } : b)
  if (panelId === "extra") s.extras = { ...s.extras, bundles }
  else s.panels[panelId] = { ...s.panels[panelId], bundles }
  persist(s)
}

export function resetPricing() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(KEY)
  cache = null
  window.dispatchEvent(new CustomEvent("lab-pricing-changed"))
}

export function formatPKR(n: number): string {
  return `Rs. ${(n || 0).toLocaleString("en-PK")}`
}

/* ═══════════════════════════════════════════════════════════════
   RESOLVER — used by Result Entry and Print
   ═══════════════════════════════════════════════════════════════ */

export interface PriceResult {
  total: number
  rule: "whole" | "wholeTier2" | "bundle" | "sum" | "empty"
  label: string
  breakdown: { id: string; label: string; price: number }[]
}

export function resolvePanelPrice(panelId: string, activeKeys: string[]): PriceResult {
  const panel = allPanelsForPricing().find((p) => p.id === panelId)
  if (!panel || activeKeys.length === 0) {
    return { total: 0, rule: "empty", label: "Nothing selected", breakdown: [] }
  }

  const pricing = getPanelPricing(panelId)
  const visibleTests = panel.tests.filter((t) => !pricing.hidden.includes(t.id))
  const visibleIds = visibleTests.map((t) => t.id)
  const selectedIds = activeKeys
    .map((k) => k.split(":").slice(1).join(":"))
    .filter((id) => visibleIds.includes(id))
  const selectedSet = new Set(selectedIds)

  if (selectedSet.size === 0) {
    return { total: 0, rule: "empty", label: "Nothing selected", breakdown: [] }
  }

  const nonOptional = visibleTests.filter((t) => !t.optional)
  const allNonOptionalSelected = nonOptional.every((t) => selectedSet.has(t.id))

  if (allNonOptionalSelected && !pricing.hidden.length) {
    const panelDef = PANELS.find((p) => p.id === panelId)
    const tier2Tests = panelDef?.wholeTier2Tests ?? []
    const usesTier2 = tier2Tests.some((t) => selectedSet.has(t))
    const price = usesTier2 ? (pricing.wholeTier2 || pricing.whole) : pricing.whole
    if (price > 0) {
      return {
        total: price,
        rule: usesTier2 ? "wholeTier2" : "whole",
        label: usesTier2 ? "Whole panel (with add-on)" : "Whole panel",
        breakdown: [{ id: "__whole__", label: usesTier2 ? "Whole panel + add-on" : "Whole panel price", price }],
      }
    }
  }

  const sorted = [...pricing.bundles].sort((a, b) => b.tests.length - a.tests.length)
  for (const b of sorted) {
    if (!b.enabled) continue
    const bSet = new Set(b.tests.filter((id) => visibleIds.includes(id)))
    if (bSet.size !== selectedSet.size) continue
    let match = true
    for (const id of selectedSet) if (!bSet.has(id)) { match = false; break }
    if (match) {
      return {
        total: b.price,
        rule: "bundle",
        label: b.label,
        breakdown: [{ id: `bundle:${b.id}`, label: `${b.label} (bundle)`, price: b.price }],
      }
    }
  }

  const breakdown = [...selectedSet].map((id) => ({
    id,
    label: visibleTests.find((t) => t.id === id)?.name ?? id,
    price: pricing.singles[id] ?? 0,
  }))
  return {
    total: breakdown.reduce((s, r) => s + r.price, 0),
    rule: "sum",
    label: `${selectedSet.size} individual test(s)`,
    breakdown,
  }
}

export function getPrice(id: string): number {
  if (id.includes(":")) {
    const [pid, tid] = id.split(":")
    return getSinglePrice(pid, tid)
  }
  return getWholePrice(id)
}

export function getPanelTotal(panelId: string): number {
  return getWholePrice(panelId)
}
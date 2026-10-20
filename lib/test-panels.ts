// lib/test-panels.ts

export type Gender = "Male" | "Female" | "Child"

export interface Test {
  id: string
  name: string
  unit?: string
  range?: string
  maleRange?: string
  femaleRange?: string
  childRange?: string
  options?: string[]
  default?: string
  optional?: boolean
  section?: string
  numeric?: boolean
}

export interface Panel {
  id: string
  name: string
  category: string
  tests: Test[]
  /** Whole-panel only — individual tests are never billed separately. */
  wholeOnly?: boolean
  /** Optional add-on test ids that raise the whole-panel price to a second tier. */
  wholeTier2Tests?: string[]
}

const OPTS_STD   = ["Nil", "Trace", "+", "++", "+++", "Few"]
const OPTS_YN    = ["Negative", "Positive"]
const COLOUR_U   = ["Pale Yellow", "Straw", "Dark Yellow", "Amber", "Red", "Brown"]
const COLOUR_S   = ["Brown", "Yellow", "Green", "Black", "Pale", "Red"]
const CONSIST_S  = ["Formed", "Semi-Formed", "Soft", "Loose", "Watery"]

export const PANELS: Panel[] = [
  // ═══════════════════ CBC ═══════════════════
  {
    id: "cbc",
    name: "CBC (Complete Blood Count)",
    category: "Hematology",
    wholeOnly: true,
    wholeTier2Tests: ["esr"],
    tests: [
      { id: "hb",   name: "Hemoglobin",  unit: "g/dL",       maleRange: "13-18", femaleRange: "12-16", childRange: "N/A" },
      { id: "rbc",  name: "RBC",         unit: "million/µL", maleRange: "5.0-6.5", femaleRange: "3.9-5.3", childRange: "4.1-6.1" },
      { id: "hct",  name: "HCT",         unit: "%",          maleRange: "40-54", femaleRange: "40-54", childRange: "40-54" },
      { id: "mcv",  name: "MCV",         unit: "fL",         maleRange: "76-96", femaleRange: "76-96", childRange: "76-96" },
      { id: "mch",  name: "MCH",         unit: "pg",         maleRange: "28-32", femaleRange: "28-32", childRange: "28-32" },
      { id: "mchc", name: "MCHC",        unit: "g/dL",       maleRange: "32-36", femaleRange: "32-36", childRange: "32-36" },
      { id: "plt",  name: "Platelets",   unit: "/µL",        maleRange: "150000-400000", femaleRange: "150000-400000", childRange: "150000-400000" },
      { id: "wbc",  name: "WBC",         unit: "/µL",        maleRange: "4000-11000", femaleRange: "4000-11000", childRange: "4000-11000" },
      { id: "esr",  name: "ESR",         unit: "mm/30min",   maleRange: "0-9", femaleRange: "0-15", childRange: "N/A", optional: true },
      { id: "neut", name: "Neutrophils", unit: "%",          maleRange: "40-70", femaleRange: "40-70", childRange: "40-70" },
      { id: "lymp", name: "Lymphocytes", unit: "%",          maleRange: "20-50", femaleRange: "20-50", childRange: "20-50" },
      { id: "mono", name: "Monocytes",   unit: "%",          maleRange: "1-6", femaleRange: "1-6", childRange: "1-6" },
      { id: "eos",  name: "Eosinophils", unit: "%",          maleRange: "1-6", femaleRange: "1-6", childRange: "1-6" },
      { id: "baso", name: "Basophils",   unit: "%",          maleRange: "0-1", femaleRange: "0-1", childRange: "0-1" },
    ],
  },

  // ═══════════════════ LFT ═══════════════════
  {
    id: "lft",
    name: "Liver Function Test (LFT)",
    category: "LFT",
    tests: [
      { id: "total_bilirubin",    name: "Total Bilirubin",    unit: "mg/dL", range: "0.1-1.0" },
      { id: "direct_bilirubin",   name: "Direct Bilirubin",   unit: "mg/dL", range: "0.0-0.25" },
      { id: "indirect_bilirubin", name: "Indirect Bilirubin", unit: "mg/dL", range: "0.4-1.0" },
      { id: "alt",                name: "ALT (SGPT)",         unit: "U/L",   range: "up to 40" },
      { id: "alk_phos",           name: "Alk. Phosphatase",   unit: "U/L",   range: "60-275" },
      { id: "ggt",                name: "GGT",                unit: "U/L",   range: "8-61" },
      { id: "total_protein",      name: "Total Protein",      unit: "g/dL",  range: "6.0-8.3" },
      { id: "albumin",            name: "Albumin",            unit: "g/dL",  range: "3.5-5.0" },
      { id: "globulin",           name: "Globulin",           unit: "g/dL",  range: "2.0-3.5" },
      { id: "ag_ratio",           name: "A/G Ratio",          unit: "",      range: "1.0-2.0" },
    ],
  },

  // ═══════════════════ BIOCHEMISTRY ═══════════════════
  {
    id: "biochemistry",
    name: "Biochemistry",
    category: "Biochemistry",
    tests: [
      { id: "glucose_f",  name: "Glucose (Fasting)", unit: "mg/dL", range: "70-110" },
      { id: "glucose_r",  name: "Glucose (Random)",  unit: "mg/dL", range: "70-170" },
      { id: "hba1c",      name: "HbA1c",             unit: "%",     range: "<5.7" },
      { id: "uric_acid",  name: "Uric Acid",         unit: "mg/dL", maleRange: "3.4-7.0", femaleRange: "2.4-5.7", childRange: "N/A" },
      { id: "amylase",    name: "Amylase",           unit: "U/L",   range: "up to 140" },
      { id: "urea",       name: "Urea",              unit: "mg/dL", range: "10-40" },
      { id: "creatinine", name: "Creatinine",        unit: "mg/dL", range: "0.5-1.1" },
      { id: "calcium",    name: "Calcium",           unit: "mg/dL", range: "8.8-10.2" },
      { id: "ldh",        name: "LDH",               unit: "U/L",   range: "140-280" },
      { id: "phosphorus", name: "Phosphorus",        unit: "mg/dL", range: "2.5-4.5" },
      { id: "magnesium",  name: "Magnesium",         unit: "mg/dL", range: "1.7-2.2" },
      { id: "iron",       name: "Iron",              unit: "µg/dL", range: "60-170" },
      { id: "tibc",       name: "TIBC",              unit: "µg/dL", range: "250-450" },
      { id: "ferritin",   name: "Ferritin",          unit: "ng/mL", range: "20-300" },
    ],
  },

  // ═══════════════════ SEROLOGY ═══════════════════
  {
    id: "serology",
    name: "Serology",
    category: "Serology",
    tests: [
      { id: "hbsag",         name: "HBsAg",          unit: "", options: OPTS_YN, default: "Negative" },
      { id: "anti_hcv",      name: "Anti-HCV",       unit: "", options: OPTS_YN, default: "Negative" },
      { id: "anti_hiv",      name: "Anti-HIV",       unit: "", options: OPTS_YN, default: "Negative" },
      { id: "aso_titre",     name: "ASO Titre",      unit: "", options: OPTS_YN, default: "Negative" },
      { id: "ra_factor",     name: "RA Factor",      unit: "", options: OPTS_YN, default: "Negative" },
      { id: "widal_to",      name: "Widal TO",       unit: "", options: ["1:20", "1:40", "1:80", "1:160", "1:320"], default: "1:40" },
      { id: "widal_th",      name: "Widal TH",       unit: "", options: ["1:20", "1:40", "1:80", "1:160", "1:320"], default: "1:40" },
      { id: "typhidot_igg",  name: "TYPHIDOT IgG",   unit: "", options: OPTS_YN, default: "Negative" },
      { id: "typhidot_igm",  name: "TYPHIDOT IgM",   unit: "", options: OPTS_YN, default: "Negative" },
      { id: "mp_pf",         name: "MP Pf",          unit: "", options: OPTS_YN, default: "Negative" },
      { id: "mp_pv",         name: "MP Pv",          unit: "", options: OPTS_YN, default: "Negative" },
      { id: "dengue_ns1",    name: "Dengue NS1",     unit: "", options: OPTS_YN, default: "Negative" },
      { id: "hpylori",       name: "H. Pylori",      unit: "", options: OPTS_YN, default: "Negative" },
      { id: "stool_hpylori", name: "Stool H. Pylori",unit: "", options: OPTS_YN, default: "Negative" },
      { id: "vdrl",          name: "VDRL",           unit: "", options: OPTS_YN, default: "Negative" },
      { id: "tpha",          name: "TPHA",           unit: "", options: OPTS_YN, default: "Negative" },
    ],
  },

  // ═══════════════════ IMMUNOLOGY ═══════════════════
  {
    id: "immunology",
    name: "Immunology",
    category: "Immunology",
    tests: [
      { id: "crp",             name: "CRP",             unit: "mg/L", range: "<6.0" },
      { id: "ra_factor",       name: "RA Factor",       unit: "", options: OPTS_YN, default: "Negative" },
      { id: "ra_factor_titer", name: "RA Factor Titer", unit: "", options: OPTS_YN, default: "Negative" },
      { id: "ana",             name: "ANA",             unit: "", options: OPTS_YN, default: "Negative" },
      { id: "anti_dsdna",      name: "Anti-dsDNA",      unit: "IU/mL", range: "<30" },
      { id: "c3",              name: "Complement C3",   unit: "mg/dL", range: "90-180" },
      { id: "c4",              name: "Complement C4",   unit: "mg/dL", range: "10-40" },
    ],
  },

  // ═══════════════════ LIPID PROFILE ═══════════════════
  {
    id: "lipid_profile",
    name: "Lipid Profile",
    category: "Lipid Profile",
    tests: [
      { id: "cholesterol",  name: "Cholesterol",        unit: "mg/dL", range: "<200" },
      { id: "triglyceride", name: "Triglyceride",       unit: "mg/dL", range: "0-200" },
      { id: "hdl",          name: "HDL",                unit: "mg/dL", range: "45" },
      { id: "ldl",          name: "LDL",                unit: "mg/dL", range: "0-150" },
      { id: "vldl",         name: "VLDL",               unit: "mg/dL", range: "0-40" },
      { id: "non_hdl",      name: "Non-HDL Cholesterol",unit: "mg/dL", range: "<130" },
      { id: "tc_hdl_ratio", name: "TC/HDL Ratio",       unit: "",      range: "<5.0" },
    ],
  },

  // ═══════════════════ ELECTROLYTES ═══════════════════
  {
    id: "electrolytes",
    name: "Electrolytes",
    category: "Electrolytes",
    tests: [
      { id: "na",              name: "Sodium (Na)",        unit: "mmol/L", range: "136-145" },
      { id: "k",               name: "Potassium (K)",      unit: "mmol/L", range: "3.5-5.1" },
      { id: "cl",              name: "Chloride (Cl)",      unit: "mmol/L", range: "95-110" },
      { id: "hco3",            name: "Bicarbonate (HCO3)", unit: "mmol/L", range: "22-32" },
      { id: "anion_gap",       name: "Anion Gap",          unit: "mmol/L", range: "8-16" },
      { id: "calcium_ionized", name: "Calcium (Ionized)",  unit: "mmol/L", range: "1.15-1.32" },
      { id: "magnesium",       name: "Magnesium",          unit: "mmol/L", range: "0.65-1.05" },
      { id: "phosphorus",      name: "Phosphorus",         unit: "mmol/L", range: "0.81-1.45" },
    ],
  },

  // ═══════════════════ URINE D/R (whole only) ═══════════════════
  {
    id: "urine",
    name: "Urine D/R",
    category: "Urine",
    wholeOnly: true,
    tests: [
      { id: "u_quantity",           name: "Quantity",           unit: "ml",   numeric: true, default: "20",          section: "Physical Examination" },
      { id: "u_colour",             name: "Colour",             unit: "",     options: COLOUR_U, default: "Pale Yellow", section: "Physical Examination" },
      { id: "u_sg",                 name: "Specific Gravity",   unit: "",     numeric: true, range: "1.005-1.030",    default: "1.030", section: "Physical Examination" },
      { id: "u_ph",                 name: "pH",                 unit: "",     numeric: true, range: "5.0-8.0",        default: "6.0",   section: "Physical Examination" },
      { id: "u_blood",              name: "Blood",              unit: "",     options: OPTS_STD, default: "Nil",       section: "Physical Examination" },
      { id: "u_nitrite",            name: "Nitrite",            unit: "",     options: OPTS_STD, default: "Nil",       section: "Physical Examination" },
      { id: "u_protein",            name: "Protein",            unit: "",     options: OPTS_STD, default: "Nil",       section: "Physical Examination" },
      { id: "u_sugar",              name: "Sugar",              unit: "",     options: OPTS_STD, default: "Nil",       section: "Physical Examination" },
      { id: "u_ketone",             name: "Ketone",             unit: "",     options: OPTS_STD, default: "1+",        section: "Physical Examination" },
      { id: "u_bilirubin",          name: "Bilirubin",          unit: "",     options: OPTS_STD, default: "Nil",       section: "Physical Examination" },
      { id: "u_urobilinogen",       name: "Urobilinogen",       unit: "",     options: OPTS_STD, default: "Nil",       section: "Physical Examination" },
      { id: "u_leucocytes",         name: "Leucocytes",         unit: "",     options: OPTS_STD, default: "Nil",       section: "Physical Examination" },
      { id: "u_pus_cells",          name: "Pus Cells",          unit: "/HPF", options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_red_cells",          name: "Red Cells",          unit: "/HPF", options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_epithelial_cells",   name: "Epithelial Cells",   unit: "",     options: OPTS_STD, default: "Few",       section: "Microscopic Examination" },
      { id: "u_yeast_cells",        name: "Yeast Cells",        unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_uric_acid_crystals", name: "Uric Acid Crystals", unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_calcium_oxalate",    name: "Calcium Oxalate",    unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_calcium_carbonate",  name: "Calcium Carbonate",  unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_mucus_threads",      name: "Mucus Threads",      unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_spermatozoa",        name: "Spermatozoa",        unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_rbc_cast",           name: "RBC Cast",           unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_granular_cast",      name: "Granular Cast",      unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_cocco_bacteria",     name: "Cocco Bacteria",     unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_amorphous",          name: "Amorphous",          unit: "",     options: OPTS_STD, default: "1+",        section: "Microscopic Examination" },
      { id: "u_wbc_cast",           name: "WBC Cast",           unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
      { id: "u_calcium_phosphate",  name: "Calcium Phosphate",  unit: "",     options: OPTS_STD, default: "Nil",       section: "Microscopic Examination" },
    ],
  },

  // ═══════════════════ STOOL D/R (whole only) ═══════════════════
  {
    id: "stool",
    name: "Stool D/R",
    category: "Stool",
    wholeOnly: true,
    tests: [
      { id: "stool_color",            name: "Color",             unit: "", options: COLOUR_S, default: "Brown",    section: "Physical Examination" },
      { id: "stool_consistency",      name: "Consistency",       unit: "", options: CONSIST_S, default: "Formed",  section: "Physical Examination" },
      { id: "stool_blood",            name: "Blood",             unit: "", options: OPTS_STD, default: "Nil",      section: "Physical Examination" },
      { id: "stool_worms",            name: "Worms",             unit: "", options: OPTS_STD, default: "Nil",      section: "Physical Examination" },
      { id: "stool_ph",               name: "pH",                unit: "", numeric: true, range: "6.5-7.5", default: "7.0", section: "Physical Examination" },
      { id: "stool_occult_blood",     name: "Occult Blood",      unit: "", options: OPTS_STD, default: "Nil",      section: "Physical Examination" },
      { id: "stool_mucus",            name: "Mucus",             unit: "", options: OPTS_STD, default: "Nil",      section: "Physical Examination" },
      { id: "stool_pus_cells",        name: "Pus Cells",         unit: "/hpf", options: OPTS_STD, default: "Nil",   section: "Microscopic Examination" },
      { id: "stool_rbc",              name: "RBC",               unit: "/hpf", options: OPTS_STD, default: "Nil",   section: "Microscopic Examination" },
      { id: "stool_epithelial_cells", name: "Epithelial Cells",  unit: "", options: OPTS_STD, default: "Few",      section: "Microscopic Examination" },
      { id: "stool_bacteria",         name: "Bacteria",          unit: "", options: OPTS_STD, default: "Few",      section: "Microscopic Examination" },
      { id: "stool_ova_cysts",        name: "Ova/Cysts",         unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_parasites",        name: "Parasites",         unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_fat_globules",     name: "Fat Globules",      unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_yeast_cells",      name: "Yeast Cells",       unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_trophozoites",     name: "Trophozoites",      unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_granular_cast",    name: "Granular Cast",     unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_fat_bodies",       name: "Fat Bodies",        unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_undigested_food",  name: "Undigested Food",   unit: "", options: OPTS_STD, default: "Few",      section: "Microscopic Examination" },
      { id: "stool_hpylori",          name: "H. Pylori Antigen", unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
      { id: "stool_culture",          name: "Culture",           unit: "", options: OPTS_STD, default: "Nil",      section: "Microscopic Examination" },
    ],
  },

  // ═══════════════════ SEMEN ANALYSIS (whole only) ═══════════════════
  {
    id: "semen",
    name: "Semen Analysis",
    category: "Semen Analysis",
    wholeOnly: true,
    tests: [
      { id: "sem_days",     name: "Days of Abstinence", unit: "",    numeric: true, default: "3",        section: "Semen Examination" },
      { id: "sem_color",    name: "Color",              unit: "",    options: ["Grayish", "Translucent", "Opaque"], default: "Grayish", section: "Physical and Chemical Exam" },
      { id: "sem_volume",   name: "Volume",             unit: "ml",  numeric: true, range: "2.5-6.0", default: "2.5", section: "Physical and Chemical Exam" },
      { id: "sem_ph",       name: "pH",                 unit: "",    numeric: true, range: "7.2-8.0", default: "6.0", section: "Physical and Chemical Exam" },
      { id: "sem_active",   name: "(a) Active",         unit: "%",   numeric: true, range: "65", default: "70", section: "Motility" },
      { id: "sem_sluggish", name: "(b) Sluggish",       unit: "%",   numeric: true, range: "10", default: "10", section: "Motility" },
      { id: "sem_dead",     name: "(c) Dead",           unit: "%",   numeric: true, range: "20", default: "20", section: "Motility" },
      { id: "sem_normal",   name: "(a) Normal",         unit: "%",   numeric: true, range: "80", default: "85", section: "Morphology" },
      { id: "sem_abnormal", name: "(b) Abnormal",       unit: "%",   numeric: true, range: "20", default: "15", section: "Morphology" },
      { id: "sem_pus",      name: "Pus Cells",          unit: "",    default: "08-12", section: "Morphology" },
      { id: "sem_total",    name: "Total Count",        unit: "Million/ml", numeric: true, range: "60-300", default: "85", section: "Total Count" },
    ],
  },

  // ═══════════════════ H. PYLORI (whole only) ═══════════════════
  {
    id: "hpylori",
    name: "H. Pylori Tests",
    category: "H. Pylori",
    wholeOnly: true,
    tests: [
      { id: "stool_hpylori", name: "Stool H. Pylori", unit: "", options: OPTS_YN, default: "Negative", section: "Stool H. Pylori" },
      { id: "hpylori",       name: "H. Pylori",       unit: "", options: OPTS_YN, default: "Negative", section: "H. Pylori" },
    ],
  },

  // ═══════════════════ THYROID ═══════════════════
  {
    id: "thyroid",
    name: "Thyroid Profile",
    category: "Thyroid",
    tests: [
      { id: "tsh",       name: "TSH",                        unit: "uIU/mL", range: "0.4-4.2" },
      { id: "t3",        name: "T3 (Total Triiodothyronine)",unit: "nmol/mL", range: "0.9-2.8" },
      { id: "t4",        name: "T4 (Total Thyroxine)",       unit: "nmol/L", range: "10.23-300" },
      { id: "free_t3",   name: "Free T3",                    unit: "pg/mL",  range: "2.3-4.2" },
      { id: "free_t4",   name: "Free T4",                    unit: "ng/dL",  range: "0.8-1.8" },
      { id: "t3_uptake", name: "T3 Uptake",                  unit: "%",      range: "25-35" },
      { id: "t7",        name: "T7 (Free Thyroxine Index)",  unit: "",       range: "1.4-4.0" },
      { id: "anti_tg",   name: "Anti-Tg",                    unit: "IU/mL",  range: "<40" },
      { id: "anti_tpo",  name: "Anti-TPO",                   unit: "IU/mL",  range: "<35" },
    ],
  },

  // ═══════════════════ COAGULATION ═══════════════════
  {
    id: "coagulation",
    name: "Coagulation",
    category: "Coagulation",
    tests: [
      { id: "pt",            name: "PT (Prothrombin Time)", unit: "sec",   range: "11-13.5" },
      { id: "aptt",          name: "APTT",                  unit: "sec",   range: "25-35" },
      { id: "inr",           name: "INR",                   unit: "",      range: "0.8-1.2" },
      { id: "fibrinogen",    name: "Fibrinogen",            unit: "mg/dL", range: "200-400" },
      { id: "d_dimer",       name: "D-Dimer",               unit: "µg/mL", range: "<0.5" },
      { id: "thrombin_time", name: "Thrombin Time",         unit: "sec",   range: "14-21" },
      { id: "bleeding_time", name: "Bleeding Time",         unit: "min",   range: "1-9" },
      { id: "clotting_time", name: "Clotting Time",         unit: "min",   range: "5-15" },
    ],
  },

  // ═══════════════════ MISCELLANEOUS ═══════════════════
  {
    id: "miscellaneous",
    name: "Miscellaneous",
    category: "Miscellaneous",
    tests: [
      { id: "blood_group",        name: "Blood Group",          unit: "", options: ["A", "B", "AB", "O"] },
      { id: "semen_analysis",     name: "Semen Analysis",       unit: "", range: "Normal" },
      { id: "sputum_afb",         name: "Sputum for AFB",       unit: "", options: OPTS_YN, default: "Negative" },
      { id: "occult_blood",       name: "Occult Blood (Stool)", unit: "", options: OPTS_YN, default: "Negative" },
      { id: "peripheral_smear",   name: "Peripheral Smear",     unit: "", options: ["Normal", "Abnormal"], default: "Normal" },
      { id: "reticulocyte_count", name: "Reticulocyte Count",   unit: "%", range: "0.5-1.5" },
    ],
  },

  // ═══════════════════ URINE PT (whole only) ═══════════════════
  {
    id: "urine_pt",
    name: "Urine PT (Pregnancy Test)",
    category: "Urine PT",
    wholeOnly: true,
    tests: [
      { id: "urine_pregnancy", name: "Urine Pregnancy", unit: "", options: OPTS_YN, default: "Negative" },
    ],
  },

  // ═══════════════════ BT / CT (whole only) ═══════════════════
  {
    id: "btct",
    name: "BT CT (Bleeding Time / Clotting Time)",
    category: "Coagulation",
    wholeOnly: true,
    tests: [
      { id: "bt", name: "Bleeding Time (BT)", unit: "min", range: "2-7" },
      { id: "ct", name: "Clotting Time (CT)", unit: "min", range: "5-11" },
    ],
  },

  // ═══════════════════ VITAMIN D (whole only) ═══════════════════
  {
    id: "vitamind",
    name: "Vitamin D",
    category: "Biochemistry",
    wholeOnly: true,
    tests: [
      { id: "vitamin_d", name: "Vitamin D", unit: "ng/mL",
        range: "Deficiency: <20\nInsufficiency: 20-30\nSufficiency: 30-100\nIntoxication: >100" },
    ],
  },

  // ═══════════════════ HB (whole only) ═══════════════════
  {
    id: "hb",
    name: "HB (Hemoglobin)",
    category: "Hematology",
    wholeOnly: true,
    tests: [
      { id: "hb_only", name: "Hemoglobin", unit: "g/dL",
        maleRange: "13.5-18.0", femaleRange: "12.0-15.0", childRange: "11.0-16.0" },
    ],
  },

  // ═══════════════════ BETA HCG (whole only) ═══════════════════
  {
    id: "beta_hcg",
    name: "Beta HCG (Quantitative)",
    category: "Hormone",
    wholeOnly: true,
    tests: [
      { id: "beta_hcg", name: "β‑hCG", unit: "mIU/mL",
        range: "Week 3: 5.8–71.2\nWeek 4: 9.5–750\nWeek 5: 217–7138\nWeek 6: 158–31,795\nWeek 7: 3697–163,563\nWeek 8: 32,065–149,571\nWeek 9: 63,803–151,410\nWeek 10: 46,509–186,977\nWeek 12: 27,832–210,612\nWeek 14: 27,832–210,612\nWeek 15: 12,039–70,971\nWeek 16: 9040–56,451\nWeek 17: 8175–55,868\nWeek 18: 8099–58,176" },
    ],
  },

  // ═══════════════════ CROSS MATCH (whole only) ═══════════════════
  {
    id: "crossmatch",
    name: "Cross Match (Blood Grouping & Compatibility)",
    category: "Cross Match",
    wholeOnly: true,
    tests: [
      { id: "patient_blood_group", name: "Patient Blood Group",   unit: "", options: ["A", "B", "AB", "O"] },
      { id: "patient_rh",          name: "Patient Rh",            unit: "", options: ["Positive", "Negative"] },
      { id: "donor_blood_group",   name: "Donor Blood Group",     unit: "", options: ["A", "B", "AB", "O"] },
      { id: "donor_rh",            name: "Donor Rh",              unit: "", options: ["Positive", "Negative"] },
      { id: "bag_no",              name: "Bag No.",               unit: "" },
      { id: "hbsag",               name: "HBsAg (Hepatitis B)",   unit: "", options: OPTS_YN, default: "Negative" },
      { id: "anti_hcv",            name: "Anti-HCV (Hepatitis C)",unit: "", options: OPTS_YN, default: "Negative" },
      { id: "hiv",                 name: "HIV 1 & 2",             unit: "", options: OPTS_YN, default: "Negative" },
      { id: "cross_match",         name: "Cross Match",           unit: "", options: ["Compatible", "Incompatible"], default: "Compatible" },
    ],
  },
]

/* ────────────── Helpers ────────────── */

export function panelById(id: string): Panel | undefined {
  return PANELS.find((p) => p.id === id)
}

export function rangeFor(test: Test, gender: Gender): string {
  if (test.maleRange && test.femaleRange && test.childRange) {
    if (gender === "Male") return test.maleRange
    if (gender === "Female") return test.femaleRange
    return test.childRange
  }
  return test.range ?? ""
}

export function evaluate(value: string, range: string): "high" | "low" | "normal" | "none" {
  if (!value || !range) return "none"
  const num = parseFloat(value)
  if (isNaN(num)) return "none"
  const parts = range.split("-").map((s) => parseFloat(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    if (num < parts[0]) return "low"
    if (num > parts[1]) return "high"
    return "normal"
  }
  return "none"
}

export type PanelDef = Panel
export type TestDef = Test

/* ═══════════════════════════════════════════════════════════════
   EXTRA / INDIVIDUAL TESTS
   ═══════════════════════════════════════════════════════════════ */

export interface ExtraTest extends Test {
  panelId: "extra"
  panelName: string
}

const EXTRA_OPTS_YN    = ["Negative", "Positive"]
const EXTRA_OPTS_WIDAL = ["1:20", "1:40", "1:80", "1:160", "1:320"]

export const EXTRA_TESTS: ExtraTest[] = [
  // ── Serology / Immunology ──
  { id: "crp",             name: "CRP",             unit: "mg/L", range: "<6.0", numeric: true, panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "typhidot_igg",    name: "TYPHIDOT IgG",    unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "typhidot_igm",    name: "TYPHIDOT IgM",    unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "mp_pf",           name: "MP Pf",           unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "mp_pv",           name: "MP Pv",           unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "stool_hpylori",   name: "Stool H. Pylori", unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "hpylori",         name: "H. Pylori",       unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "widal_to",        name: "Widal TO",        unit: "",     options: EXTRA_OPTS_WIDAL, default: "1:40",     panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "widal_th",        name: "Widal TH",        unit: "",     options: EXTRA_OPTS_WIDAL, default: "1:40",     panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "aso_titre",       name: "ASO Titre",       unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "ra_factor",       name: "RA Factor",       unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "ra_factor_titer", name: "RA Factor Titer", unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "hbsag",           name: "HBsAg",           unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "anti_hcv",        name: "Anti-HCV",        unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "anti_hiv",        name: "Anti-HIV",        unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },
  { id: "dengue_ns1",      name: "Dengue NS1",      unit: "",     options: EXTRA_OPTS_YN,    default: "Negative", panelId: "extra", panelName: "Serology/Immunology", section: "Serology/Immunology" },

  // ── Biochemistry ──
  { id: "glucose_r",  name: "Glucose (Random)",  unit: "mg/dL", range: "70-170",    numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },
  { id: "glucose_f",  name: "Glucose (Fasting)", unit: "mg/dL", range: "70-110",    numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },
  { id: "hba1c",      name: "HbA1c",             unit: "%",     range: "<5.7",      numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },
  { id: "amylase",    name: "Amylase",           unit: "U/L",   range: "up to 140", numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },
  { id: "urea",       name: "Urea",              unit: "mg/dL", range: "10-40",     numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },
  { id: "creatinine", name: "Creatinine",        unit: "mg/dL", range: "0.5-1.1",   numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },
  { id: "calcium",    name: "Calcium",           unit: "mg/dL", range: "8.8-10.2",  numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },
  { id: "ldh",        name: "LDH",               unit: "U/L",   range: "140-280",   numeric: true, panelId: "extra", panelName: "Biochemistry", section: "Biochemistry" },

  // ── LFT ──
  { id: "total_bilirubin",    name: "Total Bilirubin",    unit: "mg/dL", range: "0.4-1.0",  numeric: true, panelId: "extra", panelName: "LFT", section: "LFT" },
  { id: "alt",                name: "ALT (SGPT)",         unit: "U/L",   range: "up to 40", numeric: true, panelId: "extra", panelName: "LFT", section: "LFT" },
  { id: "alk_phos",           name: "Alk. Phosphatase",   unit: "U/L",   range: "60-306",   numeric: true, panelId: "extra", panelName: "LFT", section: "LFT" },
  { id: "direct_bilirubin",   name: "Direct Bilirubin",   unit: "mg/dL", range: "0.0-0.25", numeric: true, panelId: "extra", panelName: "LFT", section: "LFT" },
  { id: "indirect_bilirubin", name: "Indirect Bilirubin", unit: "mg/dL", range: "0.4-1.0",  numeric: true, panelId: "extra", panelName: "LFT", section: "LFT" },

  // ── Lipid Profile ──
  { id: "cholesterol",  name: "Cholesterol",  unit: "mg/dL", range: "<200",  numeric: true, panelId: "extra", panelName: "Lipid Profile", section: "Lipid Profile" },
  { id: "triglyceride", name: "Triglyceride", unit: "mg/dL", range: "<150",  numeric: true, panelId: "extra", panelName: "Lipid Profile", section: "Lipid Profile" },
  { id: "hdl",          name: "HDL",          unit: "mg/dL", range: "45",    numeric: true, panelId: "extra", panelName: "Lipid Profile", section: "Lipid Profile" },
  { id: "ldl",          name: "LDL",          unit: "mg/dL", range: "0-150", numeric: true, panelId: "extra", panelName: "Lipid Profile", section: "Lipid Profile" },
]

export function extraById(id: string): ExtraTest | undefined {
  return EXTRA_TESTS.find((t) => t.id === id)
}

/* ────────────── Pricing metadata ────────────── */

export interface PricingPanelView {
  id: string
  name: string
  category: string
  wholeOnly: boolean
  wholeTier2Tests: string[]
  tests: {
    id: string
    key: string
    name: string
    unit: string
    section?: string
    optional?: boolean
  }[]
}

export function allPanelsForPricing(): PricingPanelView[] {
  return PANELS.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    wholeOnly: p.wholeOnly ?? false,
    wholeTier2Tests: p.wholeTier2Tests ?? [],
    tests: p.tests.map((t) => ({
      id: t.id,
      key: `${p.id}:${t.id}`,
      name: t.name,
      unit: t.unit ?? "",
      section: t.section,
      optional: t.optional ?? false,
    })),
  }))
}
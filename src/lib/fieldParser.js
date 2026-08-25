/**
 * CBC field extraction and normalization for controlled OCR
 * scope; review flags missing, ambiguous, or suspicious extraction.
 *
 * This module is deliberately pure — it takes raw OCR text and returns
 * structured candidates. It does not call Tesseract itself, so it is
 * fully unit-testable with plain Node, no dependencies, exactly like
 * chronology.js. The OCR call site (CaptureScreen) is a thin wrapper
 * around this.
 *
 * IMPORTANT: no real patient values are hard-coded anywhere in this
 * file. Test fixtures use clearly synthetic numbers.
 */

// Canonical field IDs must match src/data/db.js CANONICAL_FIELDS.
const LABEL_NORMALIZATION = {
  wbc: ["wbc", "white blood cell count", "white blood cells", "leukocyte count", "leukocytes"],
  lymphocytes: ["lymphocytes", "lymphs", "lym"],
  monocytes: ["monocytes", "mono"],
  eosinophils: ["eosinophils", "eos"],
  neutrophils: ["neutrophils", "neut", "segmented neutrophils", "segs"],
  rbc: ["rbc", "red blood cell count", "red blood cells", "erythrocyte count"],
  hemoglobin: ["hemoglobin", "haemoglobin", "hgb", "hb"],
  hematocrit: ["hematocrit", "haematocrit", "hct"],
};

// Build a flat lookup: normalized label text -> canonical field id.
const LABEL_LOOKUP = new Map();
for (const [fieldId, variants] of Object.entries(LABEL_NORMALIZATION)) {
  for (const variant of variants) {
    LABEL_LOOKUP.set(variant, fieldId);
  }
}

function normalizeLabelText(raw) {
  return raw.trim().toLowerCase().replace(/[.:]/g, "").replace(/\s+/g, " ");
}

/**
 * Attempt to map a raw OCR label to a canonical field id.
 * Returns null if no supported label matches; no other
 * medical measurements during this release").
 */
export function matchCanonicalField(rawLabel) {
  const norm = normalizeLabelText(rawLabel);
  if (LABEL_LOOKUP.has(norm)) return LABEL_LOOKUP.get(norm);

  // Loose containment match for OCR noise (e.g. trailing punctuation,
  // extra words like "Absolute Neutrophils").
  for (const [variant, fieldId] of LABEL_LOOKUP.entries()) {
    if (norm.includes(variant)) return fieldId;
  }
  return null;
}

// A results line looks roughly like: "Label   12.3   x10^9/L   4.0-10.0"
// OCR text is noisy, so this is intentionally permissive: label text,
// then a number (int or decimal), then optional unit/range on the rest
// of the line.
const RESULT_LINE_RE = /^([A-Za-z][A-Za-z .%-]{1,40}?)\s+([\d]+\.?[\d]*)\s*([A-Za-z%/^0-9]*)\s*(.*)$/;

/**
 * Extract candidate field results from raw OCR text, one attempt per
 * line. Unmatched lines and unsupported labels are simply not
 * returned — they are not errors, just not part of the controlled
 * eight-field scope.
 */
export function extractCandidateFields(rawText) {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates = [];

  for (const line of lines) {
    const match = line.match(RESULT_LINE_RE);
    if (!match) continue;

    const [, rawLabel, rawValue, rawUnit, rest] = match;
    const canonicalFieldId = matchCanonicalField(rawLabel);
    if (!canonicalFieldId) continue;

    const value = parseFloat(rawValue);
    const referenceRangeMatch = rest.match(/([\d]+\.?[\d]*)\s*-\s*([\d]+\.?[\d]*)/);

    candidates.push({
      canonicalFieldId,
      rawLabel: rawLabel.trim(),
      value,
      unit: rawUnit || null,
      referenceRange: referenceRangeMatch
        ? { low: parseFloat(referenceRangeMatch[1]), high: parseFloat(referenceRangeMatch[2]) }
        : null,
      sourceLine: line,
    });
  }

  return dedupeKeepingFirst(candidates);
}

// If OCR produces the same field twice on a page (header repeated,
// noise), keep the first occurrence and flag it as ambiguous rather
// than silently picking one.
function dedupeKeepingFirst(candidates) {
  const seen = new Map();
  const result = [];
  for (const c of candidates) {
    if (seen.has(c.canonicalFieldId)) {
      const existing = result.find((r) => r.canonicalFieldId === c.canonicalFieldId);
      if (existing) existing.ambiguousDuplicate = true;
      continue;
    }
    seen.set(c.canonicalFieldId, true);
    result.push({ ...c, ambiguousDuplicate: false });
  }
  return result;
}

// Date extraction: common lab-report date formats. Returns ISO 8601
// date string or null. Deliberately does not invent a time component
// A date-only source must not acquire an invented time.
const DATE_PATTERNS = [
  { re: /(\d{4})-(\d{2})-(\d{2})/, order: ["y", "m", "d"] },
  { re: /(\d{2})\/(\d{2})\/(\d{4})/, order: ["m", "d", "y"] },
  { re: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, order: ["d", "monthName", "y"] },
];

const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function extractDates(rawText) {
  const lines = rawText.split(/\r?\n/);
  let clinicalDate = null;
  let printDate = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isOrderOrClinical = lower.includes("order") || lower.includes("collected") || lower.includes("clinical");
    const isPrint = lower.includes("print") || lower.includes("reported");

    for (const pattern of DATE_PATTERNS) {
      const m = line.match(pattern.re);
      if (!m) continue;
      const iso = toIsoDate(m, pattern.order);
      if (!iso) continue;
      if (isOrderOrClinical && !clinicalDate) clinicalDate = iso;
      else if (isPrint && !printDate) printDate = iso;
      else if (!clinicalDate) clinicalDate = iso; // fallback: first plausible date found
    }
  }

  return { clinicalDate, printDate };
}

function toIsoDate(match, order) {
  const parts = {};
  order.forEach((key, i) => {
    const raw = match[i + 1];
    parts[key] = key === "monthName" ? MONTHS[raw.slice(0, 3).toLowerCase()] : raw;
  });
  const y = parts.y;
  const m = parts.monthName || String(parts.m).padStart(2, "0");
  const d = String(parts.d).padStart(2, "0");
  if (!y || !m || !d) return null;
  return `${y}-${m}-${d}`;
}

/**
 * Review-flag computation: missing date, missing
 * result, ambiguous mapping, result/reference-range confusion,
 * unsupported labels, suspicious decimal shifts.
 */
export function computeReviewFlags(candidates, dates) {
  const flags = [];

  if (!dates.clinicalDate) {
    flags.push({ type: "missing_date", message: "No clinical/order date detected. Confirm date provenance before saving." });
  }

  const foundFieldIds = new Set(candidates.map((c) => c.canonicalFieldId));
  const missingFields = Object.keys(LABEL_NORMALIZATION).filter((id) => !foundFieldIds.has(id));
  if (missingFields.length > 0) {
    flags.push({
      type: "partial_extraction",
      message: `Not all supported fields were detected: ${missingFields.join(", ")}.`,
      missingFields,
    });
  }

  for (const c of candidates) {
    if (c.ambiguousDuplicate) {
      flags.push({ type: "ambiguous_mapping", message: `"${c.rawLabel}" matched more than once.`, canonicalFieldId: c.canonicalFieldId });
    }
    if (c.referenceRange && (c.value === c.referenceRange.low || c.value === c.referenceRange.high)) {
      // Possible result/reference-range confusion: value exactly equals
      // a range boundary, which sometimes means OCR grabbed the range
      // number instead of the result.
      flags.push({
        type: "result_range_confusion",
        message: `${c.rawLabel}: extracted value exactly matches its reference-range boundary — verify OCR didn't grab the range instead of the result.`,
        canonicalFieldId: c.canonicalFieldId,
      });
    }
    if (isSuspiciousDecimalShift(c)) {
      flags.push({
        type: "suspicious_decimal_shift",
        message: `${c.rawLabel}: value ${c.value} looks like it may be off by a factor of 10 (common OCR decimal-point miss).`,
        canonicalFieldId: c.canonicalFieldId,
      });
    }
  }

  return flags;
}

// Heuristic only, surfaced to the user for confirmation — never auto-corrected.
function isSuspiciousDecimalShift(candidate) {
  if (!candidate.referenceRange) return false;
  const { low, high } = candidate.referenceRange;
  const v = candidate.value;
  const shiftedUp = v * 10;
  const shiftedDown = v / 10;
  const inRangeNow = v >= low && v <= high;
  const shiftedUpInRange = shiftedUp >= low && shiftedUp <= high;
  const shiftedDownInRange = shiftedDown >= low && shiftedDown <= high;
  return !inRangeNow && (shiftedUpInRange || shiftedDownInRange);
}

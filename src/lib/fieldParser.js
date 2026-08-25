/**
 * CBC field extraction and normalization for controlled OCR scope.
 * Pure and unit-testable: raw OCR text in, structured candidates out.
 */

const LABEL_NORMALIZATION = {
  wbc: [
    "wbc", "wbc count", "white blood cell count", "white blood cells",
    "white blood cell", "leukocyte count", "leukocytes",
  ],
  lymphocytes: ["lymphocytes", "lymphocyte", "lymphs", "lymph", "lym"],
  monocytes: ["monocytes", "monocyte", "mono"],
  eosinophils: ["eosinophils", "eosinophil", "eos"],
  neutrophils: ["neutrophils", "neutrophil", "neut", "segmented neutrophils", "segs"],
  rbc: [
    "rbc", "rbc count", "red blood cell count", "red blood cells",
    "red blood cell", "erythrocyte count", "erythrocytes",
  ],
  hemoglobin: ["hemoglobin", "haemoglobin", "hgb", "hb"],
  hematocrit: ["hematocrit", "haematocrit", "hct"],
};

const LABEL_LOOKUP = new Map();
for (const [fieldId, variants] of Object.entries(LABEL_NORMALIZATION)) {
  for (const variant of variants) LABEL_LOOKUP.set(variant, fieldId);
}

function normalizeLabelText(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[|:;,.]/g, " ")
    .replace(/\s+/g, " ");
}

export function matchCanonicalField(rawLabel) {
  const norm = normalizeLabelText(rawLabel);
  if (LABEL_LOOKUP.has(norm)) return LABEL_LOOKUP.get(norm);

  // Prefer the longest alias first so short aliases (hb, eos, etc.) do not
  // accidentally win inside a longer OCR fragment.
  const variants = [...LABEL_LOOKUP.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [variant, fieldId] of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i").test(norm)) return fieldId;
  }
  return null;
}

function findLabelMatchInLine(line) {
  const norm = normalizeLabelText(line);
  const variants = [...LABEL_LOOKUP.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [variant, fieldId] of variants) {
    const index = norm.indexOf(variant);
    if (index !== -1) return { fieldId, variant, norm, index };
  }
  return null;
}

const NUMBER_RE = /-?\d+(?:[.,]\d+)?/g;

function parseNumberToken(token) {
  if (!token) return null;
  const normalized = token.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseRange(text) {
  const m = String(text || "").match(/(-?\d+(?:[.,]\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  return { low: parseNumberToken(m[1]), high: parseNumberToken(m[2]) };
}

function inferUnit(text) {
  const source = String(text || "");
  const percent = source.match(/%/);
  if (percent) return "%";
  const unit = source.match(/(?:x|×)?\s*10\s*\^?\s*\d+\s*\/\s*[lL]|g\s*\/\s*[lL]|g\s*\/\s*d[lL]|[uµ]mol\s*\/\s*[lL]/i);
  return unit ? unit[0].replace(/\s+/g, "") : null;
}

function candidateFromRow(line) {
  const labelMatch = findLabelMatchInLine(line);
  if (!labelMatch) return null;

  // Work from the original line so punctuation/decimals are preserved.
  const lower = line.toLowerCase();
  let labelEnd = 0;
  for (const [variant, fieldId] of [...LABEL_LOOKUP.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (fieldId !== labelMatch.fieldId) continue;
    const idx = lower.indexOf(variant);
    if (idx >= 0) {
      labelEnd = idx + variant.length;
      break;
    }
  }
  const tail = line.slice(labelEnd);
  const numbers = tail.match(NUMBER_RE) || [];
  if (numbers.length === 0) return null;

  const value = parseNumberToken(numbers[0]);
  if (value == null) return null;

  return {
    canonicalFieldId: labelMatch.fieldId,
    rawLabel: line.slice(0, Math.max(labelEnd, 1)).trim() || labelMatch.variant,
    value,
    unit: inferUnit(tail),
    referenceRange: parseRange(tail),
    sourceLine: line,
    extractionMode: "row",
  };
}

/**
 * Extract supported CBC fields from OCR text.
 *
 * Pass 1 handles ordinary row-oriented OCR. Pass 2 handles common table OCR
 * where a label is emitted on one line and its numeric result on the next.
 * It never uses the reference range as the result.
 */
export function extractCandidateFields(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = [];
  const found = new Set();

  for (const line of lines) {
    const candidate = candidateFromRow(line);
    if (!candidate || found.has(candidate.canonicalFieldId)) continue;
    candidates.push({ ...candidate, ambiguousDuplicate: false });
    found.add(candidate.canonicalFieldId);
  }

  // Recover labels whose OCR value was pushed onto the following line. Stop if
  // another supported label intervenes so we do not pair one test with another.
  for (let i = 0; i < lines.length; i += 1) {
    const label = findLabelMatchInLine(lines[i]);
    if (!label || found.has(label.fieldId)) continue;

    for (let offset = 1; offset <= 2 && i + offset < lines.length; offset += 1) {
      const next = lines[i + offset];
      if (findLabelMatchInLine(next)) break;
      const range = parseRange(next);
      const tokens = next.match(NUMBER_RE) || [];
      if (tokens.length === 0) continue;

      // A line that consists only of a range (e.g. 5-10) is not a result line.
      if (range && tokens.length === 2 && /^\s*-?\d+(?:[.,]\d+)?\s*(?:-|–|—|to)\s*-?\d+(?:[.,]\d+)?\s*$/i.test(next)) {
        continue;
      }

      const value = parseNumberToken(tokens[0]);
      if (value == null) continue;
      candidates.push({
        canonicalFieldId: label.fieldId,
        rawLabel: lines[i],
        value,
        unit: inferUnit(next),
        referenceRange: range,
        sourceLine: `${lines[i]} | ${next}`,
        extractionMode: "adjacent-line",
        ambiguousDuplicate: false,
      });
      found.add(label.fieldId);
      break;
    }
  }

  return candidates;
}

export function mergeCandidatePasses(...passes) {
  const byField = new Map();
  for (const pass of passes) {
    for (const candidate of pass || []) {
      const current = byField.get(candidate.canonicalFieldId);
      if (!current || candidateQuality(candidate) > candidateQuality(current)) {
        byField.set(candidate.canonicalFieldId, candidate);
      }
    }
  }
  return [...byField.values()];
}

function candidateQuality(candidate) {
  let score = 0;
  if (candidate.unit) score += 1;
  if (candidate.referenceRange) score += 1;
  if (candidate.extractionMode === "row") score += 1;
  if (candidate.referenceRange) {
    const { low, high } = candidate.referenceRange;
    if (candidate.value >= low && candidate.value <= high) score += 2;
  }
  return score;
}

const DATE_PATTERNS = [
  { re: /(\d{4})-(\d{2})-(\d{2})/, order: ["y", "m", "d"] },
  { re: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, order: ["m", "d", "y"] },
  { re: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, order: ["d", "monthName", "y"] },
];

const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function extractDates(rawText) {
  const lines = String(rawText || "").split(/\r?\n/);
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
      else if (!clinicalDate) clinicalDate = iso;
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
      flags.push({
        type: "result_range_confusion",
        message: `${c.rawLabel}: extracted value exactly matches its reference-range boundary — verify OCR didn't grab the range instead of the result.`,
        canonicalFieldId: c.canonicalFieldId,
      });
    }
    if (isSuspiciousDecimalShift(c)) {
      flags.push({
        type: "suspicious_decimal_shift",
        message: `${c.rawLabel}: value ${c.value} may contain an OCR decimal-point error. Compare it directly with the source before saving.`,
        canonicalFieldId: c.canonicalFieldId,
      });
    }
  }

  return flags;
}

function isSuspiciousDecimalShift(candidate) {
  if (!candidate.referenceRange) return false;
  const { low, high } = candidate.referenceRange;
  const v = candidate.value;
  if (v >= low && v <= high) return false;
  const shiftedUp = v * 10;
  const shiftedDown = v / 10;
  return (shiftedUp >= low && shiftedUp <= high) || (shiftedDown >= low && shiftedDown <= high);
}

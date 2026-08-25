/** CBC field extraction and normalization for controlled OCR scope. */
const LABEL_NORMALIZATION = {
  wbc: ["wbc", "wbc count", "white blood cell count", "white blood cells", "white blood cell", "leukocyte count", "leukocytes"],
  lymphocytes: ["lymphocytes", "lymphocyte", "lymphs", "lymph", "lym"],
  monocytes: ["monocytes", "monocyte", "mono"],
  eosinophils: ["eosinophils", "eosinophil", "eos"],
  neutrophils: ["neutrophils", "neutrophil", "neut", "segmented neutrophils", "segs"],
  rbc: ["rbc", "rbc count", "red blood cell count", "red blood cells", "red blood cell", "erythrocyte count", "erythrocytes"],
  hemoglobin: ["hemoglobin", "haemoglobin", "hgb", "hb"],
  hematocrit: ["hematocrit", "haematocrit", "hct"],
};
const LABEL_LOOKUP = new Map();
for (const [fieldId, variants] of Object.entries(LABEL_NORMALIZATION)) for (const variant of variants) LABEL_LOOKUP.set(variant, fieldId);

function normalizeLabelText(raw) { return String(raw || "").trim().toLowerCase().replace(/[|:;,.]/g, " ").replace(/\s+/g, " "); }
export function matchCanonicalField(rawLabel) {
  const norm = normalizeLabelText(rawLabel);
  if (LABEL_LOOKUP.has(norm)) return LABEL_LOOKUP.get(norm);
  const variants = [...LABEL_LOOKUP.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [variant, fieldId] of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i").test(norm)) return fieldId;
  }
  return null;
}
function findLabelMatchInLine(line) {
  const norm = normalizeLabelText(line);
  for (const [variant, fieldId] of [...LABEL_LOOKUP.entries()].sort((a, b) => b[0].length - a[0].length)) if (norm.includes(variant)) return { fieldId, variant };
  return null;
}
const NUMBER_RE = /-?\d+(?:[.,]\d+)?/g;
function parseNumberToken(token) { const value = Number.parseFloat(String(token || "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function parseRange(text) {
  const m = String(text || "").match(/(-?\d+(?:[.,]\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:[.,]\d+)?)/i);
  return m ? { low: parseNumberToken(m[1]), high: parseNumberToken(m[2]) } : null;
}

export function normalizeOcrUnit(rawUnit, fieldId = null) {
  const raw = String(rawUnit || "").trim();
  if (!raw) return null;
  const compact = raw.toLowerCase().replace(/×/g, "x").replace(/\s+/g, "").replace(/[|]/g, "/");
  if (compact.includes("%")) return "%";
  if (/g\/?dl/.test(compact)) return "g/dL";
  if (/g\/?l/.test(compact)) return "g/L";

  // CBC count units are commonly mangled by OCR because the superscript caret
  // or exponent sits between small glyphs. Normalize the notation only; never
  // alter the measured value.
  if (/x?10.*\/?l/.test(compact) || /^10.*\/?l/.test(compact)) {
    if (fieldId === "wbc") return "x10^9/L";
    if (fieldId === "rbc") return "x10^12/L";
    const exponent = compact.match(/10(?:\^|[^0-9])*(9|12)/)?.[1]
      || compact.match(/10\d*?(9|12)(?:\/|l|$)/)?.[1];
    if (exponent) return `x10^${exponent}/L`;
  }
  return raw.replace(/\s+/g, "");
}

function inferUnit(text, fieldId) {
  const source = String(text || "");
  if (source.includes("%")) return "%";
  const unit = source.match(/(?:x|×)?\s*10\s*(?:\^|7|\*)?\s*\d{1,2}\s*\/?\s*[lL]|g\s*\/?\s*d[lL]|g\s*\/?\s*[lL]|[uµ]mol\s*\/?\s*[lL]/i);
  return unit ? normalizeOcrUnit(unit[0], fieldId) : null;
}
function candidateFromRow(line) {
  const label = findLabelMatchInLine(line); if (!label) return null;
  const lower = line.toLowerCase();
  const labelEnd = lower.indexOf(label.variant) + label.variant.length;
  const tail = line.slice(Math.max(0, labelEnd));
  const numbers = tail.match(NUMBER_RE) || [];
  const value = parseNumberToken(numbers[0]); if (value == null) return null;
  return { canonicalFieldId: label.fieldId, rawLabel: line.slice(0, labelEnd).trim() || label.variant, value, unit: inferUnit(tail, label.fieldId), referenceRange: parseRange(tail), sourceLine: line, extractionMode: "row" };
}
export function extractCandidateFields(rawText) {
  const lines = String(rawText || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = []; const found = new Set();
  for (const line of lines) {
    const candidate = candidateFromRow(line);
    if (!candidate || found.has(candidate.canonicalFieldId)) continue;
    candidates.push({ ...candidate, ambiguousDuplicate: false }); found.add(candidate.canonicalFieldId);
  }
  for (let i = 0; i < lines.length; i += 1) {
    const label = findLabelMatchInLine(lines[i]); if (!label || found.has(label.fieldId)) continue;
    for (let offset = 1; offset <= 2 && i + offset < lines.length; offset += 1) {
      const next = lines[i + offset]; if (findLabelMatchInLine(next)) break;
      const range = parseRange(next); const tokens = next.match(NUMBER_RE) || [];
      if (!tokens.length) continue;
      if (range && tokens.length === 2 && /^\s*-?\d+(?:[.,]\d+)?\s*(?:-|–|—|to)\s*-?\d+(?:[.,]\d+)?\s*$/i.test(next)) continue;
      const value = parseNumberToken(tokens[0]); if (value == null) continue;
      candidates.push({ canonicalFieldId: label.fieldId, rawLabel: lines[i], value, unit: inferUnit(next, label.fieldId), referenceRange: range, sourceLine: `${lines[i]} | ${next}`, extractionMode: "adjacent-line", ambiguousDuplicate: false });
      found.add(label.fieldId); break;
    }
  }
  return candidates;
}

// Merge value and unit consensus independently. A strong value pass must not
// drag along a malformed unit when the other OCR passes agree on the unit.
export function mergeCandidatePasses(...passes) {
  const grouped = new Map();
  passes.forEach((pass, passIndex) => {
    for (const candidate of pass || []) {
      const normalizedUnit = normalizeOcrUnit(candidate.unit, candidate.canonicalFieldId);
      const list = grouped.get(candidate.canonicalFieldId) || [];
      list.push({ ...candidate, unit: normalizedUnit, ocrPassIndex: passIndex });
      grouped.set(candidate.canonicalFieldId, list);
    }
  });

  const selected = [];
  for (const [, candidates] of grouped) {
    const valueCounts = new Map();
    const unitCounts = new Map();
    for (const c of candidates) {
      const valueKey = String(c.value);
      valueCounts.set(valueKey, (valueCounts.get(valueKey) || 0) + 1);
      if (c.unit) unitCounts.set(c.unit, (unitCounts.get(c.unit) || 0) + 1);
    }

    const valueSorted = [...candidates].sort((a, b) => {
      const agreementA = valueCounts.get(String(a.value)) || 0;
      const agreementB = valueCounts.get(String(b.value)) || 0;
      if (agreementA !== agreementB) return agreementB - agreementA;
      return evidenceQuality(b) - evidenceQuality(a);
    });
    const winner = valueSorted[0];

    let selectedUnit = winner.unit || null;
    let unitAgreement = selectedUnit ? (unitCounts.get(selectedUnit) || 1) : 0;
    for (const [unit, count] of unitCounts.entries()) {
      if (count > unitAgreement) { selectedUnit = unit; unitAgreement = count; }
    }

    selected.push({
      ...winner,
      unit: selectedUnit,
      ocrAgreement: valueCounts.get(String(winner.value)) || 1,
      unitOcrAgreement: unitAgreement,
      ocrAlternatives: candidates.map((c) => ({ value: c.value, unit: c.unit, pass: c.ocrPassIndex })),
    });
  }
  return selected;
}
function evidenceQuality(candidate) { return (candidate.unit ? 2 : 0) + (candidate.referenceRange ? 1 : 0) + (candidate.extractionMode === "row" ? 1 : 0); }

export function extractInstitution(rawText) {
  const lines = String(rawText || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = [];
  const keywords = /(diagnostic|medical\s+(?:center|centre|clinic)|hospital|laborator(?:y|ies)|health\s+center|clinic\s+corp|medical\s+clinic)/i;
  const reject = /(lab report|hematology|clinical chemistry|serology|reference range|normal values|performed by|verified by|pathologist|ocr pass)/i;

  lines.forEach((line, index) => {
    if (!keywords.test(line) || reject.test(line)) return;
    const cleaned = line
      .replace(/^[^A-Za-z0-9]+/, "")
      .replace(/[^A-Za-z0-9&.,'()\- ]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length < 6 || cleaned.length > 120) return;
    let score = 10;
    if (index < 18) score += 5;
    if (/diagnostic/i.test(cleaned)) score += 3;
    if (/(hospital|medical center|medical clinic|laboratory)/i.test(cleaned)) score += 3;
    if (cleaned === cleaned.toUpperCase()) score += 2;
    score += Math.min(cleaned.length / 30, 3);
    candidates.push({ value: cleaned, score });
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.value || null;
}

const DATE_PATTERNS = [
  { re: /(\d{4})-(\d{2})-(\d{2})/, order: ["y", "m", "d"] },
  { re: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, order: ["m", "d", "y"] },
  { re: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, order: ["d", "monthName", "y"] },
];
const MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
export function extractDates(rawText) {
  const lines = String(rawText || "").split(/\r?\n/); let clinicalDate = null; let printDate = null;
  for (const line of lines) {
    const lower = line.toLowerCase(); const isClinical = lower.includes("order") || lower.includes("collected") || lower.includes("clinical"); const isPrint = lower.includes("print") || lower.includes("reported");
    for (const pattern of DATE_PATTERNS) {
      const m = line.match(pattern.re); if (!m) continue; const iso = toIsoDate(m, pattern.order); if (!iso) continue;
      if (isClinical && !clinicalDate) clinicalDate = iso; else if (isPrint && !printDate) printDate = iso; else if (!clinicalDate) clinicalDate = iso;
    }
  }
  return { clinicalDate, printDate };
}
function toIsoDate(match, order) {
  const parts = {}; order.forEach((key, i) => { const raw = match[i + 1]; parts[key] = key === "monthName" ? MONTHS[raw.slice(0, 3).toLowerCase()] : raw; });
  const y = parts.y; const m = parts.monthName || String(parts.m).padStart(2, "0"); const d = String(parts.d).padStart(2, "0"); return y && m && d ? `${y}-${m}-${d}` : null;
}
export function computeReviewFlags(candidates, dates) {
  const flags = [];
  if (!dates.clinicalDate) flags.push({ type: "missing_date", message: "No clinical/order date detected. Confirm date provenance before saving." });
  const found = new Set(candidates.map((c) => c.canonicalFieldId)); const missing = Object.keys(LABEL_NORMALIZATION).filter((id) => !found.has(id));
  if (missing.length) flags.push({ type: "partial_extraction", message: `Not all supported fields were detected: ${missing.join(", ")}.`, missingFields: missing });
  for (const c of candidates) {
    if (c.ocrAlternatives && new Set(c.ocrAlternatives.map((a) => String(a.value))).size > 1) flags.push({ type: "ocr_disagreement", message: `${c.rawLabel}: OCR passes disagree on the value. Review against the source.`, canonicalFieldId: c.canonicalFieldId });
    if (c.referenceRange && (c.value === c.referenceRange.low || c.value === c.referenceRange.high)) flags.push({ type: "result_range_confusion", message: `${c.rawLabel}: extracted value exactly matches its reference-range boundary — verify OCR didn't grab the range instead of the result.`, canonicalFieldId: c.canonicalFieldId });
    if (isSuspiciousDecimalShift(c)) flags.push({ type: "suspicious_decimal_shift", message: `${c.rawLabel}: value ${c.value} may contain an OCR decimal-point error. Compare it directly with the source before saving.`, canonicalFieldId: c.canonicalFieldId });
  }
  return flags;
}
function isSuspiciousDecimalShift(candidate) {
  if (!candidate.referenceRange) return false; const { low, high } = candidate.referenceRange; const v = candidate.value; if (v >= low && v <= high) return false;
  return (v * 10 >= low && v * 10 <= high) || (v / 10 >= low && v / 10 <= high);
}

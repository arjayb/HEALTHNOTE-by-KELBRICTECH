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
function inferUnit(text) {
  const source = String(text || "");
  if (source.includes("%")) return "%";
  const unit = source.match(/(?:x|×)?\s*10\s*\^?\s*\d+\s*\/\s*[lL]|g\s*\/\s*[lL]|g\s*\/\s*d[lL]|[uµ]mol\s*\/\s*[lL]/i);
  return unit ? unit[0].replace(/\s+/g, "") : null;
}
function candidateFromRow(line) {
  const label = findLabelMatchInLine(line); if (!label) return null;
  const lower = line.toLowerCase();
  let labelEnd = lower.indexOf(label.variant) + label.variant.length;
  const tail = line.slice(Math.max(0, labelEnd));
  const numbers = tail.match(NUMBER_RE) || [];
  const value = parseNumberToken(numbers[0]); if (value == null) return null;
  return { canonicalFieldId: label.fieldId, rawLabel: line.slice(0, labelEnd).trim() || label.variant, value, unit: inferUnit(tail), referenceRange: parseRange(tail), sourceLine: line, extractionMode: "row" };
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
      candidates.push({ canonicalFieldId: label.fieldId, rawLabel: lines[i], value, unit: inferUnit(next), referenceRange: range, sourceLine: `${lines[i]} | ${next}`, extractionMode: "adjacent-line", ambiguousDuplicate: false });
      found.add(label.fieldId); break;
    }
  }
  return candidates;
}

// Merge independent OCR passes by agreement and extraction evidence only.
// Deliberately does NOT reward values for falling inside a medical reference range.
export function mergeCandidatePasses(...passes) {
  const grouped = new Map();
  passes.forEach((pass, passIndex) => {
    for (const candidate of pass || []) {
      const list = grouped.get(candidate.canonicalFieldId) || [];
      list.push({ ...candidate, ocrPassIndex: passIndex }); grouped.set(candidate.canonicalFieldId, list);
    }
  });
  const selected = [];
  for (const [, candidates] of grouped) {
    const counts = new Map();
    for (const c of candidates) {
      const key = `${c.value}|${c.unit || ""}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    candidates.sort((a, b) => {
      const agreementA = counts.get(`${a.value}|${a.unit || ""}`) || 0;
      const agreementB = counts.get(`${b.value}|${b.unit || ""}`) || 0;
      if (agreementA !== agreementB) return agreementB - agreementA;
      return evidenceQuality(b) - evidenceQuality(a);
    });
    const winner = candidates[0];
    selected.push({ ...winner, ocrAgreement: counts.get(`${winner.value}|${winner.unit || ""}`) || 1, ocrAlternatives: candidates.map((c) => ({ value: c.value, unit: c.unit, pass: c.ocrPassIndex })) });
  }
  return selected;
}
function evidenceQuality(candidate) { return (candidate.unit ? 2 : 0) + (candidate.referenceRange ? 1 : 0) + (candidate.extractionMode === "row" ? 1 : 0); }

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

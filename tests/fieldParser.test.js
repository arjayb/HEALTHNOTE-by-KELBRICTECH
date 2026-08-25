import { describe, it, expect } from "vitest";
import { matchCanonicalField, extractCandidateFields, extractDates, computeReviewFlags } from "../src/lib/fieldParser.js";

// Synthetic fixture text only — never real patient data.
const SYNTHETIC_CBC_TEXT = `
COMMUNITY DIAGNOSTIC LABORATORY
Order Date: 2024-03-11
Print Date: 03/12/2024

Test              Result   Unit        Reference Range
WBC               6.10     x10^9/L     4.00-10.00
Lymphocytes       2.20     x10^9/L     1.00-3.00
Monocytes         0.40     x10^9/L     0.20-0.80
Eosinophils       0.15     x10^9/L     0.02-0.50
Neutrophils       3.60     x10^9/L     2.00-7.00
RBC               4.80     x10^12/L    4.20-5.80
Hemoglobin        14.20    g/dL        13.00-17.00
Hematocrit        42.00    %           38.00-50.00
`;

const SYNTHETIC_PARTIAL_TEXT = `
Order Date: 2024-01-05
WBC          5.50   x10^9/L   4.00-10.00
Hemoglobin   13.50  g/dL      13.00-17.00
`;

describe("matchCanonicalField", () => {
  it("matches exact canonical labels", () => {
    expect(matchCanonicalField("WBC")).toBe("wbc");
    expect(matchCanonicalField("Hemoglobin")).toBe("hemoglobin");
  });

  it("matches common equivalents", () => {
    expect(matchCanonicalField("White Blood Cell Count")).toBe("wbc");
    expect(matchCanonicalField("Hgb")).toBe("hemoglobin");
  });

  it("returns null for unsupported measurements", () => {
    expect(matchCanonicalField("Platelet Count")).toBeNull();
    expect(matchCanonicalField("Glucose")).toBeNull();
  });
});

describe("extractCandidateFields", () => {
  it("extracts all eight supported fields from a clean synthetic report", () => {
    const candidates = extractCandidateFields(SYNTHETIC_CBC_TEXT);
    expect(candidates).toHaveLength(8);
    const wbc = candidates.find((c) => c.canonicalFieldId === "wbc");
    expect(wbc.value).toBe(6.1);
    expect(wbc.referenceRange).toEqual({ low: 4, high: 10 });
  });

  it("extracts only the fields actually present in a partial report", () => {
    const candidates = extractCandidateFields(SYNTHETIC_PARTIAL_TEXT);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.canonicalFieldId).sort()).toEqual(["hemoglobin", "wbc"]);
  });

  it("does not fabricate results for lines with no supported label", () => {
    const text = "Platelet Count   250   x10^9/L   150-400";
    expect(extractCandidateFields(text)).toHaveLength(0);
  });
});

describe("extractDates", () => {
  it("finds the clinical/order date from a synthetic report", () => {
    const { clinicalDate } = extractDates(SYNTHETIC_CBC_TEXT);
    expect(clinicalDate).toBe("2024-03-11");
  });

  it("does not invent a time component", () => {
    const { clinicalDate } = extractDates(SYNTHETIC_CBC_TEXT);
    expect(clinicalDate).not.toContain("T");
    expect(clinicalDate).not.toContain(":");
  });
});

describe("computeReviewFlags", () => {
  it("flags partial extraction when supported fields are missing", () => {
    const candidates = extractCandidateFields(SYNTHETIC_PARTIAL_TEXT);
    const dates = extractDates(SYNTHETIC_PARTIAL_TEXT);
    const flags = computeReviewFlags(candidates, dates);
    const partial = flags.find((f) => f.type === "partial_extraction");
    expect(partial).toBeDefined();
    expect(partial.missingFields).toContain("lymphocytes");
  });

  it("flags missing date when no clinical date is present", () => {
    const text = "WBC   6.00   x10^9/L   4.00-10.00";
    const candidates = extractCandidateFields(text);
    const dates = extractDates(text);
    const flags = computeReviewFlags(candidates, dates);
    expect(flags.some((f) => f.type === "missing_date")).toBe(true);
  });

  it("flags a suspicious decimal shift", () => {
    // 61.0 is out of range but /10 = 6.1 falls inside 4.00-10.00 — likely a missed decimal point.
    const text = "WBC   61.0   x10^9/L   4.00-10.00\nOrder Date: 2024-01-01";
    const candidates = extractCandidateFields(text);
    const dates = extractDates(text);
    const flags = computeReviewFlags(candidates, dates);
    expect(flags.some((f) => f.type === "suspicious_decimal_shift")).toBe(true);
  });

  it("does not flag a clean, complete synthetic report beyond expected", () => {
    const candidates = extractCandidateFields(SYNTHETIC_CBC_TEXT);
    const dates = extractDates(SYNTHETIC_CBC_TEXT);
    const flags = computeReviewFlags(candidates, dates);
    expect(flags.some((f) => f.type === "missing_date")).toBe(false);
    expect(flags.some((f) => f.type === "partial_extraction")).toBe(false);
  });
});

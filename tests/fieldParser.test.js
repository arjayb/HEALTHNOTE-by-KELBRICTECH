import { describe, it, expect } from "vitest";
import { matchCanonicalField, extractCandidateFields, extractDates, computeReviewFlags, mergeCandidatePasses } from "../src/lib/fieldParser.js";

const SYNTHETIC_CBC_TEXT = `
COMMUNITY DIAGNOSTIC LABORATORY
Order Date: 2024-03-11
Print Date: 03/12/2024
Test Result Unit Reference Range
WBC 6.10 x10^9/L 4.00-10.00
Lymphocytes 2.20 x10^9/L 1.00-3.00
Monocytes 0.40 x10^9/L 0.20-0.80
Eosinophils 0.15 x10^9/L 0.02-0.50
Neutrophils 3.60 x10^9/L 2.00-7.00
RBC 4.80 x10^12/L 4.20-5.80
Hemoglobin 14.20 g/dL 13.00-17.00
Hematocrit 42.00 % 38.00-50.00
`;

const STO_DOMINGO_STYLE = `
Order Date: 03/30/2026
TEST RESULT UNIT NORMAL VALUES
WHITE BLOOD CELL COUNT 5.6 x10^9/L 5-10
Lymphocytes 36.0 % 20.0 - 45.0
Monocytes 2.0 % 1.0 - 7.0
Eosinophils 5.0 % 1.0 - 5.0
Neutrophils 57.0 % 40.0 - 75.0
RED BLOOD CELL COUNT 5.89 x10^12/L 4.6 - 6.2
HEMOGLOBIN 179 g/L 140 - 180
HEMATOCRIT 0.55 0.40 - 0.54
`;

const COLUMN_SPLIT = `
WHITE BLOOD CELL COUNT
5.6 x10^9/L 5-10
Lymphocytes
36.0 % 20.0-45.0
Monocytes
2.0 % 1.0-7.0
Eosinophils
5.0 % 1.0-5.0
Neutrophils
57.0 % 40.0-75.0
RED BLOOD CELL COUNT
5.89 x10^12/L 4.6-6.2
HEMOGLOBIN
179 g/L 140-180
HEMATOCRIT
0.55 0.40-0.54
`;

describe("matchCanonicalField", () => {
  it("matches canonical labels and common aliases", () => {
    expect(matchCanonicalField("WBC")).toBe("wbc");
    expect(matchCanonicalField("White Blood Cell Count")).toBe("wbc");
    expect(matchCanonicalField("WBC Count")).toBe("wbc");
    expect(matchCanonicalField("Hgb")).toBe("hemoglobin");
    expect(matchCanonicalField("Red Blood Cell Count")).toBe("rbc");
  });
  it("rejects unsupported measurements", () => expect(matchCanonicalField("Platelet Count")).toBeNull());
});

describe("extractCandidateFields", () => {
  it("extracts all eight supported fields from clean text", () => expect(extractCandidateFields(SYNTHETIC_CBC_TEXT)).toHaveLength(8));
  it("extracts all eight fields from the target lab table shape with exact decimal fidelity", () => {
    const candidates = extractCandidateFields(STO_DOMINGO_STYLE);
    expect(candidates).toHaveLength(8);
    expect(candidates.find((c) => c.canonicalFieldId === "wbc").value).toBe(5.6);
    expect(candidates.find((c) => c.canonicalFieldId === "rbc").value).toBe(5.89);
    expect(candidates.find((c) => c.canonicalFieldId === "hematocrit").value).toBe(0.55);
  });
  it("reconstructs all eight when OCR separates labels from values", () => {
    const candidates = extractCandidateFields(COLUMN_SPLIT);
    expect(candidates).toHaveLength(8);
    expect(candidates.find((c) => c.canonicalFieldId === "wbc").value).toBe(5.6);
  });
  it("does not treat a standalone reference range as a result", () => {
    expect(extractCandidateFields("WBC\n5-10")).toHaveLength(0);
  });
  it("merges complementary OCR passes without duplicating fields", () => {
    const a = extractCandidateFields("WBC 5.6 x10^9/L 5-10");
    const b = extractCandidateFields("Hemoglobin 179 g/L 140-180");
    expect(mergeCandidatePasses(a, b)).toHaveLength(2);
  });
});

describe("dates and review flags", () => {
  it("extracts mm/dd/yyyy order date without inventing time", () => {
    const { clinicalDate } = extractDates(STO_DOMINGO_STYLE);
    expect(clinicalDate).toBe("2026-03-30");
    expect(clinicalDate).not.toContain("T");
  });
  it("flags partial extraction", () => {
    const text = "Order Date: 2024-01-05\nWBC 5.50 x10^9/L 4.00-10.00";
    const flags = computeReviewFlags(extractCandidateFields(text), extractDates(text));
    expect(flags.some((f) => f.type === "partial_extraction")).toBe(true);
  });
  it("flags suspicious decimal loss rather than silently correcting it", () => {
    const text = "WBC 56 x10^9/L 5-10\nOrder Date: 2026-03-30";
    const flags = computeReviewFlags(extractCandidateFields(text), extractDates(text));
    expect(flags.some((f) => f.type === "suspicious_decimal_shift")).toBe(true);
  });
});

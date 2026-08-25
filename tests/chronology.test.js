import { describe, it, expect } from "vitest";
import {
  effectiveDate,
  compareObservationsNewestFirst,
  isFirstSaveForField,
  computeSnapshot,
  vigilanceState,
  dateProvenance,
} from "../src/lib/chronology.js";

describe("effectiveDate", () => {
  it("prefers clinicalDate over observedAt", () => {
    const obs = { clinicalDate: "2025-05-01", observedAt: "2025-06-01" };
    expect(effectiveDate(obs)).toBe("2025-05-01");
  });

  it("falls back to observedAt when clinicalDate is absent", () => {
    const obs = { observedAt: "2025-06-01" };
    expect(effectiveDate(obs)).toBe("2025-06-01");
  });

  it("never falls back to addedAt, which is provenance only", () => {
    const obs = { addedAt: "2025-07-01" };
    expect(effectiveDate(obs)).toBeNull();
  });
});

describe("compareObservationsNewestFirst", () => {
  it("ranks the dated observation above the undated one regardless of addedAt", () => {
    const older = { clinicalDate: "2020-01-01", addedAt: "2025-01-01", createdAt: "2025-01-01" };
    const undated = { addedAt: "2026-01-01", createdAt: "2026-01-01" }; // added far more recently
    const sorted = [undated, older].sort(compareObservationsNewestFirst);
    expect(sorted[0]).toBe(older);
  });

  it("orders two dated observations by clinicalDate, newest first", () => {
    const a = { clinicalDate: "2025-05-01", createdAt: "2025-05-02" };
    const b = { clinicalDate: "2025-06-01", createdAt: "2025-06-02" };
    const sorted = [a, b].sort(compareObservationsNewestFirst);
    expect(sorted[0]).toBe(b);
  });

  it("breaks ties by createdAt, then control number", () => {
    const a = { clinicalDate: "2025-05-01", createdAt: "2025-05-02T10:00:00Z", controlNumber: 1 };
    const b = { clinicalDate: "2025-05-01", createdAt: "2025-05-02T10:00:00Z", controlNumber: 2 };
    const sorted = [a, b].sort(compareObservationsNewestFirst);
    expect(sorted[0]).toBe(b); // higher control number wins the tie
  });
});

describe("isFirstSaveForField baseline assignment", () => {
  it("is true only when no prior observation exists for the field", () => {
    expect(isFirstSaveForField([])).toBe(true);
    expect(isFirstSaveForField([{ id: "x" }])).toBe(false);
    expect(isFirstSaveForField([], { canonicalFieldId: "wbc" })).toBe(false);
  });
});

describe("dateProvenance", () => {
  it("keeps clinical, system-capture, and undated origins explicit", () => {
    expect(dateProvenance({ clinicalDate: "2026-08-24", observedAt: "2026-08-25T01:00:00Z" }).kind).toBe("clinical");
    expect(dateProvenance({ observedAt: "2026-08-25T01:00:00Z" }).kind).toBe("observed");
    expect(dateProvenance({ addedAt: "2026-08-25T01:00:00Z" }).kind).toBe("undated");
  });
});

describe("computeSnapshot", () => {
  const fields = [{ id: "wbc", label: "White blood cell count", shortLabel: "WBC" }];

  it("returns null latest for a field with no observations", () => {
    const result = computeSnapshot({ wbc: [] }, fields);
    expect(result[0].latest).toBeNull();
  });

  it("returns the chronologically newest observation as latest", () => {
    const older = { clinicalDate: "2025-01-01", createdAt: "2025-01-02", value: 5 };
    const newer = { clinicalDate: "2025-06-01", createdAt: "2025-06-02", value: 7 };
    const result = computeSnapshot({ wbc: [older, newer] }, fields);
    expect(result[0].latest).toBe(newer);
  });
});

describe("vigilanceState", () => {
  it("flags attach-verified action when newest is UNVERIFIED but an earlier VERIFIED exists", () => {
    const newestUnverified = {
      clinicalDate: "2025-06-01",
      createdAt: "2025-06-02",
      verificationState: "UNVERIFIED",
    };
    const olderVerified = {
      clinicalDate: "2025-01-01",
      createdAt: "2025-01-02",
      verificationState: "VERIFIED",
    };
    const sorted = [newestUnverified, olderVerified]; // already newest-first
    const state = vigilanceState(sorted);
    expect(state.newest).toBe(newestUnverified);
    expect(state.showAttachVerifiedAction).toBe(true);
    expect(state.mostRecentVerified).toBe(olderVerified);
  });

  it("never silently substitutes the older verified value as newest", () => {
    const newestUnverified = { verificationState: "UNVERIFIED", value: "newest" };
    const olderVerified = { verificationState: "VERIFIED", value: "older" };
    const state = vigilanceState([newestUnverified, olderVerified]);
    expect(state.newest.value).toBe("newest");
  });
});

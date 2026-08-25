import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { beforeEach, describe, expect, it } from "vitest";
import { clearAllData, createArchive, getDb } from "../src/data/db.js";
import { deleteSourceDocument, saveConfirmedCapture } from "../src/lib/saveFlow.js";

const field = (value) => ({
  canonicalFieldId: "wbc",
  rawLabel: "WBC",
  value,
  unit: "x10^9/L",
});

beforeEach(async () => {
  await clearAllData();
  await createArchive();
});

describe("record provenance and persistence", () => {
  it("uses a system observation timestamp for an undated live camera capture", async () => {
    const sourceBlob = new NodeBlob(["synthetic image"], { type: "image/png" });
    const saved = await saveConfirmedCapture({
      sourceType: "Lab report (photo)",
      captureOrigin: "camera",
      clinicalDate: null,
      confirmedFields: [field(6.1)],
      sourceBlob,
    });

    expect(saved.sourceDocument.verificationState).toBe("VERIFIED");
    expect(saved.sourceDocument.observedAt).toMatch(/T/);
    expect(saved.observations[0].observedAt).toBe(saved.sourceDocument.observedAt);
    expect(saved.observations[0].isBaseline).toBe(true);
  });

  it("keeps an undated upload undated while preserving its original source", async () => {
    const sourceBlob = new NodeBlob(["synthetic report"], { type: "application/pdf" });
    const saved = await saveConfirmedCapture({
      sourceType: "Lab report (PDF)",
      captureOrigin: "upload",
      clinicalDate: null,
      confirmedFields: [field(5.8)],
      sourceBlob,
    });
    const db = await getDb();
    const persisted = await db.get("sourceDocument", saved.sourceDocument.id);

    expect(saved.sourceDocument.observedAt).toBeNull();
    expect(saved.sourceDocument.verificationState).toBe("VERIFIED");
    expect(persisted.sourceBlob).toBeInstanceOf(NodeBlob);
    expect(persisted.sourceMimeType).toBe("application/pdf");
  });

  it("permanently labels a source-free manual entry UNVERIFIED", async () => {
    const saved = await saveConfirmedCapture({
      sourceType: "Manual entry",
      captureOrigin: "manual",
      clinicalDate: "2026-08-24",
      confirmedFields: [field(7.2)],
      sourceBlob: null,
    });

    expect(saved.sourceDocument.verificationState).toBe("UNVERIFIED");
    expect(saved.observations[0].verificationState).toBe("UNVERIFIED");
  });
});

describe("baseline invariants", () => {
  it("keeps first-ingested baseline when an older clinical record is added", async () => {
    const first = await saveConfirmedCapture({
      sourceType: "Lab report (photo)", captureOrigin: "camera", clinicalDate: "2026-08-24",
      confirmedFields: [field(6.1)], sourceBlob: new NodeBlob(["first"], { type: "image/png" }),
    });
    const older = await saveConfirmedCapture({
      sourceType: "Lab report (PDF)", captureOrigin: "upload", clinicalDate: "2026-08-21",
      confirmedFields: [field(5.9)], sourceBlob: new NodeBlob(["older"], { type: "application/pdf" }),
    });

    expect(first.observations[0].isBaseline).toBe(true);
    expect(older.observations[0].isBaseline).toBe(false);
  });

  it("does not auto-promote a replacement baseline after deletion", async () => {
    const first = await saveConfirmedCapture({
      sourceType: "Lab report (photo)", captureOrigin: "camera", clinicalDate: "2026-08-24",
      confirmedFields: [field(6.1)], sourceBlob: new NodeBlob(["first"], { type: "image/png" }),
    });
    await deleteSourceDocument(first.sourceDocument.id);
    const next = await saveConfirmedCapture({
      sourceType: "Manual entry", captureOrigin: "manual", clinicalDate: "2026-08-25",
      confirmedFields: [field(6.4)], sourceBlob: null,
    });

    expect(next.observations[0].isBaseline).toBe(false);
    const db = await getDb();
    expect(await db.get("baselineTombstone", "wbc")).toBeTruthy();
  });
});

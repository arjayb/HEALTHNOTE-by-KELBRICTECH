import { openDB } from "idb";

// Versioned local-only schema.
// LocalProfile/PrototypeArchive, SourceDocument, Observation,
// CorrectionAudit, ExportRequest.
// Nothing here ever leaves the device: no network calls exist in this module.

export const DB_NAME = "healthnote_poc";
export const DB_VERSION = 1;

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // One row: prototype archive identity + creation state.
      if (!db.objectStoreNames.contains("prototypeArchive")) {
        db.createObjectStore("prototypeArchive", { keyPath: "id" });
      }

      // Source documents (one per captured/imported source).
      if (!db.objectStoreNames.contains("sourceDocument")) {
        const store = db.createObjectStore("sourceDocument", { keyPath: "id" });
        store.createIndex("controlNumber", "controlNumber", { unique: true });
        store.createIndex("addedAt", "addedAt");
      }

      // Observations (many per source document; one per canonical field).
      if (!db.objectStoreNames.contains("observation")) {
        const store = db.createObjectStore("observation", { keyPath: "id" });
        store.createIndex("sourceDocumentId", "sourceDocumentId");
        store.createIndex("canonicalFieldId", "canonicalFieldId");
        store.createIndex("byFieldAndDate", ["canonicalFieldId", "clinicalDate"]);
      }

      // Correction audit trail — corrections never overwrite original extraction.
      if (!db.objectStoreNames.contains("correctionAudit")) {
        const store = db.createObjectStore("correctionAudit", { keyPath: "id" });
        store.createIndex("observationId", "observationId");
      }

      // Export requests (local PDF generation history, prototype-mode stamped).
      if (!db.objectStoreNames.contains("exportRequest")) {
        db.createObjectStore("exportRequest", { keyPath: "id" });
      }

      // Baseline tombstones are retained even if the source is deleted.
      if (!db.objectStoreNames.contains("baselineTombstone")) {
        const store = db.createObjectStore("baselineTombstone", { keyPath: "canonicalFieldId" });
        store.createIndex("canonicalFieldId", "canonicalFieldId");
      }
    },
  });
}

// The eight canonical fields for Release 0.1. No other
// measurement types are recognized in this release.
export const CANONICAL_FIELDS = [
  { id: "wbc", label: "White blood cell count", shortLabel: "WBC" },
  { id: "lymphocytes", label: "Lymphocytes", shortLabel: "Lymphocytes" },
  { id: "monocytes", label: "Monocytes", shortLabel: "Monocytes" },
  { id: "eosinophils", label: "Eosinophils", shortLabel: "Eosinophils" },
  { id: "neutrophils", label: "Neutrophils", shortLabel: "Neutrophils" },
  { id: "rbc", label: "Red blood cell count", shortLabel: "RBC" },
  { id: "hemoglobin", label: "Hemoglobin", shortLabel: "Hemoglobin" },
  { id: "hematocrit", label: "Hematocrit", shortLabel: "Hematocrit" },
];

export async function archiveExists() {
  const db = await getDb();
  const all = await db.getAll("prototypeArchive");
  return all.length > 0;
}

export async function createArchive() {
  const db = await getDb();
  const existing = await db.getAll("prototypeArchive");
  if (existing.length > 0) return existing[0];
  const record = {
    id: "local-archive",
    createdAt: new Date().toISOString(),
    schemaVersion: DB_VERSION,
  };
  await db.put("prototypeArchive", record);
  return record;
}

export async function clearAllData() {
  const db = await getDb();
  const tx = db.transaction(
    ["prototypeArchive", "sourceDocument", "observation", "correctionAudit", "exportRequest", "baselineTombstone"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("prototypeArchive").clear(),
    tx.objectStore("sourceDocument").clear(),
    tx.objectStore("observation").clear(),
    tx.objectStore("correctionAudit").clear(),
    tx.objectStore("exportRequest").clear(),
    tx.objectStore("baselineTombstone").clear(),
  ]);
  await tx.done;
}

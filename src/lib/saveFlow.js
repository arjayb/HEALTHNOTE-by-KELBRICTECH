import { getDb, CANONICAL_FIELDS } from "../data/db.js";
import { isFirstSaveForField } from "./chronology.js";
import { nextControlNumber, formatControlNumber } from "./controlNumber.js";

/**
 * Persists one record and its observations. Control numbers are never
 * reused, and baseline status is assigned only on first-ever ingestion.
 */
export async function saveConfirmedCapture({
  sourceType,
  captureOrigin,
  clinicalDate,
  documentPrintAt,
  rawOcrText,
  confirmedFields,
  sourceRef,
  sourceBlob,
  observedAt: suppliedObservedAt,
}) {
  const db = await getDb();

  const meta = (await db.get("prototypeArchive", "local-archive")) || {};
  const highestIssued = meta.highestControlNumberIssued || 0;
  const controlNumber = nextControlNumber(highestIssued);

  const sourceDocumentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const isLiveCameraCapture = captureOrigin === "camera";
  const isManualEntry = captureOrigin === "manual";
  const observedAt = !clinicalDate && isLiveCameraCapture ? (suppliedObservedAt || now) : null;
  const hasOriginalSource = Boolean(sourceBlob && typeof sourceBlob.size === "number" && sourceBlob.type);
  const verificationState = !isManualEntry && (hasOriginalSource || Boolean(observedAt))
    ? "VERIFIED"
    : "UNVERIFIED";

  const sourceDocument = {
    id: sourceDocumentId,
    controlNumber,
    controlNumberFormatted: formatControlNumber(controlNumber),
    sourceType,
    captureOrigin,
    sourceRef: sourceRef || null,
    sourceBlob: sourceBlob || null,
    sourceMimeType: sourceBlob?.type || null,
    rawOcrText: rawOcrText || "",
    clinicalDate: clinicalDate || null,
    documentPrintAt: documentPrintAt || null,
    observedAt,
    addedAt: now,
    verificationState,
    createdAt: now,
    updatedAt: now,
  };

  const observations = [];
  for (const field of confirmedFields) {
    const canonicalField = CANONICAL_FIELDS.find((f) => f.id === field.canonicalFieldId);
    if (!canonicalField) continue;

    const existingForField = await db.getAllFromIndex("observation", "canonicalFieldId", field.canonicalFieldId);
    const baselineTombstone = await db.get("baselineTombstone", field.canonicalFieldId);
    const baseline = isFirstSaveForField(existingForField, baselineTombstone);

    observations.push({
      id: crypto.randomUUID(),
      sourceDocumentId,
      canonicalFieldId: field.canonicalFieldId,
      rawLabel: field.rawLabel,
      normalizedLabel: canonicalField.label,
      value: field.value,
      unit: field.unit,
      referenceRange: field.referenceRange || null,
      verificationState,
      isBaseline: baseline,
      clinicalDate: clinicalDate || null,
      observedAt,
      addedAt: now,
      sourceType,
      controlNumber,
      controlNumberFormatted: formatControlNumber(controlNumber),
      createdAt: now,
      updatedAt: now,
      correctionHistory: [],
    });
  }

  const tx = db.transaction(["sourceDocument", "observation", "prototypeArchive"], "readwrite");
  await tx.objectStore("sourceDocument").put(sourceDocument);
  for (const obs of observations) {
    await tx.objectStore("observation").put(obs);
  }
  await tx.objectStore("prototypeArchive").put({
    ...meta,
    id: "local-archive",
    highestControlNumberIssued: controlNumber,
  });
  await tx.done;

  return { sourceDocument, observations };
}

/**
 * Records a correction to an existing observation as an audit entry.
 * A correction must not erase the original extraction. The current value is updated,
 * but the correction history retains what it was before.
 */
export async function correctObservation(observationId, { newValue, newUnit, reason }) {
  const db = await getDb();
  const obs = await db.get("observation", observationId);
  if (!obs) throw new Error(`Observation ${observationId} not found`);

  const auditEntry = {
    id: crypto.randomUUID(),
    observationId,
    previousValue: obs.value,
    previousUnit: obs.unit,
    newValue,
    newUnit,
    reason: reason || null,
    correctedAt: new Date().toISOString(),
  };

  const updatedObs = {
    ...obs,
    value: newValue,
    unit: newUnit,
    updatedAt: auditEntry.correctedAt,
    correctionHistory: [...(obs.correctionHistory || []), auditEntry.id],
  };

  const tx = db.transaction(["observation", "correctionAudit"], "readwrite");
  await tx.objectStore("observation").put(updatedObs);
  await tx.objectStore("correctionAudit").put(auditEntry);
  await tx.done;

  return { observation: updatedObs, auditEntry };
}

/**
 * Deletion updates the snapshot but must not silently migrate
 * BASELINE. If the deleted source document contained a baseline
 * observation for any field, a tombstone is written recording that
 * fact — no replacement baseline is auto-assigned.
 */
export async function deleteSourceDocument(sourceDocumentId) {
  const db = await getDb();
  const observations = await db.getAllFromIndex("observation", "sourceDocumentId", sourceDocumentId);

  const tx = db.transaction(["sourceDocument", "observation", "baselineTombstone"], "readwrite");

  for (const obs of observations) {
    if (obs.isBaseline) {
      await tx.objectStore("baselineTombstone").put({
        canonicalFieldId: obs.canonicalFieldId,
        originalBaselineObservationId: obs.id,
        originalBaselineSourceDocumentId: sourceDocumentId,
        originalBaselineValue: obs.value,
        originalBaselineDate: obs.clinicalDate,
        deletedAt: new Date().toISOString(),
        note: "Baseline source was deleted. No replacement baseline was auto-assigned.",
      });
    }
    await tx.objectStore("observation").delete(obs.id);
  }
  await tx.objectStore("sourceDocument").delete(sourceDocumentId);
  await tx.done;
}

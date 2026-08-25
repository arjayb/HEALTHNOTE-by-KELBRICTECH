import { getDb, CANONICAL_FIELDS } from "../data/db.js";
import { isFirstSaveForField } from "./chronology.js";
import { nextControlNumber, formatControlNumber } from "./controlNumber.js";

function fieldWasEdited(field) {
  if (field.userEdited) return true;

  const hadOriginalValue = Object.prototype.hasOwnProperty.call(field, "originalExtractedValue");
  const hadOriginalUnit = Object.prototype.hasOwnProperty.call(field, "originalExtractedUnit");

  const valueChanged = hadOriginalValue && Number(field.value) !== Number(field.originalExtractedValue);
  const originalUnit = field.originalExtractedUnit ?? "";
  const currentUnit = field.unit ?? "";
  const unitChanged = hadOriginalUnit && String(currentUnit).trim() !== String(originalUnit).trim();

  return valueChanged || unitChanged;
}

export async function saveConfirmedCapture({ sourceType, captureOrigin, clinicalDate, documentPrintAt, rawOcrText, confirmedFields, sourceRef, sourceBlob, observedAt: suppliedObservedAt }) {
  const db = await getDb();
  const meta = (await db.get("prototypeArchive", "local-archive")) || {};
  const controlNumber = nextControlNumber(meta.highestControlNumberIssued || 0);
  const sourceDocumentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const isLiveCameraCapture = captureOrigin === "camera";
  const isManualEntry = captureOrigin === "manual";
  const observedAt = !clinicalDate && isLiveCameraCapture ? (suppliedObservedAt || now) : null;
  const hasOriginalSource = Boolean(sourceBlob && typeof sourceBlob.size === "number" && sourceBlob.type);
  const sourceVerificationState = !isManualEntry && (hasOriginalSource || Boolean(observedAt)) ? "VERIFIED" : "UNVERIFIED";
  const anyUserEdited = confirmedFields.some(fieldWasEdited);

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
    verificationState: anyUserEdited ? "UNVERIFIED" : sourceVerificationState,
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
    const wasEdited = fieldWasEdited(field);
    const verificationState = isManualEntry || wasEdited ? "UNVERIFIED" : sourceVerificationState;

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
      userEditedFromSource: wasEdited,
      originalExtractedValue: Object.prototype.hasOwnProperty.call(field, "originalExtractedValue") ? field.originalExtractedValue : null,
      originalExtractedUnit: Object.prototype.hasOwnProperty.call(field, "originalExtractedUnit") ? field.originalExtractedUnit : null,
    });
  }

  const tx = db.transaction(["sourceDocument", "observation", "prototypeArchive"], "readwrite");
  await tx.objectStore("sourceDocument").put(sourceDocument);
  for (const obs of observations) await tx.objectStore("observation").put(obs);
  await tx.objectStore("prototypeArchive").put({ ...meta, id: "local-archive", highestControlNumberIssued: controlNumber });
  await tx.done;
  return { sourceDocument, observations };
}

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
    verificationState: "UNVERIFIED",
    userEditedFromSource: true,
    updatedAt: auditEntry.correctedAt,
    correctionHistory: [...(obs.correctionHistory || []), auditEntry.id],
  };

  const tx = db.transaction(["observation", "correctionAudit"], "readwrite");
  await tx.objectStore("observation").put(updatedObs);
  await tx.objectStore("correctionAudit").put(auditEntry);
  await tx.done;
  return { observation: updatedObs, auditEntry };
}

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

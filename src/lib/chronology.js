/** Chronology, baseline, and snapshot rules. Pure and unit-testable. */

/**
 * Effective medical date ranking:
 * 1. clinicalDate when present
 * 2. otherwise a valid observedAt for a contemporaneous capture
 * 3. addedAt is provenance only — never used to make an old undated
 *    document appear medically newest.
 */
export function effectiveDate(observation) {
  if (observation.clinicalDate) return observation.clinicalDate;
  if (observation.observedAt) return observation.observedAt;
  return null; // no addedAt fallback — handled explicitly by callers as "undated"
}

/**
 * Compare two observations for chronological ordering (newest first).
 * Ties resolve by createdAt, then immutable control number.
 */
export function compareObservationsNewestFirst(a, b) {
  const da = effectiveDate(a);
  const db_ = effectiveDate(b);

  // Undated observations never outrank dated ones.
  if (da && !db_) return -1;
  if (!da && db_) return 1;
  if (da && db_) {
    const cmp = new Date(db_) - new Date(da);
    if (cmp !== 0) return cmp;
  }

  // Tie or both undated: createdAt, then control number.
  const createdCmp = new Date(b.createdAt) - new Date(a.createdAt);
  if (createdCmp !== 0) return createdCmp;
  return (b.controlNumber ?? 0) - (a.controlNumber ?? 0);
}

/**
 * BASELINE assignment: the FIRST record ever saved for a field
 * becomes baseline, atomically, at save time. This must never be
 * recalculated from medical chronology and never moves when an
 * older-dated document is added later. Callers must persist the
 * returned flag at save time — this function only decides, it does
 * not re-derive baseline from existing data on each read.
 */
export function isFirstSaveForField(existingObservationsForField, baselineTombstone = null) {
  return existingObservationsForField.length === 0 && !baselineTombstone;
}

/**
 * Current Health Snapshot: for each populated canonical field,
 * the most recent on-file observation by chronology rule — computed,
 * not separately stored.
 */
export function computeSnapshot(observationsByField, canonicalFields) {
  return canonicalFields.map((field) => {
    const obs = observationsByField[field.id] || [];
    if (obs.length === 0) {
      return { field, latest: null };
    }
    const sorted = [...obs].sort(compareObservationsNewestFirst);
    return { field, latest: sorted[0], observations: sorted, vigilance: vigilanceState(sorted) };
  });
}

/**
 * Vigilance behavior: if the newest on-file result for a field
 * is UNVERIFIED, surface it as newest but flag that an "attach most
 * recent verified info" action is available if an earlier verified
 * record exists. Never silently substitute the older verified value.
 */
export function vigilanceState(sortedObservationsNewestFirst) {
  if (sortedObservationsNewestFirst.length === 0) {
    return { newest: null, showAttachVerifiedAction: false, mostRecentVerified: null };
  }
  const newest = sortedObservationsNewestFirst[0];
  if (newest.verificationState === "VERIFIED") {
    return { newest, showAttachVerifiedAction: false, mostRecentVerified: newest };
  }
  const mostRecentVerified =
    sortedObservationsNewestFirst.find((o) => o.verificationState === "VERIFIED") || null;
  return {
    newest,
    showAttachVerifiedAction: Boolean(mostRecentVerified),
    mostRecentVerified,
  };
}

export function dateProvenance(observation) {
  if (observation.clinicalDate) {
    return { label: "Clinical date", value: observation.clinicalDate, kind: "clinical" };
  }
  if (observation.observedAt) {
    return { label: "System capture time", value: observation.observedAt, kind: "observed" };
  }
  return { label: "Undated", value: null, kind: "undated" };
}

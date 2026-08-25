/**
 * Immutable, zero-padded control numbers.
 * The controlled proof run begins at #001, then #002.
 * Deleted numbers are never reused — this function only ever looks at
 * the highest number ever issued (tracked separately from active
 * documents) so a delete cannot free up a number for reuse.
 */
export function formatControlNumber(n) {
  return String(n).padStart(3, "0");
}

export function nextControlNumber(highestIssuedSoFar) {
  return (highestIssuedSoFar || 0) + 1;
}

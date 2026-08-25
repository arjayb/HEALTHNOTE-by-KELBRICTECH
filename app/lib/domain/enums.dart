/// How a record's VERIFIED status was (or wasn't) established.
/// Per the product rules: user confirmation of OCR/manual entry alone
/// is NOT sufficient — verification requires one of these two paths.
enum VerificationMethod {
  originalSource, // attached original document/report/prescription/image
  systemTimestampedCapture, // in-app camera capture, system-timestamped
  none, // not yet source-backed — record is UNVERIFIED
}

enum VerificationState { verified, unverified }

/// Where a record's date information came from. Distinct fields, not
/// a single blended "date" — see the product rules and product specification's
/// date-integrity rule (never substitute addedAt for clinical date).
enum DateProvenance {
  dateFromSource, // clinicalDate, from the original document
  systemObserved, // observedAt, from a live in-app capture
  manuallyEntered, // clinicalDate, user-typed
  dateUnknown,
  addedToHealthNote, // addedAt only — never presented as clinical date
}

enum SourceType {
  labReport,
  digitalMonitor,
  smartScale,
  prescriber,
  manualEntry,
  pulseOximeter,
  thermometer,
  other,
}

// FieldIdentity moved to field_identity.dart as a value-object + registry,
// not a fixed enum — a fixed enum couldn't represent individual lab
// analytes/medications distinctly (see the architecture).

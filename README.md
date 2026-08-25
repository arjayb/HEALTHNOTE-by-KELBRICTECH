# HEALTHNOTE by KELBRICTECH

HEALTHNOTE is a mobile-first, patient-owned health information tracker prototype. It organizes captured lab results into a chronological, on-device archive and keeps provenance labels visible.

> **Prototype safety notice:** Use synthetic demonstration data only. This release has no application password, encrypted vault, biometric unlock, recovery flow, or password-protected PDF. It is **not for real medical information** and does not provide diagnosis, interpretation, or treatment advice.

## Current prototype capabilities

- Camera capture or image/PDF upload
- Fully local browser OCR with bundled worker, WebAssembly core, and English language data
- Manual entry permanently marked `UNVERIFIED`
- Source-backed and system-timestamped live captures marked `VERIFIED`
- Clinical-date, system-capture-time, and undated provenance rules
- Immutable control numbers and first-ingested `BASELINE` labels
- Current snapshot, archive, filters, vigilance comparison, and source viewing
- Selective PDF export for latest or archived/date-range records
- Local IndexedDB persistence; no application API or analytics

## Local development

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
```

The pre-development script copies OCR runtime assets from installed packages into `public/ocr`. No OCR resource is loaded from a CDN at runtime.

## Verification

```bash
npm test
npm run build
npm run preview
```

For the GitHub Pages build, the public base path is `/HEALTHNOTE-by-KELBRICTECH/`.

## Data and verification rules

- A document clinical date is used when present.
- If an in-app camera capture has no document date, its device capture time becomes `observedAt`.
- An undated upload remains undated; `addedAt` is provenance and never medical chronology.
- An original attachment or valid live-capture timestamp produces `VERIFIED`.
- A manual entry without an attached source remains `UNVERIFIED`.
- The first ingested observation for a field remains `BASELINE` even if a later upload has an earlier clinical date.
- Deleting a baseline creates a tombstone; no later record is silently promoted.

## Public development lifecycle

DISCOVER → DESIGN → BUILD → PROVE

## Deferred security release

User-created password, recovery phrase, biometric unlock, encrypted on-device storage, automatic locking, failed-attempt handling, and password-protected sharing are intentionally deferred. Do not enter real patient data until those controls are implemented and independently verified.

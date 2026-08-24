# HEALTHNOTE Public Product Specification

This document records confirmed patient-facing behavior for the HEALTHNOTE prototype. Internal implementation details remain proprietary to KELBRICTECH.

## Record status

Every record permanently carries one of two visible statuses:

- **VERIFIED:** source-backed by an attached original document, image, or PDF; or captured directly through HEALTHNOTE with a system-generated observation timestamp.
- **UNVERIFIED:** entered without a traceable supporting source, missing its source, or materially changed beyond what its source supports.

Verified means source-backed. It does not mean clinically authenticated, medically approved, or reviewed by a healthcare provider.

Verification status remains visible on the dashboard, snapshot, archive, record details, timeline, PDFs, exports, and provider-facing reports. Users can filter between **Show verified only** and **Show all entries**.

## Most-recent data vigilance

HEALTHNOTE displays the most recent on-file result for each normalized health field even when it is unverified.

When that newest result is unverified and an earlier verified result exists, HEALTHNOTE offers:

> Attach most recent verified info

The resulting snapshot or report includes both records with their original dates, values, units, statuses, provenance, and control numbers. The older verified result never replaces or conceals the newer unverified result.

## Date provenance

HEALTHNOTE keeps medical chronology separate from storage activity:

- **Clinical date:** stated by the original source or entered as the medical-event date.
- **Observed at:** generated when HEALTHNOTE captures a contemporaneous live-device reading.
- **Added at:** records when information entered HEALTHNOTE and is never substituted for an unknown medical-event date.
- **Created at:** immutable record-creation timestamp.

An undated historical document does not become the latest clinical result merely because it was recently imported.

## Baseline

The first record entered for each normalized health field receives the permanent label **BASELINE**.

Baseline is determined by ingestion order—not by clinical chronology. Importing an older result later does not transfer the baseline label. Baseline is independent of verification, so a record may be **VERIFIED · BASELINE** or **UNVERIFIED · BASELINE**.

Baseline and latest are separate classifications and may belong to different records. If a baseline is deleted, HEALTHNOTE preserves an audit event and does not silently assign another baseline.

## Control numbers

Every record receives an immutable control number when it enters HEALTHNOTE. Control numbers are never reused or recalculated after sorting, editing, archiving, verification changes, or retrospective imports.

## Source and review

Original documents and captured images remain linked to their extracted records. OCR output is presented for review before final save. User review confirms transcription accuracy, but user confirmation alone does not create verified status without an approved source-backed path.

Manual entries may be saved immediately as unverified and supported with source material later.

Material changes to a source-backed value, unit, date, identity field, medication, or dosage return the changed record to unverified unless the source still directly supports it. Prior provenance remains auditable.

## Snapshot and sharing

The Current Health Snapshot is a deterministic assembly of on-file records, not an AI-written clinical interpretation. Users control included fields, records, date ranges, identifiers, source documents, and whether to attach the most recent verified comparison when the newest result is unverified.

Generated PDFs and protected shares preserve verification, baseline, control-number, and date-provenance labels.

## Local access and recovery

The prototype is patient-owned and local-first. It uses a user-created password, may support device biometrics, and provides a securely generated 12-word on-device recovery phrase. It does not require email recovery or a centralized HEALTHNOTE account.

KELBRICTECH cannot retrieve a user's password, recovery phrase, or local archive.

## Scope

HEALTHNOTE organizes patient-provided information. It does not diagnose, prescribe, authenticate clinical truth, provide emergency monitoring, or replace qualified medical advice.

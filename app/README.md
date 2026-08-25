# HEALTHNOTE by KELBRICTECH

Patient-owned, offline-first personal health information tracking for lab
results, prescriptions, procedures, measurements, and source documents.

## Product rules represented in this scaffold

- The dashboard ranks the most recent on-file result for each normalized field.
- VERIFIED and UNVERIFIED remain visible in the interface and exported output.
- The default filter shows all records; users may select verified-only.
- If the latest record is unverified, the latest verified record can be attached
  beside it for context without replacing or hiding the newest record.
- The first ingested record for a field permanently receives BASELINE, even when
  an older clinical record is imported later.
- Control numbers are immutable and never reused.
- Clinical, observed, added, and created timestamps remain distinct.
- Core storage and processing are designed to remain on-device.

## Current status

This is a source scaffold, not a production health-record application. The
domain model, ranking rules, status badges, baseline allocation logic, and
supporting tests are present. The following remain release blockers:

- concrete encrypted database and repository implementation;
- completed capture, OCR confirmation, archive, share, PDF, and recovery flows;
- device-benchmarked Argon2id parameters and dedicated cryptographic tests;
- biometric key wrapping, security review, and on-device privacy verification;
- release signing, accessibility and visual QA, and a proved release APK.

Do not enter real health data until the security and storage blockers are closed.

## Android prototype build

The repository includes automated validation for the mobile scaffold and can
produce a debug APK for controlled prototype testing.

## Public development record

DISCOVER → DESIGN → BUILD → PROVE

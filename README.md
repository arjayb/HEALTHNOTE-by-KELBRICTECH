# HEALTHNOTE by KELBRICTECH

> Your personal health information tracker.

**Status:** DISCOVER complete · DESIGN complete · BUILD prototype scaffold complete · first PROVE checkpoint complete

HEALTHNOTE is a privacy-first, patient-owned mobile application concept from KELBRICTECH. It is designed to turn scattered medical documents and readings from home health devices into a verified, chronological health record stored on the user's own device.

**Quick on our feet. Thoroughly crafted. Mindfully featured.**

## Why we are building it

Health information is often scattered across paper laboratory reports, prescriptions, hospital portals, camera photos, email attachments, and home monitoring devices. Patients can possess all of these records and still struggle to answer a simple question: **What is my most recent health information?**

HEALTHNOTE is being designed to make that answer available without requiring the patient to surrender custody of their complete medical history to another centralized service.

## Product principles

- **Patient-owned:** the record belongs to the patient.
- **Local-first:** health information stays on the user's device by default.
- **Offline-capable:** core recordkeeping does not require continuous connectivity.
- **Source-backed verification:** every entry permanently discloses whether it is verified or unverified.
- **Chronology with provenance:** every value retains its date, source, and verification status.
- **Stable baselines:** the first on-file entry for each field remains visibly marked as its baseline.
- **Deliberate sharing:** nothing leaves the device unless the user intentionally exports it.
- **Information, not diagnosis:** the prototype organizes patient-provided information and does not replace professional medical care.

## Prototype-defining features

### 1. Latest-results dashboard

Display the most recent on-file entry from every populated health category, with its unit, date, source, verification status, baseline status, and access to its full history.

If the newest entry is unverified, HEALTHNOTE offers to attach the most recent verified result for that field without hiding or replacing the newer entry.

### 2. Medical-document scanner

Photograph or upload laboratory results, prescriptions, procedure records, and other health documents. Detect relevant information—especially dates and timestamps—and preserve a traceable relationship between each extracted record and its original source.

### 3. Camera and file intake

Accept camera captures, existing photographs, and PDF documents.

### 4. Chronological archive

Preserve original documents and maintain an organized history of past results, prescriptions, procedures, and other health information.

### 5. Live Reading Capture

Photograph the display of an unconnected home health device, extract the displayed reading, ask whether it was taken just now, and—after confirmation—use the phone's capture time as the measurement timestamp. Initial targets include glucose meters and blood-pressure monitors.

For older documents without a clinical date, upload time will never be presented as the medical-event date.

### 6. Current Health Snapshot

One action assembles the latest on-file entry from every populated category into a concise patient snapshot. Verified, unverified, and baseline labels remain visible. When the latest entry is unverified, the user can attach the most recent source-backed result for comparison.

### 7. Selective protected sharing

Let the patient select some or all information, choose a date range, include or exclude original documents, and generate a password-protected PDF on the device. Verification, baseline, chronology provenance, and immutable control numbers remain visible in shared outputs.

### 8. Patient-controlled access and recovery

Use a user-created password, optional device biometrics, and an on-device 12-word recovery phrase. No email account or centralized HEALTHNOTE account is required for the prototype.

## What makes the complete workflow different

Individual products already validate local health-record storage, document OCR, medical timelines, device-display scanning, and one-click summaries. HEALTHNOTE's prototype will test the value of combining them into one coherent workflow:

**Capture → Classify provenance → Timestamp → Organize → Surface latest information → Share selectively**

We have not found another product publicly documenting this exact complete workflow. This is not a claim that no such product exists; it is the current outcome of our discovery work.

## Development status

HEALTHNOTE follows KELBRICTECH's four-stage product protocol:

| Stage | Objective | Status |
| --- | --- | --- |
| DISCOVER | Establish the opportunity and intended value | Complete |
| DESIGN | Shape the product experience | Complete |
| BUILD | Create the working prototype scaffold | Complete |
| PROVE | Validate the result | First cloud-build checkpoint complete; continued validation required |

Detailed internal development methods and implementation workflows are proprietary to KELBRICTECH.

## Public artifacts

- [Interactive mobile-interface prototype](prototype/index.html)
- [Confirmed public product behavior](PRODUCT_SPEC.md)

## Safety and scope

HEALTHNOTE is an early-stage personal information-management prototype. It is not a medical device, diagnostic service, emergency service, electronic health record operated by a healthcare provider, or replacement for qualified medical advice.

Extracted information can be incomplete or incorrect. The original source, verification state, and user corrections must remain visible and auditable.

## Repository policy

No real patient information, credentials, private medical documents, or identifiable health data may be committed to this repository. Demonstrations must use synthetic or explicitly authorized test data.

## Working identity

**HEALTHNOTE by KELBRICTECH** is the working prototype identity. Naming and trademark clearance will be completed before any commercial launch.

## Creator

Concept and product direction by **KELBRIC Technologies**, presented under the **KELBRICTECH** product signature.

---

© 2026 KELBRIC Technologies. Prototype documentation. All rights reserved.

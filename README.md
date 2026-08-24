# HEALTHNOTE by KELBRICTECH

> Your personal health information tracker.

**Status:** Concept announced · Discovery in progress · First working prototype pending

HEALTHNOTE is a privacy-first, patient-owned mobile application concept from KELBRICTECH. It is designed to turn scattered medical documents and readings from home health devices into a verified, chronological health record stored on the user's own device.

**Quick on our feet. Thoroughly crafted. Mindfully featured.**

## Why we are building it

Health information is often scattered across paper laboratory reports, prescriptions, hospital portals, camera photos, email attachments, and home monitoring devices. Patients can possess all of these records and still struggle to answer a simple question: **What is my most recent health information?**

HEALTHNOTE is being designed to make that answer available without requiring the patient to surrender custody of their complete medical history to another centralized service.

## Product principles

- **Patient-owned:** the record belongs to the patient.
- **Local-first:** health information stays on the user's device by default.
- **Offline-capable:** core recordkeeping does not require continuous connectivity.
- **Verified extraction:** scanned values must be reviewed before becoming part of the health record.
- **Chronology with provenance:** every value retains its date, source, and verification status.
- **Deliberate sharing:** nothing leaves the device unless the user intentionally exports it.
- **Information, not diagnosis:** the prototype organizes patient-provided information and does not replace professional medical care.

## Prototype-defining features

### 1. Latest-results dashboard

Display the most recent verified entry from every populated health category, with its unit, date, source, status, and access to its full history.

### 2. Medical-document scanner

Photograph or upload laboratory results, prescriptions, procedure records, and other health documents. Detect relevant information—especially dates and timestamps—and require user verification before saving extracted data.

### 3. Camera and file intake

Accept camera captures, existing photographs, and PDF documents.

### 4. Chronological archive

Preserve original documents and maintain an organized history of past results, prescriptions, procedures, and other health information.

### 5. Live Reading Capture

Photograph the display of an unconnected home health device, extract the displayed reading, ask whether it was taken just now, and—after confirmation—use the phone's capture time as the measurement timestamp. Initial targets include glucose meters and blood-pressure monitors.

For older documents without a clinical date, upload time will never be presented as the medical-event date.

### 6. Current Health Snapshot

One action assembles the latest verified entry from every populated category into a concise patient snapshot, with a detailed supporting report available when needed.

### 7. Selective protected sharing

Let the patient select some or all information, choose a date range, include or exclude original documents, and generate a password-protected PDF on the device.

## What makes the complete workflow different

Individual products already validate local health-record storage, document OCR, medical timelines, device-display scanning, and one-click summaries. HEALTHNOTE's prototype will test the value of combining them into one coherent workflow:

**Capture → Verify → Timestamp → Organize → Surface latest information → Share selectively**

We have not found another product publicly documenting this exact complete workflow. This is not a claim that no such product exists; it is the current outcome of our discovery work.

## Development status

HEALTHNOTE follows KELBRICTECH's four-stage product protocol:

| Stage | Objective | Status |
| --- | --- | --- |
| DISCOVER | Establish the opportunity and intended value | In progress |
| DESIGN | Shape the product experience | Pending |
| BUILD | Create the working prototype | Pending |
| PROVE | Validate the result | Pending |

Detailed internal development methods and implementation workflows are proprietary to KELBRICTECH.

## Safety and scope

HEALTHNOTE is an early-stage personal information-management prototype. It is not a medical device, diagnostic service, emergency service, electronic health record operated by a healthcare provider, or replacement for qualified medical advice.

Extracted information can be incomplete or incorrect. The original source, verification state, and user corrections must remain visible and auditable.

## Repository policy

No real patient information, credentials, private medical documents, or identifiable health data may be committed to this repository. Demonstrations must use synthetic or explicitly authorized test data.

## Working identity

**HEALTHNOTE by KELBRICTECH** is the working prototype identity. Naming and trademark clearance will be completed before any commercial launch.

## Creator

Concept and product direction by **KELBRICTECH**.

---

© 2026 KELBRICTECH. Prototype documentation. All rights reserved.

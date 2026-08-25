import React, { useState, useRef, useCallback } from "react";
import { SourceCameraIcon, FileIcon } from "../components/icons/index.js";
import { CANONICAL_FIELDS } from "../data/db.js";
import { extractCandidateFields, extractDates, computeReviewFlags } from "../lib/fieldParser.js";
import { saveConfirmedCapture } from "../lib/saveFlow.js";

/** Local capture, upload, OCR review, and manual-entry journey. */

const STEPS = {
  CHOOSE: "choose",
  PDF_PAGE_SELECT: "pdf_page_select",
  PREVIEW: "preview",
  OCR_RUNNING: "ocr_running",
  REVIEW: "review",
  MANUAL: "manual",
  SAVING: "saving",
};

export default function CaptureScreen({ onSaved, onBack }) {
  const [step, setStep] = useState(STEPS.CHOOSE);
  const [file, setFile] = useState(null);
  const [captureOrigin, setCaptureOrigin] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [selectedPageNumber, setSelectedPageNumber] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);
  const [rawOcrText, setRawOcrText] = useState("");
  const [candidateFields, setCandidateFields] = useState([]);
  const [dates, setDates] = useState({ clinicalDate: null, printDate: null });
  const [reviewFlags, setReviewFlags] = useState([]);
  const [manualField, setManualField] = useState({
    canonicalFieldId: CANONICAL_FIELDS[0].id,
    value: "",
    unit: "",
    clinicalDate: "",
  });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetToChoose = () => {
    setStep(STEPS.CHOOSE);
    setFile(null);
    setCaptureOrigin(null);
    setPreviewUrl(null);
    setPdfPages([]);
    setSelectedPageNumber(null);
    setOcrProgress(0);
    setOcrError(null);
    setRawOcrText("");
    setCandidateFields([]);
    setDates({ clinicalDate: null, printDate: null });
    setReviewFlags([]);
  };

  const handleFileChosen = useCallback(async (chosenFile, origin) => {
    setFile(chosenFile);
    setCaptureOrigin(origin);
    if (chosenFile.type === "application/pdf") {
      setStep(STEPS.PDF_PAGE_SELECT);
      await renderPdfThumbnails(chosenFile);
    } else {
      setPreviewUrl(URL.createObjectURL(chosenFile));
      setStep(STEPS.PREVIEW);
    }
  }, []);

  const renderPdfThumbnails = async (pdfFile) => {
    const pdfjsLib = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push({ pageNumber, thumbnailDataUrl: canvas.toDataURL() });
    }
    setPdfPages(pages);
  };

  const handlePageSelected = async (pageNumber) => {
    setSelectedPageNumber(pageNumber);
    const pdfjsLib = await import("pdfjs-dist");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    setPreviewUrl(canvas.toDataURL());
    setStep(STEPS.PREVIEW);
  };

  const runOcr = async () => {
    setStep(STEPS.OCR_RUNNING);
    setOcrError(null);
    setOcrProgress(0);
    try {
      const Tesseract = await import("tesseract.js");
      const localBase = import.meta.env.BASE_URL;
      const { data } = await Tesseract.recognize(previewUrl, "eng", {
        workerPath: `${localBase}ocr/worker.min.js`,
        corePath: `${localBase}ocr/core`,
        langPath: `${localBase}ocr/lang`,
        workerBlobURL: false,
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = data.text || "";
      setRawOcrText(text);
      const candidates = extractCandidateFields(text);
      const extractedDates = extractDates(text);
      const flags = computeReviewFlags(candidates, extractedDates);

      setCandidateFields(candidates);
      setDates(extractedDates);
      setReviewFlags(flags);
      setStep(STEPS.REVIEW);
    } catch (err) {
      setOcrError(err.message || "OCR failed. You can retry or go back.");
      setStep(STEPS.PREVIEW);
    }
  };

  const updateCandidateValue = (canonicalFieldId, key, value) => {
    setCandidateFields((prev) =>
      prev.map((c) => (c.canonicalFieldId === canonicalFieldId ? { ...c, [key]: value } : c))
    );
  };

  const handleConfirmSave = async () => {
    setStep(STEPS.SAVING);
    const { sourceDocument } = await saveConfirmedCapture({
      sourceType: file?.type === "application/pdf" ? "Lab report (PDF)" : "Lab report (photo)",
      captureOrigin,
      clinicalDate: dates.clinicalDate,
      documentPrintAt: dates.printDate,
      rawOcrText,
      confirmedFields: candidateFields,
      sourceRef: file?.name || "capture",
      sourceBlob: file,
    });
    onSaved(sourceDocument.id);
  };

  const handleManualSave = async () => {
    const numericValue = Number(manualField.value);
    if (!Number.isFinite(numericValue)) return;
    setStep(STEPS.SAVING);
    const canonical = CANONICAL_FIELDS.find((field) => field.id === manualField.canonicalFieldId);
    const { sourceDocument } = await saveConfirmedCapture({
      sourceType: "Manual entry",
      captureOrigin: "manual",
      clinicalDate: manualField.clinicalDate || null,
      documentPrintAt: null,
      rawOcrText: "",
      confirmedFields: [{
        canonicalFieldId: manualField.canonicalFieldId,
        rawLabel: canonical?.label || manualField.canonicalFieldId,
        value: numericValue,
        unit: manualField.unit.trim(),
      }],
      sourceRef: null,
      sourceBlob: null,
    });
    onSaved(sourceDocument.id);
  };

  return (
    <div className="hn-capture-screen">
      <header className="hn-screen-header">
        <button type="button" onClick={onBack} aria-label="Back">←</button>
        <h2>Capture</h2>
      </header>

      {step === STEPS.CHOOSE && (
        <div className="hn-capture-choose">
          <p>Choose how to add a lab report.</p>
          <button type="button" className="hn-btn hn-btn-primary" onClick={() => cameraInputRef.current?.click()}>
            <SourceCameraIcon className="hn-btn-icon" />
            Use Camera
          </button>
          <button type="button" className="hn-btn hn-btn-outline" onClick={() => fileInputRef.current?.click()}>
            <FileIcon className="hn-btn-icon" />
            Upload Image or PDF
          </button>
          <button type="button" className="hn-btn hn-btn-outline" onClick={() => setStep(STEPS.MANUAL)}>
            Enter Manually
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => e.target.files[0] && handleFileChosen(e.target.files[0], "camera")}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => e.target.files[0] && handleFileChosen(e.target.files[0], "upload")}
          />
        </div>
      )}

      {step === STEPS.MANUAL && (
        <div className="hn-manual-entry" data-testid="manual-entry-form">
          <p>Manual entries remain permanently marked UNVERIFIED unless an original source is attached in a separate record.</p>
          <label>
            Health field
            <select
              value={manualField.canonicalFieldId}
              onChange={(e) => setManualField((current) => ({ ...current, canonicalFieldId: e.target.value }))}
            >
              {CANONICAL_FIELDS.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
            </select>
          </label>
          <label>
            Value
            <input type="number" step="any" value={manualField.value} onChange={(e) => setManualField((current) => ({ ...current, value: e.target.value }))} />
          </label>
          <label>
            Unit
            <input type="text" value={manualField.unit} onChange={(e) => setManualField((current) => ({ ...current, unit: e.target.value }))} />
          </label>
          <label>
            Clinical date (optional)
            <input type="date" value={manualField.clinicalDate} onChange={(e) => setManualField((current) => ({ ...current, clinicalDate: e.target.value }))} />
          </label>
          <button type="button" className="hn-btn hn-btn-primary" disabled={!manualField.value} onClick={handleManualSave}>Save UNVERIFIED Entry</button>
          <button type="button" className="hn-link-button" onClick={resetToChoose}>Cancel</button>
        </div>
      )}

      {step === STEPS.PDF_PAGE_SELECT && (
        <div className="hn-pdf-page-select">
          <p>Select the page containing the CBC results.</p>
          {pdfPages.length === 0 && <p className="hn-empty-state">Rendering page thumbnails…</p>}
          <div className="hn-pdf-page-grid">
            {pdfPages.map((p) => (
              <button key={p.pageNumber} type="button" onClick={() => handlePageSelected(p.pageNumber)}>
                <img src={p.thumbnailDataUrl} alt={`Page ${p.pageNumber}`} />
                <span>Page {p.pageNumber}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === STEPS.PREVIEW && (
        <div className="hn-capture-preview">
          <img src={previewUrl} alt="Selected source preview" className="hn-preview-image" />
          {ocrError && <p className="hn-error-text">{ocrError}</p>}
          <button type="button" className="hn-btn hn-btn-primary" onClick={runOcr}>
            {ocrError ? "Retry OCR" : "Run OCR"}
          </button>
          <button type="button" className="hn-link-button" onClick={resetToChoose}>
            Choose a different source
          </button>
        </div>
      )}

      {step === STEPS.OCR_RUNNING && (
        <div className="hn-capture-ocr-progress">
          <p>Reading document locally… {ocrProgress}%</p>
          <div className="hn-progress-bar">
            <div className="hn-progress-bar-fill" style={{ width: `${ocrProgress}%` }} />
          </div>
        </div>
      )}

      {step === STEPS.REVIEW && (
        <ReviewTable
          candidateFields={candidateFields}
          dates={dates}
          reviewFlags={reviewFlags}
          rawOcrText={rawOcrText}
          captureOrigin={captureOrigin}
          onUpdateDate={(value) => setDates((current) => ({ ...current, clinicalDate: value || null }))}
          onUpdateField={updateCandidateValue}
          onConfirm={handleConfirmSave}
        />
      )}

      {step === STEPS.SAVING && <p>Saving…</p>}
    </div>
  );
}

function ReviewTable({ candidateFields, dates, reviewFlags, rawOcrText, captureOrigin, onUpdateDate, onUpdateField, onConfirm }) {
  return (
    <div className="hn-review-table">
      <label className="hn-review-date">
        Clinical date (optional)
        <input type="date" value={dates.clinicalDate || ""} onChange={(e) => onUpdateDate(e.target.value)} />
      </label>
      {!dates.clinicalDate && captureOrigin === "camera" && (
        <p className="hn-explainer">No document date detected. The device capture time will be stored as the system-generated observation time.</p>
      )}
      {!dates.clinicalDate && captureOrigin === "upload" && (
        <p className="hn-explainer">No document date detected. This upload will remain undated; upload time is provenance only.</p>
      )}

      {reviewFlags.length > 0 && (
        <ul className="hn-review-flags">
          {reviewFlags.map((f, i) => (
            <li key={i} className={`hn-flag hn-flag-${f.type}`}>
              {f.message}
            </li>
          ))}
        </ul>
      )}

      {candidateFields.length === 0 && (
        <p className="hn-empty-state">
          OCR could not find any of the eight supported fields on this page. You can retry with
          a clearer photo or a different page.
        </p>
      )}

      {candidateFields.map((c) => {
        const canonical = CANONICAL_FIELDS.find((f) => f.id === c.canonicalFieldId);
        return (
          <div key={c.canonicalFieldId} className="hn-review-row">
            <label>{canonical?.shortLabel || c.rawLabel}</label>
            <input
              type="number"
              step="any"
              value={c.value}
              onChange={(e) => onUpdateField(c.canonicalFieldId, "value", parseFloat(e.target.value))}
            />
            <input
              type="text"
              value={c.unit || ""}
              onChange={(e) => onUpdateField(c.canonicalFieldId, "unit", e.target.value)}
              placeholder="unit"
            />
            {c.referenceRange && (
              <span className="hn-review-range">
                Ref: {c.referenceRange.low}–{c.referenceRange.high}
              </span>
            )}
          </div>
        );
      })}

      <details className="hn-raw-ocr-text">
        <summary>Raw OCR text</summary>
        <pre>{rawOcrText}</pre>
      </details>

      <button
        type="button"
        className="hn-btn hn-btn-primary"
        disabled={candidateFields.length === 0}
        onClick={onConfirm}
        data-testid="confirm-save"
      >
        Confirm and Save
      </button>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { DownloadIcon } from "../components/icons/index.js";
import { CANONICAL_FIELDS } from "../data/db.js";
import { dateProvenance, effectiveDate } from "../lib/chronology.js";
import { generateExportPdf } from "../lib/pdfExport.js";

/** Selective local PDF export for current or archived observations. */
export default function ShareScreen({ snapshotRows, observations, sourceDocuments, onBack }) {
  const [scope, setScope] = useState("latest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [includeSourceRefs, setIncludeSourceRefs] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [generating, setGenerating] = useState(false);

  const sourceById = useMemo(
    () => Object.fromEntries(sourceDocuments.map((document) => [document.id, document])),
    [sourceDocuments]
  );

  const candidates = useMemo(() => {
    const base = scope === "latest"
      ? snapshotRows.filter((row) => row.latest).map((row) => row.latest)
      : observations;
    return base
      .filter((observation) => {
        if (scope !== "archive") return true;
        const date = effectiveDate(observation);
        if (startDate && (!date || date.slice(0, 10) < startDate)) return false;
        if (endDate && (!date || date.slice(0, 10) > endDate)) return false;
        return true;
      })
      .sort((a, b) => (effectiveDate(b) || "").localeCompare(effectiveDate(a) || ""));
  }, [scope, snapshotRows, observations, startDate, endDate]);

  useEffect(() => {
    setSelectedIds(candidates.map((observation) => observation.id));
    setPdfBlobUrl(null);
  }, [scope, startDate, endDate, candidates.length]);

  const toggleRecord = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const recordsForExport = candidates
    .filter((observation) => selectedIds.includes(observation.id))
    .map((observation) => {
      const field = CANONICAL_FIELDS.find((item) => item.id === observation.canonicalFieldId);
      const source = sourceById[observation.sourceDocumentId];
      return {
        fieldLabel: field?.label || observation.normalizedLabel,
        value: observation.value,
        unit: observation.unit,
        verificationState: observation.verificationState,
        isBaseline: observation.isBaseline,
        dateProvenance: dateProvenance(observation),
        controlNumberFormatted: observation.controlNumberFormatted,
        sourceType: source?.sourceType || observation.sourceType || "No source attached",
      };
    });

  const handleGenerate = async () => {
    setGenerating(true);
    const nextBlob = await generateExportPdf({
      records: recordsForExport,
      includeSourceRefs,
      rangeLabel: scope === "latest" ? "Current / latest information" : `${startDate || "Beginning"} to ${endDate || "Present"}`,
    });
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(URL.createObjectURL(nextBlob));
    setGenerating(false);
  };

  const handleShareOrDownload = async () => {
    if (!pdfBlobUrl) return;
    const blob = await (await fetch(pdfBlobUrl)).blob();
    const file = new File([blob], "healthnote-export.pdf", { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "HealthNote export" });
      return;
    }
    const link = document.createElement("a");
    link.href = pdfBlobUrl;
    link.download = "healthnote-export.pdf";
    link.click();
  };

  return (
    <div className="hn-share-screen">
      <header className="hn-screen-header">
        <button type="button" onClick={onBack} aria-label="Back">←</button>
        <h2>Share</h2>
      </header>

      <p className="hn-prototype-export-notice">PROTOTYPE EXPORT — NOT PASSWORD PROTECTED</p>

      <div className="hn-filter-toggle" role="group" aria-label="Export scope">
        <button type="button" className={scope === "latest" ? "hn-filter-active" : ""} onClick={() => setScope("latest")}>Current / latest</button>
        <button type="button" className={scope === "archive" ? "hn-filter-active" : ""} onClick={() => setScope("archive")}>Archive / date range</button>
      </div>

      {scope === "archive" && (
        <div className="hn-date-range">
          <label>From <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>To <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <small>Undated records appear only when no date range is applied.</small>
        </div>
      )}

      <h3>Records to include</h3>
      <ul className="hn-share-field-list">
        {candidates.map((observation) => {
          const field = CANONICAL_FIELDS.find((item) => item.id === observation.canonicalFieldId);
          const provenance = dateProvenance(observation);
          return (
            <li key={observation.id}>
              <label>
                <input type="checkbox" checked={selectedIds.includes(observation.id)} onChange={() => toggleRecord(observation.id)} />
                <span>{field?.label || observation.normalizedLabel}: {observation.value} {observation.unit}</span>
                <span className={observation.verificationState === "VERIFIED" ? "hn-badge hn-badge-verified" : "hn-badge hn-badge-unverified"}>{observation.verificationState}</span>
                {observation.isBaseline && <span className="hn-badge hn-badge-baseline">BASELINE</span>}
                <small>{provenance.label}: {provenance.value || "—"} · Control #{observation.controlNumberFormatted}</small>
              </label>
            </li>
          );
        })}
      </ul>
      {candidates.length === 0 && <p className="hn-empty-state">No records match this export view.</p>}

      <p className="hn-explainer">Verification, baseline, date provenance, and control number labels are always included.</p>
      <label className="hn-share-toggle">
        <input type="checkbox" checked={includeSourceRefs} onChange={(event) => setIncludeSourceRefs(event.target.checked)} />
        Include original-source references
      </label>

      <button type="button" className="hn-btn hn-btn-primary" onClick={handleGenerate} disabled={generating || recordsForExport.length === 0}>
        {generating ? "Generating…" : "Generate PDF"}
      </button>

      {pdfBlobUrl && (
        <div className="hn-share-preview">
          <iframe src={pdfBlobUrl} title="PDF preview" className="hn-pdf-preview-frame" />
          <button type="button" className="hn-btn hn-btn-outline" onClick={handleShareOrDownload}>
            <DownloadIcon className="hn-btn-icon" />
            Share / Download
          </button>
        </div>
      )}
    </div>
  );
}

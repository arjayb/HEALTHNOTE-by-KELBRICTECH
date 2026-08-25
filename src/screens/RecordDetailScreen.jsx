import React from "react";
import { CANONICAL_FIELDS } from "../data/db.js";
import { FlaskIcon, ClockIcon, EyeIcon } from "../components/icons/index.js";

/** Record detail, provenance, and audit history. */
export default function RecordDetailScreen({ sourceDocument, observations, correctionAuditsByObservationId, onBack, onViewSource }) {
  if (!sourceDocument) {
    return (
      <div className="hn-record-detail-screen">
        <header className="hn-screen-header">
          <button type="button" onClick={onBack} aria-label="Back">←</button>
          <h2>Record</h2>
        </header>
        <p className="hn-empty-state">Record not found.</p>
      </div>
    );
  }

  return (
    <div className="hn-record-detail-screen">
      <header className="hn-screen-header">
        <button type="button" onClick={onBack} aria-label="Back">←</button>
        <h2>Record #{sourceDocument.controlNumberFormatted}</h2>
      </header>

      <div className="hn-record-detail-meta">
        <span
          className={
            sourceDocument.verificationState === "VERIFIED" ? "hn-badge hn-badge-verified" : "hn-badge hn-badge-unverified"
          }
        >
          {sourceDocument.verificationState}
        </span>
        <span><FlaskIcon className="hn-inline-icon" />{sourceDocument.sourceType}</span>
        <span><ClockIcon className="hn-inline-icon" />{sourceDocument.clinicalDate ? `Clinical date: ${sourceDocument.clinicalDate}` : sourceDocument.observedAt ? `System capture time: ${sourceDocument.observedAt}` : "Undated"}</span>
        {sourceDocument.documentPrintAt && <span>Printed: {sourceDocument.documentPrintAt}</span>}
      </div>

      {sourceDocument.sourceBlob ? (
        <button type="button" className="hn-link-button" onClick={onViewSource} data-testid="view-original-source">
          <EyeIcon className="hn-inline-icon" />
          View original source
        </button>
      ) : (
        <p className="hn-explainer">No original source is attached to this UNVERIFIED manual entry.</p>
      )}

      <h3>Observations</h3>
      <ul className="hn-observation-list">
        {observations.map((obs) => {
          const canonical = CANONICAL_FIELDS.find((f) => f.id === obs.canonicalFieldId);
          const corrections = correctionAuditsByObservationId?.[obs.id] || [];
          return (
            <li key={obs.id} className="hn-observation-item">
              <div className="hn-observation-top">
                <strong>{canonical?.shortLabel || obs.rawLabel}</strong>
                <span className={obs.verificationState === "VERIFIED" ? "hn-badge hn-badge-verified" : "hn-badge hn-badge-unverified"}>{obs.verificationState}</span>
                {obs.isBaseline && <span className="hn-badge hn-badge-baseline">BASELINE</span>}
              </div>
              <div>
                {obs.value} {obs.unit}
              </div>
              {obs.referenceRange && (
                <div className="hn-review-range">
                  Ref: {obs.referenceRange.low}–{obs.referenceRange.high}
                </div>
              )}
              {corrections.length > 0 && (
                <details className="hn-correction-history">
                  <summary>Correction history ({corrections.length})</summary>
                  <ul>
                    {corrections.map((c) => (
                      <li key={c.id}>
                        {c.correctedAt}: {c.previousValue} {c.previousUnit} → {c.newValue} {c.newUnit}
                        {c.reason ? ` (${c.reason})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

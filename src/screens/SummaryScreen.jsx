import React from "react";
import { CbcFieldIcon } from "../components/icons/index.js";

/** Detailed summary without diagnosis, interpretation, or treatment advice. */
export default function SummaryScreen({ snapshotRows, onOpenRecord, onBack }) {
  const populated = snapshotRows.filter((r) => r.latest !== null);
  const missing = snapshotRows.filter((r) => r.latest === null);

  return (
    <div className="hn-summary-screen">
      <header className="hn-screen-header">
        <button type="button" onClick={onBack} aria-label="Back">←</button>
        <h2>Latest Summary</h2>
      </header>

      <p className="hn-summary-disclaimer">
        This summary organizes and presents information you've added. It does not diagnose,
        interpret, or suggest treatment.
      </p>

      {populated.length === 0 && (
        <p className="hn-empty-state">No fields populated yet.</p>
      )}

      <ul className="hn-summary-list">
        {populated.map(({ field, latest, vigilance }) => (
          <li key={field.id} className="hn-summary-item">
            <div className="hn-summary-item-top">
              <CbcFieldIcon canonicalFieldId={field.id} size={26} />
              <strong>{field.label}</strong>
              <span
                className={
                  latest.verificationState === "VERIFIED" ? "hn-badge hn-badge-verified" : "hn-badge hn-badge-unverified"
                }
              >
                {latest.verificationState}
              </span>
              {latest.isBaseline && <span className="hn-badge hn-badge-baseline">BASELINE</span>}
            </div>
            <div>
              {latest.value} {latest.unit} — {latest.clinicalDate || latest.observedAt}
            </div>
            <div className="hn-summary-item-meta">
              Control #{latest.controlNumberFormatted}
            </div>
            <button type="button" className="hn-link-button" onClick={() => onOpenRecord(latest.sourceDocumentId)}>
              View source record
            </button>
            {vigilance.showAttachVerifiedAction && (
              <div className="hn-vigilance" data-testid={`summary-vigilance-${field.id}`}>
                <strong>Vigilance:</strong> newest on-file information is UNVERIFIED.
                <button type="button" className="hn-link-button" onClick={() => onOpenRecord(vigilance.mostRecentVerified.sourceDocumentId)}>
                  Attach most recent verified info
                </button>
                <span>
                  {vigilance.mostRecentVerified.value} {vigilance.mostRecentVerified.unit} · {vigilance.mostRecentVerified.clinicalDate || vigilance.mostRecentVerified.observedAt || "Undated"} · Control #{vigilance.mostRecentVerified.controlNumberFormatted}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <div className="hn-summary-missing">
          <h3>Not yet recorded</h3>
          <p>{missing.map((r) => r.field.label).join(", ")}</p>
        </div>
      )}
    </div>
  );
}

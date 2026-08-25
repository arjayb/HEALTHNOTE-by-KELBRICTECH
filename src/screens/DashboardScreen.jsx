import React from "react";
import { CANONICAL_FIELDS } from "../data/db.js";
import { CbcFieldIcon } from "../components/icons/index.js";

/** Dashboard using only locally stored records. */
export default function DashboardScreen({ snapshotRows, recentRecords, filter, onFilterChange, onNavigate, onOpenRecord }) {
  const hasAnyRecord = recentRecords.length > 0;

  return (
    <div className="hn-dashboard-screen">
      <header className="hn-dashboard-header">
        <h1>My HealthNote</h1>
        <span className="hn-stored-indicator">🔒 Stored on this device</span>
      </header>

      <section className="hn-snapshot-hero">
        <img
          src={`${import.meta.env.BASE_URL}assets/healthnote_art_04_dashboard_clipboard_v01.png`}
          alt=""
          aria-hidden="true"
          className="hn-snapshot-icon"
        />
        <h2>Current Health Snapshot</h2>
        <p>Your latest on-file health information at a glance.</p>
        <button type="button" className="hn-btn hn-btn-primary" onClick={() => onNavigate("summary")}>
          View latest summary
        </button>
      </section>

      <section className="hn-latest-results">
        <div className="hn-section-header">
          <h3>Latest results</h3>
          <button type="button" className="hn-link-button" onClick={() => onNavigate("archive")}>
            All results
          </button>
        </div>

        <div className="hn-filter-toggle" role="group" aria-label="Result filter">
          <button
            type="button"
            className={filter === "all" ? "hn-filter-active" : ""}
            onClick={() => onFilterChange("all")}
          >
            All
          </button>
          <button
            type="button"
            className={filter === "verified" ? "hn-filter-active" : ""}
            onClick={() => onFilterChange("verified")}
          >
            Verified only
          </button>
        </div>

        {!hasAnyRecord && (
          <p className="hn-empty-state" data-testid="empty-no-records">
            No records yet. Capture your first result to see it here.
          </p>
        )}

        {hasAnyRecord && filter === "verified" && !snapshotRows.some((r) => r.latest?.verificationState === "VERIFIED") && (
          <p className="hn-empty-state" data-testid="empty-no-verified">
            No verified records yet under this filter.
          </p>
        )}

        {hasAnyRecord && (
          <div className="hn-result-grid">
            {snapshotRows
              .filter((row) => row.latest !== null)
              .map((row) => ({ ...row, displayObservation: filter === "verified" ? row.vigilance.mostRecentVerified : row.latest }))
              .filter((row) => row.displayObservation)
              .map((row) => {
                const shown = row.displayObservation;
                return (
                <article key={row.field.id} className="hn-result-card" data-testid={`result-${row.field.id}`}>
                  <div className="hn-result-card-top">
                    <CbcFieldIcon canonicalFieldId={row.field.id} size={30} />
                    <span className="hn-result-field-name">{row.field.shortLabel}</span>
                    <span
                      className={
                        shown.verificationState === "VERIFIED"
                          ? "hn-badge hn-badge-verified"
                          : "hn-badge hn-badge-unverified"
                      }
                    >
                      {shown.verificationState}
                    </span>
                  </div>
                  <div className="hn-result-value">
                    {shown.value} <span className="hn-result-unit">{shown.unit}</span>
                  </div>
                  <div className="hn-result-date">{shown.clinicalDate || shown.observedAt || "Undated"}</div>
                  {shown.isBaseline && <span className="hn-badge hn-badge-baseline">BASELINE</span>}
                  <div className="hn-result-control">Control #{shown.controlNumberFormatted}</div>
                  {filter === "all" && row.vigilance.showAttachVerifiedAction && (
                    <div className="hn-vigilance" data-testid={`vigilance-${row.field.id}`}>
                      <span>Most recent result is UNVERIFIED.</span>
                      <button type="button" className="hn-link-button" onClick={() => onOpenRecord(row.vigilance.mostRecentVerified.sourceDocumentId)}>
                        Attach most recent verified info
                      </button>
                      <small>
                        Verified: {row.vigilance.mostRecentVerified.value} {row.vigilance.mostRecentVerified.unit} · {row.vigilance.mostRecentVerified.clinicalDate || row.vigilance.mostRecentVerified.observedAt || "Undated"}
                      </small>
                    </div>
                  )}
                </article>
              );})}
          </div>
        )}
      </section>

      <button
        type="button"
        className="hn-capture-fab"
        onClick={() => onNavigate("capture")}
        aria-label="Capture"
        data-testid="capture-action"
      >
        📷
      </button>

      <section className="hn-recent-records">
        <div className="hn-section-header">
          <h3>Recent records</h3>
          <button type="button" className="hn-link-button" onClick={() => onNavigate("archive")}>
            View all
          </button>
        </div>

        {!hasAnyRecord && (
          <p className="hn-empty-state">Archive created — no records yet.</p>
        )}

        {hasAnyRecord && (
          <ul className="hn-recent-list">
            {recentRecords.map((doc) => (
              <li key={doc.id} className="hn-recent-item" onClick={() => onNavigate("record", doc.id)}>
                <span className="hn-recent-type">{doc.sourceType}</span>
                <span className="hn-recent-date">{doc.clinicalDate || doc.observedAt || "Undated"}</span>
                <span
                  className={
                    doc.verificationState === "VERIFIED"
                      ? "hn-badge hn-badge-verified"
                      : "hn-badge hn-badge-unverified"
                  }
                >
                  {doc.verificationState}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

import React, { useState, useMemo } from "react";
import { ChevronRightIcon, TrashIcon, FilterIcon } from "../components/icons/index.js";

/** Chronological archive with verification filtering and explicit deletion. */
export default function ArchiveScreen({ sourceDocuments, onOpenRecord, onDelete, onBack }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const filtered = useMemo(() => {
    let docs = [...sourceDocuments];
    if (filter === "verified") {
      docs = docs.filter((d) => d.verificationState === "VERIFIED");
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      docs = docs.filter(
        (d) =>
          (d.sourceType || "").toLowerCase().includes(q) ||
          (d.controlNumberFormatted || "").toLowerCase().includes(q)
      );
    }
    docs.sort((a, b) => new Date(b.clinicalDate || b.observedAt || 0) - new Date(a.clinicalDate || a.observedAt || 0));
    return docs;
  }, [sourceDocuments, filter, search]);

  return (
    <div className="hn-archive-screen">
      <header className="hn-screen-header">
        <button type="button" onClick={onBack} aria-label="Back">←</button>
        <h2>Archive</h2>
      </header>

      <input
        type="search"
        className="hn-search-input"
        placeholder="Search by field or control number"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search archive"
      />

      <div className="hn-filter-toggle" role="group" aria-label="Result filter">
        <FilterIcon className="hn-filter-toggle-icon" />
        <button type="button" className={filter === "all" ? "hn-filter-active" : ""} onClick={() => setFilter("all")}>
          All
        </button>
        <button type="button" className={filter === "verified" ? "hn-filter-active" : ""} onClick={() => setFilter("verified")}>
          Verified only
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="hn-empty-state">No records match this view yet.</p>
      )}

      <ul className="hn-archive-list">
        {filtered.map((doc) => (
          <li key={doc.id} className="hn-archive-item">
            <button type="button" className="hn-archive-item-main" onClick={() => onOpenRecord(doc.id)}>
              <ChevronRightIcon className="hn-archive-chevron" />
              <div className="hn-archive-item-top">
                <span className="hn-archive-type">{doc.sourceType}</span>
                <span
                  className={
                    doc.verificationState === "VERIFIED" ? "hn-badge hn-badge-verified" : "hn-badge hn-badge-unverified"
                  }
                >
                  {doc.verificationState}
                </span>
              </div>
              <div className="hn-archive-item-meta">
                <span>{doc.clinicalDate ? `Clinical: ${doc.clinicalDate}` : doc.observedAt ? `System capture: ${doc.observedAt}` : "Undated"}</span>
                <span>Control #{doc.controlNumberFormatted}</span>
              </div>
            </button>

            {pendingDeleteId !== doc.id ? (
              <button
                type="button"
                className="hn-archive-delete-trigger"
                onClick={() => setPendingDeleteId(doc.id)}
                aria-label={`Delete record ${doc.controlNumberFormatted}`}
              >
                <TrashIcon className="hn-inline-icon" />
                Delete
              </button>
            ) : (
              <div className="hn-confirm-clear">
                <p>Delete this record permanently? If it's a BASELINE source, a tombstone note is kept — no replacement baseline is assigned automatically.</p>
                <div className="hn-confirm-clear-actions">
                  <button type="button" onClick={() => setPendingDeleteId(null)}>Cancel</button>
                  <button
                    type="button"
                    className="hn-btn-danger"
                    onClick={() => {
                      onDelete(doc.id);
                      setPendingDeleteId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

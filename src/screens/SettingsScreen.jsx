import React, { useState } from "react";
import { CANONICAL_FIELDS } from "../data/db.js";
import { clearAllData } from "../data/db.js";

const SCHEMA_VERSION = 1;
const APP_VERSION = "0.1.0-poc";

/**
 * Settings screen. All content here is live HTML — no
 * generated art required for this screen to be functionally complete.
 */
export default function SettingsScreen({ onBack, onDataCleared, onOpenAbout }) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleClearConfirmed = async () => {
    await clearAllData();
    setConfirmingClear(false);
    onDataCleared();
  };

  return (
    <div className="hn-settings-screen">
      <header className="hn-screen-header">
        <button type="button" onClick={onBack} aria-label="Back">←</button>
        <h2>Settings</h2>
      </header>

      <section className="hn-settings-section">
        <div className="hn-settings-row">
          <span>Mode</span>
          <span className="hn-settings-value">Prototype — password protection not enabled</span>
        </div>
        <div className="hn-settings-row">
          <span>Storage</span>
          <span className="hn-settings-value">Local only. Nothing leaves this device.</span>
        </div>
        <div className="hn-settings-row">
          <span>Supported fields</span>
          <span className="hn-settings-value">
            {CANONICAL_FIELDS.map((f) => f.shortLabel).join(", ")}
          </span>
        </div>
        <button type="button" className="hn-settings-row hn-settings-link" onClick={onOpenAbout}>
          <span>About / Dedication</span>
          <span>›</span>
        </button>
      </section>

      <section className="hn-settings-section">
        <div className="hn-settings-row">
          <span>App version</span>
          <span className="hn-settings-value">{APP_VERSION}</span>
        </div>
        <div className="hn-settings-row">
          <span>Schema version</span>
          <span className="hn-settings-value">{SCHEMA_VERSION}</span>
        </div>
      </section>

      <section className="hn-settings-section">
        <p className="hn-settings-privacy">
          HEALTHNOTE organizes and presents information you provide. It does not diagnose,
          interpret, or recommend treatment. Always consult a qualified healthcare provider.
        </p>
        <p className="hn-settings-privacy">
          Security release roadmap: user-created password, birthdate + security-question
          recovery, 12-word recovery phrase, biometric unlock, rate limiting, and
          password-protected export are planned for a later release and are not part of
          this prototype.
        </p>
      </section>

      <section className="hn-settings-section">
        {!confirmingClear ? (
          <button
            type="button"
            className="hn-btn-danger"
            onClick={() => setConfirmingClear(true)}
            data-testid="clear-data"
          >
            Clear all prototype data
          </button>
        ) : (
          <div className="hn-confirm-clear">
            <p>This permanently removes all local records, sources, OCR text, and prototype state on this device. This cannot be undone.</p>
            <div className="hn-confirm-clear-actions">
              <button type="button" onClick={() => setConfirmingClear(false)}>Cancel</button>
              <button type="button" className="hn-btn-danger" onClick={handleClearConfirmed} data-testid="confirm-clear-data">
                Yes, clear everything
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

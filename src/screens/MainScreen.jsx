import React from "react";
import { LeafIcon, UnlockPadlockIcon, DeviceTrustShieldIcon } from "../components/icons/index.js";
import OrbitalHalo from "../components/OrbitalHalo.jsx";

/** Main entry screen for the public prototype. */
export default function MainScreen({ archiveAlreadyExists, onCreate, onUnlock, onForgotPassword }) {
  return (
    <div className="hn-main-screen">
      <header className="hn-main-titleblock">
        <h1 className="hn-main-title">
          <span className="hn-title-ivory">HEALTH</span>
          <span className="hn-title-mint">NOTE</span>
        </h1>
        <div className="hn-main-byline">by KELBRICTECH</div>
        <p className="hn-main-tagline">Your personal health information tracker.</p>
      </header>

      <div className="hn-main-hero" role="img" aria-label="HEALTHNOTE notebook with heartbeat line and security shield">
        <OrbitalHalo className="hn-orbital-halo" />
        <img src={`${import.meta.env.BASE_URL}assets/healthnote_art_01_main_hero_v02.png`} alt="" aria-hidden="true" className="hn-hero-art" />
      </div>

      <div className="hn-main-actions">
        <button
          type="button"
          className="hn-btn hn-btn-primary"
          onClick={onCreate}
          data-testid="create-healthnote"
        >
          <LeafIcon className="hn-btn-icon" />
          Create My HealthNote
        </button>

        <button
          type="button"
          className="hn-btn hn-btn-outline"
          onClick={onUnlock}
          disabled={!archiveAlreadyExists}
          data-testid="unlock-healthnote"
          aria-describedby={!archiveAlreadyExists ? "hn-unlock-explainer" : undefined}
        >
          <UnlockPadlockIcon className="hn-btn-icon" />
          Unlock My HealthNote
        </button>
        {!archiveAlreadyExists && (
          <p id="hn-unlock-explainer" className="hn-explainer">
            No local HealthNote exists on this device yet. Create one to get started.
          </p>
        )}

        <button
          type="button"
          className="hn-link-button"
          onClick={onForgotPassword}
          data-testid="forgot-password"
        >
          Forgot password?
        </button>
      </div>

      <p className="hn-main-footer">
        <DeviceTrustShieldIcon className="hn-footer-shield-icon" />
        Your health record stays on your device.
      </p>
    </div>
  );
}

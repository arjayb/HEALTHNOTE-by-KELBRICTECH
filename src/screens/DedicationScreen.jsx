import React from "react";

/** Full-bleed dedication screen with live, accessible text. */
export default function DedicationScreen({ onContinue }) {
  return (
    <div
      className="hn-dedication-screen"
      role="button"
      tabIndex={0}
      onClick={onContinue}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onContinue();
      }}
      aria-label="Tap to continue"
    >
      <div className="hn-dedication-cover">
        <img
          src={`${import.meta.env.BASE_URL}assets/healthnote_art_03_dedication_bg_v01.png`}
          alt=""
          aria-hidden="true"
          className="hn-dedication-bg"
        />

        <blockquote className="hn-dedication-text">
          Everything
          <br />
          listed here,
          <br />
          lives on —<br />
          <span className="hn-dedication-wordmark">HEALTHNOTE</span>
        </blockquote>
      </div>

      <div className="hn-dedication-footer-mark">
        <img
          src={`${import.meta.env.BASE_URL}assets/healthnote_brand_01_signature_v02.svg`}
          alt=""
          aria-hidden="true"
          className="hn-signature-mark"
        />
        <div className="hn-footer-wordmark">HEALTHNOTE</div>
        <div className="hn-footer-byline">by KELBRICTECH</div>
      </div>

      <button type="button" className="hn-tap-continue" onClick={onContinue}>
        Tap to continue
      </button>
    </div>
  );
}

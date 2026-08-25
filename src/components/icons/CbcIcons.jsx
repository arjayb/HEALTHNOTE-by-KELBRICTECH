import React from "react";

/**
 * Eight controlled CBC field icons.
 * Simplified, medically-suggestive-not-diagnostic monochrome shapes
 * inside identical circular medallions. No diagnostic
 * red/green signaling is used. Medical meaning comes from
 * the adjacent live field label, not the icon alone.
 */

const glyphProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--hn-ivory-white)",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// CBC-01 — WBC: round leukocyte with a simple lobed nucleus
function WbcGlyph() {
  return (
    <svg {...glyphProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 9c1-1.5 3-1.5 4 0s3 1.5 4 0" />
      <path d="M8 14c1.2 1 2 1 3 0s2-1 3 0 1.8 1 2.5.3" />
    </svg>
  );
}

// CBC-02 — Lymphocytes: one large round nucleus, narrow cytoplasm ring
function LymphocyteGlyph() {
  return (
    <svg {...glyphProps}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.6" fill="var(--hn-ivory-white)" stroke="none" />
    </svg>
  );
}

// CBC-03 — Monocytes: broad kidney-shaped nucleus
function MonocyteGlyph() {
  return (
    <svg {...glyphProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 8.5c3-1.5 6 .5 6 3.5s-3 5-6 3.5c2-1 2.5-2.3 2.5-3.5S11 9.5 9 8.5Z" fill="var(--hn-ivory-white)" stroke="none" />
    </svg>
  );
}

// CBC-04 — Eosinophils: bilobed nucleus + a few controlled dots (granules)
function EosinophilGlyph() {
  return (
    <svg {...glyphProps}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="10" cy="10.5" r="2" fill="var(--hn-ivory-white)" stroke="none" />
      <circle cx="14" cy="13.5" r="2" fill="var(--hn-ivory-white)" stroke="none" />
      <circle cx="8.5" cy="14.5" r="0.7" fill="var(--hn-ivory-white)" stroke="none" />
      <circle cx="15.5" cy="9.5" r="0.7" fill="var(--hn-ivory-white)" stroke="none" />
    </svg>
  );
}

// CBC-05 — Neutrophils: clear three-lobed segmented nucleus
function NeutrophilGlyph() {
  return (
    <svg {...glyphProps}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="10" cy="9.5" r="1.8" fill="var(--hn-ivory-white)" stroke="none" />
      <circle cx="14.5" cy="10" r="1.8" fill="var(--hn-ivory-white)" stroke="none" />
      <circle cx="11.5" cy="14.5" r="1.8" fill="var(--hn-ivory-white)" stroke="none" />
    </svg>
  );
}

// CBC-06 — RBC: simplified biconcave disc in slight perspective
function RbcGlyph() {
  return (
    <svg {...glyphProps}>
      <ellipse cx="12" cy="12" rx="8" ry="6" />
      <path d="M8.5 12c1-1.5 2-1.5 3.5-1.5s2.5 0 3.5 1.5c-1 1.5-2 1.5-3.5 1.5s-2.5 0-3.5-1.5Z" />
    </svg>
  );
}

// CBC-07 — Hemoglobin: clean blood-drop silhouette ("Hb" added as live HTML by the caller, not baked into the SVG)
function HemoglobinGlyph() {
  return (
    <svg {...glyphProps}>
      <circle cx="12" cy="12" r="8" />
      <path
        d="M12 6.5c2.4 3 4 5.1 4 7.3a4 4 0 0 1-8 0c0-2.2 1.6-4.3 4-7.3Z"
        fill="var(--hn-ivory-white)"
        stroke="none"
      />
    </svg>
  );
}

// CBC-08 — Hematocrit: vertical test tube with a divided blood-column fraction
function HematocritGlyph() {
  return (
    <svg {...glyphProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M10 6.5h4v11a2 2 0 0 1-4 0v-11Z" />
      <path d="M10 13h4" />
      <rect x="10.2" y="13.2" width="3.6" height="4.1" fill="var(--hn-ivory-white)" stroke="none" />
    </svg>
  );
}

const GLYPHS_BY_FIELD = {
  wbc: WbcGlyph,
  lymphocytes: LymphocyteGlyph,
  monocytes: MonocyteGlyph,
  eosinophils: EosinophilGlyph,
  neutrophils: NeutrophilGlyph,
  rbc: RbcGlyph,
  hemoglobin: HemoglobinGlyph,
  hematocrit: HematocritGlyph,
};

/**
 * Renders a CBC field's icon inside the shared circular medallion.
 * `canonicalFieldId` must match one of src/data/db.js CANONICAL_FIELDS.
 * Falls back to a plain circle (no glyph) for an unrecognized id rather
 * than throwing, so a future field addition degrades gracefully.
 */
export function CbcFieldIcon({ canonicalFieldId, size = 32 }) {
  const Glyph = GLYPHS_BY_FIELD[canonicalFieldId];
  return (
    <span
      className="hn-cbc-medallion"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {Glyph ? <Glyph /> : null}
    </span>
  );
}

export const CBC_ICON_FIELD_IDS = Object.keys(GLYPHS_BY_FIELD);

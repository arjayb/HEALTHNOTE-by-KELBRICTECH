import React from "react";

/**
 * Main-page icon trio.
 * Code-native SVG — stroke ~2px, rounded caps/joins, legible at
 * 24-32 CSS px. Color driven by `currentColor` so buttons can set it
 * via CSS (dark navy stroke on the mint primary button, pale mint
 * outline on the secondary button) without separate icon variants.
 */

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// ICON-MAIN-01 — Create leaf: two clean outlined leaves from one stem.
export function LeafIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 21c0-6 3-10 7-12-1 6-3 10-7 12Z" />
      <path d="M12 21c0-5-2.5-8.5-6-10.5C7 14 9 18 12 21Z" />
      <path d="M12 21V9" />
    </svg>
  );
}

// ICON-MAIN-02 — Unlock padlock: tall rounded shackle, rounded body.
export function UnlockPadlockIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7a4 4 0 0 1 7.2-2.4" />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ICON-MAIN-03 — Device-trust shield: thin outline, simple check.
export function DeviceTrustShieldIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

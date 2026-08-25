import React from "react";

/**
 * Main-page orbital halo.
 * "Two or three extremely fine concentric teal-blue circular arcs...
 * a sparse trail of tiny teal dots following the outer arc... a thin
 * horizontal cyan light trace crosses the center and fades at both
 * ends... may be implemented in CSS/SVG instead of generated raster
 * artwork if the result matches the reference precisely."
 *
 * Built code-native; no raster round-trip is needed for a geometric element.
 * Noninteractive, subtle, positioned behind the main hero artwork.
 */
export default function OrbitalHalo({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hn-halo-fade" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="var(--hn-mint)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--hn-mint)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hn-halo-trace" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="var(--hn-mint)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--hn-mint-soft)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--hn-mint)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Concentric fine arcs, fading outward into the navy background */}
      <circle cx="200" cy="200" r="140" fill="none" stroke="url(#hn-halo-fade)" strokeWidth="1" />
      <circle cx="200" cy="200" r="170" fill="none" stroke="var(--hn-mint)" strokeOpacity="0.12" strokeWidth="0.75" />
      <circle cx="200" cy="200" r="195" fill="none" stroke="var(--hn-mint)" strokeOpacity="0.06" strokeWidth="0.5" />

      {/* Sparse dot trail following the outer arc, right side only */}
      {[-18, 0, 20, 42, 66].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const r = 195;
        const x = 200 + r * Math.cos(rad);
        const y = 200 + r * Math.sin(rad);
        return (
          <circle
            key={deg}
            cx={x}
            cy={y}
            r={0.9 + i * 0.15}
            fill="var(--hn-mint-soft)"
            opacity={0.5 - i * 0.08}
          />
        );
      })}

      {/* Thin horizontal light trace through the center, fading at both ends */}
      <rect x="20" y="199" width="360" height="1.5" fill="url(#hn-halo-trace)" />
    </svg>
  );
}

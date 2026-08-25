import React from "react";

/**
 * Bottom-navigation icon family.
 * One coherent SVG family, 24x24 coordinate system. Color is driven
 * by `currentColor` — the consuming component (BottomNav) sets navy
 * for the active item and slate for inactive, rather
 * than shipping separate active/inactive SVGs.
 */

const baseProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// NAV-01 — Dashboard/home
export function NavHomeIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

// NAV-02 — Archive/storage box
export function NavArchiveIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="4" y="4" width="16" height="4.5" rx="1" />
      <path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5" />
      <path d="M10 12.5h4" />
    </svg>
  );
}

// NAV-03 — Camera (center action; may render inside a larger circular button by the caller)
export function NavCameraIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 8.5a1 1 0 0 1 1-1h2.2l1-1.6h7.6l1 1.6H19a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

// NAV-04 — Share/export arrow
export function NavShareIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
    </svg>
  );
}

// NAV-05 — Settings gear: circle + radial teeth, simple and robust
// rather than a single fragile hand-derived gear outline path.
export function NavSettingsIcon(props) {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 360) / 8;
    return angle;
  });
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <g>
        {teeth.map((angle) => (
          <line
            key={angle}
            x1="12"
            y1="4.2"
            x2="12"
            y2="6.4"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
      </g>
    </svg>
  );
}

export const NAV_ICONS = {
  dashboard: NavHomeIcon,
  archive: NavArchiveIcon,
  capture: NavCameraIcon,
  share: NavShareIcon,
  settings: NavSettingsIcon,
};

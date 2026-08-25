import React from "react";

/**
 * General source and action icons.
 * Same stroke family as MainIcons/NavIcons for visual consistency.
 */

const baseProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// SRC-01 — Laboratory flask
export function FlaskIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M10 3h4" />
      <path d="M10.5 3v5.5L5.8 17a2 2 0 0 0 1.7 3h9a2 2 0 0 0 1.7-3l-4.7-8.5V3" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

// SRC-02 — Camera (captured photograph)
export function SourceCameraIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 8.5a1 1 0 0 1 1-1h2.2l1-1.6h7.6l1 1.6H19a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

// SRC-03 — File/document (uploaded image/PDF)
export function FileIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

// SRC-04 — Pencil (manual entry/correction)
export function PencilIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20Z" />
      <path d="M14 7l3 3" />
    </svg>
  );
}

// SRC-05 — Clock/calendar (clinical or observed date)
export function ClockIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

// SRC-06 — Chevron right (open details)
export function ChevronRightIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

// SRC-07 — Download (export PDF)
export function DownloadIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 4v11" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 18v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

// SRC-08 — Trash (delete with confirmation)
export function TrashIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

// SRC-09 — Eye (view original source)
export function EyeIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

// SRC-10 — Filter (All / Verified-only)
export function FilterIcon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
    </svg>
  );
}

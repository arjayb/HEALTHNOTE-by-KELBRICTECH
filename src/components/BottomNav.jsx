import React from "react";
import { NAV_ICONS } from "./icons/index.js";

const NAV_ITEMS = [
  { route: "dashboard", label: "Dashboard" },
  { route: "archive", label: "Archive" },
  { route: "capture", label: "Capture" },
  { route: "share", label: "Share" },
  { route: "settings", label: "Settings" },
];

/**
 * Shared bottom navigation. Active
 * bottom-navigation item: navy icon, darker label and short underline.
 * Inactive items use slate.
 */
export default function BottomNav({ activeRoute, onNavigate }) {
  return (
    <nav className="hn-bottom-nav" aria-label="Primary">
      {NAV_ITEMS.map(({ route, label }) => {
        const Icon = NAV_ICONS[route];
        const isActive = activeRoute === route;
        const isCapture = route === "capture";
        return (
          <button
            key={route}
            type="button"
            onClick={() => onNavigate(route)}
            className={isActive ? "hn-nav-active" : ""}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={isCapture ? "hn-nav-capture-circle" : "hn-nav-icon"}>
              <Icon />
            </span>
            <span className="hn-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

"use client";

import { usePathname } from "next/navigation";

/**
 * Skip links. "Skip to content" is on every page; "Skip to selected work"
 * only where its target (#selected-work on the homepage) exists, so the
 * first Tab stops never lead nowhere.
 */
export function SkipLinks() {
  const pathname = usePathname();
  return (
    <div>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {pathname === "/" ? (
        <a href="#selected-work" className="skip-link" style={{ left: "10.5rem" }}>
          Skip to selected work
        </a>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";

/** Bare layout for build-time tooling routes (poster rendering). */
export default function ToolsLayout({ children }: { children: ReactNode }) {
  return <main id="main">{children}</main>;
}

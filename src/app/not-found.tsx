import { SkipLinks } from "@/components/layout/SkipLinks";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { NotFoundView } from "@/components/layout/NotFoundView";

/**
 * Root 404 for unmatched URLs. It renders inside the root layout only, so it
 * carries the same chrome as the site group's layout.
 */
export default function NotFound() {
  return (
    <>
      <SkipLinks />
      <SiteHeader />
      <main id="main" className="flex-1">
        <NotFoundView />
      </main>
      <SiteFooter />
    </>
  );
}

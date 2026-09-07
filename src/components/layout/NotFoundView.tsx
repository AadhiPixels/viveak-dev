import Link from "next/link";
import { nav, secondaryNav, site } from "@/content/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ArrowRight } from "@/components/ui/Icons";
import { DocumentTitle } from "./DocumentTitle";

const routes = [{ href: "/", label: "Home" }, ...nav, ...secondaryNav];

/**
 * Shared 404 content. Rendered by the site group's not-found boundary (inside
 * the normal layout) and by the root not-found page for unmatched URLs.
 */
export function NotFoundView() {
  return (
    <section
      data-chapter="not-found"
      data-theme="dark"
      aria-labelledby="page-title"
      className="bg-ink text-lumen"
    >
      <DocumentTitle title={`Page not found | ${site.name}`} />
      <div className="container-x pt-28 pb-24 md:pt-40 md:pb-32">
        <Eyebrow>404 · Not found</Eyebrow>
        <h1 id="page-title" className="t-display-l mt-6 max-w-[14ch] text-lumen">
          This route was not found.
        </h1>
        <p className="t-lead mt-8 max-w-[44ch] text-silver">
          The address may have changed, or it never existed. Every route below does.
        </p>
        <nav aria-label="Site routes" className="mt-14 max-w-3xl border-t border-line md:mt-16">
          <ul>
            {routes.map((r) => (
              <li key={r.href} className="border-b border-line">
                <Link
                  href={r.href}
                  className="group flex items-center justify-between gap-6 py-5 text-lumen transition-colors hover:text-signal md:py-6"
                >
                  <span className="t-display-s">{r.label}</span>
                  <ArrowRight
                    size={20}
                    className="shrink-0 text-silver-2 transition-[color,transform] group-hover:translate-x-1 group-hover:text-signal"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}

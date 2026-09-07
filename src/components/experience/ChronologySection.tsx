import type { ReactNode } from "react";

/**
 * One section of the chronology: the section name sits in a narrow left
 * column (sticky on desktop) and the entries read down the right.
 */
export function ChronologySection({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="border-t border-line py-14 md:py-20">
      <div className="container-x grid gap-y-8 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            <h2 id={headingId} className="t-display-s text-ink">
              {title}
            </h2>
            {aside ? <div className="mt-3">{aside}</div> : null}
          </div>
        </div>
        <div className="min-w-0 lg:col-span-8 lg:col-start-5">{children}</div>
      </div>
    </section>
  );
}

/** Bullet list with the site's accent-dash markers, tuned for the light chapter. */
export function BulletList({ items, className = "" }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`prose-site t-body text-ink/80 ${className}`}>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

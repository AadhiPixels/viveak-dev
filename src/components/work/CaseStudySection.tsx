import type { ReactNode } from "react";

/**
 * One chapter of a case study: a numbered display heading and a reading
 * column. Sections are separated by hairlines rather than boxes.
 */
export function CaseStudySection({
  id,
  index,
  title,
  children,
  wide = false,
}: {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
  /** Let the body use the full column (diagrams) instead of the 68ch measure. */
  wide?: boolean;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="border-t border-line pt-10 first:border-t-0 first:pt-0 md:pt-12"
    >
      <div className="flex items-baseline gap-4">
        <span className="mono-label text-silver-2 tabular-nums" aria-hidden="true">
          {index}
        </span>
        <h2 id={headingId} className="t-display-s text-lumen">
          {title}
        </h2>
      </div>
      <div className={`mt-6 ${wide ? "" : "max-w-[68ch]"}`}>{children}</div>
    </section>
  );
}

/** Body list with the site's accent-dash bullets. */
export function SectionList({ items }: { items: string[] }) {
  return (
    <div className="prose-site t-body text-silver">
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

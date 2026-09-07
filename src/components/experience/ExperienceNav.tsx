/** Small in-page navigation for the chronology, shown from tablet widths up. */
export function ExperienceNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav aria-label="On this page" className="hidden md:block">
      <ol className="flex flex-wrap gap-x-7 gap-y-3">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="mono-label inline-flex items-center gap-2.5 py-1.5 text-silver-2 transition-colors hover:text-lumen"
            >
              <span aria-hidden="true" className="tabular-nums text-silver-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

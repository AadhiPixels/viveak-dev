/** Small mono technology labels, kept to what the CV states. */
export function StackLabels({ items, className = "" }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label="Stack" className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => (
        <li
          key={item}
          className="mono-label rounded-full border border-line px-2.5 py-1 text-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

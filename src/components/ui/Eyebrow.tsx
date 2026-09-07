import type { ReactNode } from "react";

/** Small mono label. `index` renders the chapter number, e.g. "03". */
export function Eyebrow({
  children,
  index,
  className = "",
  as: Tag = "p",
}: {
  children: ReactNode;
  index?: string;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  return (
    <Tag className={`eyebrow flex items-center gap-3 ${className}`}>
      {index ? (
        <>
          <span className="text-fg/80">{index}</span>
          <span aria-hidden="true" className="h-px w-6 bg-line-strong" />
        </>
      ) : null}
      <span>{children}</span>
    </Tag>
  );
}

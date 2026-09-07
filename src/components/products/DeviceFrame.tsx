import type { ReactNode } from "react";

type LabelTag = "h3" | "h4" | "p";

/**
 * A quiet CSS phone: rounded rectangle, ink bezel, no notch or hardware
 * detail. From 640px up it draws the bezel; below that it collapses to a plain
 * hairline panel, which reads better on narrow screens. Height follows the
 * content (with a phone-like minimum from `sm`), so nothing inside ever needs
 * its own scrollbar and interaction is never obstructed.
 */
export function DeviceFrame({
  title,
  id,
  as: Tag = "h3",
  children,
  className = "",
}: {
  title: string;
  id: string;
  as?: LabelTag;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`flex w-full min-w-0 flex-col ${className}`}>
      <Tag id={id} className="eyebrow">
        {title}
      </Tag>
      <div className="mt-4 flex flex-1 flex-col">
        <div
          className="mx-auto flex w-full max-w-[21.25rem] flex-1 flex-col rounded-2xl border border-line bg-white sm:rounded-[2.5rem] sm:border-0 sm:bg-ink sm:p-2"
          data-device-frame=""
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-[calc(1rem-1px)] bg-white sm:min-h-[40rem] sm:rounded-[2rem]">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Companion to DeviceFrame for desktop-style views such as a back office: a plain hairline panel. */
export function PanelFrame({
  title,
  id,
  as: Tag = "h3",
  children,
  className = "",
}: {
  title: string;
  id: string;
  as?: LabelTag;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`flex w-full min-w-0 flex-col ${className}`}>
      <Tag id={id} className="eyebrow">
        {title}
      </Tag>
      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white" data-panel-frame="">
        {children}
      </div>
    </section>
  );
}

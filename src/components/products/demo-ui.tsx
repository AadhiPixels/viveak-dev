import type { CSSProperties, ReactNode } from "react";

/**
 * Small building blocks shared by the product walkthroughs and the static
 * previews. Every interface is sized in `em` below a root whose font-size
 * follows the container width, so the same screen renders crisply inside a
 * 300px phone frame and a wide back-office panel.
 *
 * `interactive={false}` renders controls as inert spans for the homepage
 * previews (which are decorative and aria-hidden by their parent).
 */

export function DemoRoot({
  children,
  className = "",
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
} & Omit<React.ComponentProps<"div">, "children" | "className" | "style">) {
  return (
    <div className={`@container flex h-full min-h-0 w-full flex-1 flex-col ${className}`} {...rest}>
      <div
        className="flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden font-sans leading-[1.4] antialiased"
        style={{ fontSize: "clamp(12px, 4.8cqw, 16px)", ...style }}
      >
        {children}
      </div>
    </div>
  );
}

type ButtonSize = "md" | "sm";

const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: "min-h-[2.75em] px-[1.1em] text-[0.9375em]",
  sm: "min-h-[2.125em] px-[0.9em] text-[0.8125em]",
};

export function DemoButton({
  children,
  onClick,
  disabled = false,
  interactive,
  size = "md",
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  interactive: boolean;
  size?: ButtonSize;
  /** Colour classes for the product's own palette. */
  className?: string;
  ariaLabel?: string;
}) {
  const classes = `inline-flex select-none items-center justify-center gap-[0.5em] rounded-full font-medium leading-none tracking-[-0.01em] transition-colors duration-150 ${BUTTON_SIZE[size]} ${className}`;
  if (!interactive) {
    return (
      <span className={`${classes} ${disabled ? "opacity-[0.66]" : ""}`} data-static-control="">
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${classes} cursor-pointer disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export function DemoChip({
  children,
  selected,
  onClick,
  interactive,
  selectedClassName,
  className = "",
}: {
  children: ReactNode;
  selected: boolean;
  onClick?: () => void;
  interactive: boolean;
  selectedClassName: string;
  className?: string;
}) {
  const classes = `inline-flex min-h-[2.125em] select-none items-center rounded-full border px-[0.85em] text-[0.8125em] font-medium leading-none transition-colors duration-150 ${
    selected ? selectedClassName : className
  }`;
  if (!interactive) {
    return <span className={classes}>{children}</span>;
  }
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`${classes} cursor-pointer`}>
      {children}
    </button>
  );
}

export function DemoPill({
  children,
  className = "",
  dot = true,
}: {
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[0.4em] rounded-full px-[0.7em] py-[0.35em] text-[0.6875em] font-semibold uppercase leading-none tracking-[0.08em] ${className}`}
    >
      {dot ? <span aria-hidden="true" className="h-[0.5em] w-[0.5em] rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/** Mono, uppercase micro label used for section titles inside the demo screens. */
export function DemoLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[0.625em] font-medium uppercase leading-none tracking-[0.14em] ${className}`}>
      {children}
    </p>
  );
}

export function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-[1em] w-[1em] ${className}`}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.6z" />
    </svg>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-[1em] w-[1em] ${className}`} aria-hidden="true" focusable="false" fill="none">
      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Simple cup glyph for the loyalty card. */
export function CupIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-[1em] w-[1em] ${className}`} aria-hidden="true" focusable="false" fill="none">
      <path
        d="M3 5.5h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4ZM11 6.5h1.25a1.75 1.75 0 0 1 0 3.5H11M4 3.5V2M7 3.5V2M10 3.5V2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Honeycomb cell used as the Fixabee sample mark. */
export function HexIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-[1em] w-[1em] ${className}`} aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M8 1.2 13.9 4.6v6.8L8 14.8 2.1 11.4V4.6L8 1.2z" />
    </svg>
  );
}

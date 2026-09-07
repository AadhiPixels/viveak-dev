import type { ReactNode } from "react";
import type { AttemptOutcome, CircuitState, DeliveryState, LogLevel, SubscriberHealth } from "@/lib/sim/types";

/**
 * Small presentational pieces shared by the lab panels. Tones map onto the
 * site's state colours: `signal` for healthy and success, `danger` for failing
 * and dead letters, `amber` for half-open, rate limiting and warnings.
 */
export type Tone = "signal" | "danger" | "amber" | "muted" | "neutral";

export function healthTone(health: SubscriberHealth): Tone {
  switch (health) {
    case "healthy":
      return "signal";
    case "failing":
      return "danger";
    case "rate-limited":
      return "amber";
    case "timeout":
      return "amber";
  }
}

export function healthLabel(health: SubscriberHealth): string {
  switch (health) {
    case "healthy":
      return "Healthy";
    case "failing":
      return "Failing · 503";
    case "rate-limited":
      return "Rate limiting · 429";
    case "timeout":
      return "Losing responses";
  }
}

export function circuitTone(state: CircuitState): Tone {
  switch (state) {
    case "closed":
      return "signal";
    case "open":
      return "danger";
    case "half-open":
      return "amber";
  }
}

export function circuitLabel(state: CircuitState): string {
  switch (state) {
    case "closed":
      return "Closed";
    case "open":
      return "Open";
    case "half-open":
      return "Half-open";
  }
}

export function deliveryTone(state: DeliveryState): Tone {
  switch (state) {
    case "delivered":
      return "signal";
    case "dead-letter":
      return "danger";
    case "retry-scheduled":
      return "amber";
    case "processing":
      return "neutral";
    case "queued":
      return "muted";
  }
}

export function deliveryLabel(state: DeliveryState): string {
  switch (state) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "retry-scheduled":
      return "Retry scheduled";
    case "delivered":
      return "Delivered";
    case "dead-letter":
      return "Dead letter";
  }
}

export function outcomeTone(outcome: AttemptOutcome): Tone {
  switch (outcome) {
    case "success":
    case "duplicate-ignored":
      return "signal";
    case "failure":
    case "timeout":
      return "danger";
    case "rate-limited":
      return "amber";
  }
}

export function outcomeLabel(outcome: AttemptOutcome): string {
  switch (outcome) {
    case "success":
      return "Success";
    case "duplicate-ignored":
      return "Duplicate ignored";
    case "failure":
      return "Failure";
    case "timeout":
      return "Timeout";
    case "rate-limited":
      return "Rate limited";
  }
}

export function levelTone(level: LogLevel): Tone {
  switch (level) {
    case "info":
      return "muted";
    case "success":
      return "signal";
    case "warn":
      return "amber";
    case "error":
      return "danger";
  }
}

const TONE_TEXT: Record<Tone, string> = {
  signal: "text-signal",
  danger: "text-danger",
  amber: "text-amber",
  muted: "text-silver-2",
  neutral: "text-lumen",
};

const TONE_BORDER: Record<Tone, string> = {
  signal: "border-signal/40",
  danger: "border-danger/40",
  amber: "border-amber/40",
  muted: "border-line",
  neutral: "border-(--line-strong)",
};

const TONE_DOT: Record<Tone, string> = {
  signal: "bg-signal",
  danger: "bg-danger",
  amber: "bg-amber",
  muted: "bg-silver-3",
  neutral: "bg-lumen",
};

export function toneText(tone: Tone): string {
  return TONE_TEXT[tone];
}

export function toneDot(tone: Tone): string {
  return TONE_DOT[tone];
}

export function Badge({
  tone = "muted",
  children,
  dot = false,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`mono-label inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 ${TONE_BORDER[tone]} ${TONE_TEXT[tone]} ${className}`}
    >
      {dot ? <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} /> : null}
      {children}
    </span>
  );
}

export function Panel({
  title,
  label,
  actions,
  children,
  className = "",
  bodyClassName = "",
  id,
  headingId,
}: {
  title: string;
  label?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  headingId?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col rounded-2xl border border-line bg-graphite ${className}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 md:px-5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 id={headingId} className="font-sans text-[0.95rem] font-medium tracking-[-0.01em] text-lumen">
            {title}
          </h3>
          {label ? <span className="mono-label text-silver-2">{label}</span> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={`min-w-0 flex-1 px-4 py-4 md:px-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="min-w-0" title={hint}>
      <dt className="eyebrow leading-tight">{label}</dt>
      <dd className={`mt-1 font-display text-[1.35rem] font-medium tabular-nums leading-none tracking-[-0.03em] ${TONE_TEXT[tone]}`}>
        {value}
      </dd>
    </div>
  );
}

/** Ghost-style small control used inside panels. */
export function SmallButton({
  children,
  onClick,
  disabled = false,
  pressed,
  className = "",
  title,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={title}
      aria-label={ariaLabel}
      className={`mono-label inline-flex min-h-8 items-center gap-1.5 rounded-full border border-(--line-strong) px-3 text-silver transition-colors hover:border-lumen hover:text-lumen disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-signal aria-pressed:text-signal ${className}`}
    >
      {children}
    </button>
  );
}

import { useMode } from "../mode";

const DAY_ITEMS = [
  "~1M events/day", "circuit breakers that actually trip", "NestJS · TypeScript",
  "AWS EventBridge → BullMQ → your endpoint", "Lambdas → EKS, no cold starts",
  "outbox pattern", "idempotency keys", "Retry-After: 30", "ETag semantics",
  "9 engineers, one standard", "Datadog or it didn't happen",
];

const NIGHT_ITEMS = [
  "thecococard.com — live", "fixabee.com — live", "thethirdcoconut.com — live",
  "Stripe Connect payouts", "consumer PWA + staff till", "cross-app Playwright E2E",
  "DoDay · ClimaGo · ShouldIGo", "GrowMeAForest 🌳", "mobile game experiments",
  "concept → production, fast", "the on-call rota is me",
];

export function Ticker() {
  const { mode } = useMode();
  const items = mode === "day" ? DAY_ITEMS : NIGHT_ITEMS;
  const row = items.map((t, i) => <span key={i}>{t} ✦</span>);
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        <span>{row}</span>
        <span>{row}</span>
      </div>
    </div>
  );
}

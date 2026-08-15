import { useMode } from "../mode";

const DAY_ITEMS = [
  "~1M events/day", "circuit breakers that actually trip", "5 playable exhibits below",
  "Lambdas → EKS, no cold starts", "EC2 → K8s for 300+ engineers",
  "LEGO.com returns: −30% support contact", "AEM components across Europe",
  "outbox pattern", "idempotency keys", "0 requests dropped", "Datadog or it didn't happen",
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

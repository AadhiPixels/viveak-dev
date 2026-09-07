import {
  COCOCARD_SAMPLE,
  businessView,
  canRecordVisit,
  canRedeem,
  describeActivity,
  formatSampleTime,
  stampsRemaining,
  type CocoCardState,
} from "@/lib/walkthroughs/cococard";
import { CupIcon, DemoButton, DemoLabel, DemoPill, DemoRoot } from "./demo-ui";

/**
 * Presentational screens for the TheCocoCard walkthrough. Both are pure
 * projections of `CocoCardState`, so the interactive walkthrough and the
 * static homepage previews render exactly the same interface.
 *
 * Palette: white app surface, espresso ink (#2b1c15), a coffee accent
 * (#8a5a3c), cream neutrals and a caramel stamp (#e8c9a0). Deliberately
 * brand-neutral: this is a sample business, not the live product's branding.
 */

export interface CocoCustomerActions {
  onRecordVisit: () => void;
  onRedeem: () => void;
}

export function CocoCustomerScreen({
  state,
  interactive,
  actions,
}: {
  state: CocoCardState;
  interactive: boolean;
  actions?: CocoCustomerActions;
}) {
  const { threshold, business, cardNumber, customer, rewardName } =
    COCOCARD_SAMPLE;
  const remaining = stampsRemaining(state);
  const ready = canRedeem(state);
  const columns = Math.min(threshold, 6);
  const progress = Math.round((state.stamps / threshold) * 100);
  const reward = rewardName.toLowerCase();
  const mine = state.activity
    .filter((entry) => entry.customer === customer)
    .slice(0, 3);

  return (
    <DemoRoot
      className="bg-white text-[#2b1c15]"
      data-screen="cococard-customer"
    >
      <header className="flex items-center justify-between px-[1.25em] pt-[1.25em]">
        <div>
          <DemoLabel className="text-[#8a5a3c]">Your cards</DemoLabel>
          <p className="mt-[0.4em] text-[1.125em] font-semibold tracking-[-0.02em]">
            Good morning, {customer}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid h-[2.25em] w-[2.25em] place-items-center rounded-full bg-[#f6f1ea] text-[0.8125em] font-semibold"
        >
          {customer.charAt(0)}
        </span>
      </header>

      {/* The margins live on a wrapper: WebKit stretches a flex item that has an aspect-ratio to the
          full container width and ignores its horizontal margins, which pushed the card off the frame. */}
      <div className="mx-[1.25em] mt-[1.25em]">
        <div className="flex aspect-[1.586] w-full flex-col justify-between rounded-[1.1em] bg-[#2b1c15] p-[1.1em] text-[#f6efe6]">
          <div className="flex items-start justify-between gap-[0.75em]">
            <div className="min-w-0">
              <p className="truncate text-[0.9375em] font-semibold tracking-[-0.01em]">
                {business}
              </p>
              <p className="mt-[0.2em] text-[0.6875em] text-[#f6efe6]/60">
                Loyalty card · No. {cardNumber}
              </p>
            </div>
            <CupIcon className="shrink-0 text-[1.25em] text-[#e8c9a0]" />
          </div>

          <div
            role="img"
            className="grid gap-[0.5em]"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
            aria-label={`${state.stamps} of ${threshold} stamps`}
            data-stamps={state.stamps}
          >
            {Array.from({ length: threshold }, (_, i) => {
              const filled = i < state.stamps;
              return (
                <span
                  key={i}
                  className={`grid aspect-square place-items-center rounded-full ${
                    filled
                      ? "bg-[#e8c9a0] text-[#2b1c15]"
                      : "border border-dashed border-[#f6efe6]/30 text-[#f6efe6]/45"
                  }`}
                >
                  {filled ? (
                    <CupIcon className="text-[1em]" />
                  ) : (
                    <span className="text-[0.6875em] font-medium">{i + 1}</span>
                  )}
                </span>
              );
            })}
          </div>

          <div className="flex items-end justify-between gap-[0.75em]">
            <p className="text-[0.8125em] font-medium tabular-nums">
              {state.stamps} of {threshold} stamps
            </p>
            <p className="text-[0.6875em] text-[#f6efe6]/60">
              {ready ? "Reward ready" : `${rewardName} at ${threshold}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-[1.25em] mt-[1em]">
        <div
          className="h-[0.375em] overflow-hidden rounded-full bg-[#f1ebe2]"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-[#8a5a3c] transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-[0.6em] text-[0.8125em] text-[#6b625b]">
          {ready
            ? `Your ${reward} is ready to redeem.`
            : `${remaining} more ${remaining === 1 ? "visit" : "visits"} for a ${reward}.`}
        </p>
      </div>

      <div className="mx-[1.25em] mt-[1.25em] grid gap-[0.6em]">
        <DemoButton
          interactive={interactive}
          onClick={actions?.onRecordVisit}
          disabled={!canRecordVisit(state)}
          className="bg-[#2b1c15] text-white hover:bg-[#3d2a20]"
          ariaLabel={`Record a visit for ${customer}`}
        >
          Record a visit
        </DemoButton>
        <DemoButton
          interactive={interactive}
          onClick={actions?.onRedeem}
          disabled={!ready}
          className={
            ready
              ? "border border-[#8a5a3c] bg-[#f6f1ea] text-[#2b1c15] hover:bg-[#efe6da]"
              : "border border-[#d9cfc3] text-[#2b1c15]"
          }
          ariaLabel={`Redeem ${reward}`}
        >
          Redeem reward
        </DemoButton>
        <p className="text-[0.6875em] leading-[1.45] text-[#6b625b]">
          {ready
            ? "Card full. Redeem to start a new card."
            : "Demo controls. They stand in for a visit recorded by the business."}
        </p>
      </div>

      <div className="mx-[1.25em] mt-[1.25em]">
        <div className="flex items-baseline justify-between">
          <DemoLabel className="text-[#6b625b]">Your activity</DemoLabel>
          <span className="text-[0.6875em] text-[#6b625b]">{business}</span>
        </div>
        <ol
          className="mt-[0.35em]"
          aria-label={`${customer}'s recent activity`}
        >
          {mine.length === 0 ? (
            <li className="py-[0.55em] text-[0.8125em] text-[#6b625b]">
              No visits yet.
            </li>
          ) : null}
          {mine.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-[0.75em] border-b border-[#ece5db] py-[0.55em] text-[0.8125em] last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-[0.6em]">
                <span className="font-mono text-[0.85em] tabular-nums text-[#6b625b]">
                  {formatSampleTime(entry.at)}
                </span>
                <span className="truncate">{describeActivity(entry)}</span>
              </span>
              <span className="shrink-0 font-mono text-[0.85em] tabular-nums text-[#6b625b]">
                {entry.kind === "reward"
                  ? "Reward"
                  : `${entry.stamps}/${threshold}`}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mx-[1.25em] mt-auto flex items-center justify-between border-t border-[#ece5db] pt-[0.9em] pb-[1.25em] text-[0.75em]">
        <span>
          Rewards redeemed{" "}
          <span className="font-semibold tabular-nums">
            {state.customerRewards}
          </span>
        </span>
        <span className="text-[#6b625b]">Sample data</span>
      </div>
    </DemoRoot>
  );
}

export function CocoBackOfficeScreen({ state }: { state: CocoCardState }) {
  const view = businessView(state);
  const kpis = [
    { label: "Visits today", value: view.visitsToday },
    { label: "Members", value: view.members },
    { label: "Rewards redeemed", value: view.rewardsRedeemed },
  ];

  return (
    <DemoRoot
      className="bg-white text-[#1b1512]"
      data-screen="cococard-backoffice"
    >
      <header className="flex items-center justify-between gap-[1em] border-b border-[#ece5db] px-[1.25em] py-[0.9em]">
        <div className="flex min-w-0 items-center gap-[0.75em]">
          <span
            className="grid h-[2em] w-[2em] shrink-0 place-items-center rounded-[0.5em] bg-[#2b1c15] text-[#e8c9a0]"
            aria-hidden="true"
          >
            <CupIcon />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.9375em] font-semibold leading-tight">
              {view.business}
            </p>
            <p className="text-[0.6875em] text-[#6b625b]">
              Back office · Overview
            </p>
          </div>
        </div>
        <p className="shrink-0 font-mono text-[0.6875em] text-[#6b625b]">
          Today
        </p>
      </header>

      <dl className="grid grid-cols-3 border-b border-[#ece5db]">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`px-[1.25em] py-[1em] ${i > 0 ? "border-l border-[#ece5db]" : ""}`}
          >
            <dt>
              <DemoLabel className="text-[#6b625b]">{kpi.label}</DemoLabel>
            </dt>
            <dd className="mt-[0.5em] font-display text-[1.75em] font-semibold leading-none tabular-nums tracking-[-0.03em]">
              {kpi.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-[1em] border-b border-[#ece5db] px-[1.25em] py-[0.8em]">
        <div>
          <DemoLabel className="text-[#6b625b]">Reward rule</DemoLabel>
          <p className="mt-[0.4em] text-[0.875em] font-medium">
            {view.rewardRule}
          </p>
        </div>
        <DemoPill dot={false} className="shrink-0 bg-[#f6f1ea] text-[#8a5a3c]">
          Illustrative
        </DemoPill>
      </div>

      <div className="flex-1 px-[1.25em] pt-[1em] pb-[0.5em]">
        <div className="flex items-baseline justify-between">
          <DemoLabel className="text-[#6b625b]">Recent activity</DemoLabel>
          <span className="text-[0.6875em] tabular-nums text-[#6b625b]">
            Last {view.activity.length}
          </span>
        </div>
        <ol className="mt-[0.35em]" aria-label="Recent activity">
          {view.activity.map((entry) => {
            const mine = entry.customer === COCOCARD_SAMPLE.customer;
            return (
              <li
                key={entry.id}
                className="grid grid-cols-[3.25em_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-[0.75em] border-b border-[#ece5db] py-[0.6em] last:border-b-0 @lg:grid-cols-[3.5em_9em_minmax(0,1fr)_auto] @lg:grid-rows-1"
              >
                <span className="row-span-2 font-mono text-[0.6875em] tabular-nums text-[#6b625b] @lg:row-span-1">
                  {formatSampleTime(entry.at)}
                </span>
                <span className="flex min-w-0 items-center gap-[0.4em] text-[0.875em] font-medium leading-tight">
                  {mine ? (
                    <span
                      aria-hidden="true"
                      className="h-[0.4em] w-[0.4em] shrink-0 rounded-full bg-[#8a5a3c]"
                    />
                  ) : null}
                  <span className="truncate">{entry.customer}</span>
                </span>
                <span className="col-start-2 row-start-2 text-[0.75em] leading-tight text-[#6b625b] @lg:col-start-3 @lg:row-start-1">
                  {describeActivity(entry)}
                </span>
                <span className="row-span-2 justify-self-end @lg:row-span-1">
                  {entry.kind === "reward" ? (
                    <DemoPill
                      dot={false}
                      className="bg-[#f6f1ea] text-[#8a5a3c]"
                    >
                      Reward
                    </DemoPill>
                  ) : (
                    <span className="font-mono text-[0.6875em] tabular-nums text-[#6b625b]">
                      {entry.stamps}/{COCOCARD_SAMPLE.threshold}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="border-t border-[#ece5db] px-[1.25em] py-[0.7em] text-[0.6875em] text-[#6b625b]">
        Sample data. Counters and activity are synthetic.
      </footer>
    </DemoRoot>
  );
}

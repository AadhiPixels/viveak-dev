"use client";

import { useId, useReducer, useRef } from "react";
import { walkthroughDisclaimer } from "@/content/products";
import {
  COCOCARD_SAMPLE,
  cococardReducer,
  createInitialState,
  describeLastAction,
  nextTimestamp,
} from "@/lib/walkthroughs/cococard";
import { Button } from "@/components/ui/Button";
import { CocoBackOfficeScreen, CocoCustomerScreen } from "./CocoCardScreens";
import { DeviceFrame, PanelFrame } from "./DeviceFrame";
import { useSettleIn } from "./useSettleIn";

/**
 * TheCocoCard walkthrough: Sam's loyalty card and the business back office,
 * driven by one reducer so every action updates both views at once.
 */
export function CocoCardWalkthrough({ className = "" }: { className?: string }) {
  const [state, dispatch] = useReducer(cococardReducer, undefined, () => createInitialState());
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useSettleIn(ref);

  const actions = {
    onRecordVisit: () => dispatch({ type: "recordVisit", at: nextTimestamp(state) }),
    onRedeem: () => dispatch({ type: "redeemReward", at: nextTimestamp(state) }),
  };

  return (
    <div ref={ref} className={`@container ${className}`} data-walkthrough="cococard">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
        <div className="max-w-[52ch]">
          <p className="eyebrow">Conceptual walkthrough · synthetic data</p>
          <p className="t-body mt-2 text-muted">
            Record visits until the card is full, redeem the {COCOCARD_SAMPLE.rewardName.toLowerCase()}, and watch the
            back office update on the same action.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="-mr-3 ml-auto" onClick={() => dispatch({ type: "reset" })}>
          Reset demo
        </Button>
      </div>

      <div className="mt-8 grid gap-10 @3xl:grid-cols-[minmax(0,21.25rem)_minmax(0,1fr)] @3xl:items-start @3xl:gap-8">
        <DeviceFrame id={`${id}-customer`} title={`Customer app · ${COCOCARD_SAMPLE.customer}'s card`}>
          <CocoCustomerScreen state={state} interactive actions={actions} />
        </DeviceFrame>
        <PanelFrame id={`${id}-business`} title={`Business back-office · ${COCOCARD_SAMPLE.business}`}>
          <CocoBackOfficeScreen state={state} />
        </PanelFrame>
      </div>

      <p className="mono-label mt-6 max-w-[80ch] text-muted">{walkthroughDisclaimer}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {describeLastAction(state)}
      </p>
    </div>
  );
}

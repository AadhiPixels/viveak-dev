"use client";

import { useId, useReducer, useRef } from "react";
import { walkthroughDisclaimer } from "@/content/products";
import {
  createInitialState,
  describeLastAction,
  fixabeeReducer,
  nextTimestamp,
  type AreaCode,
  type ServiceId,
} from "@/lib/walkthroughs/fixabee";
import { Button } from "@/components/ui/Button";
import { DeviceFrame } from "./DeviceFrame";
import { FixabeeCustomerScreen, FixabeeProviderScreen } from "./FixabeeScreens";
import { useSettleIn } from "./useSettleIn";

/**
 * Fixabee walkthrough: the customer app and the provider app side by side
 * (stacked and labelled on narrow screens), sharing one reducer so a request
 * made on the left appears on the right and the provider's decision flows
 * back to the customer's booking card.
 */
export function FixabeeWalkthrough({ className = "" }: { className?: string }) {
  const [state, dispatch] = useReducer(fixabeeReducer, undefined, () => createInitialState());
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useSettleIn(ref);

  const customerActions = {
    onSelectService: (serviceId: ServiceId) => dispatch({ type: "selectService", serviceId }),
    onSelectArea: (area: AreaCode) => dispatch({ type: "selectArea", area }),
    onRequest: (providerId: string) => dispatch({ type: "requestBooking", providerId, at: nextTimestamp(state) }),
  };
  const providerActions = {
    onAccept: (bookingId: string) => dispatch({ type: "providerAccept", bookingId, at: nextTimestamp(state) }),
    onDecline: (bookingId: string) => dispatch({ type: "providerDecline", bookingId, at: nextTimestamp(state) }),
    onComplete: (bookingId: string) => dispatch({ type: "complete", bookingId, at: nextTimestamp(state) }),
  };

  return (
    <div ref={ref} className={`@container ${className}`} data-walkthrough="fixabee">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
        <div className="max-w-[52ch]">
          <p className="eyebrow">Conceptual walkthrough · synthetic data</p>
          <p className="t-body mt-2 text-muted">
            Choose a service and postcode area, request a sample provider, then accept or decline it from the provider
            app. The customer&apos;s booking card follows the decision.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="-mr-3 ml-auto" onClick={() => dispatch({ type: "reset" })}>
          Reset demo
        </Button>
      </div>

      <div className="mx-auto mt-8 grid max-w-[46rem] gap-10 @2xl:grid-cols-2 @2xl:gap-8">
        <DeviceFrame id={`${id}-customer`} title="Customer app">
          <FixabeeCustomerScreen state={state} interactive actions={customerActions} />
        </DeviceFrame>
        <DeviceFrame id={`${id}-provider`} title="Provider app">
          <FixabeeProviderScreen state={state} interactive actions={providerActions} />
        </DeviceFrame>
      </div>

      <p className="mono-label mt-6 max-w-[80ch] text-muted">{walkthroughDisclaimer}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {describeLastAction(state)}
      </p>
    </div>
  );
}

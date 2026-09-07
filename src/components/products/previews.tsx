import { createInitialState as createCocoState } from "@/lib/walkthroughs/cococard";
import {
  createInitialState as createFixabeeState,
  fixabeeReducer,
  nextTimestamp,
} from "@/lib/walkthroughs/fixabee";
import { CocoBackOfficeScreen, CocoCustomerScreen } from "./CocoCardScreens";
import { FixabeeCustomerScreen, FixabeeProviderScreen } from "./FixabeeScreens";

/**
 * Static, non-interactive renders of the product interfaces used by the
 * homepage device compositions. They fill their parent (`h-full w-full`) and
 * scale with its width, so the same component works inside a 300 by 650 CSS
 * px phone frame and a wider back-office panel.
 *
 * Fixed states, produced by the same reducers as the /products walkthroughs:
 * - CocoCardPreview (customer): Sam's card at 4 of 6 stamps for Sample Coffee Co.
 * - CocoCardPreview view="business": the matching back office (18 visits today,
 *   146 members, 23 rewards redeemed, five recent entries).
 * - FixabeePreview (customer): plumbing in E2 with three sample providers, no booking yet.
 * - FixabeePreview view="provider": Northlock Plumbing with one incoming request.
 *
 * Everything shown is synthetic sample data; the parent composition should
 * carry the visible walkthrough disclaimer.
 */

const COCO_STATE = createCocoState();
const FIXABEE_CUSTOMER_STATE = createFixabeeState();
const FIXABEE_PROVIDER_STATE = fixabeeReducer(FIXABEE_CUSTOMER_STATE, {
  type: "requestBooking",
  providerId: "northlock",
  at: nextTimestamp(FIXABEE_CUSTOMER_STATE),
});

export function CocoCardPreview({
  className = "",
  view = "customer",
}: {
  className?: string;
  /** "customer" for a phone frame; "business" for the wider back-office panel. */
  view?: "customer" | "business";
}) {
  return (
    <div className={`h-full w-full ${className}`} aria-hidden="true" data-preview={`cococard-${view}`}>
      {view === "business" ? (
        <CocoBackOfficeScreen state={COCO_STATE} />
      ) : (
        <CocoCustomerScreen state={COCO_STATE} interactive={false} />
      )}
    </div>
  );
}

export function FixabeePreview({
  className = "",
  view = "customer",
}: {
  className?: string;
  /** "customer" shows discovery; "provider" shows the provider app with one incoming request. */
  view?: "customer" | "provider";
}) {
  return (
    <div className={`h-full w-full ${className}`} aria-hidden="true" data-preview={`fixabee-${view}`}>
      {view === "provider" ? (
        <FixabeeProviderScreen state={FIXABEE_PROVIDER_STATE} interactive={false} />
      ) : (
        <FixabeeCustomerScreen state={FIXABEE_CUSTOMER_STATE} interactive={false} />
      )}
    </div>
  );
}

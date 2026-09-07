/**
 * TheCocoCard walkthrough: a pure reducer for a synthetic loyalty card.
 *
 * Everything in this module is sample data for a conceptual portfolio
 * walkthrough. "Sample Coffee Co." is a fictional business, the six-stamp
 * rule is illustrative and not confirmed live-product behaviour, and the
 * reducer never reads a clock: every action carries its own `at` value
 * (minutes into the sample day) so the state stays deterministic and
 * unit-testable.
 */

export const COCOCARD_SAMPLE = {
  business: "Sample Coffee Co.",
  businessDescriptor: "Independent coffee shop · sample business",
  customer: "Sam",
  cardNumber: "0042",
  /** Illustrative rule: stamps needed for one reward. */
  threshold: 6,
  rewardName: "Free coffee",
  rewardRule: "6 stamps = 1 free coffee",
  /** Minutes the synthetic clock advances between demo actions. */
  stepMinutes: 7,
  /** Upper bound for the back-office activity list. */
  maxActivity: 8,
} as const;

export type ActivityKind = "visit" | "reward";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  customer: string;
  /** Minutes since midnight on the sample day. Supplied by the caller, never read from a clock. */
  at: number;
  /** Stamps on the customer's card after a visit. Absent for reward entries. */
  stamps?: number;
}

export type CocoCardLastAction = "visit" | "redeem" | "reset" | null;

export interface CocoCardState {
  /** Stamps on Sam's current card. */
  stamps: number;
  /** Rewards Sam has redeemed during the demo. */
  customerRewards: number;
  /** Business counters. Seeded with sample baselines. */
  visitsToday: number;
  members: number;
  rewardsRedeemed: number;
  /** Newest first, bounded to COCOCARD_SAMPLE.maxActivity. */
  activity: ActivityEntry[];
  /** Action counter, used for stable ids. */
  seq: number;
  /** Timestamp of the most recent entry (minutes into the sample day). */
  lastAt: number;
  lastAction: CocoCardLastAction;
}

export type CocoCardAction =
  | { type: "recordVisit"; at: number }
  | { type: "redeemReward"; at: number }
  | { type: "reset" };

export interface BusinessView {
  business: string;
  visitsToday: number;
  members: number;
  rewardsRedeemed: number;
  rewardRule: string;
  /** Newest first, at most COCOCARD_SAMPLE.maxActivity entries. */
  activity: ActivityEntry[];
}

/** Minutes into the sample day for a clock reading. */
export function sampleMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/** "09:24" for 564. Wraps past midnight so the demo can never print a negative time. */
export function formatSampleTime(at: number): string {
  const total = ((Math.round(at) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Seeded activity from other sample members plus Sam's own fourth stamp, so
 * the customer card (4 of 6) and the back-office feed agree from the start.
 */
const SEED_ACTIVITY: readonly ActivityEntry[] = [
  { id: "seed-5", kind: "visit", customer: "Sam", at: sampleMinutes(9, 24), stamps: 4 },
  { id: "seed-4", kind: "visit", customer: "Priya N.", at: sampleMinutes(9, 18), stamps: 3 },
  { id: "seed-3", kind: "reward", customer: "Jordan M.", at: sampleMinutes(9, 12) },
  { id: "seed-2", kind: "visit", customer: "Jordan M.", at: sampleMinutes(9, 11), stamps: 6 },
  { id: "seed-1", kind: "visit", customer: "Alex R.", at: sampleMinutes(8, 47), stamps: 1 },
];

const SEED_STAMPS = 4;

export function createInitialState(overrides: Partial<Pick<CocoCardState, "stamps">> = {}): CocoCardState {
  const stamps = clampStamps(overrides.stamps ?? SEED_STAMPS);
  return {
    stamps,
    customerRewards: 0,
    visitsToday: 18,
    members: 146,
    rewardsRedeemed: 23,
    activity: SEED_ACTIVITY.map((entry) => ({ ...entry })),
    seq: 0,
    lastAt: SEED_ACTIVITY[0].at,
    lastAction: null,
  };
}

function clampStamps(value: number): number {
  return Math.min(COCOCARD_SAMPLE.threshold, Math.max(0, Math.floor(value)));
}

export function canRecordVisit(state: CocoCardState): boolean {
  return state.stamps < COCOCARD_SAMPLE.threshold;
}

export function canRedeem(state: CocoCardState): boolean {
  return state.stamps >= COCOCARD_SAMPLE.threshold;
}

export function stampsRemaining(state: CocoCardState): number {
  return Math.max(0, COCOCARD_SAMPLE.threshold - state.stamps);
}

/** Next synthetic timestamp for an action, derived from state rather than a clock. */
export function nextTimestamp(state: CocoCardState): number {
  return state.lastAt + COCOCARD_SAMPLE.stepMinutes;
}

function pushActivity(activity: ActivityEntry[], entry: ActivityEntry): ActivityEntry[] {
  return [entry, ...activity].slice(0, COCOCARD_SAMPLE.maxActivity);
}

export function cococardReducer(state: CocoCardState, action: CocoCardAction): CocoCardState {
  switch (action.type) {
    case "recordVisit": {
      if (!canRecordVisit(state)) return state;
      const stamps = state.stamps + 1;
      const seq = state.seq + 1;
      return {
        ...state,
        stamps,
        visitsToday: state.visitsToday + 1,
        activity: pushActivity(state.activity, {
          id: `a${seq}`,
          kind: "visit",
          customer: COCOCARD_SAMPLE.customer,
          at: action.at,
          stamps,
        }),
        seq,
        lastAt: action.at,
        lastAction: "visit",
      };
    }
    case "redeemReward": {
      if (!canRedeem(state)) return state;
      const seq = state.seq + 1;
      return {
        ...state,
        stamps: 0,
        customerRewards: state.customerRewards + 1,
        rewardsRedeemed: state.rewardsRedeemed + 1,
        activity: pushActivity(state.activity, {
          id: `a${seq}`,
          kind: "reward",
          customer: COCOCARD_SAMPLE.customer,
          at: action.at,
        }),
        seq,
        lastAt: action.at,
        lastAction: "redeem",
      };
    }
    case "reset":
      return { ...createInitialState(), lastAction: "reset" };
    default:
      return state;
  }
}

/** The business back-office projection of the same state. */
export function businessView(state: CocoCardState): BusinessView {
  return {
    business: COCOCARD_SAMPLE.business,
    visitsToday: state.visitsToday,
    members: state.members,
    rewardsRedeemed: state.rewardsRedeemed,
    rewardRule: COCOCARD_SAMPLE.rewardRule,
    activity: state.activity.slice(0, COCOCARD_SAMPLE.maxActivity),
  };
}

export function describeActivity(entry: ActivityEntry): string {
  return entry.kind === "reward" ? `${COCOCARD_SAMPLE.rewardName} redeemed` : "Visit recorded";
}

/** Short, meaningful status line for assistive technology after a state change. */
export function describeLastAction(state: CocoCardState): string {
  switch (state.lastAction) {
    case "visit":
      return canRedeem(state)
        ? `Visit recorded. Card full at ${state.stamps} of ${COCOCARD_SAMPLE.threshold} stamps. Reward ready to redeem.`
        : `Visit recorded. ${state.stamps} of ${COCOCARD_SAMPLE.threshold} stamps.`;
    case "redeem":
      return `${COCOCARD_SAMPLE.rewardName} redeemed. Card reset to 0 stamps.`;
    case "reset":
      return "Demo reset to its starting state.";
    default:
      return "";
  }
}

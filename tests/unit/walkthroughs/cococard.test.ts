import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COCOCARD_SAMPLE,
  businessView,
  canRecordVisit,
  canRedeem,
  cococardReducer,
  createInitialState,
  describeActivity,
  describeLastAction,
  formatSampleTime,
  nextTimestamp,
  sampleMinutes,
  stampsRemaining,
  type CocoCardAction,
  type CocoCardState,
} from "@/lib/walkthroughs/cococard";

const { threshold, maxActivity } = COCOCARD_SAMPLE;

function run(actions: CocoCardAction[], initial: CocoCardState = createInitialState()): CocoCardState {
  return actions.reduce(cococardReducer, initial);
}

/** Visits with a synthetic clock derived from state, the way the UI drives it. */
function visit(state: CocoCardState): CocoCardState {
  return cococardReducer(state, { type: "recordVisit", at: nextTimestamp(state) });
}

function redeem(state: CocoCardState): CocoCardState {
  return cococardReducer(state, { type: "redeemReward", at: nextTimestamp(state) });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cococard walkthrough", () => {
  it("starts with a partly stamped card that agrees with the back-office feed", () => {
    const state = createInitialState();
    expect(state.stamps).toBe(4);
    expect(state.customerRewards).toBe(0);
    expect(canRecordVisit(state)).toBe(true);
    expect(canRedeem(state)).toBe(false);
    expect(stampsRemaining(state)).toBe(threshold - 4);

    const view = businessView(state);
    expect(view.business).toBe(COCOCARD_SAMPLE.business);
    expect(view.rewardRule).toBe(COCOCARD_SAMPLE.rewardRule);
    expect(view.activity[0]).toMatchObject({ customer: "Sam", kind: "visit", stamps: 4 });
    expect(view.activity.length).toBeLessThanOrEqual(maxActivity);
  });

  it("stamps the card up to the threshold and then refuses further visits until redeemed", () => {
    let state = createInitialState({ stamps: 0 });
    const baselineVisits = state.visitsToday;

    for (let i = 1; i <= threshold; i++) {
      state = visit(state);
      expect(state.stamps).toBe(i);
      expect(state.visitsToday).toBe(baselineVisits + i);
      expect(businessView(state).activity[0]).toMatchObject({ customer: "Sam", kind: "visit", stamps: i });
    }

    expect(canRedeem(state)).toBe(true);
    expect(canRecordVisit(state)).toBe(false);
    expect(stampsRemaining(state)).toBe(0);
    expect(describeLastAction(state)).toContain("Reward ready");

    const full = state;
    const again = visit(full);
    expect(again).toBe(full);
  });

  it("only redeems at the threshold, then resets the card and counts the reward on both sides", () => {
    const partial = createInitialState({ stamps: 2 });
    expect(redeem(partial)).toBe(partial);

    const full = createInitialState({ stamps: threshold });
    const redeemed = redeem(full);
    expect(redeemed.stamps).toBe(0);
    expect(redeemed.customerRewards).toBe(full.customerRewards + 1);
    expect(redeemed.rewardsRedeemed).toBe(full.rewardsRedeemed + 1);
    expect(redeemed.visitsToday).toBe(full.visitsToday);
    expect(canRecordVisit(redeemed)).toBe(true);

    const [latest] = businessView(redeemed).activity;
    expect(latest).toMatchObject({ customer: "Sam", kind: "reward" });
    expect(latest.stamps).toBeUndefined();
    expect(describeActivity(latest)).toBe("Free coffee redeemed");
    expect(describeLastAction(redeemed)).toContain("redeemed");
  });

  it("keeps the customer card and the business view in step through a full cycle", () => {
    let state = createInitialState();
    const startVisits = state.visitsToday;
    const startRewards = state.rewardsRedeemed;
    const toFull = threshold - state.stamps;

    for (let i = 0; i < toFull; i++) state = visit(state);
    state = redeem(state);
    state = visit(state);

    expect(state.stamps).toBe(1);
    expect(state.customerRewards).toBe(1);
    const view = businessView(state);
    expect(view.visitsToday).toBe(startVisits + toFull + 1);
    expect(view.rewardsRedeemed).toBe(startRewards + 1);
    expect(view.members).toBe(createInitialState().members);
    expect(view.activity.map((a) => a.kind).slice(0, 2)).toEqual(["visit", "reward"]);
  });

  it("bounds recent activity to eight entries, newest first, with unique ids", () => {
    let state = createInitialState({ stamps: 0 });
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < threshold; i++) state = visit(state);
      state = redeem(state);
    }
    const { activity } = businessView(state);
    expect(activity).toHaveLength(maxActivity);
    expect(new Set(activity.map((a) => a.id)).size).toBe(maxActivity);
    for (let i = 1; i < activity.length; i++) {
      expect(activity[i - 1].at).toBeGreaterThanOrEqual(activity[i].at);
    }
    expect(activity[0].kind).toBe("reward");
  });

  it("resets to the starting state", () => {
    const state = run([
      { type: "recordVisit", at: 600 },
      { type: "recordVisit", at: 607 },
      { type: "redeemReward", at: 614 },
    ]);
    const reset = cococardReducer(state, { type: "reset" });
    expect(reset).toEqual({ ...createInitialState(), lastAction: "reset" });
    expect(describeLastAction(reset)).toBe("Demo reset to its starting state.");
  });

  it("is deterministic and never reads the clock", () => {
    const now = vi.spyOn(Date, "now");
    const actions: CocoCardAction[] = [
      { type: "recordVisit", at: 600 },
      { type: "recordVisit", at: 607 },
      { type: "redeemReward", at: 614 },
      { type: "recordVisit", at: 621 },
    ];
    const a = run(actions);
    const b = run(actions);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(now).not.toHaveBeenCalled();
    // Inputs are not mutated.
    const initial = createInitialState();
    const snapshot = structuredClone(initial);
    run(actions, initial);
    expect(initial).toEqual(snapshot);
  });

  it("formats synthetic clock readings and advances them from state", () => {
    expect(formatSampleTime(sampleMinutes(9, 24))).toBe("09:24");
    expect(formatSampleTime(0)).toBe("00:00");
    expect(formatSampleTime(1440 + 5)).toBe("00:05");
    const state = createInitialState();
    const next = nextTimestamp(state);
    expect(next).toBe(state.lastAt + COCOCARD_SAMPLE.stepMinutes);
    const after = cococardReducer(state, { type: "recordVisit", at: next });
    expect(after.lastAt).toBe(next);
    expect(nextTimestamp(after)).toBeGreaterThan(next);
  });
});

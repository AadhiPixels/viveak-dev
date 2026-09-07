import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AREAS,
  FIXABEE_SAMPLE,
  PROVIDERS,
  SERVICES,
  activeProvider,
  canRequest,
  createInitialState,
  customerStatus,
  describeLastAction,
  fixabeeReducer,
  formatSampleTime,
  incomingRequests,
  latestCustomerBooking,
  matchProviders,
  matchingProviders,
  nextTimestamp,
  providerSchedule,
  type FixabeeAction,
  type FixabeeState,
} from "@/lib/walkthroughs/fixabee";

function run(actions: FixabeeAction[], initial: FixabeeState = createInitialState()): FixabeeState {
  return actions.reduce(fixabeeReducer, initial);
}

function request(state: FixabeeState, providerId: string): FixabeeState {
  return fixabeeReducer(state, { type: "requestBooking", providerId, at: nextTimestamp(state) });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fixabee sample data", () => {
  it("offers a provider for every service in every postcode area, best rated first", () => {
    for (const service of SERVICES) {
      for (const area of AREAS) {
        const matches = matchProviders(service.id, area.code);
        expect(matches.length, `${service.id} in ${area.code}`).toBeGreaterThan(0);
        expect(matches.length).toBeLessThanOrEqual(FIXABEE_SAMPLE.maxMatches);
        for (const p of matches) {
          expect(p.services).toContain(service.id);
          expect(p.areas).toContain(area.code);
        }
        for (let i = 1; i < matches.length; i++) {
          expect(matches[i - 1].rating).toBeGreaterThanOrEqual(matches[i].rating);
        }
      }
    }
  });

  it("keeps provider ids unique and ratings inside a five star scale", () => {
    expect(new Set(PROVIDERS.map((p) => p.id)).size).toBe(PROVIDERS.length);
    for (const p of PROVIDERS) {
      expect(p.rating).toBeGreaterThan(0);
      expect(p.rating).toBeLessThanOrEqual(5);
      expect(p.reviewCount).toBeGreaterThan(0);
    }
  });
});

describe("fixabee walkthrough", () => {
  it("starts on a service and area with matches and a seeded job on the provider schedule", () => {
    const state = createInitialState();
    expect(state.serviceId).toBe("plumbing");
    expect(state.area).toBe("E2");
    expect(matchingProviders(state).map((p) => p.id)).toEqual(["northlock", "copperline", "tapwright"]);
    expect(latestCustomerBooking(state)).toBeNull();
    expect(incomingRequests(state)).toEqual([]);
    expect(providerSchedule(state)).toHaveLength(1);
    expect(activeProvider(state).id).toBe("northlock");
  });

  it("updates matches when the service or area changes", () => {
    let state = fixabeeReducer(createInitialState(), { type: "selectService", serviceId: "gardening" });
    expect(state.lastAction).toBe("select");
    expect(matchingProviders(state).every((p) => p.services.includes("gardening"))).toBe(true);
    state = fixabeeReducer(state, { type: "selectArea", area: "SW4" });
    expect(matchingProviders(state).map((p) => p.id)).toEqual(["greenmoss", "hedgerow"]);
    // Re-selecting the current values is a no-op.
    expect(fixabeeReducer(state, { type: "selectArea", area: "SW4" })).toBe(state);
    expect(fixabeeReducer(state, { type: "selectService", serviceId: "gardening" })).toBe(state);
  });

  it("creates a requested booking that the provider view can see", () => {
    const initial = createInitialState();
    const state = request(initial, "northlock");
    const booking = latestCustomerBooking(state);
    expect(booking).toMatchObject({
      customer: FIXABEE_SAMPLE.customer,
      serviceId: "plumbing",
      area: "E2",
      providerId: "northlock",
      status: "requested",
      slot: FIXABEE_SAMPLE.slot,
    });
    expect(incomingRequests(state)).toEqual([booking]);
    expect(customerStatus(booking!)).toMatchObject({ label: "Requested" });
    expect(describeLastAction(state)).toContain("Northlock Plumbing");
    expect(activeProvider(state).id).toBe("northlock");
  });

  it("refuses requests to providers that do not match the selection, and duplicate open requests", () => {
    const initial = createInitialState();
    // Greenmoss does not do plumbing in E2.
    expect(canRequest(initial, "greenmoss")).toBe(false);
    expect(request(initial, "greenmoss")).toBe(initial);
    expect(request(initial, "does-not-exist")).toBe(initial);

    const once = request(initial, "northlock");
    expect(canRequest(once, "northlock")).toBe(false);
    expect(request(once, "northlock")).toBe(once);
    // A different provider is still available.
    expect(canRequest(once, "copperline")).toBe(true);
  });

  it("moves a request to accepted and updates the customer status and schedule", () => {
    const requested = request(createInitialState(), "northlock");
    const id = latestCustomerBooking(requested)!.id;
    const at = nextTimestamp(requested);
    const accepted = fixabeeReducer(requested, { type: "providerAccept", bookingId: id, at });

    const booking = latestCustomerBooking(accepted)!;
    expect(booking.status).toBe("accepted");
    expect(booking.updatedAt).toBe(at);
    expect(customerStatus(booking).label).toBe("Accepted");
    expect(customerStatus(booking).detail).toContain("Northlock Plumbing");
    expect(incomingRequests(accepted)).toEqual([]);
    expect(providerSchedule(accepted)[0].id).toBe(id);
    expect(describeLastAction(accepted)).toContain("accepted");

    // Accepting again, or completing something not accepted, changes nothing.
    expect(fixabeeReducer(accepted, { type: "providerAccept", bookingId: id, at: at + 5 })).toBe(accepted);
    expect(fixabeeReducer(requested, { type: "complete", bookingId: id, at: at + 5 })).toBe(requested);

    const completed = fixabeeReducer(accepted, { type: "complete", bookingId: id, at: at + 5 });
    expect(latestCustomerBooking(completed)!.status).toBe("completed");
    expect(customerStatus(latestCustomerBooking(completed)!).label).toBe("Completed");
  });

  it("supports the decline path and lets the customer try another provider", () => {
    const requested = request(createInitialState(), "northlock");
    const id = latestCustomerBooking(requested)!.id;
    const declined = fixabeeReducer(requested, { type: "providerDecline", bookingId: id, at: nextTimestamp(requested) });

    expect(latestCustomerBooking(declined)!.status).toBe("declined");
    expect(customerStatus(latestCustomerBooking(declined)!).label).toBe("Declined");
    expect(incomingRequests(declined)).toEqual([]);
    expect(providerSchedule(declined).map((b) => b.id)).not.toContain(id);
    expect(describeLastAction(declined)).toContain("declined");

    const retry = request(declined, "copperline");
    expect(latestCustomerBooking(retry)).toMatchObject({ providerId: "copperline", status: "requested" });
    expect(activeProvider(retry).id).toBe("copperline");
    expect(incomingRequests(retry)).toHaveLength(1);
    // Unknown booking ids are ignored.
    expect(fixabeeReducer(retry, { type: "providerAccept", bookingId: "nope", at: 700 })).toBe(retry);
  });

  it("bounds the booking list and orders incoming requests oldest first", () => {
    let state = createInitialState();
    const providers = ["northlock", "copperline", "tapwright"];
    for (let round = 0; round < 3; round++) {
      for (const id of providers) {
        state = request(state, id);
        const bookingId = latestCustomerBooking(state)!.id;
        if (round < 2) {
          state = fixabeeReducer(state, { type: "providerDecline", bookingId, at: nextTimestamp(state) });
        }
      }
    }
    expect(state.bookings.length).toBeLessThanOrEqual(FIXABEE_SAMPLE.maxBookings);
    const incoming = incomingRequests(state);
    expect(incoming.map((b) => b.providerId)).toEqual(providers);
    for (let i = 1; i < incoming.length; i++) {
      expect(incoming[i - 1].requestedAt).toBeLessThanOrEqual(incoming[i].requestedAt);
    }
  });

  it("resets to the starting state", () => {
    const state = run([
      { type: "selectService", serviceId: "cleaning" },
      { type: "selectArea", area: "N1" },
      { type: "requestBooking", providerId: "marlow", at: 610 },
    ]);
    expect(latestCustomerBooking(state)).not.toBeNull();
    const reset = fixabeeReducer(state, { type: "reset" });
    expect(reset).toEqual({ ...createInitialState(), lastAction: "reset" });
    expect(describeLastAction(reset)).toBe("Demo reset to its starting state.");
  });

  it("is deterministic and never reads the clock", () => {
    const now = vi.spyOn(Date, "now");
    const actions: FixabeeAction[] = [
      { type: "selectService", serviceId: "electrical" },
      { type: "selectArea", area: "SE1" },
      { type: "requestBooking", providerId: "amperelane", at: 607 },
      { type: "providerAccept", bookingId: "bk1", at: 612 },
      { type: "complete", bookingId: "bk1", at: 617 },
    ];
    const a = run(actions);
    const b = run(actions);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(latestCustomerBooking(a)!.status).toBe("completed");
    expect(now).not.toHaveBeenCalled();

    const initial = createInitialState();
    const snapshot = structuredClone(initial);
    run(actions, initial);
    expect(initial).toEqual(snapshot);
    expect(formatSampleTime(607)).toBe("10:07");
  });
});

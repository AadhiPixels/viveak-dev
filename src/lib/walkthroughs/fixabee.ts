/**
 * Fixabee walkthrough: a pure reducer for a synthetic bookings flow.
 *
 * Services, price bands, postcode areas, providers, ratings and the referral
 * code are all sample data for a conceptual portfolio walkthrough. None of it
 * is live-product data, nothing here creates real bookings, and there are no
 * payments: provider onboarding and Stripe payouts are features of the live
 * product that the interface only describes in text. The reducer never reads
 * a clock; every timed action carries its own `at` value (minutes into the
 * sample day).
 */

export type ServiceId = "cleaning" | "plumbing" | "electrical" | "gardening" | "handyman";
export type AreaCode = "E2" | "SE1" | "N1" | "SW4";
export type BookingStatus = "requested" | "accepted" | "declined" | "completed";
export type FixabeeLastAction = "select" | "request" | "accept" | "decline" | "complete" | "reset" | null;

export interface Service {
  id: ServiceId;
  name: string;
  /** Illustrative price band, not a live-product price. */
  priceBand: string;
}

export interface Area {
  code: AreaCode;
  /** Postcode district name, for readability. */
  name: string;
}

export interface Provider {
  id: string;
  /** Fictional business name. */
  name: string;
  services: ServiceId[];
  areas: AreaCode[];
  /** Sample rating out of 5. */
  rating: number;
  reviewCount: number;
  responseTime: string;
  fromPrice: string;
}

export interface Booking {
  id: string;
  customer: string;
  serviceId: ServiceId;
  area: AreaCode;
  providerId: string;
  status: BookingStatus;
  slot: string;
  requestedAt: number;
  updatedAt: number;
}

export interface FixabeeState {
  serviceId: ServiceId;
  area: AreaCode;
  /** Newest first, bounded to FIXABEE_SAMPLE.maxBookings. Includes seeded jobs for other sample customers. */
  bookings: Booking[];
  seq: number;
  lastAt: number;
  lastAction: FixabeeLastAction;
  /** Booking touched by the most recent request, accept, decline or complete action. */
  lastBookingId: string | null;
}

export type FixabeeAction =
  | { type: "selectService"; serviceId: ServiceId }
  | { type: "selectArea"; area: AreaCode }
  | { type: "requestBooking"; providerId: string; at: number }
  | { type: "providerAccept"; bookingId: string; at: number }
  | { type: "providerDecline"; bookingId: string; at: number }
  | { type: "complete"; bookingId: string; at: number }
  | { type: "reset" };

export const FIXABEE_SAMPLE = {
  customer: "Sam",
  /** Static synthetic referral code shown in the customer view. */
  referralCode: "SAM-4F2K",
  referralNote: "Sample referral code. Referrals are a live-product feature; no credit is issued here.",
  slot: "Tomorrow, 09:00 to 11:00",
  stepMinutes: 5,
  maxBookings: 6,
  maxMatches: 3,
} as const;

export const SERVICES: readonly Service[] = [
  { id: "cleaning", name: "Cleaning", priceBand: "£18 to £26 per hour" },
  { id: "plumbing", name: "Plumbing", priceBand: "£60 to £95 call-out" },
  { id: "electrical", name: "Electrical", priceBand: "£65 to £110 call-out" },
  { id: "gardening", name: "Gardening", priceBand: "£25 to £40 per hour" },
  { id: "handyman", name: "Handyman", priceBand: "£30 to £45 per hour" },
];

export const AREAS: readonly Area[] = [
  { code: "E2", name: "Bethnal Green" },
  { code: "SE1", name: "Southwark" },
  { code: "N1", name: "Islington" },
  { code: "SW4", name: "Clapham" },
];

/** Fixed roster of fictional providers. Ratings and review counts are sample data. */
export const PROVIDERS: readonly Provider[] = [
  {
    id: "northlock",
    name: "Northlock Plumbing",
    services: ["plumbing"],
    areas: ["E2", "N1", "SE1"],
    rating: 4.9,
    reviewCount: 211,
    responseTime: "Replies in about 1 hour",
    fromPrice: "From £65",
  },
  {
    id: "copperline",
    name: "Copperline Plumbing & Heating",
    services: ["plumbing"],
    areas: ["E2", "SE1", "SW4"],
    rating: 4.7,
    reviewCount: 89,
    responseTime: "Replies in about 2 hours",
    fromPrice: "From £60",
  },
  {
    id: "tapwright",
    name: "Tapwright & Sons",
    services: ["plumbing", "handyman"],
    areas: ["E2", "N1", "SW4"],
    rating: 4.6,
    reviewCount: 54,
    responseTime: "Replies same day",
    fromPrice: "From £70",
  },
  {
    id: "marlow",
    name: "Marlow & Finch Cleaning",
    services: ["cleaning"],
    areas: ["E2", "N1", "SE1"],
    rating: 4.9,
    reviewCount: 128,
    responseTime: "Replies in about 1 hour",
    fromPrice: "From £20 per hour",
  },
  {
    id: "tidewell",
    name: "Tidewell Home Services",
    services: ["cleaning", "handyman"],
    areas: ["SE1", "SW4", "N1"],
    rating: 4.7,
    reviewCount: 64,
    responseTime: "Replies in about 3 hours",
    fromPrice: "From £22 per hour",
  },
  {
    id: "lintwell",
    name: "Lintwell Cleaning Co.",
    services: ["cleaning"],
    areas: ["E2", "SW4"],
    rating: 4.8,
    reviewCount: 77,
    responseTime: "Replies in about 2 hours",
    fromPrice: "From £18 per hour",
  },
  {
    id: "amperelane",
    name: "Ampere Lane Electrical",
    services: ["electrical"],
    areas: ["E2", "N1", "SE1", "SW4"],
    rating: 4.9,
    reviewCount: 157,
    responseTime: "Replies in about 1 hour",
    fromPrice: "From £70",
  },
  {
    id: "voltmere",
    name: "Voltmere Electrical",
    services: ["electrical", "handyman"],
    areas: ["E2", "SE1"],
    rating: 4.7,
    reviewCount: 42,
    responseTime: "Replies same day",
    fromPrice: "From £65",
  },
  {
    id: "greenmoss",
    name: "Greenmoss Gardens",
    services: ["gardening"],
    areas: ["SW4", "SE1", "N1"],
    rating: 4.8,
    reviewCount: 73,
    responseTime: "Replies in about 2 hours",
    fromPrice: "From £28 per hour",
  },
  {
    id: "hedgerow",
    name: "Hedgerow & Hoe",
    services: ["gardening"],
    areas: ["E2", "N1", "SW4"],
    rating: 4.6,
    reviewCount: 38,
    responseTime: "Replies same day",
    fromPrice: "From £25 per hour",
  },
  {
    id: "kestrel",
    name: "Kestrel Handyman Services",
    services: ["handyman"],
    areas: ["E2", "N1", "SE1", "SW4"],
    rating: 4.8,
    reviewCount: 96,
    responseTime: "Replies in about 1 hour",
    fromPrice: "From £32 per hour",
  },
];

export function sampleMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export function formatSampleTime(at: number): string {
  const total = ((Math.round(at) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function serviceById(id: ServiceId): Service {
  const found = SERVICES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown sample service: ${id}`);
  return found;
}

export function areaByCode(code: AreaCode): Area {
  const found = AREAS.find((a) => a.code === code);
  if (!found) throw new Error(`Unknown sample area: ${code}`);
  return found;
}

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** A job already on the default provider's schedule, so the provider view is not empty at the start. */
const SEED_BOOKINGS: readonly Booking[] = [
  {
    id: "seed-1",
    customer: "Chris D.",
    serviceId: "plumbing",
    area: "N1",
    providerId: "northlock",
    status: "accepted",
    slot: "Today, 14:00 to 16:00",
    requestedAt: sampleMinutes(8, 15),
    updatedAt: sampleMinutes(8, 31),
  },
];

export function createInitialState(): FixabeeState {
  return {
    serviceId: "plumbing",
    area: "E2",
    bookings: SEED_BOOKINGS.map((b) => ({ ...b })),
    seq: 0,
    lastAt: sampleMinutes(10, 2),
    lastAction: null,
    lastBookingId: null,
  };
}

export function nextTimestamp(state: FixabeeState): number {
  return state.lastAt + FIXABEE_SAMPLE.stepMinutes;
}

/** Providers covering the service in the area, best rated first, bounded to maxMatches. */
export function matchProviders(serviceId: ServiceId, area: AreaCode): Provider[] {
  return PROVIDERS.filter((p) => p.services.includes(serviceId) && p.areas.includes(area))
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name))
    .slice(0, FIXABEE_SAMPLE.maxMatches);
}

export function matchingProviders(state: FixabeeState): Provider[] {
  return matchProviders(state.serviceId, state.area);
}

/** Bookings made by the walkthrough customer, newest first. */
export function customerBookings(state: FixabeeState): Booking[] {
  return state.bookings.filter((b) => b.customer === FIXABEE_SAMPLE.customer);
}

export function latestCustomerBooking(state: FixabeeState): Booking | null {
  return customerBookings(state)[0] ?? null;
}

/** Requests waiting for a provider decision, oldest first so the queue reads top to bottom. */
export function incomingRequests(state: FixabeeState): Booking[] {
  return state.bookings.filter((b) => b.status === "requested").slice().reverse();
}

/** Accepted and completed jobs, most recently updated first. */
export function providerSchedule(state: FixabeeState): Booking[] {
  return state.bookings
    .filter((b) => b.status === "accepted" || b.status === "completed")
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * The provider whose app the walkthrough shows: the provider of Sam's most
 * recent booking, otherwise the best match for the current selection.
 */
export function activeProvider(state: FixabeeState): Provider {
  const latest = latestCustomerBooking(state);
  const fromBooking = latest ? providerById(latest.providerId) : undefined;
  if (fromBooking) return fromBooking;
  const match = matchingProviders(state)[0];
  return match ?? PROVIDERS[0];
}

export function hasOpenRequest(state: FixabeeState, providerId: string): boolean {
  return state.bookings.some(
    (b) => b.status === "requested" && b.providerId === providerId && b.customer === FIXABEE_SAMPLE.customer,
  );
}

export function canRequest(state: FixabeeState, providerId: string): boolean {
  const provider = providerById(providerId);
  if (!provider) return false;
  const matches = provider.services.includes(state.serviceId) && provider.areas.includes(state.area);
  return matches && !hasOpenRequest(state, providerId);
}

function updateBooking(
  state: FixabeeState,
  bookingId: string,
  from: BookingStatus,
  to: BookingStatus,
  at: number,
  lastAction: FixabeeLastAction,
): FixabeeState {
  const index = state.bookings.findIndex((b) => b.id === bookingId);
  if (index === -1 || state.bookings[index].status !== from) return state;
  const bookings = state.bookings.slice();
  bookings[index] = { ...bookings[index], status: to, updatedAt: at };
  return { ...state, bookings, seq: state.seq + 1, lastAt: at, lastAction, lastBookingId: bookingId };
}

export function fixabeeReducer(state: FixabeeState, action: FixabeeAction): FixabeeState {
  switch (action.type) {
    case "selectService":
      if (action.serviceId === state.serviceId) return state;
      return { ...state, serviceId: action.serviceId, lastAction: "select" };
    case "selectArea":
      if (action.area === state.area) return state;
      return { ...state, area: action.area, lastAction: "select" };
    case "requestBooking": {
      if (!canRequest(state, action.providerId)) return state;
      const seq = state.seq + 1;
      const booking: Booking = {
        id: `bk${seq}`,
        customer: FIXABEE_SAMPLE.customer,
        serviceId: state.serviceId,
        area: state.area,
        providerId: action.providerId,
        status: "requested",
        slot: FIXABEE_SAMPLE.slot,
        requestedAt: action.at,
        updatedAt: action.at,
      };
      return {
        ...state,
        bookings: [booking, ...state.bookings].slice(0, FIXABEE_SAMPLE.maxBookings),
        seq,
        lastAt: action.at,
        lastAction: "request",
        lastBookingId: booking.id,
      };
    }
    case "providerAccept":
      return updateBooking(state, action.bookingId, "requested", "accepted", action.at, "accept");
    case "providerDecline":
      return updateBooking(state, action.bookingId, "requested", "declined", action.at, "decline");
    case "complete":
      return updateBooking(state, action.bookingId, "accepted", "completed", action.at, "complete");
    case "reset":
      return { ...createInitialState(), lastAction: "reset" };
    default:
      return state;
  }
}

export interface CustomerStatus {
  label: string;
  detail: string;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
};

/** What the customer sees on their booking card for a given booking. */
export function customerStatus(booking: Booking): CustomerStatus {
  const provider = providerById(booking.providerId)?.name ?? "the provider";
  const label = STATUS_LABEL[booking.status];
  switch (booking.status) {
    case "requested":
      return { label, detail: `Waiting for ${provider} to confirm.` };
    case "accepted":
      return { label, detail: `${provider} is booked for ${booking.slot.toLowerCase()}.` };
    case "declined":
      return { label, detail: `${provider} cannot take this one. Try another provider.` };
    case "completed":
      return { label, detail: `Job done by ${provider}. A rating request would follow here.` };
  }
}

/** Short status line for assistive technology after a state change. */
export function describeLastAction(state: FixabeeState): string {
  const booking = state.lastBookingId ? state.bookings.find((b) => b.id === state.lastBookingId) : undefined;
  const provider = booking ? (providerById(booking.providerId)?.name ?? "the provider") : "the provider";
  const serviceName = booking ? serviceById(booking.serviceId).name : "";
  const service = serviceName.toLowerCase();
  switch (state.lastAction) {
    case "request":
      return booking ? `${serviceName} booking requested with ${provider}. Waiting for the provider.` : "";
    case "accept":
      return `${provider} accepted the ${service} request. Customer status is now accepted.`;
    case "decline":
      return `${provider} declined the ${service} request. Customer status is now declined.`;
    case "complete":
      return `${provider} marked the ${service} job complete.`;
    case "reset":
      return "Demo reset to its starting state.";
    default:
      return "";
  }
}

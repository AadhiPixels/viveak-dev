import {
  AREAS,
  FIXABEE_SAMPLE,
  SERVICES,
  STATUS_LABEL,
  activeProvider,
  areaByCode,
  canRequest,
  customerStatus,
  formatSampleTime,
  hasOpenRequest,
  incomingRequests,
  latestCustomerBooking,
  matchingProviders,
  providerById,
  providerSchedule,
  serviceById,
  type AreaCode,
  type BookingStatus,
  type FixabeeState,
  type ServiceId,
} from "@/lib/walkthroughs/fixabee";
import { DemoButton, DemoChip, DemoLabel, DemoPill, DemoRoot, HexIcon, StarIcon } from "./demo-ui";

/**
 * Presentational screens for the Fixabee walkthrough: the customer app
 * (discovery, request, booking status) and the provider app (incoming
 * requests, schedule). Pure projections of `FixabeeState`.
 *
 * Palette: white surface, ink text, a honey accent (#f5b82e) used for
 * selection and the sample mark, and warm neutral panels. Not the live
 * product's branding.
 */

const STATUS_PILL: Record<BookingStatus, string> = {
  requested: "bg-[#fff1cc] text-[#6f4c00]",
  accepted: "bg-[#e1f3ea] text-[#0f6b4f]",
  declined: "bg-[#f8e7e6] text-[#8a2f2a]",
  completed: "bg-[#141416] text-white",
};

function BookingStatusPill({ status }: { status: BookingStatus }) {
  return <DemoPill className={STATUS_PILL[status]}>{STATUS_LABEL[status]}</DemoPill>;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export interface FixabeeCustomerActions {
  onSelectService: (serviceId: ServiceId) => void;
  onSelectArea: (area: AreaCode) => void;
  onRequest: (providerId: string) => void;
}

export function FixabeeCustomerScreen({
  state,
  interactive,
  actions,
}: {
  state: FixabeeState;
  interactive: boolean;
  actions?: FixabeeCustomerActions;
}) {
  const service = serviceById(state.serviceId);
  const area = areaByCode(state.area);
  const providers = matchingProviders(state);
  const booking = latestCustomerBooking(state);
  const bookingProvider = booking ? providerById(booking.providerId) : undefined;
  const status = booking ? customerStatus(booking) : null;

  return (
    <DemoRoot className="bg-white text-[#141416]" data-screen="fixabee-customer">
      <header className="flex items-center justify-between px-[1.25em] pt-[1.25em]">
        <div className="flex items-center gap-[0.6em]">
          <HexIcon className="text-[1.5em] text-[#f5b82e]" />
          <div>
            <p className="text-[1.125em] font-semibold leading-none tracking-[-0.02em]">Find local help</p>
            <p className="mt-[0.35em] text-[0.6875em] text-[#5b5f69]">Sample marketplace</p>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="grid h-[2.25em] w-[2.25em] place-items-center rounded-full bg-[#f7f6f2] text-[0.8125em] font-semibold"
        >
          {FIXABEE_SAMPLE.customer.charAt(0)}
        </span>
      </header>

      <section className="px-[1.25em] pt-[1.25em]" aria-label="Service">
        <DemoLabel className="text-[#5b5f69]">Service</DemoLabel>
        <div role="group" aria-label="Service" className="mt-[0.6em] flex flex-wrap gap-[0.4em]">
          {SERVICES.map((s) => (
            <DemoChip
              key={s.id}
              interactive={interactive}
              selected={s.id === state.serviceId}
              onClick={() => actions?.onSelectService(s.id)}
              selectedClassName="border-transparent bg-[#f5b82e] text-[#141416]"
              className="border-[#e3e0da] text-[#3b3f48] hover:border-[#141416]"
            >
              {s.name}
            </DemoChip>
          ))}
        </div>
      </section>

      <section className="px-[1.25em] pt-[1em]" aria-label="Postcode area">
        <DemoLabel className="text-[#5b5f69]">Postcode area</DemoLabel>
        <div role="group" aria-label="Postcode area" className="mt-[0.6em] flex flex-wrap gap-[0.4em]">
          {AREAS.map((a) => (
            <DemoChip
              key={a.code}
              interactive={interactive}
              selected={a.code === state.area}
              onClick={() => actions?.onSelectArea(a.code)}
              selectedClassName="border-transparent bg-[#f5b82e] text-[#141416]"
              className="border-[#e3e0da] text-[#3b3f48] hover:border-[#141416]"
            >
              <span className="font-mono tracking-[0.02em]">{a.code}</span>
              <span className="sr-only"> {a.name}</span>
            </DemoChip>
          ))}
        </div>
      </section>

      <section className="px-[1.25em] pt-[1.25em]" aria-label="Sample providers">
        <div className="flex items-baseline justify-between gap-[0.75em]">
          <p className="text-[0.875em] font-semibold">
            {providers.length} sample {providers.length === 1 ? "provider" : "providers"} in {area.code}
          </p>
          <span className="shrink-0 text-[0.6875em] text-[#5b5f69]">{service.priceBand}</span>
        </div>
        <ul className="mt-[0.6em] grid grid-cols-[minmax(0,1fr)] gap-[0.5em]">
          {providers.map((p) => {
            const open = hasOpenRequest(state, p.id);
            return (
              <li
                key={p.id}
                className="flex min-w-0 items-center justify-between gap-[0.75em] rounded-[0.9em] border border-[#e8e6e1] p-[0.8em]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875em] font-semibold leading-tight">{p.name}</p>
                  <p className="mt-[0.3em] flex items-center gap-[0.35em] text-[0.75em] text-[#5b5f69]">
                    <StarIcon className="text-[#f5b82e]" />
                    <span className="font-medium text-[#141416]">{p.rating.toFixed(1)}</span>
                    <span>({p.reviewCount})</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.fromPrice}</span>
                  </p>
                  <p className="mt-[0.15em] text-[0.6875em] text-[#5b5f69]">{p.responseTime}</p>
                </div>
                <DemoButton
                  interactive={interactive}
                  size="sm"
                  onClick={() => actions?.onRequest(p.id)}
                  disabled={!canRequest(state, p.id)}
                  className={`shrink-0 ${open ? "border border-[#e3e0da] text-[#5b5f69]" : "bg-[#141416] text-white hover:bg-[#2a2b30]"}`}
                  ariaLabel={open ? `Booking requested with ${p.name}` : `Request booking with ${p.name}`}
                >
                  {open ? "Requested" : "Request"}
                </DemoButton>
              </li>
            );
          })}
        </ul>
        <p className="mt-[0.6em] text-[0.6875em] text-[#5b5f69]">Ratings, reviews and prices are sample data.</p>
      </section>

      <section className="px-[1.25em] pt-[1.25em]" aria-label="Your booking">
        <DemoLabel className="text-[#5b5f69]">Your booking</DemoLabel>
        {booking && status ? (
          <div className="mt-[0.6em] rounded-[0.9em] bg-[#f7f6f2] p-[0.9em]" data-booking-status={booking.status}>
            <div className="flex items-start justify-between gap-[0.75em]">
              <div className="min-w-0">
                <p className="truncate text-[0.875em] font-semibold leading-tight">{bookingProvider?.name}</p>
                <p className="mt-[0.25em] text-[0.75em] text-[#5b5f69]">
                  {serviceById(booking.serviceId).name} · {booking.area} · {booking.slot}
                </p>
              </div>
              <BookingStatusPill status={booking.status} />
            </div>
            <p className="mt-[0.6em] text-[0.75em] leading-[1.45]">{status.detail}</p>
          </div>
        ) : (
          <p className="mt-[0.6em] rounded-[0.9em] border border-dashed border-[#d9d6cf] p-[0.9em] text-[0.75em] leading-[1.45] text-[#5b5f69]">
            Request a booking to follow its status here.
          </p>
        )}
      </section>

      <footer className="mx-[1.25em] mt-auto flex items-center justify-between gap-[0.75em] border-t border-[#e8e6e1] pt-[0.9em] pb-[1.25em] text-[0.75em]">
        <span>
          Referral code <span className="font-mono font-medium tracking-[0.02em]">{FIXABEE_SAMPLE.referralCode}</span>
        </span>
        <span className="text-[#5b5f69]">Sample</span>
      </footer>
    </DemoRoot>
  );
}

export interface FixabeeProviderActions {
  onAccept: (bookingId: string) => void;
  onDecline: (bookingId: string) => void;
  onComplete: (bookingId: string) => void;
}

export function FixabeeProviderScreen({
  state,
  interactive,
  actions,
}: {
  state: FixabeeState;
  interactive: boolean;
  actions?: FixabeeProviderActions;
}) {
  const provider = activeProvider(state);
  const requests = incomingRequests(state);
  const schedule = providerSchedule(state).slice(0, 3);

  return (
    <DemoRoot className="bg-white text-[#141416]" data-screen="fixabee-provider">
      <header className="flex items-center gap-[0.6em] px-[1.25em] pt-[1.25em]">
        <span
          aria-hidden="true"
          className="grid h-[2.25em] w-[2.25em] shrink-0 place-items-center rounded-[0.6em] bg-[#f5b82e] text-[0.75em] font-bold tracking-[0.02em]"
        >
          {initials(provider.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[1em] font-semibold leading-tight tracking-[-0.01em]">{provider.name}</p>
          <p className="mt-[0.2em] text-[0.6875em] text-[#5b5f69]">Provider app · sample provider</p>
        </div>
      </header>

      <dl className="mx-[1.25em] mt-[1em] grid grid-cols-3 rounded-[0.9em] bg-[#f7f6f2] p-[0.8em]">
        <div>
          <dt className="text-[0.625em] font-medium uppercase tracking-[0.12em] text-[#5b5f69]">Rating</dt>
          <dd className="mt-[0.3em] flex items-center gap-[0.3em] text-[0.9375em] font-semibold tabular-nums">
            <StarIcon className="text-[#f5b82e]" />
            {provider.rating.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.625em] font-medium uppercase tracking-[0.12em] text-[#5b5f69]">Reviews</dt>
          <dd className="mt-[0.3em] text-[0.9375em] font-semibold tabular-nums">{provider.reviewCount}</dd>
        </div>
        <div>
          <dt className="text-[0.625em] font-medium uppercase tracking-[0.12em] text-[#5b5f69]">Areas</dt>
          <dd className="mt-[0.3em] text-[0.9375em] font-semibold tabular-nums">
            {provider.areas.length}
            <span className="sr-only"> postcode areas: {provider.areas.join(", ")}</span>
          </dd>
        </div>
      </dl>

      <section className="px-[1.25em] pt-[1.25em]" aria-label="Incoming requests">
        <div className="flex items-baseline justify-between">
          <DemoLabel className="text-[#5b5f69]">Incoming requests</DemoLabel>
          <span className="text-[0.6875em] tabular-nums text-[#5b5f69]">{requests.length}</span>
        </div>
        {requests.length === 0 ? (
          <p className="mt-[0.6em] rounded-[0.9em] border border-dashed border-[#d9d6cf] p-[0.9em] text-[0.75em] leading-[1.45] text-[#5b5f69]">
            No new requests. Request a booking in the customer app and it appears here.
          </p>
        ) : (
          <ul className="mt-[0.6em] grid grid-cols-[minmax(0,1fr)] gap-[0.5em]">
            {requests.map((b) => {
              const forProvider = providerById(b.providerId);
              const service = serviceById(b.serviceId);
              return (
                <li
                  key={b.id}
                  className="min-w-0 rounded-[0.9em] border border-[#f0d78f] bg-[#fffaeb] p-[0.9em]"
                  data-request={b.id}
                >
                  <div className="flex items-start justify-between gap-[0.75em]">
                    <div className="min-w-0">
                      <p className="text-[0.875em] font-semibold leading-tight">
                        {service.name} · {b.area}
                      </p>
                      <p className="mt-[0.25em] text-[0.75em] text-[#5b5f69]">
                        {b.customer} · {b.slot}
                      </p>
                      {forProvider && forProvider.id !== provider.id ? (
                        <p className="mt-[0.15em] text-[0.6875em] text-[#5b5f69]">For {forProvider.name}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-mono text-[0.6875em] tabular-nums text-[#5b5f69]">
                      {formatSampleTime(b.requestedAt)}
                    </span>
                  </div>
                  <div className="mt-[0.75em] grid grid-cols-2 gap-[0.5em]">
                    <DemoButton
                      interactive={interactive}
                      size="sm"
                      onClick={() => actions?.onAccept(b.id)}
                      className="bg-[#141416] text-white hover:bg-[#2a2b30]"
                      ariaLabel={`Accept ${service.name.toLowerCase()} request from ${b.customer}`}
                    >
                      Accept
                    </DemoButton>
                    <DemoButton
                      interactive={interactive}
                      size="sm"
                      onClick={() => actions?.onDecline(b.id)}
                      className="border border-[#d9d6cf] bg-white text-[#141416] hover:border-[#141416]"
                      ariaLabel={`Decline ${service.name.toLowerCase()} request from ${b.customer}`}
                    >
                      Decline
                    </DemoButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="px-[1.25em] pt-[1.25em]" aria-label="Schedule">
        <DemoLabel className="text-[#5b5f69]">Schedule</DemoLabel>
        <ul className="mt-[0.35em]">
          {schedule.length === 0 ? (
            <li className="py-[0.6em] text-[0.75em] text-[#5b5f69]">Nothing scheduled yet.</li>
          ) : (
            schedule.map((b) => {
              const forProvider = providerById(b.providerId);
              const service = serviceById(b.serviceId);
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-[0.75em] border-b border-[#e8e6e1] py-[0.6em] last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125em] font-medium leading-tight">
                      {service.name} · {b.area} · {b.customer}
                    </p>
                    <p className="mt-[0.2em] text-[0.6875em] leading-[1.4] text-[#5b5f69]">
                      {b.slot}
                      {forProvider && forProvider.id !== provider.id ? ` · ${forProvider.name}` : ""}
                    </p>
                  </div>
                  {b.status === "accepted" ? (
                    <DemoButton
                      interactive={interactive}
                      size="sm"
                      onClick={() => actions?.onComplete(b.id)}
                      className="shrink-0 border border-[#d9d6cf] text-[#141416] hover:border-[#141416]"
                      ariaLabel={`Mark ${service.name.toLowerCase()} job for ${b.customer} complete`}
                    >
                      Mark complete
                    </DemoButton>
                  ) : (
                    <BookingStatusPill status={b.status} />
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <footer className="mx-[1.25em] mt-auto border-t border-[#e8e6e1] pt-[0.9em] pb-[1.25em]">
        <p className="text-[0.6875em] leading-[1.45] text-[#5b5f69]">
          <span className="font-medium text-[#141416]">Payouts.</span> Provider onboarding and Stripe payouts are features
          of the live product. They are described here and never simulated.
        </p>
      </footer>
    </DemoRoot>
  );
}

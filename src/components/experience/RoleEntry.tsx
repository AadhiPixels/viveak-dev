import type { Engagement, Role } from "@/content/types";
import { legoSelfReturns } from "@/content/work";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { BulletList } from "./ChronologySection";

/** Employer-level entry: title, period, location, framing sentence and bullets. */
export function RoleEntry({ role }: { role: Role }) {
  const meta = [role.period, role.location].filter(Boolean).join(" · ");
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="font-display text-[1.35rem] font-medium tracking-[-0.02em] text-ink">
          {role.title}
        </p>
        <p className="mono-label text-muted">{meta}</p>
      </div>
      {role.summary ? <p className="t-lead mt-5 max-w-[60ch] text-ink/85">{role.summary}</p> : null}
      <BulletList items={role.bullets} className="mt-6" />
    </div>
  );
}

/**
 * Client engagement inside an employer entry. Every one carries its
 * attribution line. The LEGO.com self-returns engagement is rendered as a
 * visibly distinct entry so its result is never read as part of the
 * neighbouring migration.
 */
export function EngagementEntry({ engagement }: { engagement: Engagement }) {
  const e = engagement;
  const distinct = e.id === legoSelfReturns.id;
  const headingId = `${e.id}-heading`;

  return (
    <article
      id={e.id}
      aria-labelledby={headingId}
      className={`border-t border-line pt-8 md:pt-10 ${
        distinct ? "border-l-2 border-l-accent pl-5 md:pl-7" : ""
      }`}
    >
      {distinct ? <p className="eyebrow mb-4 text-accent">Separate engagement · own result</p> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id={headingId} className="text-[1.3rem] font-medium text-ink">
          {e.client}
        </h3>
        <p className="mono-label text-muted">{e.period}</p>
      </div>
      <p className="mt-1.5 text-[0.95rem] font-medium text-ink">{e.title}</p>
      <p className="mono-label mt-1.5 text-muted">{e.attribution}</p>
      {distinct ? (
        <p className="t-display-m mt-6 text-ink">
          <span className="text-accent">{legoSelfReturns.value}</span> {legoSelfReturns.label}.
        </p>
      ) : null}
      <BulletList items={e.bullets} className="mt-5" />
      {e.caseStudy ? (
        <ArrowLink href={`/work/${e.caseStudy}`} className="mt-6 text-[0.95rem]">
          Read the case study
        </ArrowLink>
      ) : null}
    </article>
  );
}

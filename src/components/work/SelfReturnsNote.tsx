import { legoSelfReturns } from "@/content/work";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * The LEGO.com self-returns result as its own attributed block. It sits apart
 * from the case studies because it came from a different engagement and has
 * no case study of its own.
 */
export function SelfReturnsNote() {
  const r = legoSelfReturns;
  return (
    <section aria-labelledby="self-returns-heading" className="container-x pt-20 md:pt-28">
      <div className="grid gap-y-7 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-3">
          <Eyebrow>Separate engagement</Eyebrow>
          <p className="mt-5 text-[1.05rem] font-medium leading-snug text-lumen">
            {r.role}
            <span className="font-normal text-silver-2"> · {r.via}</span>
          </p>
          <p className="mono-label mt-2 text-silver-2">{r.period}</p>
        </div>
        <div className="lg:col-span-8 lg:col-start-5">
          <h2 id="self-returns-heading" className="t-display-m text-lumen">
            <span className="text-signal">{r.value}</span> {r.label}.
          </h2>
          <p className="t-lead mt-6 max-w-[56ch] text-silver">{r.statement}</p>
          <p className="t-body mt-4 max-w-[64ch] text-silver-2">
            This result belongs to the LEGO.com engagement, not to the Salesforce Marketing Cloud
            migration above. It has no case study of its own; the experience page records it in
            full.
          </p>
          <ArrowLink href={r.href} className="mt-8">
            See the engagement
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}

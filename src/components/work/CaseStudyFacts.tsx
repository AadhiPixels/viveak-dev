import type { CaseStudy } from "@/content/types";
import { getCaseStudyAttribution } from "@/lib/work";

function Fact({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2.5 text-[0.95rem] leading-snug text-lumen">{value}</dd>
    </div>
  );
}

/** Facts strip under the case-study headline: role, period, attribution, outcome. */
export function CaseStudyFacts({ study, className = "" }: { study: CaseStudy; className?: string }) {
  return (
    <dl
      className={`grid grid-cols-1 gap-x-8 gap-y-7 border-y border-line py-7 xs:grid-cols-2 md:py-8 lg:grid-cols-12 ${className}`}
    >
      <Fact label="Role" value={study.role} className="lg:col-span-2" />
      <Fact label="Period" value={study.period} className="lg:col-span-2" />
      <Fact label="Attribution" value={getCaseStudyAttribution(study)} className="lg:col-span-3" />
      <Fact
        label="Supported outcome"
        value={study.outcome}
        className="xs:col-span-2 lg:col-span-4 lg:col-start-9"
      />
    </dl>
  );
}

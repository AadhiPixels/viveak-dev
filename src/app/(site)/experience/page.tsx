import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { earlierRoles, education, profileSummary, roles, skills } from "@/content/experience";
import { products, studio } from "@/content/products";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { PersonJsonLd } from "@/components/seo/PersonJsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Download } from "@/components/ui/Icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChronologySection } from "@/components/experience/ChronologySection";
import { ExperienceNav } from "@/components/experience/ExperienceNav";
import { EngagementEntry, RoleEntry } from "@/components/experience/RoleEntry";

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: "Experience",
      description:
        "Full chronology: the latest project, Deloitte Digital programmes for LEGO, UK Government and Dyson, earlier roles, the AadhiPixels studio, education and skills.",
      path: "/experience",
    },
    parent,
  );
}

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "latest", label: "Latest project" },
  { id: "deloitte", label: "Deloitte Digital" },
  { id: "earlier", label: "Earlier roles" },
  { id: "aadhipixels", label: "AadhiPixels" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
];

export default function ExperiencePage() {
  const latest = roles.find((r) => r.id === "latest");
  const deloitte = roles.find((r) => r.id === "deloitte");
  const firstRole = earlierRoles[earlierRoles.length - 1];

  return (
    <>
      <PersonJsonLd />

      <section
        data-chapter="experience-intro"
        data-theme="dark"
        aria-labelledby="page-title"
        className="bg-ink text-lumen"
      >
        <PageHeader
          eyebrow="Experience · Full chronology"
          titleClassName="max-w-[19ch]"
          title={
            <>
              From {firstRole.title.toLowerCase()} to {site.role}.
            </>
          }
          lead={
            <>
              Every role, programme and period as the CV records it. Client programmes for LEGO,
              Dyson and UK Government were delivered through Deloitte Digital and are attributed as
              such throughout.
            </>
          }
        >
          <p className="mono-label mt-6 text-silver-2">{site.cvTitleLine}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href={site.cvHref} download className="gap-2">
              <Download /> Download CV
            </ButtonLink>
            <Link href="/contact" className="btn btn-ghost">
              Get in touch
            </Link>
          </div>
          <div className="mt-14 border-t border-line pt-6 md:mt-16">
            <ExperienceNav items={SECTIONS} />
          </div>
        </PageHeader>
      </section>

      <div data-chapter="experience" data-theme="light" className="bg-warm text-ink">
        <ChronologySection id="summary" title="Summary">
          <p className="t-lead max-w-[60ch] text-ink/85">{profileSummary}</p>
          <p className="mono-label mt-6 text-muted">{site.location}</p>
        </ChronologySection>

        {latest ? (
          <ChronologySection
            id="latest"
            title={latest.employer}
            aside={<p className="mono-label text-muted">{latest.period}</p>}
          >
            <RoleEntry role={latest} />
          </ChronologySection>
        ) : null}

        {deloitte ? (
          <ChronologySection
            id="deloitte"
            title={deloitte.employer}
            aside={<p className="mono-label text-muted">{deloitte.period}</p>}
          >
            <RoleEntry role={deloitte} />
            {deloitte.engagements?.length ? (
              <div className="mt-10 space-y-10 md:mt-12 md:space-y-12">
                {deloitte.engagements.map((e) => (
                  <EngagementEntry key={e.id} engagement={e} />
                ))}
              </div>
            ) : null}
          </ChronologySection>
        ) : null}

        <ChronologySection id="earlier" title="Earlier roles">
          <ul>
            {earlierRoles.map((r, i) => (
              <li
                key={r.id}
                className={`grid gap-x-8 gap-y-1 py-5 md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] md:py-6 ${
                  i === 0 ? "" : "border-t border-line"
                }`}
              >
                <p className="font-medium text-ink">{r.employer}</p>
                <div>
                  <p className="text-[0.95rem] font-medium text-ink">{r.title}</p>
                  <p className="t-body mt-1 text-ink/80">{r.description}</p>
                </div>
                <p className="mono-label text-muted md:text-right">{r.period}</p>
              </li>
            ))}
          </ul>
        </ChronologySection>

        <ChronologySection
          id="aadhipixels"
          title={studio.name}
          aside={<p className="mono-label text-muted">{studio.title}</p>}
        >
          <p className="t-lead max-w-[60ch] text-ink/85">{studio.description}</p>
          <div className="mt-10 space-y-10">
            {products.map((p) => (
              <article
                key={p.id}
                id={`studio-${p.id}`}
                aria-labelledby={`studio-${p.id}-heading`}
                className="border-t border-line pt-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h3 id={`studio-${p.id}-heading`} className="text-[1.3rem] font-medium text-ink">
                    {p.name}
                  </h3>
                  <p className="mono-label text-muted">{p.tagline}</p>
                </div>
                <p className="t-body mt-3 max-w-[64ch] text-ink/80">{p.description}</p>
                <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                  <ArrowLink href={`/products#${p.id}`} className="text-[0.95rem]">
                    Walkthrough on the products page
                  </ArrowLink>
                  {p.url && p.urlLabel ? (
                    <ArrowLink href={p.url} external className="text-[0.95rem]">
                      {p.urlLabel}
                    </ArrowLink>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </ChronologySection>

        <ChronologySection id="education" title="Education">
          <p className="font-display text-[1.35rem] font-medium tracking-[-0.02em] text-ink">
            {education.degree}
          </p>
          <p className="mono-label mt-2 text-muted">
            {education.institution} · {education.year}
          </p>
          <div className="mt-8 border-t border-line pt-6">
            <p className="eyebrow">Certification</p>
            <p className="mt-2.5 text-[1.05rem] font-medium text-ink">{education.certification}</p>
          </div>
        </ChronologySection>

        <ChronologySection id="skills" title="Skills">
          <dl className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            {skills.map((group) => (
              <div key={group.group}>
                <dt className="eyebrow">{group.group}</dt>
                <dd className="t-body mt-2.5 text-ink/80">{group.items.join(" · ")}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-14 border-t border-line pt-8">
            <p className="t-body max-w-[60ch] text-muted">
              Dates, titles and figures on this page are transcribed from the CV. The PDF is the
              same document, with the name of the current employer withheld in both.
            </p>
            <ButtonLink href={site.cvHref} download variant="secondary" className="mt-6 gap-2">
              <Download /> Download the CV (PDF)
            </ButtonLink>
          </div>
        </ChronologySection>
      </div>
    </>
  );
}

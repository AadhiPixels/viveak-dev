import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { caseStudies, getCaseStudy } from "@/content/work";
import { pageMetadata } from "@/lib/seo";
import { diagramCaptionBody, getCaseStudyNeighbours } from "@/lib/work";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CaseStudyDiagram } from "@/components/work/CaseStudyDiagram";
import { CaseStudyFacts } from "@/components/work/CaseStudyFacts";
import { CaseStudyNav } from "@/components/work/CaseStudyNav";
import { CaseStudySection, SectionList } from "@/components/work/CaseStudySection";
import { StackLabels } from "@/components/work/StackLabels";

type Params = { slug: string };

const SECTIONS = [
  { id: "overview", index: "01", title: "Overview" },
  { id: "responsibility", index: "02", title: "My responsibility" },
  { id: "technical-work", index: "03", title: "Supported technical work" },
  { id: "outcome", index: "04", title: "Supported outcome" },
  { id: "diagram", index: "05", title: "Conceptual diagram" },
  { id: "boundaries", index: "06", title: "What this page does not claim" },
  { id: "related", index: "07", title: "Related" },
] as const;

/** Only the slugs in the content layer exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return { title: "Not found", robots: { index: false, follow: false } };
  return pageMetadata(
    { title: study.seoTitle, description: study.seoDescription, path: `/work/${study.slug}` },
    parent,
  );
}

export default async function CaseStudyPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const { previous, next } = getCaseStudyNeighbours(study.slug);
  const attribution = study.via ? `${study.client} · ${study.via}` : study.client;
  const related = study.related ?? [];

  return (
    <article
      data-chapter="case-study"
      data-theme="dark"
      aria-labelledby="case-study-title"
      className="bg-ink text-lumen"
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Work", path: "/work" },
          { name: study.client, path: `/work/${study.slug}` },
        ]}
      />

      <header className="container-x pt-24 md:pt-32">
        <Breadcrumbs
          items={[{ href: "/", label: "Home" }, { href: "/work", label: "Work" }, { label: study.client }]}
        />
        <Eyebrow className="mt-10 md:mt-14">{attribution}</Eyebrow>
        <h1 id="case-study-title" className="t-display-l mt-6 max-w-[16ch] text-lumen">
          {study.headline}
        </h1>
        <CaseStudyFacts study={study} className="mt-12 md:mt-16" />
      </header>

      <div className="container-x py-16 md:py-24">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-10">
          <aside className="hidden lg:col-span-3 lg:block">
            <nav aria-label="On this page" className="sticky top-24">
              <p className="eyebrow">On this page</p>
              <ol className="mt-4 space-y-1">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="mono-label flex gap-3 py-1.5 text-silver-2 transition-colors hover:text-lumen"
                    >
                      <span aria-hidden="true" className="tabular-nums">
                        {s.index}
                      </span>
                      <span>{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <div className="mt-10 border-t border-line pt-6">
                <p className="eyebrow">Stack</p>
                <StackLabels items={study.stack} className="mt-4" />
              </div>
            </nav>
          </aside>

          <div className="space-y-14 md:space-y-16 lg:col-span-8 lg:col-start-5">
            <CaseStudySection id="overview" index="01" title="Overview">
              <p className="t-lead text-silver">{study.overview}</p>
              <StackLabels items={study.stack} className="mt-8 lg:hidden" />
            </CaseStudySection>

            <CaseStudySection id="responsibility" index="02" title="My responsibility">
              <p className="t-lead text-silver">{study.ownership}</p>
              <div className="mt-6">
                <SectionList items={study.responsibility} />
              </div>
            </CaseStudySection>

            <CaseStudySection id="technical-work" index="03" title="Supported technical work">
              <SectionList items={study.technicalWork} />
            </CaseStudySection>

            <CaseStudySection id="outcome" index="04" title="Supported outcome">
              <SectionList items={study.outcomes} />
            </CaseStudySection>

            <CaseStudySection id="diagram" index="05" title="Conceptual diagram" wide>
              <CaseStudyDiagram kind={study.diagram} caption={diagramCaptionBody(study.diagramCaption)} />
            </CaseStudySection>

            <CaseStudySection id="boundaries" index="06" title="What this page does not claim">
              <p className="t-body text-silver-2">
                The claims above are limited to what the CV supports. To keep them honest:
              </p>
              <div className="mt-4">
                <SectionList items={study.boundaries} />
              </div>
            </CaseStudySection>

            <CaseStudySection id="related" index="07" title="Related">
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.href}>
                    <ArrowLink href={r.href}>{r.label}</ArrowLink>
                  </li>
                ))}
              </ul>
            </CaseStudySection>
          </div>
        </div>
      </div>

      <CaseStudyNav previous={previous} next={next} />
    </article>
  );
}

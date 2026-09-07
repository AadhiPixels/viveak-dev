import type { Metadata, ResolvingMetadata } from "next";
import type { ReactNode } from "react";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { PersonJsonLd } from "@/components/seo/PersonJsonLd";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { ArrowUpRight, Download, Pin } from "@/components/ui/Icons";
import { PageHeader } from "@/components/ui/PageHeader";

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: "Contact",
      description: `Get in touch with ${site.name}: email, LinkedIn and a CV download. Based in ${site.location}.`,
      path: "/contact",
    },
    parent,
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-y-3 border-b border-line py-8 md:grid-cols-12 md:gap-x-10 md:py-10">
      <dt className="eyebrow md:col-span-3 md:pt-[0.9em]">{label}</dt>
      <dd className="min-w-0 md:col-span-9">{children}</dd>
    </div>
  );
}

const bigLink =
  "group inline-flex max-w-full items-center gap-3 text-lumen transition-colors hover:text-signal";

export default function ContactPage() {
  return (
    <section
      data-chapter="contact"
      data-theme="dark"
      aria-labelledby="page-title"
      className="bg-ink text-lumen"
    >
      <PersonJsonLd />
      <PageHeader
        eyebrow="Contact"
        title="Let's build what comes next."
        lead="Opportunities, projects and ideas are all welcome: email or LinkedIn, whichever suits you."
      />
      <div className="container-x pb-24 md:pb-32">
        <dl className="border-t border-line">
          <Row label="Email">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href={`mailto:${site.email}`} className={`${bigLink} t-display-s break-all`}>
                {site.email}
              </a>
              <CopyEmail email={site.email} />
            </div>
          </Row>

          <Row label="LinkedIn">
            <a
              href={site.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className={`${bigLink} t-display-s break-all`}
            >
              <span>{site.linkedinLabel}</span>
              <ArrowUpRight
                size={22}
                className="shrink-0 text-silver-2 transition-colors group-hover:text-signal"
              />
            </a>
          </Row>

          <Row label="CV">
            <a href={site.cvHref} download className={`${bigLink} t-display-s`}>
              <Download
                size={22}
                className="shrink-0 text-silver-2 transition-colors group-hover:text-signal"
              />
              <span>Download CV (PDF)</span>
            </a>
          </Row>

          <Row label="Location">
            <p className="t-display-s inline-flex items-center gap-3 text-silver">
              <Pin size={22} className="shrink-0 text-silver-2" />
              <span>{site.location}</span>
            </p>
          </Row>
        </dl>
      </div>
    </section>
  );
}

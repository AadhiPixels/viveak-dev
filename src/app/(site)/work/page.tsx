import type { Metadata, ResolvingMetadata } from "next";
import { caseStudies } from "@/content/work";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkIndex } from "@/components/work/WorkIndex";
import { SelfReturnsNote } from "@/components/work/SelfReturnsNote";
import { LabPointer } from "@/components/work/LabPointer";

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: "Work",
      description:
        "Selected work: an external API platform carrying around a million events a day, Dyson's EC2-to-Kubernetes migration and LEGO's zero-disruption marketing migration.",
      path: "/work",
    },
    parent,
  );
}

export default function WorkPage() {
  return (
    <section
      data-chapter="work"
      data-theme="dark"
      aria-labelledby="page-title"
      className="bg-ink text-lumen"
    >
      <PageHeader
        eyebrow="Work · Selected"
        title="Complex problems. Real outcomes."
        lead="Three programmes, each stated the way the CV records it: the role I held, the period, what I owned and the outcome the work supported. Client programmes delivered through Deloitte Digital are attributed as such."
      />
      <div className="container-x">
        <WorkIndex items={caseStudies} />
      </div>
      <SelfReturnsNote />
      <LabPointer />
    </section>
  );
}

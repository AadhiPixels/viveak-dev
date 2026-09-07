import type { CaseStudy } from "@/content/types";
import { DeliveryRoutesVisual } from "@/components/home/visuals/DeliveryRoutesVisual";
import { FragmentsVisual } from "@/components/home/visuals/FragmentsVisual";
import { ContinuityVisual } from "@/components/home/visuals/ContinuityVisual";

/**
 * Conceptual diagram for a case study: the same original illustrations as the
 * homepage chapters, rendered in their resolved state and always labelled
 * conceptual. Never an employer architecture diagram.
 */
export function CaseStudyDiagram({
  kind,
  caption,
  className = "",
}: {
  kind: CaseStudy["diagram"];
  caption: string;
  className?: string;
}) {
  return (
    <figure className={`overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      <div className="p-5 md:p-8" data-diagram={kind}>
        {kind === "routed-delivery" ? <DeliveryRoutesVisual /> : null}
        {kind === "fragments-to-platform" ? <FragmentsVisual /> : null}
        {kind === "continuity-handover" ? <ContinuityVisual light={false} id={`cs-${kind}`} /> : null}
      </div>
      <figcaption className="mono-label border-t border-line px-4 py-3 text-muted">
        Conceptual illustration. {caption}
      </figcaption>
    </figure>
  );
}

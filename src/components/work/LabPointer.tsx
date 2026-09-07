import { secondaryNav } from "@/content/site";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ArrowRight } from "@/components/ui/Icons";

const LAB_HREF = secondaryNav[0].href;

/** Pointer from the work index to the interactive lab, labelled as a simulation. */
export function LabPointer() {
  return (
    <section aria-labelledby="lab-pointer-heading" className="container-x pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="grid gap-y-7 border-t border-line pt-10 lg:grid-cols-12 lg:gap-x-10 lg:pt-12">
        <div className="lg:col-span-3">
          <Eyebrow>Lab</Eyebrow>
        </div>
        <div className="lg:col-span-8 lg:col-start-5">
          <h2 id="lab-pointer-heading" className="t-display-s text-lumen">
            Break the system. See how it recovers.
          </h2>
          <p className="t-body mt-4 max-w-[64ch] text-silver-2">
            The delivery patterns behind the external API platform case study, retries, circuit breakers, rate
            limits and a dead-letter queue, as a working model you can push around. Interactive
            educational simulation. Synthetic data. Not connected to employer systems.
          </p>
          <ButtonLink href={LAB_HREF} variant="secondary" className="mt-8 gap-2">
            Open the webhook-delivery lab <ArrowRight />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

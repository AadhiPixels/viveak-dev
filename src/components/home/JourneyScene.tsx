"use client";

import { useRef } from "react";
import { milestones } from "@/content/experience";
import { gsap, useSceneGSAP } from "@/lib/motion/gsap";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Scene 07: the person and the experience. Editorial, CV-supported substance
 * about progression, leadership and independent product work, with selected
 * milestones and a route to the full chronology. Client names appear as
 * attributed evidence only.
 */
export function JourneyScene() {
  const ref = useRef<HTMLElement>(null);
  const motionEnabled = useMotionEnabled();

  useSceneGSAP(
    () => {
      if (!motionEnabled || !ref.current) return;
      const q = gsap.utils.selector(ref.current);
      gsap.fromTo(
        q("[data-reveal-line]"),
        { yPercent: 110 },
        { yPercent: 0, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: q("[data-copy]"), start: "top 85%", end: "top 50%", scrub: 0.4 } },
      );
      gsap.fromTo(
        q("[data-reveal-rest]"),
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, stagger: 0.05, ease: "power2.out", scrollTrigger: { trigger: q("[data-copy]"), start: "top 75%", end: "top 35%", scrub: 0.4 } },
      );
      gsap.fromTo(
        q("[data-milestone]"),
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: q("[data-milestones]"), start: "top 85%", end: "top 45%", scrub: 0.4 } },
      );
    },
    { scope: ref, dependencies: [motionEnabled], lazy: "150% 0px" },
  );

  return (
    <section
      ref={ref}
      id="journey"
      data-chapter="journey"
      data-theme="light"
      aria-labelledby="journey-heading"
      className="relative z-[1] bg-warm text-ink"
    >
      <div className="container-x py-[8vh] lg:py-[12vh]">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-12">
          <div data-copy className="lg:col-span-6">
            <Eyebrow index="09">The person and the experience</Eyebrow>
            <h2 id="journey-heading" className="t-headline mt-6 text-ink">
              <span className="mask-line">
                <span className="block" data-reveal-line>
                  9+ years of platforms,
                </span>
              </span>
              <span className="mask-line">
                <span className="block" data-reveal-line>
                  teams and products.
                </span>
              </span>
            </h2>
            <div className="prose-site mt-6 space-y-5 text-[#3f434c] lg:mt-8">
              <p data-reveal-rest className="t-lead">
                I lead engineering hands-on: on my latest project, a team of 9 across parallel workstreams and the
                architecture and engineering standards of a platform handling around a million events a day. Before
                that, seven years at Deloitte Digital, from Engineer to Manager, leading engineering on client
                programmes for LEGO, Dyson and UK Government.
              </p>
            </div>
            <div data-reveal-rest>
              <ArrowLink href="/experience" className="mt-8">
                View the full experience
              </ArrowLink>
            </div>
          </div>
          <div data-milestones className="lg:col-span-5 lg:col-start-8">
            <p className="eyebrow">Selected milestones</p>
            <ol className="mt-4 border-t border-line">
              {milestones.map((m) => (
                <li key={m.title} data-milestone className="grid gap-1.5 border-b border-line py-4 sm:grid-cols-[7.5rem_1fr] lg:gap-2 lg:py-5">
                  <span className="mono-label pt-1 text-[#5b5f69]">{m.period}</span>
                  <div>
                    <a href={m.href} className="t-display-s text-ink hover:text-signal-deep">
                      {m.title}
                    </a>
                    <p className="t-body mt-1 hidden text-[#3f434c] lg:block">{m.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { facts } from "@/content/facts";
import { gsap, useSceneGSAP } from "@/lib/motion/gsap";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { Poster } from "@/components/scene/SignatureStage";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Scene 03: evidence at scale. Two CV-backed facts composed differently,
 * both real DOM text. The number is mask-revealed, never counted up.
 */
export function EvidenceChapter() {
  const ref = useRef<HTMLElement>(null);
  const motionEnabled = useMotionEnabled();
  const events = facts.eventsPerDay;
  const team = facts.engineersLed;

  useSceneGSAP(
    () => {
      if (!motionEnabled || !ref.current) return;
      const root = ref.current;
      const q = gsap.utils.selector(root);

      gsap.fromTo(
        q(".evidence-number .mask-line > span"),
        { yPercent: 108 },
        {
          yPercent: 0,
          ease: "power3.out",
          scrollTrigger: { trigger: q(".evidence-number"), start: "top 88%", end: "top 42%", scrub: 0.5 },
        },
      );
      gsap.fromTo(
        q(".evidence-number-copy"),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0,
          ease: "power2.out",
          scrollTrigger: { trigger: q(".evidence-number"), start: "top 70%", end: "top 40%", scrub: 0.5 },
        },
      );
      gsap.fromTo(
        q(".evidence-team > *"),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: q(".evidence-team"), start: "top 85%", end: "top 50%", scrub: 0.5 },
        },
      );

      // Hand the fixed canvas off: fade it out across the end of this chapter, then hide it.
      const stage = document.querySelector<HTMLElement>("[data-signature-stage]");
      if (stage) {
        gsap.fromTo(
          stage,
          { opacity: 1 },
          {
            opacity: 0,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "bottom 95%",
              end: "bottom 35%",
              scrub: true,
              onLeave: () => gsap.set(stage, { visibility: "hidden" }),
              onEnterBack: () => gsap.set(stage, { visibility: "visible" }),
            },
          },
        );
      }
    },
    { scope: ref, dependencies: [motionEnabled] },
  );

  return (
    <section
      ref={ref}
      id="evidence"
      data-chapter="evidence"
      data-theme="dark"
      aria-labelledby="evidence-heading"
      className="evidence text-lumen"
    >
      <div className="evidence-still" aria-hidden="true">
        <Poster which="k3" />
      </div>
      <div className="container-x pt-[6vh] pb-[5vh] lg:pt-[9vh] lg:pb-[8vh]">
        <Eyebrow index="03">Evidence at scale</Eyebrow>
        <h2 id="evidence-heading" className="sr-only">
          Evidence at scale
        </h2>

        <div className="evidence-number mt-10 grid items-end gap-x-10 gap-y-6 lg:grid-cols-[auto_minmax(0,1fr)]">
          <p className="t-numeral text-lumen" aria-label={`${events.value} ${events.label}`}>
            <span className="mask-line">
              <span className="block">{events.value}</span>
            </span>
          </p>
          <div className="evidence-number-copy max-w-md pb-[0.35em] lg:pb-[1.1em]">
            <p className="t-display-s text-lumen">{events.label}</p>
            <p className="t-lead mt-3 text-silver">{events.context}</p>
            <ArrowLink href={events.href} className="mt-6">
              {events.hrefLabel}
            </ArrowLink>
          </div>
        </div>

        <div className="evidence-team mt-[8vh] grid gap-5 lg:mt-[12vh] lg:grid-cols-12 lg:gap-x-10 lg:gap-y-6">
          <p className="t-display-l text-lumen lg:col-span-7 lg:col-start-5">
            Leading <span className="text-signal">{team.value}</span> engineers.
          </p>
          <p className="t-lead max-w-[38ch] text-silver lg:col-span-5 lg:col-start-5">{team.context}</p>
          <div className="lg:col-span-5 lg:col-start-5">
            <ArrowLink href={team.href}>{team.hrefLabel}</ArrowLink>
          </div>
        </div>
      </div>
      <div className="evidence-fade h-[8vh] lg:h-[12vh]" aria-hidden="true" />
    </section>
  );
}

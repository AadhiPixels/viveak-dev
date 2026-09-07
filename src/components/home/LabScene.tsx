"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useSceneGSAP } from "@/lib/motion/gsap";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ArrowRight } from "@/components/ui/Icons";
import { LabPreviewVisual } from "./visuals/LabPreviewVisual";

/**
 * Scene 06: show the engineering. A lightweight illustrative preview of the
 * webhook-delivery lab with a clear action to launch the working simulation.
 * The preview is not the simulation and is never driven by scroll.
 */
export function LabScene() {
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
        { opacity: 1, y: 0, stagger: 0.06, ease: "power2.out", scrollTrigger: { trigger: q("[data-copy]"), start: "top 75%", end: "top 40%", scrub: 0.4 } },
      );
      gsap.fromTo(
        q("[data-preview]"),
        { autoAlpha: 0, y: 30, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, ease: "power2.out", scrollTrigger: { trigger: q("[data-preview]"), start: "top 85%", end: "top 45%", scrub: 0.5 } },
      );
    },
    { scope: ref, dependencies: [motionEnabled], lazy: "150% 0px" },
  );

  return (
    <section
      ref={ref}
      id="lab-scene"
      data-chapter="lab"
      data-theme="dark"
      aria-labelledby="lab-heading"
      className="relative z-[1] bg-ink text-lumen"
    >
      <div className="container-x py-[8vh] lg:py-[12vh]">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-12">
          <div data-copy className="lg:col-span-5">
            <Eyebrow index="08">Live simulation · Show the engineering</Eyebrow>
            <h2 id="lab-heading" className="t-headline mt-6 text-lumen">
              <span className="mask-line">
                <span className="block" data-reveal-line>
                  Break the system.
                </span>
              </span>
              <span className="mask-line">
                <span className="block" data-reveal-line>
                  See how it recovers.
                </span>
              </span>
            </h2>
            <p data-reveal-rest className="t-lead mt-6 max-w-[40ch] text-silver">
              An interactive, deterministic simulation of a resilient webhook delivery pipeline: retries with bounded
              backoff, per-subscription circuit breakers, rate limits, a dead-letter queue with replay, and HMAC-signed
              payloads you can tamper with.
            </p>
            <p data-reveal-rest className="mono-label mt-4 max-w-[44ch] text-silver-3">
              Interactive educational simulation. Synthetic data. Not connected to employer systems.
            </p>
            <div data-reveal-rest className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/lab/webhook-delivery">
                Try the simulation <ArrowRight />
              </ButtonLink>
              <ArrowLink href="/work/external-api-platform">The platform behind it</ArrowLink>
            </div>
            <p data-reveal-rest className="mt-5 text-[0.95rem] text-silver-2">
              Prefer to play it? <Link href="/play" className="text-lumen underline underline-offset-4 hover:text-signal">Throughput</Link> is a small 3D
              arcade game built for this site around the same ideas.
            </p>
          </div>
          <div className="hidden lg:col-span-7 lg:block">
            <div data-preview className="rounded-2xl border border-line bg-graphite/40 p-4 md:p-6">
              <LabPreviewVisual motion={motionEnabled} />
            </div>
            <p className="mono-label mt-4 text-silver-3">Illustration. The working simulation, with controls and inspectors, is on the lab page.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

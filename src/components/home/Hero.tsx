"use client";

import Link from "next/link";
import { useRef } from "react";
import { site } from "@/content/site";
import { BREAKPOINTS, gsap, useSceneGSAP } from "@/lib/motion/gsap";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { Poster, SignatureStage } from "@/components/scene/SignatureStage";
import { setHeroProgress } from "@/components/scene/progress";
import { ArrowDown, ArrowRight, Download } from "@/components/ui/Icons";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Scene 01 (the opening image) and Scene 02 (the system opens).
 *
 * Document order is always: hero copy, then "Built to keep moving.". With full
 * motion the stage is pinned and the two blocks are choreographed by one
 * ScrollTrigger; with reduced motion (or no JavaScript) they are ordinary
 * sections with still images. CSS on html[data-motion] switches the layout so
 * nothing essential depends on JavaScript having run.
 */
export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const motionEnabled = useMotionEnabled();

  useSceneGSAP(
    () => {
      if (!motionEnabled || !stageRef.current) {
        setHeroProgress(0);
        return;
      }
      const mm = gsap.matchMedia();
      mm.add({ desktop: BREAKPOINTS.desktop, mobile: BREAKPOINTS.mobile, tall: "(min-height: 640px)" }, (ctx) => {
        const desktop = Boolean(ctx.conditions?.desktop);
        // Short viewports (landscape phones, small windows) keep the static layout so the
        // hero actions are never clipped by a pinned stage. The CSS mirrors this threshold.
        if (!ctx.conditions?.tall) {
          setHeroProgress(0);
          return;
        }
        const stage = stageRef.current!;
        const q = gsap.utils.selector(stage);
        const copy = q(".hero-copy");
        const cue = q(".hero-cue");
        const builtLines = q(".hero-built .mask-line > span");
        const builtCopy = q(".hero-built .hero-built-copy");
        const builtScrim = q(".hero-built-scrim");
        const label01 = q(".hero-label-01");
        const label02 = q(".hero-label-02");
        // Poster fallback layers live in the fixed stage, a sibling of the pinned element.
        const qRoot = gsap.utils.selector(rootRef.current);
        const posterK2 = qRoot(".poster-k2");
        const posterK3 = qRoot(".poster-k3");

        gsap.set(builtLines, { yPercent: 112 });
        gsap.set(builtCopy, { autoAlpha: 0, y: 16 });
        gsap.set(builtScrim, { autoAlpha: 0 });
        gsap.set(label02, { autoAlpha: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: desktop ? "+=145%" : "+=90%",
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 0.35,
            invalidateOnRefresh: true,
            onUpdate: (self) => setHeroProgress(self.progress),
            onRefresh: (self) => setHeroProgress(self.progress),
          },
        });

        // Beat 1: 0.00 to 0.20 hold. The scroll cue fades early.
        tl.to(cue, { autoAlpha: 0, duration: 0.08, ease: "power1.out" }, 0.04);
        // Beat 2: 0.20 to 0.55 the object opens; the hero copy lifts away.
        tl.to(copy, { autoAlpha: 0, y: desktop ? -56 : -36, duration: 0.16, ease: "power2.in" }, 0.2);
        tl.to(label01, { autoAlpha: 0, duration: 0.08 }, 0.22);
        if (posterK2.length) tl.fromTo(posterK2, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.26);
        // Beat 3: 0.55 to 0.80 "Built to keep moving." holds beside the routes.
        tl.to(builtScrim, { autoAlpha: 1, duration: 0.12 }, 0.5);
        tl.to(label02, { autoAlpha: 1, duration: 0.06 }, 0.54);
        tl.to(builtLines, { yPercent: 0, duration: 0.14, stagger: 0.05, ease: "power3.out" }, 0.55);
        tl.to(builtCopy, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power2.out" }, 0.64);
        // Beat 4: 0.80 to 1.00 the routes settle; the headline holds.
        if (posterK3.length) tl.fromTo(posterK3, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.8);
        tl.to({}, { duration: 0.2 }, 0.8);

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [motionEnabled] },
  );

  return (
    <section
      ref={rootRef}
      id="hero"
      data-chapter="hero"
      data-theme="dark"
      aria-labelledby="hero-name"
      className="hero relative bg-ink text-lumen"
    >
      <SignatureStage motion={motionEnabled} ambient={motionEnabled} className="hero-stage-canvas" />

      <div ref={stageRef} className="hero-stage relative z-[1]">
        {/* Contrast scrims, tuned per breakpoint. */}
        <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="hero-frame container-x relative flex h-full flex-col">
          <div className="hero-copy relative mt-auto pb-10 md:pb-14 lg:max-w-[46rem]">
            <div className="hero-label-01">
              <Eyebrow index="01">Systems in motion</Eyebrow>
            </div>
            <h1 id="hero-name" className="t-display-s mt-5 text-lumen md:mt-6">
              {site.name}
            </h1>
            <p className="mono-label mt-2 text-silver">{site.roleLine}</p>
            <p className="hero-tagline t-display-xl mt-6 text-lumen md:mt-8" aria-label={site.tagline}>
              <span className="block">Engineering.</span>
              <span className="block pl-[0.6em] text-silver">In motion.</span>
            </p>
            <p className="hero-intro t-lead mt-6 max-w-[34ch] text-silver md:mt-8">{site.intro}</p>
            <div className="hero-actions mt-7 flex flex-wrap items-center gap-3 md:mt-9">
              <Link href="/work" className="btn btn-primary gap-2">
                Explore my work <ArrowRight />
              </Link>
              <a href={site.cvHref} className="btn btn-secondary gap-2">
                <Download /> Download CV
              </a>
              <Link href="/contact" className="btn btn-ghost">
                Get in touch
              </Link>
            </div>
            <a
              href="#selected-work"
              className="hero-skip mono-label mt-6 inline-flex items-center gap-2 py-2 text-silver-2 hover:text-lumen md:mt-8"
            >
              <ArrowDown /> Skip to selected work
            </a>
          </div>

          <div className="hero-meta pointer-events-none absolute inset-x-[clamp(1.125rem,4vw,4rem)] bottom-0 hidden items-end justify-between pb-6 lg:flex">
            <span className="mono-label text-silver-3">{site.location}</span>
            <span className="hero-cue mono-label flex items-center gap-2 text-silver-3">
              Scroll to explore <ArrowDown />
            </span>
          </div>
        </div>

        {/* Scene 02 copy. Absolute inside the pinned stage with full motion, static section otherwise. */}
        <div className="hero-built" id="built">
          <div className="hero-built-still" aria-hidden="true">
            <Poster which="k2" />
          </div>
          <div className="hero-built-scrim" aria-hidden="true" />
          <div className="container-x">
            <div className="hero-label-02">
              <Eyebrow index="02">Complex environments</Eyebrow>
            </div>
            <h2 className="t-display-l mt-5 text-lumen md:mt-6">
              <span className="mask-line">
                <span className="block">Built to</span>
              </span>
              <span className="mask-line">
                <span className="block">keep moving.</span>
              </span>
            </h2>
            <p className="hero-built-copy t-lead mt-6 max-w-[38ch] text-silver">
              From an event platform carrying around a million events a day to migrations with zero
              customer-visible disruption, I turn complex systems into reliable, scalable platforms.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

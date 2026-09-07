"use client";

import { useRef } from "react";
import { caseStudies, legoSelfReturns } from "@/content/work";
import { facts } from "@/content/facts";
import { BREAKPOINTS, gsap, useSceneGSAP } from "@/lib/motion/gsap";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DeliveryRoutesVisual } from "./visuals/DeliveryRoutesVisual";
import { FragmentsVisual } from "./visuals/FragmentsVisual";
import { ContinuityVisual, FINAL_HANDOVER, crossoverCentre, flowPath, type Orientation } from "./visuals/ContinuityVisual";

/**
 * Scene 04: selected work as three chapters with distinct visual treatments,
 * each in normal document flow with a route to its case study. The third
 * chapter is where the page turns warm-white.
 */

function headlineLines(headline: string): string[] {
  // Split the CV-backed headline on its sentence break or roughly in half so
  // the mask reveal has two lines to work with.
  if (headline.includes(". ")) {
    const [a, ...rest] = headline.split(". ");
    return [`${a}.`, rest.join(". ")];
  }
  const words = headline.split(" ");
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function MaskedHeadline({ text, className = "", id }: { text: string; className?: string; id?: string }) {
  return (
    <h3 id={id} className={`t-headline ${className}`}>
      {headlineLines(text).map((line) => (
        <span key={line} className="mask-line">
          <span className="block" data-reveal-line>
            {line}
          </span>
        </span>
      ))}
    </h3>
  );
}

function StackLabels({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-6 hidden flex-wrap gap-2 lg:flex" aria-label="Technologies">
      {items.map((s) => (
        <li key={s} className="mono-label rounded-full border border-line px-2.5 py-1 text-muted">
          {s}
        </li>
      ))}
    </ul>
  );
}

export function WorkChapters() {
  const ref = useRef<HTMLElement>(null);
  const motionEnabled = useMotionEnabled();
  const [delivery, platform, continuity] = caseStudies;

  useSceneGSAP(
    () => {
      if (!motionEnabled || !ref.current) return;
      const root = ref.current;
      const q = gsap.utils.selector(root);

      // Headline mask reveals, one per chapter.
      root.querySelectorAll<HTMLElement>("[data-chapter-copy]").forEach((copy) => {
        const lines = copy.querySelectorAll("[data-reveal-line]");
        const rest = copy.querySelectorAll("[data-reveal-rest]");
        gsap.fromTo(
          lines,
          { yPercent: 110 },
          {
            yPercent: 0,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: copy, start: "top 85%", end: "top 55%", scrub: 0.4 },
          },
        );
        gsap.fromTo(
          rest,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0,
            stagger: 0.06,
            ease: "power2.out",
            scrollTrigger: { trigger: copy, start: "top 75%", end: "top 45%", scrub: 0.4 },
          },
        );
      });

      // 04a: draw the routes on, then hold (both authored layouts; only one is displayed).
      q("[data-visual='delivery-routes']").forEach((routes) => {
        const draws = routes.querySelectorAll("[data-draw]");
        const nodes = routes.querySelectorAll("[data-node]");
        gsap.set(draws, { strokeDasharray: 1 });
        gsap.fromTo(
          draws,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            stagger: 0.05,
            ease: "none",
            scrollTrigger: { trigger: routes, start: "top 88%", end: "top 30%", scrub: 0.5 },
          },
        );
        gsap.fromTo(
          nodes,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0,
            stagger: 0.06,
            ease: "power2.out",
            scrollTrigger: { trigger: routes, start: "top 85%", end: "top 35%", scrub: 0.5 },
          },
        );
      });

      // 04b: fragments assemble into the platform.
      const fragments = q("[data-visual='fragments']")[0];
      if (fragments) {
        const tiles = q("[data-visual='fragments'] [data-tile]");
        gsap.to(tiles, {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          stagger: { each: 0.018, from: "center" },
          ease: "power2.inOut",
          scrollTrigger: { trigger: fragments, start: "top 85%", end: "center 45%", scrub: 0.6 },
        });
        gsap.fromTo(
          q("[data-visual='fragments'] [data-plate]"),
          { autoAlpha: 0.25, scale: 0.96 },
          {
            autoAlpha: 1,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: { trigger: fragments, start: "top 60%", end: "center 45%", scrub: 0.6 },
          },
        );
        gsap.fromTo(
          q("[data-visual='fragments'] [data-label-before]"),
          { autoAlpha: 1 },
          { autoAlpha: 0.35, scrollTrigger: { trigger: fragments, start: "top 60%", end: "center 45%", scrub: true } },
        );
        gsap.fromTo(
          q("[data-visual='fragments'] [data-label-after]"),
          { autoAlpha: 0.35 },
          { autoAlpha: 1, scrollTrigger: { trigger: fragments, start: "top 60%", end: "center 45%", scrub: true } },
        );
      }

      // 04c: the warm-white surface rises over the previous chapter. The phone composition
      // overlaps less (see .work-continuity in globals.css), so its edge starts lower.
      const light = q("[data-light-sweep]")[0];
      const mm = gsap.matchMedia();
      if (light) {
        mm.add({ desktop: BREAKPOINTS.desktop, mobile: BREAKPOINTS.mobile }, (ctx) => {
          const [a, b] = ctx.conditions?.desktop ? ["34svh", "22svh"] : ["24svh", "16svh"];
          // A gently sloped edge reads as a surface rising rather than a hard cut.
          gsap.fromTo(
            light,
            { clipPath: `polygon(0% ${a}, 100% ${b}, 100% 100%, 0% 100%)` },
            {
              clipPath: "polygon(0% 0svh, 100% 0svh, 100% 100%, 0% 100%)",
              ease: "none",
              scrollTrigger: { trigger: light, start: "top bottom", end: "top 45%", scrub: true },
            },
          );
        });
      }

      // 04c: the handover progresses as the visual travels through the viewport.
      q("[data-visual='continuity']").forEach((cont) => {
        const o = (cont.getAttribute("data-orientation") as Orientation) || "wide";
        const flow = cont.querySelector<SVGPathElement>("[data-flow]");
        const halo = cont.querySelector<SVGPathElement>("[data-flow-halo]");
        const cutover = cont.querySelector<SVGGElement>("[data-cutover]");
        const apply = (p: number) => {
          const h = p * FINAL_HANDOVER;
          const d = flowPath(h, o);
          flow?.setAttribute("d", d);
          halo?.setAttribute("d", d);
          const c = crossoverCentre(h, o).toFixed(1);
          cutover?.setAttribute("transform", o === "wide" ? `translate(${c} 0)` : `translate(0 ${c})`);
        };
        apply(0);
        gsap.to(
          { p: 0 },
          {
            p: 1,
            ease: "none",
            onUpdate() {
              apply(this.targets()[0].p as number);
            },
            scrollTrigger: { trigger: cont, start: "top 80%", end: "bottom 45%", scrub: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [motionEnabled], lazy: "150% 0px" },
  );

  return (
    <section ref={ref} id="selected-work" aria-labelledby="selected-work-heading" className="relative z-[1]">
      <h2 id="selected-work-heading" className="sr-only">
        Selected work
      </h2>

      {/* 04a: latest project */}
      <div data-chapter="work-delivery" data-theme="dark" className="bg-ink text-lumen">
        <div className="container-x py-[9vh] lg:py-[12vh]">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-12">
            <div data-chapter-copy className="lg:col-span-5">
              <Eyebrow index="04">
                Selected work · {delivery.client} · {delivery.role}
              </Eyebrow>
              <MaskedHeadline text={delivery.headline} className="mt-6 text-lumen" />
              <p data-reveal-rest className="t-lead mt-6 hidden max-w-[40ch] text-silver lg:block">
                {delivery.ownership}
              </p>
              <p data-reveal-rest className="mt-8 hidden items-baseline gap-3 lg:flex">
                <span className="t-display-m text-lumen">{facts.eventsPerDay.value}</span>
                <span className="mono-label text-silver-2">{facts.eventsPerDay.label}</span>
              </p>
              <div data-reveal-rest>
                <StackLabels items={delivery.stack} />
                <ArrowLink href={`/work/${delivery.slug}`} className="mt-6 lg:mt-8">
                  Read the case study
                </ArrowLink>
              </div>
            </div>
            <div className="hidden lg:col-span-7 lg:block">
              <DeliveryRoutesVisual motion={motionEnabled} />
              <p className="mono-label mt-4 text-silver-3">Conceptual illustration. Not a diagram of any employer&apos;s systems.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 04b: Dyson via Deloitte Digital */}
      <div data-chapter="work-platform" data-theme="graphite" className="bg-graphite text-lumen">
        <div className="container-x py-[9vh] lg:py-[12vh]">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-12">
            <div className="order-2 hidden lg:order-1 lg:col-span-7 lg:block">
              <FragmentsVisual motion={motionEnabled} />
              <p className="mono-label mt-4 text-silver-3">Conceptual illustration. It does not depict the client&apos;s architecture.</p>
            </div>
            <div data-chapter-copy className="order-1 lg:order-2 lg:col-span-5">
              <Eyebrow index="05">
                {platform.client} · {platform.via} · {platform.role}
              </Eyebrow>
              <MaskedHeadline text={platform.headline} className="mt-6 text-lumen" />
              <p data-reveal-rest className="t-lead mt-6 hidden max-w-[40ch] text-silver lg:block">
                {platform.ownership}
              </p>
              <p data-reveal-rest className="mt-8 hidden items-baseline gap-3 lg:flex">
                <span className="t-display-m text-lumen">{facts.engineersImpacted.value}</span>
                <span className="mono-label max-w-[22ch] text-silver-2">engineers in the organisation, {platform.period}</span>
              </p>
              <div data-reveal-rest>
                <StackLabels items={platform.stack} />
                <ArrowLink href={`/work/${platform.slug}`} className="mt-6 lg:mt-8">
                  Read the case study
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 04c: LEGO via Deloitte Digital, where the page turns warm-white */}
      <div data-chapter="work-continuity" data-theme="light" data-light-sweep className="work-continuity relative z-[2] bg-warm text-ink">
        <div className="work-continuity-inner container-x">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-12">
            <div data-chapter-copy className="lg:col-span-5">
              <Eyebrow index="06">
                {continuity.client} · {continuity.via} · {continuity.role}
              </Eyebrow>
              <MaskedHeadline text={continuity.headline} className="mt-6 text-ink" />
              <p data-reveal-rest className="t-lead mt-6 hidden max-w-[40ch] text-[#3f434c] lg:block">
                {continuity.ownership}
              </p>
              <p data-reveal-rest className="mt-8 hidden items-baseline gap-3 lg:flex">
                <span className="t-display-m text-ink">{facts.zeroDisruption.value}</span>
                <span className="mono-label max-w-[24ch] text-[#5b5f69]">{facts.zeroDisruption.label}</span>
              </p>
              <div data-reveal-rest>
                <StackLabels items={continuity.stack} />
                <ArrowLink href={`/work/${continuity.slug}`} className="mt-6 lg:mt-8">
                  Read the case study
                </ArrowLink>
              </div>
            </div>
            <div className="hidden lg:col-span-7 lg:block lg:pt-6">
              <ContinuityVisual motion={motionEnabled} light id="home-continuity" />
              <p className="mono-label mt-4 text-[#5b5f69]">Conceptual illustration. Not a record of the programme&apos;s architecture.</p>
            </div>
          </div>

          {/* Separate LEGO.com result, kept distinct from the migration */}
          <div className="mt-[7vh] grid gap-6 border-t border-line pt-8 lg:mt-[9vh] lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8 lg:pt-10">
            <div className="lg:col-span-5">
              <Eyebrow>Separate engagement · {legoSelfReturns.role} · {legoSelfReturns.via}</Eyebrow>
              <p className="mono-label mt-2 text-[#5b5f69]">{legoSelfReturns.period}</p>
            </div>
            <div className="lg:col-span-7">
              <p className="t-display-m text-ink">
                <span className="text-signal-deep">{legoSelfReturns.value}</span> {legoSelfReturns.label}.
              </p>
              <p className="t-body mt-4 hidden max-w-[60ch] text-[#3f434c] lg:block">{legoSelfReturns.statement}</p>
              <p className="mono-label mt-3 text-[#5b5f69]">
                A different engagement from the marketing-platform migration above; it is not an outcome of that migration.
              </p>
              <ArrowLink href={legoSelfReturns.href} className="mt-5">
                See the engagement
              </ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

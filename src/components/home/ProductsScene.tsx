"use client";

import { useRef, type ReactNode } from "react";
import { products, studio, walkthroughDisclaimer } from "@/content/products";
import { gsap, BREAKPOINTS, useSceneGSAP } from "@/lib/motion/gsap";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { CocoCardPreview, FixabeePreview } from "@/components/products/previews";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Scene 05: from platform engineering to products. Warm-white chapter with
 * large device compositions that move from a presentation angle into a stable,
 * readable orientation. Desktop overlaps a phone pair with a back-office
 * panel; mobile shows one readable device at a time with no tilt.
 */

function Phone({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return (
    <figure className={`m-0 ${className}`} data-device>
      <div className="rounded-[2.6rem] bg-ink p-[7px] shadow-[0_40px_80px_-40px_rgba(5,5,7,0.55)]">
        <div className="aspect-[9/19.2] w-full overflow-hidden rounded-[2.2rem] bg-white" aria-hidden="true">
          {children}
        </div>
      </div>
      <figcaption className="mono-label mt-3 text-[#5b5f69]">{label}</figcaption>
    </figure>
  );
}

export function ProductsScene() {
  const ref = useRef<HTMLElement>(null);
  const motionEnabled = useMotionEnabled();
  const [coco, fixabee] = products;

  useSceneGSAP(
    () => {
      if (!motionEnabled || !ref.current) return;
      const root = ref.current;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      gsap.fromTo(
        q("[data-reveal-line]"),
        { yPercent: 110 },
        {
          yPercent: 0,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: q("[data-copy]"), start: "top 85%", end: "top 50%", scrub: 0.4 },
        },
      );
      gsap.fromTo(
        q("[data-reveal-rest]"),
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: { trigger: q("[data-copy]"), start: "top 75%", end: "top 40%", scrub: 0.4 },
        },
      );

      mm.add({ desktop: BREAKPOINTS.desktop, mobile: BREAKPOINTS.mobile }, (ctx) => {
        const stage = q("[data-devices]")[0];
        if (!stage) return;
        if (ctx.conditions?.desktop) {
          // Presentation angle → stable orientation over the first half of the stage.
          const st = { trigger: stage, start: "top 85%", end: "top 25%", scrub: 0.6 };
          gsap.fromTo(
            q("[data-device='panel']"),
            { rotateY: -12, rotateX: 4, y: 40, autoAlpha: 0, transformPerspective: 1600 },
            { rotateY: 0, rotateX: 0, y: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: st },
          );
          gsap.fromTo(
            q("[data-device='phone-1']"),
            { rotateY: -18, rotateX: 6, y: 90, autoAlpha: 0, transformPerspective: 1600 },
            { rotateY: 0, rotateX: 0, y: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: st },
          );
          gsap.fromTo(
            q("[data-device='phone-2']"),
            { rotateY: 16, rotateX: 6, y: 140, autoAlpha: 0, transformPerspective: 1600 },
            { rotateY: 0, rotateX: 0, y: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: st },
          );
        } else {
          // One readable device at a time: a simple rise, no tilt.
          q("[data-device]").forEach((el) => {
            gsap.fromTo(
              el,
              { y: 40, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                ease: "power2.out",
                scrollTrigger: { trigger: el, start: "top 90%", end: "top 60%", scrub: 0.5 },
              },
            );
          });
        }
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [motionEnabled], lazy: "150% 0px" },
  );

  return (
    <section
      ref={ref}
      id="products-scene"
      data-chapter="products"
      data-theme="light"
      aria-labelledby="products-heading"
      className="relative z-[1] bg-warm text-ink"
    >
      <div className="container-x py-[8vh] lg:py-[12vh]">
        <div data-copy className="max-w-4xl">
          <Eyebrow index="07">From platforms to products · {studio.name}</Eyebrow>
          <h2 id="products-heading" className="t-display-l mt-6 text-ink">
            <span className="mask-line">
              <span className="block" data-reveal-line>
                From the first idea.
              </span>
            </span>
            <span className="mask-line">
              <span className="block" data-reveal-line>
                To the product in your hand.
              </span>
            </span>
          </h2>
          <p data-reveal-rest className="t-lead mt-6 max-w-[52ch] text-[#3f434c]">
            {studio.description}
          </p>
          <div data-reveal-rest className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/products">Explore the products</ButtonLink>
            <ArrowLink href="/products#thecococard">Try the walkthroughs</ArrowLink>
          </div>
        </div>

        {/* Desktop: overlapping composition. Mobile: stacked devices. */}
        <div data-devices className="products-stage relative mt-10 lg:mt-20">
          <div className="hidden lg:block">
            <div className="relative h-[min(64vh,600px)]" style={{ perspective: "1600px" }}>
              <div
                data-device="panel"
                className="absolute left-0 top-0 w-[62%] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_50px_100px_-60px_rgba(5,5,7,0.5)]"
                style={{ aspectRatio: "16 / 10" }}
                aria-hidden="true"
              >
                <CocoCardPreview view="business" />
              </div>
              <div data-device="phone-1" className="absolute left-[46%] top-[16%] w-[min(19vw,290px)]">
                <div className="rounded-[2.6rem] bg-ink p-[7px] shadow-[0_40px_80px_-40px_rgba(5,5,7,0.6)]">
                  <div className="aspect-[9/19.2] w-full overflow-hidden rounded-[2.2rem] bg-white" aria-hidden="true">
                    <CocoCardPreview />
                  </div>
                </div>
              </div>
              <div data-device="phone-2" className="absolute left-[72%] top-[4%] w-[min(19vw,290px)]">
                <div className="rounded-[2.6rem] bg-ink p-[7px] shadow-[0_40px_80px_-40px_rgba(5,5,7,0.6)]">
                  <div className="aspect-[9/19.2] w-full overflow-hidden rounded-[2.2rem] bg-white" aria-hidden="true">
                    <FixabeePreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:hidden">
            <Phone label={`${coco.name} · customer card`} className="mx-auto w-full max-w-[264px] sm:max-w-[300px]">
              <CocoCardPreview />
            </Phone>
            <Phone label={`${fixabee.name} · local services`} className="mx-auto hidden w-full max-w-[300px] sm:block">
              <FixabeePreview />
            </Phone>
          </div>
          <p className="mono-label mt-6 max-w-[70ch] text-[#5b5f69]">{walkthroughDisclaimer}</p>
        </div>

        {/* Names and routes only; the descriptions and walkthroughs live on /products. */}
        <ul className="mt-10 grid gap-6 border-t border-line pt-8 md:grid-cols-2 md:gap-x-16 lg:mt-12">
          {[coco, fixabee].map((p) => (
            <li key={p.id}>
              <h3 className="t-display-s text-ink">{p.name}</h3>
              <p className="mono-label mt-1 text-[#5b5f69]">{p.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                <ArrowLink href={`/products#${p.id}`}>Walkthrough</ArrowLink>
                {p.url ? (
                  <ArrowLink href={p.url} external>
                    Visit {p.urlLabel}
                  </ArrowLink>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

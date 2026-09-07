"use client";

import { useRef } from "react";
import { site } from "@/content/site";
import { gsap, useSceneGSAP } from "@/lib/motion/gsap";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { Poster } from "@/components/scene/SignatureStage";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Download, LinkedIn, Mail, Pin } from "@/components/ui/Icons";

/**
 * Scene 08: the closing frame. A quieter return of the opening motif and
 * large, direct contact actions that never hide behind hover or motion.
 */
export function ClosingScene() {
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
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, stagger: 0.05, ease: "power2.out", scrollTrigger: { trigger: q("[data-copy]"), start: "top 75%", end: "top 40%", scrub: 0.4 } },
      );
      gsap.fromTo(
        q("[data-closing-still]"),
        { opacity: 0.35 },
        { opacity: 1, ease: "none", scrollTrigger: { trigger: ref.current, start: "top 80%", end: "bottom bottom", scrub: true } },
      );
    },
    { scope: ref, dependencies: [motionEnabled], lazy: "150% 0px" },
  );

  return (
    <section
      ref={ref}
      id="contact-scene"
      data-chapter="closing"
      data-theme="dark"
      aria-labelledby="closing-heading"
      className="relative z-[1] overflow-hidden bg-ink text-lumen"
    >
      <div data-closing-still className="absolute inset-0" aria-hidden="true">
        <Poster which="k3" className="opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,7,0.55),rgba(5,5,7,0.2)_45%,rgba(5,5,7,0.9))]" />
      </div>
      <div className="container-x relative flex min-h-[62svh] flex-col justify-center py-[9vh] lg:min-h-[76svh] lg:py-[12vh]">
        <div data-copy>
          <Eyebrow index="10">Let&apos;s build what&apos;s next</Eyebrow>
          <h2 id="closing-heading" className="t-display-xl mt-6 text-lumen">
            <span className="mask-line">
              <span className="block" data-reveal-line>
                Let&apos;s build
              </span>
            </span>
            <span className="mask-line">
              <span className="block pl-[0.4em]" data-reveal-line>
                what comes next.
              </span>
            </span>
          </h2>
          <p data-reveal-rest className="t-lead mt-8 max-w-[44ch] text-silver">
            Opportunities, projects and ideas are all welcome. Email is quickest; LinkedIn works too.
          </p>
        </div>
        <ul data-reveal-rest className="mt-12 grid gap-x-12 gap-y-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <p className="eyebrow">Email</p>
            <a href={`mailto:${site.email}`} className="mt-3 inline-flex items-center gap-2 text-[1.05rem] font-medium text-lumen hover:text-signal">
              <Mail /> {site.email}
            </a>
            <div className="mt-3">
              <CopyEmail email={site.email} />
            </div>
          </li>
          <li>
            <p className="eyebrow">LinkedIn</p>
            <a
              href={site.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-[1.05rem] font-medium text-lumen hover:text-signal"
            >
              <LinkedIn /> {site.linkedinLabel}
            </a>
          </li>
          <li>
            <p className="eyebrow">CV</p>
            <a href={site.cvHref} className="mt-3 inline-flex items-center gap-2 text-[1.05rem] font-medium text-lumen hover:text-signal">
              <Download /> Download CV (PDF)
            </a>
          </li>
          <li>
            <p className="eyebrow">Location</p>
            <p className="mt-3 inline-flex items-center gap-2 text-[1.05rem] font-medium text-lumen">
              <Pin /> {site.location}
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}

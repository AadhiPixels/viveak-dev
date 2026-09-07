"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { nav, secondaryNav, site } from "@/content/site";
import { Close, Download, LinkedIn, Mail } from "@/components/ui/Icons";
import { MotionToggle } from "@/components/motion/MotionToggle";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        document.documentElement.style.overflow = "";
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label="Site menu"
      data-theme="dark"
      className="m-0 h-[100dvh] max-h-none w-full max-w-none bg-ink p-0 text-lumen backdrop:bg-ink/60 open:flex open:flex-col"
    >
      <div className="container-x flex h-14 items-center justify-between">
        <span className="text-[0.9rem] font-medium">{site.name}</span>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost min-h-9 px-2"
          aria-label="Close menu"
        >
          <Close />
        </button>
      </div>
      <nav aria-label="Mobile" className="container-x mt-6 flex-1">
        <ul className="flex flex-col">
          {[...nav, ...secondaryNav].map((item, i) => (
            <li key={item.href} className="border-b border-line">
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-baseline gap-4 py-4 text-[2rem] font-display font-semibold tracking-[-0.03em]"
              >
                <span className="mono-label text-muted">0{i + 1}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={site.cvHref} className="btn btn-primary gap-2" onClick={onClose}>
            <Download /> Download CV
          </a>
          <a href={`mailto:${site.email}`} className="btn btn-secondary gap-2">
            <Mail /> Email
          </a>
          <a
            href={site.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary gap-2"
          >
            <LinkedIn /> LinkedIn
          </a>
        </div>
      </nav>
      <div className="container-x safe-pb flex items-center justify-between gap-4 py-5">
        <MotionToggle />
        <span className="mono-label text-muted">{site.location}</span>
      </div>
    </dialog>
  );
}

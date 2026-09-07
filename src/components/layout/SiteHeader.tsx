"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { nav, secondaryNav, site } from "@/content/site";
import { Monogram } from "@/components/ui/Monogram";
import { Download, Menu } from "@/components/ui/Icons";
import { MobileMenu } from "./MobileMenu";

type Theme = "dark" | "light" | "graphite";

/**
 * Compact fixed header. It reads the theme of the chapter beneath it so that
 * contrast holds across dark and warm-white chapters, and gains a translucent
 * backdrop once the page has scrolled.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which chapter sits under the header line.
  useEffect(() => {
    const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    const headerH = headerRef.current?.offsetHeight ?? 56;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const t = (entry.target as HTMLElement).dataset.theme as Theme | undefined;
            if (t) setTheme(t);
          }
        }
      },
      {
        // A one pixel band just below the header.
        rootMargin: `-${headerH - 1}px 0px -${Math.max(0, window.innerHeight - headerH)}px 0px`,
        threshold: 0,
      },
    );
    chapters.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        ref={headerRef}
        data-theme={theme}
        className={`fixed inset-x-0 top-0 z-40 text-fg transition-[background-color,box-shadow] duration-300 ${
          scrolled ? "backdrop-blur-md" : ""
        }`}
        style={{
          backgroundColor: scrolled ? "color-mix(in oklab, var(--bg) 72%, transparent)" : "transparent",
          boxShadow: scrolled ? "0 1px 0 var(--line)" : "none",
        }}
      >
        <div className="container-x flex h-14 items-center justify-between gap-4 md:h-16">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-fg"
            aria-label={`${site.name}, home`}
          >
            <Monogram size={26} className="shrink-0" />
            <span className="hidden truncate text-[0.9rem] font-medium tracking-[-0.01em] xs:inline">
              {site.name}
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`rounded-full px-3.5 py-2 text-[0.9rem] font-medium transition-colors hover:text-fg ${
                      isActive(item.href) ? "text-fg" : "text-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {secondaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`rounded-full px-3.5 py-2 text-[0.9rem] font-medium transition-colors hover:text-fg ${
                      isActive(item.href) ? "text-fg" : "text-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={site.cvHref}
              className="btn btn-secondary min-h-9 gap-2 px-3.5 py-2 text-[0.85rem]"
              aria-label="Download CV (PDF)"
            >
              <Download />
              <span className="hidden sm:inline">Download CV</span>
              <span className="sm:hidden">CV</span>
            </a>
            <button
              type="button"
              className="btn btn-ghost min-h-9 px-2 lg:hidden"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

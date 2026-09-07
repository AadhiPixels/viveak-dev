import Link from "next/link";
import { nav, secondaryNav, site } from "@/content/site";
import { Monogram } from "@/components/ui/Monogram";
import { Download, LinkedIn, Mail } from "@/components/ui/Icons";
import { MotionToggle } from "@/components/motion/MotionToggle";

export function SiteFooter() {
  return (
    <footer data-theme="dark" data-chapter="footer" className="bg-ink text-lumen">
      <div className="container-x border-t border-line py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <Monogram size={30} />
              <div>
                <p className="text-[0.95rem] font-medium">{site.name}</p>
                <p className="mono-label text-muted">{site.roleLine}</p>
              </div>
            </div>
            <p className="t-body mt-6 text-muted">
              {site.intro} Based in {site.location}.
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="eyebrow mb-4">Pages</p>
            <ul className="space-y-1">
              {[...nav, ...secondaryNav].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-block py-1.5 text-[0.95rem] text-silver hover:text-lumen">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="eyebrow mb-4">Connect</p>
            <ul className="space-y-2.5">
              <li>
                <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 py-1 text-[0.95rem] text-silver hover:text-lumen">
                  <Mail /> {site.email}
                </a>
              </li>
              <li>
                <a
                  href={site.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 py-1 text-[0.95rem] text-silver hover:text-lumen"
                >
                  <LinkedIn /> {site.linkedinLabel}
                </a>
              </li>
              <li>
                <a href={site.cvHref} className="inline-flex items-center gap-2 py-1 text-[0.95rem] text-silver hover:text-lumen">
                  <Download /> Download CV (PDF)
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-6 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="mono-label text-muted">
            © {new Date().getFullYear()} {site.name}. {site.concept}. Built with Next.js, GSAP and Three.js.
          </p>
          <MotionToggle />
        </div>
      </div>
    </footer>
  );
}

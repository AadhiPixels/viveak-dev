import type { Metadata, ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import type { ComponentType } from "react";
import { products, studio } from "@/content/products";
import type { Product } from "@/content/types";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Check } from "@/components/ui/Icons";
import { CocoCardWalkthrough } from "@/components/products/CocoCardWalkthrough";
import { FixabeeWalkthrough } from "@/components/products/FixabeeWalkthrough";

const title = "Products";
const description =
  "AadhiPixels products: TheCocoCard and Fixabee. Verified product features as the CV states them, live links, and conceptual walkthroughs with synthetic data.";

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata({ title, description, path: "/products" }, parent);
}

const WALKTHROUGHS: Record<string, ComponentType<{ className?: string }>> = {
  thecococard: CocoCardWalkthrough,
  fixabee: FixabeeWalkthrough,
};

/** "Independent product studio where I..." reads as a sentence after the studio name. */
function asClause(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

export default function ProductsPage() {
  return (
    <div data-chapter="products" data-theme="light" className="bg-warm text-ink">
      <section className="container-x pt-28 pb-16 md:pt-40 md:pb-24" aria-labelledby="products-heading">
        <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Products" }]} />
        <Eyebrow className="mt-12">
          Products · {studio.name}
        </Eyebrow>
        <h1 id="products-heading" className="t-display-l mt-6 max-w-[15ch]">
          From the first idea. To the product in your hand.
        </h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-x-10">
          <p className="t-lead max-w-[58ch] text-ink lg:col-span-7">
            <span className="font-medium">{studio.name}</span> is an {asClause(studio.description)}
          </p>
          <p className="t-body max-w-[46ch] text-muted lg:col-span-4 lg:col-start-9">
            Two products are live. Each section states the product&apos;s features as the CV describes them, links to
            the live site, and adds a conceptual walkthrough built for this portfolio: synthetic data, illustrative
            rules, nothing connected to the real services.
          </p>
        </div>
      </section>

      {products.map((product, index) => (
        <ProductSection key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}

function ProductSection({ product, index }: { product: Product; index: number }) {
  const Walkthrough = WALKTHROUGHS[product.id];
  const headingId = `${product.id}-heading`;
  return (
    <section id={product.id} aria-labelledby={headingId} className="border-t border-line scroll-mt-24">
      <div className="container-x py-20 md:py-28">
        <div className="grid gap-14 xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] xl:gap-x-16">
          <div className="xl:sticky xl:top-28 xl:self-start">
            <Eyebrow index={String(index + 1).padStart(2, "0")}>Live product</Eyebrow>
            <h2 id={headingId} className="t-display-m mt-6">
              {product.name}
            </h2>
            <p className="t-lead mt-4 text-ink">{product.tagline}</p>
            <p className="t-body mt-5 max-w-[48ch] text-muted">{product.description}</p>

            <div className="mt-10 border-t border-line pt-6">
              <p className="eyebrow">Verified product features</p>
              <ul className="mt-4 space-y-2.5">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[0.95rem] leading-relaxed">
                    <Check className="mt-[0.35rem] shrink-0 text-signal-deep" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="mono-label mt-5 max-w-[40ch] text-muted">
                As stated in the CV. The live site at {product.urlLabel} was checked during the build.
              </p>
            </div>

            {product.url ? (
              <ArrowLink href={product.url} external className="mt-8">
                Visit {product.urlLabel}
              </ArrowLink>
            ) : null}
          </div>

          <div className="min-w-0">{Walkthrough ? <Walkthrough /> : null}</div>
        </div>
      </div>
    </section>
  );
}

import { Section } from "../components/Section";

const PRODUCTS = [
  {
    emoji: "🥥",
    name: "TheCocoCard",
    url: "https://thecococard.com",
    live: true,
    blurb:
      "Digital loyalty for local businesses — business back-office, consumer PWA, staff till flow, Flutter app, two Firebase backends, cross-app Playwright E2E.",
    stack: "Next.js · PWA · Flutter · Firebase · Playwright",
  },
  {
    emoji: "🐝",
    name: "Fixabee",
    url: "https://fixabee.com",
    live: true,
    blurb:
      "Local-services marketplace — bookings, provider onboarding with Stripe Connect payouts, postcode discovery, referrals, admin console, dev/test/prod environments.",
    stack: "Flutter · Firebase · Stripe Connect",
  },
  {
    emoji: "🌴",
    name: "TheThirdCoconut",
    url: "https://thethirdcoconut.com",
    live: true,
    blurb: "Brand and marketing site for the Coco estate — designed, built and operated solo.",
    stack: "Next.js 16 · Vercel",
  },
  {
    emoji: "🧪",
    name: "The prototype shelf",
    url: null,
    live: false,
    blurb:
      "TakeMineFree, BuyMyPostcode, DoDay, ClimaGo, ShouldIGo, GrowMeAForest — plus mobile-game experiments (AlphaMerge, StayStill, One-Minute Challenge). Ideas become working software fast here.",
    stack: "Rapid prototyping · Flutter · Firebase",
  },
];

export function Products() {
  return (
    <Section id="products" no="03" title="The night shift">
      <p className="section-lede">
        <strong>AadhiPixels</strong> is my one-person product studio. Everything below was designed,
        built, deployed and operated by me — which means when something pages at 2am,{" "}
        <strong>it pages me</strong>. That changes how you build.
      </p>
      <div className="prod-grid">
        {PRODUCTS.map((p) =>
          p.url ? (
            <a key={p.name} className="prod card" href={p.url} target="_blank" rel="noopener">
              <div className="prod-top">
                <span className="prod-emoji">{p.emoji}</span>
                <h3>{p.name}</h3>
                <span className={"pill" + (p.live ? " pill-live" : "")}>{p.live ? "LIVE" : "LAB"}</span>
              </div>
              <p>{p.blurb}</p>
              <span className="prod-stack">{p.stack}</span>
            </a>
          ) : (
            <div key={p.name} className="prod card">
              <div className="prod-top">
                <span className="prod-emoji">{p.emoji}</span>
                <h3>{p.name}</h3>
                <span className="pill">LAB</span>
              </div>
              <p>{p.blurb}</p>
              <span className="prod-stack">{p.stack}</span>
            </div>
          )
        )}
      </div>
    </Section>
  );
}

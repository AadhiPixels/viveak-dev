import type { Product } from "./types";

export const studio = {
  name: "AadhiPixels",
  /** Title exactly as the CV section heading frames it. No period is given on the CV. */
  title: "Founder & Product Engineer",
  description:
    "Independent product studio where I identify product opportunities, then design, architect, build, deploy and operate the software myself, alongside smaller experiments taken from concept to working product.",
  source: { kind: "cv", ref: "Founder & Product Engineer, AadhiPixels" } as const,
};

export const products: Product[] = [
  {
    id: "thecococard",
    name: "TheCocoCard",
    tagline: "Digital loyalty for local businesses.",
    description:
      "Digital loyalty platform for local businesses. Business back-office, consumer PWA and Flutter app on Firebase backends, deployed on Vercel and Firebase with cross-app Playwright E2E tests.",
    features: [
      "Business back-office",
      "Consumer PWA and Flutter app",
      "Firebase backends",
      "Deployed on Vercel and Firebase",
      "Cross-app Playwright E2E tests",
    ],
    url: "https://thecococard.com",
    urlLabel: "thecococard.com",
    urlSource: {
      kind: "verified-url",
      ref: "https://thecococard.com fetched during the build; live product site titled 'Coco Card - one loyalty card for the high street'.",
    },
    source: { kind: "cv", ref: "Founder & Product Engineer, AadhiPixels: TheCocoCard" },
  },
  {
    id: "fixabee",
    name: "Fixabee",
    tagline: "Local services. Sorted.",
    description:
      "Local-services marketplace in Flutter and Firebase. Bookings, provider onboarding with Stripe payouts, postcode-based discovery and referrals, shipped through full dev/test/prod release environments.",
    features: [
      "Bookings",
      "Provider onboarding with Stripe payouts",
      "Postcode-based discovery",
      "Referrals",
      "Full dev/test/prod release environments",
    ],
    url: "https://www.fixabee.com",
    urlLabel: "fixabee.com",
    urlSource: {
      kind: "verified-url",
      ref: "https://www.fixabee.com fetched during the build; live product site crediting Aadhi Pixels Ltd, with app store links.",
    },
    source: { kind: "cv", ref: "Founder & Product Engineer, AadhiPixels: Fixabee" },
  },
];

/**
 * Walkthrough disclaimers. The demos on this site are illustrative portfolio
 * interactions with synthetic data. They are not the live products and their
 * sample business rules are not confirmed live-product behaviour.
 */
export const walkthroughDisclaimer =
  "Conceptual walkthrough with synthetic data. Sample business rules are illustrative and not confirmed live-product behaviour. Nothing here creates real accounts, payments, payouts or bookings.";

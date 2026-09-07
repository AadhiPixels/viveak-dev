# Claim and source map

Developer-facing. Every public claim on viveakv.dev traces to one of:

- **CV**: the CV supplied in Sep 2026, republished as `public/Viveak-Vadivelkarasan-CV.pdf` from the
  HTML source in `cv/` (`npm run cv:build`) with the current employer's name withheld. Every other
  line of the PDF is the supplied text; served at `/cv`.
- **Verified URL**: fetched during the build on 6 Sep 2026.
- **Authored**: a conceptual explanation written for this site. Never presented as history.

Content lives in `src/content/*.ts`; each record carries a `source` field. This file lists the
claims that appear in headline positions and the qualifiers that must survive editing.

## Employer naming

At Viveak's request (Sep 2026) the current employer is not named anywhere on the site. The role is
described as "my latest project" / "Latest project", and the case study lives at
`/work/external-api-platform`. The Deloitte Digital client programmes (LEGO, Dyson, UK Government)
and the earlier employers remain named as on the CV. Two statements about the current role come
from Viveak directly rather than the CV and are marked `note` in the content layer: leading the
team "across multiple parallel workstreams" and "working closely with product, delivery and the
technical architect". The downloadable PDF applies the same rule: the role is headed "Current
employer (confidential)", the profile and the impact table say "on my latest project", the role
summary carries the two statements above and drops the product-specific word that identified the
company; every other line matches the supplied CV. The earlier CV that named the employer is not
kept in the repository, but it remains in the commit history before 7 Sep 2026: squash or rewrite
that history before making the repository public.

## Identity

| Claim | Source | Qualifier |
| --- | --- | --- |
| Viveak Vadivelkarasan, London, UK | CV header | |
| Tech Lead · Distributed Systems · External APIs | CV title line ("Tech Lead \| Distributed Systems · External API Platforms · AWS & Kubernetes") | Shortened for the hero; full line on /experience |
| viveak.03@gmail.com, linkedin.com/in/viveakv, viveakv.dev | CV header | Telephone number not republished |
| 9+ years building distributed backend platforms and external APIs | CV executive profile | Keep "9+" |
| BSc (Hons) Computer Science, City, University of London, 2017 | CV education | |
| AWS Certified Solutions Architect | CV certification | No level, date or validity claimed |

## Headline facts

| Claim | Source | Qualifier |
| --- | --- | --- |
| ~1M events/day through the webhook delivery platform | CV selected impact; current-role bullet 1 | Approximate; the service he designed and built on his latest project; never shown as live telemetry |
| Leading 9 engineers | CV executive profile; current-role summary | Technical lead of the team, owns architecture and standards; "parallel workstreams" and the product/delivery/architect collaboration are Viveak's own words (Sep 2026) |
| 300+ engineers impacted by the EC2-to-Kubernetes migration | CV selected impact; Dyson bullet | Organisation size, not a team he managed; via Deloitte Digital; no cost-saving percentage |
| ~30% fewer customer-service contacts after automating self-returns on LEGO.com | CV selected impact; LEGO.com bullet | Separate engagement (Full-Stack Developer, Jun 2020 - Jun 2021); not an outcome of the SFMC migration |
| 0 customer-visible disruptions during LEGO's Salesforce Marketing Cloud migration | CV selected impact; LEGO SFMC bullet | Team of four engineers; via Deloitte Digital |
| 5 major third-party clients, with more onboarding | CV current-role summary | |

## Roles and chronology

All dates and titles are transcribed from the CV in `src/content/experience.ts`:

- Latest project (employer not named on the site), Tech Lead, External APIs, Jul 2025 - Present, London.
- Deloitte Digital, Manager, Technology Consulting, Jun 2018 - Jul 2025, London; promoted through
  Engineer, Senior Engineer, Lead Engineer and Manager. Client programmes: LEGO Customer Data
  Platform (Technical Lead, Jul 2024 - Jul 2025), UK Government (Technical Lead Engineer,
  Feb 2023 - Jul 2024), LEGO Salesforce Marketing Cloud Migration (Lead Engineer,
  Jun 2021 - Dec 2022), LEGO.com (Full-Stack Developer, Jun 2020 - Jun 2021), Dyson
  (Lead Engineer, Frontend Engineer until Nov 2019, Jun 2018 - May 2020).
- Gentrack, Software Engineer, 2018. Accenture, Application Developer, 2017 - 2018.
  Tullett Prebon, Software Engineer Intern, 2016. Accenture, Industrial Placement, 2015 - 2016.

LEGO, Dyson and UK Government are Deloitte client programmes. The site states this on every
chapter, case study and experience entry ("via Deloitte Digital").

## Products

| Claim | Source |
| --- | --- |
| AadhiPixels: independent product studio; identifies opportunities, designs, architects, builds, deploys and operates the software | CV |
| TheCocoCard: digital loyalty platform for local businesses; business back-office, consumer PWA and Flutter app, Firebase backends, Vercel and Firebase deployment, cross-app Playwright E2E tests | CV |
| thecococard.com | Verified URL (live site titled "Coco Card - one loyalty card for the high street") |
| Fixabee: local-services marketplace in Flutter and Firebase; bookings, provider onboarding with Stripe payouts, postcode-based discovery, referrals, dev/test/prod release environments | CV |
| fixabee.com | Verified URL (live site, footer credits Aadhi Pixels Ltd) |

The product walkthroughs on /products and the device compositions on the homepage are
**authored** conceptual walkthroughs with synthetic data. Sample business rules (stamp
thresholds, reward names, service prices, provider names) are illustrative and labelled so.
Nothing on the site claims revenue, adoption, ratings or download figures.

## Authored explanations

- Homepage chapter visuals (routed delivery, fragments to platform, continuity handover) are
  conceptual illustrations, labelled in place. They are not employer architecture diagrams.
- The webhook-delivery lab is an independently authored educational simulation. Its retry limits,
  backoff, circuit thresholds, cooldown and rate limits are illustrative parameters documented in
  `docs/SIMULATION.md`. It is not connected to employer systems and does not model any employer's
  configuration.
- The HMAC demonstration uses a public, demo-only key and Web Crypto in the browser.

## Deliberately absent

No testimonials, awards, rates, notice period, references, availability badge, portrait,
personality traits, invented biography, telephone number, revenue or adoption figures,
historical trade-offs or lessons attributed to Viveak, or social links beyond LinkedIn.

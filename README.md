# Viveak Vadivelkarasan · Systems in Motion

The source of [viveakv.dev](https://viveakv.dev): a cinematic, scroll-driven portfolio with a
signature WebGL sculpture, three case studies, working product walkthroughs, an interactive
webhook-delivery lab, a small 3D arcade game (`/play`, see `docs/GAME.md`) and a downloadable CV. Every career claim traces to the CV
(`docs/CLAIMS.md`); demos are labelled synthetic.

## Quick start

```bash
npm ci            # if npm 10 fails with "edgesOut", use: npx npm@11 ci
npm run dev       # http://localhost:3000
```

Node 20.9+ (built and tested with Node 22). No environment variables are required.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint (flat config) and `tsc --noEmit` |
| `npm test` | Vitest unit tests (simulation engine, HMAC, walkthrough reducers, ribbon geometry, game engine, SEO helpers) |
| `npm run test:e2e` | Playwright end-to-end suite against a production build on port 3400 (`npm run build` first) |
| `npm run assets:posters` | Re-render the hero poster images from the live scene (dev server on 3000 required) |
| `npm run cv:build` / `npm run cv:check` | Print `cv/index.html` to `public/Viveak-Vadivelkarasan-CV.pdf` with Playwright's Chromium (fails on a third page, an em or en dash, or the withheld employer name); `cv:check` validates without writing |
| `npm run qa:screens` / `npm run qa:record` | Responsive screenshot set and scroll recordings into `qa/` |
| `npm run qa:audit` | Metadata, target-size and axe-core audit of every route at phone and desktop widths (production server on 3400) |

## Stack (resolved versions)

Next.js 16.3.4 (App Router, Turbopack), React 19.2.8, TypeScript 5.9.3 (strict), Tailwind CSS
4.3.3, GSAP 3.15.0 + @gsap/react 2.1.2 (ScrollTrigger, gsap.matchMedia), three 0.185.1 with
@react-three/fiber 9.7.0 and @react-three/drei 10.7.8, Vitest 4.1.11, @playwright/test 1.56.0,
sharp 0.35.4. Fonts are self-hosted OFL files (Inter Tight, Geist Sans, Geist Mono) in
`src/app/fonts`. No CMS, database, analytics or third-party scripts.

## Repository map

```
src/app/                 routes: (site) pages, (tools)/poster renderer, sitemap, robots, OG image
src/content/             the typed content layer: site, experience, work, products, facts (with sources)
src/components/home/     homepage scenes 01 to 08 and their SVG visuals
src/components/scene/    signature sculpture: ribbon geometry, R3F scene, compositions, poster stage
src/components/lab/      webhook-delivery lab UI (state comes only from src/lib/sim)
src/components/products/ walkthrough UIs, previews, device frames
src/components/game/     Throughput: R3F scene, session, HUD and overlays
src/lib/game/            deterministic game engine and route
src/components/work/     work index, case-study sections, conceptual diagrams
src/components/layout/   header, mobile menu, footer, skip links
src/components/motion/   motion preference provider and toggle
src/lib/motion/          GSAP registration, useSceneGSAP, preference store
src/lib/sim/             deterministic simulation engine, presets, config
src/lib/crypto/          Web Crypto HMAC demo
src/lib/walkthroughs/    CocoCard and Fixabee reducers
tests/unit, tests/e2e    Vitest and Playwright suites
scripts/                 poster generation, screenshot and recording helpers, sync helpers
docs/                    storyboard, motion spec, claims map, simulation spec, conventions, QA
public/                  CV PDF (built from cv/, served at /cv), poster images
cv/                      CV source (index.html, styles.css, Inter font files); `npm run cv:build` prints the PDF
```

## How the motion system works

- One authoritative scroll-progress source: the hero's pinned ScrollTrigger writes
  `heroProgress.target`; the WebGL scene (or the poster fallback) reads it. Nothing else drives
  the sculpture.
- Scenes build their timelines with `useSceneGSAP` (GSAP context with `revertOnUpdate`), inside
  `gsap.matchMedia()` for desktop, mobile and a minimum-height condition, and only when
  `useMotionEnabled()` is true. Reduced motion (system preference or the site's setting,
  persisted in `localStorage["vv-motion"]` and mirrored to `<html data-motion>`) renders the
  resolved compositions in normal flow with no pins.
- The sculpture is procedural: ring data for four keyframes (knot, loosening, routes, settled)
  blended on the CPU and extruded as hard-edged ribbons; camera and group poses blend with the
  same beats (`src/components/scene/compositions.ts`). Posters for keyframes 0, 2 and 3 are
  rendered from the same scene and serve as the first frame and the no-WebGL fallback.
- Native scrolling only. No wheel or touch interception, no snapping, no nested pins.

See `docs/MOTION-SPEC.md` for the per-scene specification and `docs/STORYBOARD.md` for the
narrative.

## Content and truth

Edit facts in `src/content/*.ts`; never in components. `docs/CLAIMS.md` lists the qualifiers
that must survive (attribution of client programmes to Deloitte Digital, organisation size versus
team size, the separate LEGO.com result). The current employer is deliberately not named on the
site or in the downloadable CV; the CV is maintained as HTML and CSS in `cv/` and printed with
`npm run cv:build`. Copy is British English without em dashes.

## Deployment

The site is deployed on Vercel from the `main` branch of
[AadhiPixels/viveak-dev](https://github.com/AadhiPixels/viveak-dev); every push to `main` builds
production at https://viveakv.dev. It is a standard Next.js app: no custom server, no environment
variables, image optimisation not required (posters are pre-encoded WebP/AVIF). `vercel.json` only
pins the Next.js framework preset and `package.json` pins Node 22. `/cv` redirects to the PDF in
`public/` with an attachment header (see `next.config.ts`). The `/poster` route is disabled in
production unless `POSTER_ROUTE=1` is set.

## Verification status

See `docs/QA-REPORT.md` for what was tested, the lab measurements and their conditions, and the
known limitations.

# QA results

End-to-end coverage, responsive and visual captures, and lab performance measurements for
the production build. Everything below was run on 7 September 2026 inside a 2 vCPU, 8 GB
Linux container with no GPU. Nothing here is a measurement of a real device.

## Environment and versions

| Item | Value |
| --- | --- |
| Node | 22.22.2 |
| Next.js / React | 16.3.4 (Turbopack) / 19.2.8 |
| @playwright/test | 1.56.0 |
| Browser | Chromium 141.0.7390.37 (Playwright build 1194 in `/opt/pw-browsers`). Firefox and WebKit are not installed and were not run. |
| WebGL | Software rendering via SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`) |
| Lighthouse | 13.4.1 (`npx lighthouse@latest`, pointed at the Playwright Chromium through `CHROME_PATH`) |
| Vitest / sharp | 4.1.11 / 0.35.4 |
| Build | `next build` production output, served with `next start` on port 3400 (compression on) |

No dependencies were added. No `data-testid` attributes were added; the specs use roles, labels and
visible text, plus the existing `data-*` hooks (`data-signature-stage`, `data-walkthrough`,
`data-screen`, `data-stamps`, `data-booking-status`, `data-request`, `data-chapter`).

## How to run

```bash
npm run build                          # required first: the e2e config assumes .next exists
npm run start -- --port 3400           # optional; the config reuses a server on 3400 or starts one
npx playwright test                    # 73 tests, chromium project, 2 workers, retries 0
npx playwright show-report             # HTML report in playwright-report/

node scripts/qa-capture.mjs            # qa/screens/*.png + manifest.json (about 9 minutes)
node scripts/qa-record.mjs             # qa/video/home-1440x900.webm and home-390x844.webm

CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
npx --yes lighthouse@latest http://localhost:3400/ \
  --chrome-flags="--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist" \
  --output=json --output-path=qa/lighthouse-home-desktop.json \
  --only-categories=performance,accessibility,best-practices,seo --preset=desktop
# repeated without --preset=desktop for the mobile emulation, for /, /lab/webhook-delivery and /products,
# plus two homepage runs with --chrome-flags="--headless=new --no-sandbox --disable-3d-apis" (WebGL off)
```

`playwright.config.ts`: testDir `tests/e2e`, baseURL `http://localhost:3400`, chromium only,
`launchOptions.args` with the SwiftShader flags, `webServer` = `npm run start -- --port 3400` with
`reuseExistingServer: true`, retries 0, reporters `list` + `html` (`playwright-report/`), traces and
screenshots kept on failure. `PW_WORKERS=1` lowers concurrency on smaller machines.
`.gitignore` now covers `playwright-report/`, `test-results/`, `blob-report/` and `playwright/.cache/`.

## Playwright results (final build)

`npx playwright test` · 73 passed, 0 failed, 0 flaky, 5.1 minutes with 2 workers, on the final
build. An earlier full run on the pre-fix build passed 72 and exposed one timing flake in the
tab-order test (the skip links slide in over 150 ms and were measured too early); it was fixed by
polling the focused element's geometry, and the test then passed three consecutive repeats under
load before the final run.

| Spec | Tests | Result | What it covers |
| --- | --- | --- | --- |
| `home.spec.ts` | 18 | 18 pass | First screen at 1440x900 and 390x844 (h1, role line, tagline, intro, Explore my work, Download CV → `/cv`, Get in touch, Skip to selected work → `#selected-work`, all inside the viewport at scroll 0); one h1; banner, main, contentinfo and labelled navs; client-side header navigation (desktop links and the mobile menu dialog) verified with a window marker; closing section links after a full scroll; no console errors or page errors across load plus a full scroll pass (THREE.Clock deprecation ignored); no horizontal overflow at 320, 375, 390, 768, 1024, 1440, 1920 and 844x390, at the top and after a full scroll, including a per-element scan for boxes escaping the viewport outside any clipping ancestor. |
| `motion.spec.ts` | 4 | 4 pass | Reduced motion: no `.pin-spacer`, "Built to keep moving." in normal flow below the hero, stage not fixed, poster mode. Full motion: pin spacer, `html[data-motion="full"]`, scroll 900 px hides the hero copy, end of pin reveals the headline inside its masks, reverse scroll restores it. `localStorage vv-motion=reduced` survives a reload. Footer radiogroup "Motion" switches Reduced → Full without a reload. |
| `fallbacks.spec.ts` | 3 | 3 pass | JavaScript disabled: h1, "Built to keep moving.", "~1M", the three chapter headlines, contact links, plain-link navigation; lab page text summary and disclaimer. WebGL disabled (getContext override): stage stays `data-mode="poster"`, no canvas, poster cross-fade follows scroll, links work, no errors. |
| `pages.spec.ts` | 12 | 12 pass | `/work` lists three case studies with links; each case study 200, one h1, "What this page does not claim"; unknown slug 404; `/experience` anchors `#latest #deloitte #lego-self-returns #dyson #earlier #education`, "~30%" inside the self-returns entry, in-page nav; `/contact` links and copy-email button ("Copied", clipboard content, reverts); `/cv` 307 → PDF 200 `application/pdf` attachment; sitemap and robots; unknown route 404 with the not-found view; Person JSON-LD on `/` and `/contact` with the right name and no `worksFor`. |
| `products.spec.ts` | 6 | 6 pass | At 1440x900 and 390x844: both walkthroughs carry the synthetic-data disclaimer; TheCocoCard visits 4 → 6 stamps, reward redeems, stamps reset to 0, back office "Visits today" 18 → 20 and "Rewards redeemed" 23 → 24, activity feed, live-region text, reset; Fixabee service and area selection, request, provider view switches and shows the incoming request, accept updates the customer card, complete, reset. |
| `lab.spec.ts` | 9 | 9 pass | Disclaimer, pipeline SVG, Send event increments Events; Fail A + burst of 10 stepped with the Step control: retries visible, circuit opens, first dead letter after more than 10 moments (35 in practice) while B and C deliver all 10; Restore A, probe closes the circuit, parked deliveries drain with no further dead letters; Replay creates a new delivery and the original stays dead-lettered (DLQ, inspector, table filter, log); Pause freezes the clock, Step advances it, Resume restarts; shortcuts `s`, Space, `f`, `r` on the body and ignored inside the burst input; HMAC valid → tamper invalid (signature mismatch) → stale timestamp invalid → re-sign valid; SMIL `animateMotion` pulses present with full motion while running, absent with reduced motion; narrow-screen vertical pipeline and sticky quick controls. |
| `a11y.spec.ts` | 21 | 21 pass | Tab order on `/`: skip links, header (home, Work, Products, Experience, Contact, Lab, Download CV), hero actions, then chapter links; 30 stops all visible, on screen, opaque, never `visibility: hidden`, each with a non-`none` outline; skip link moves focus and scroll; footer motion radios work with arrow keys. On nine pages: every `img` has `alt`, every link and button has an accessible name, every form control has a label, exactly one h1 first, no heading level skips. |

Unit tests: `npm test` 88 passed (7 files). `npm run lint` and `npm run typecheck` pass with the new files.

## Product fixes made (two files, both small)

1. `src/components/layout/SkipLinks.tsx`: the second skip link ("Skip to selected work",
   `#selected-work`) was rendered on every page although its target only exists on the
   homepage, so the first Tab stop on eight of nine pages led nowhere and Lighthouse's `skip-link`
   audit failed on `/lab/webhook-delivery` and `/products`. The component is now a client component
   that renders that link only when `usePathname() === "/"`. Server rendering is unchanged (verified
   with JavaScript disabled).
2. `src/components/home/Hero.tsx`: the hero meta row ("London, UK" / "Scroll to explore") used
   `inset-x-0` inside the padded `container-x`, so it sat flush against the viewport edge
   (x = 0 at 1440 wide, 192 px at 1920 against a 256 px gutter). One class changed to
   `inset-x-[clamp(1.125rem,4vw,4rem)]`, the container's own padding. Cosmetic.

## Defects found and not fixed

1. **Hero actions are clipped on short viewports with full motion (high).** With full motion the
   pinned `.hero-stage` is `height: 100svh; overflow: hidden` and the hero copy is taller than
   short viewports, so the primary actions fall outside the stage and scrolling never reveals
   them (the copy lifts away as the pin progresses). Measured (copy bottom vs viewport height):
   844x390 → copy 72 to 622 px, "Explore my work" at 459 to 503 px, entirely hidden;
   1280x560 → actions at 529 to 573 px, cut; 1366x640 → actions visible, "Skip to selected work"
   at 627 to 643 px cut, the meta row drawn over it, and the "01 Systems in motion" eyebrow
   touching the header. Reproduce: load `/` at 844x390 (landscape phone) or a 1280x560 window.
   Screens: `qa/screens/home-844x390-hero-p0.png`, `home-1280x560-hero-p0.png`,
   `home-1366x640-hero-p0.png`. Reduced motion and no-JavaScript are unaffected (the stage is not
   fixed-height there). Suggested fix in the CSS the storyboard owns: below a height threshold
   (about `max-height: 700px` on desktop, `max-height: 560px` on mobile) either reduce the
   `t-display-xl` size and vertical spacing or fall back to the static (reduced) layout. Not a
   one-class change, so left alone.
2. **`text-silver-3` on graphite is 4.41:1, below the 4.5:1 minimum (medium).** `#7a7f89` on
   `#16181d` fails for the 12 px mono labels used on graphite panels. Lighthouse `color-contrast`
   fails on `/` (Dyson chapter caption and fragment labels) and `/lab/webhook-delivery` (22 uses
   in `src/components/lab`: Deliveries 10, HmacDemo 6, DeadLetters 2, Controls 2,
   SubscriberCards 1, LogPanel 1: subscriber endpoints, log timestamps, "of 25", the shortcuts note,
   inspector labels). On ink the same token is 5.1:1 and passes. Suggested fix: nudge the token
   `--color-silver-3` in `src/app/globals.css` to `#80858f` or lighter (4.8:1 on graphite, 5.5:1
   on ink), or use `text-silver-2` on graphite surfaces. The token file is out of bounds for this
   task and the choice is a design one, so it is reported only.
3. **Dimmed state labels in the Dyson fragments visual reach 1.6:1 (low, informational).**
   The "before/after" labels are deliberately faded to 0.35 opacity as the assembly completes;
   Lighthouse flags whichever is dimmed at audit time. The illustration carries its own
   `aria-label`, so this is a sighted-user legibility note rather than an AT problem.
4. **320x640: name and role line overlap the sculpture (low).** At the smallest tested viewport
   the copy fills the whole stage and the h1 sits over the lower edge of the K0 poster with only
   the bottom scrim behind it. Still legible in the capture; see `qa/screens/home-320-hero-p0.png`.
5. **AVIF posters are generated but never served (low, performance).** `public/posters` holds
   AVIF and WebP for every keyframe, but `Poster` in `src/components/scene/SignatureStage.tsx`
   only references the WebP files. Wiring an AVIF `<source>` would save about 45 percent on the
   opening image (desktop K0: 47 KB WebP vs 25 KB AVIF).
6. **`package.json` script `qa:screens` points at a missing `scripts/capture-screens.ts`.**
   `package.json` may not be edited under the conventions; suggest pointing it at
   `node scripts/qa-capture.mjs`.

## Captures

`node scripts/qa-capture.mjs` wrote 208 PNG files (17.8 MB) to `qa/screens/` plus
`manifest.json` (viewport, device scale factor, motion mode, scroll position, stage mode and bytes
per capture). Names follow `<route>-<width>-<label>.png`:

- Homepage, full motion, `?vv-ambient=0`, WebGL canvas active in every set: widths 320, 375, 390,
  768, 1024, 1440, 1920, plus `844x390` (landscape) and `720@2x` (200 percent zoom emulation:
  720x900 CSS px at deviceScaleFactor 2). Each set captures the pinned hero at progress 0, 0.5 and
  1 (`hero-p0`, `hero-p50`, `hero-p100`) and every following scene at its start (`evidence`,
  `work-delivery`, `work-platform`, `work-continuity`, `products-scene`, `lab-scene`, `journey`,
  `contact-scene`). The 1440 and 390 sets also capture the middle and end of each scene
  (`-start`, `-middle`, `-end`).
- Homepage, reduced motion (`home-1440-reduced-*`, `home-390-reduced-*`): `hero`, `built` and the
  same scene positions.
- Dedicated pages at 1440 and 390: `work`, the three case studies, `products`, `experience`,
  `contact`, `lab-webhook-delivery`, each as `-top` (first screen) and `-full` (full page).
  Pages taller than 8000 px (`experience-390`, `lab-webhook-delivery-390`) are stitched from
  viewport segments because Chromium on SwiftShader duplicates content in native full-page
  captures beyond that height; in those two images the fixed header and the lab's sticky quick
  controls are hidden after the first segment (`stitched: true` in the manifest).
- Two extra frames documenting defect 1: `home-1366x640-hero-p0.png` and `home-1280x560-hero-p0.png`
  (made with the existing `scripts/shot.mjs`).

`node scripts/qa-record.mjs` wrote `qa/video/home-1440x900.webm` (2.8 MB, 27 s) and
`qa/video/home-390x844.webm` (2.9 MB, 29 s): a hold on the opening image, a slow scroll to the
bottom in 40 ms steps, a pause, and the same scroll back up. Limitation: under SwiftShader the
compositor stalls while the WebGL scene renders, so the first seconds of each video hold the
opening frame and then jump; the scroll itself ran from about 3 s to 26 s. Frame pacing in these
files is a property of the software renderer, not of the site.

Everything in `qa/` totals about 31 MB on disk (screens 20 MB including the two extra frames, video 6 MB,
Lighthouse and network JSON 6 MB). None of it is needed at runtime; the integrator may prefer to keep
`qa/` out of the repository.

## Performance

All numbers come from headless Chromium on a 2 vCPU container. Lighthouse's simulated
throttling models the network and CPU, but the WebGL scene runs on SwiftShader (CPU), which does
not exist on any real device. Treat the homepage numbers as an upper bound on cost and the
no-WebGL runs as the JavaScript cost in isolation. Lighthouse settings: desktop preset (1350x940,
no CPU slowdown, 40 ms RTT, 10 Mbps) and the default mobile emulation (412x823 at 1.75x,
4x CPU slowdown, 150 ms RTT, 1.6 Mbps). Method: Lighthouse JSON reports in `qa/lighthouse-*.json`.

### Lighthouse

| Page, form factor | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | SI | TTI |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` desktop, run 1 (before fixes) | 72 | 96 | 100 | 100 | 0.3 s | 1.1 s | 620 ms | 0 | 1.5 s | 1.8 s |
| `/` desktop, run 2 (final) | 58 | 96 | 100 | 100 | 0.4 s | 1.3 s | 6,820 ms | 0 | 3.9 s | 8.0 s |
| `/` desktop, WebGL disabled | 99 | 96 | 100 | 100 | 0.3 s | 0.9 s | 80 ms | 0 | 0.6 s | 1.1 s |
| `/` mobile, run 1 | 48 | 96 | 100 | 100 | 1.4 s | 4.6 s | 11,500 ms | 0 | 5.9 s | 13.4 s |
| `/` mobile, run 2 (final) | 49 | 96 | 100 | 100 | 1.4 s | 4.7 s | 11,590 ms | 0 | 5.4 s | 13.6 s |
| `/` mobile, WebGL disabled | 71 | 96 | 100 | 100 | 1.0 s | 3.5 s | 860 ms | 0 | 1.9 s | 5.0 s |
| `/lab/webhook-delivery` desktop | 100 | 97 | 100 | 100 | 0.3 s | 0.7 s | 0 ms | 0 | 0.7 s | 0.7 s |
| `/lab/webhook-delivery` mobile | 88 | 97 | 100 | 100 | 1.4 s | 3.6 s | 150 ms | 0.01 | 1.8 s | 3.9 s |
| `/products` desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.8 s | 0 ms | 0 | 0.6 s | 0.8 s |
| `/products` mobile | 89 | 100 | 100 | 100 | 1.4 s | 3.7 s | 100 ms | 0 | 1.6 s | 3.9 s |

Reading the homepage rows: the difference between the two WebGL runs (620 ms vs 6,820 ms TBT on
identical code) is one "Unattributable" long task of 0.6 to 10 s, which is SwiftShader compiling
and drawing the three.js scene on the CPU. With WebGL off the same page scores 99 on desktop. The
mobile no-WebGL run is the honest JavaScript picture: an 860 ms TBT made of a 739 ms hydration
task in the React/Next runtime chunk plus GSAP setup under 4x CPU slowdown, and an LCP of 3.5 s
(the intro paragraph) on the throttled network. Accessibility deductions are the contrast finding
above (home 96, lab 97); before the skip-link fix the lab scored 95 and products 98 because of the
`skip-link` audit. Best practices and SEO are 100 everywhere; CLS is 0 or 0.01 everywhere.
Lab and products lose mobile points only to LCP on the simulated 1.6 Mbps connection.

### Browser timings without throttling (Playwright, CDP, production server)

| Page | TTFB | FCP | LCP (element) | CLS | JS at `load` | JS after 6 s idle | Total wire after idle |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` 1440x900 | 14 ms | 408 ms | 408 ms (hero tagline span) | 0.0001 | 215 KB wire, 682 KB raw, 11 files | 496 KB wire, 1,702 KB raw, 16 files | 844 KB |
| `/` 390x844 | 9 ms | 140 ms | 140 ms (intro paragraph) | 0 | 215 KB, 682 KB raw | 474 KB, 1,628 KB raw, 13 files | 746 KB |
| `/lab/webhook-delivery` 1440 | 7 ms | 176 ms | 176 ms (h1) | 0.0003 | 162 KB, 533 KB raw, 10 files | 239 KB, 757 KB raw, 15 files | 499 KB |
| `/lab/webhook-delivery` 390 | 6 ms | 180 ms | 180 ms (lead paragraph) | 0 | 162 KB, 533 KB raw | 235 KB, 750 KB raw, 13 files | 475 KB |
| `/products` 1440 | 6 ms | 124 ms | 124 ms (h1) | 0 | 197 KB, 617 KB raw, 10 files | 239 KB, 757 KB raw, 15 files | 484 KB |

"Wire" is the gzip-compressed size reported by `Network.loadingFinished`; "raw" is decoded bytes.
The jump after idle on the homepage is the deferred three.js chunk (258 KB wire), requested from
`requestIdleCallback` only when WebGL is available. Every page also loads three self-hosted
variable fonts (182 KB) and small RSC prefetches for visible links (17 to 44 KB).

### Bundle and asset sizes

`.next/static/chunks`: 19 files, 1.86 MB raw. Largest (raw / gzip):

| Chunk | Raw | Gzip | Contents |
| --- | --- | --- | --- |
| `2adr_pny_oy3f.js` | 967 KB | 262 KB | three.js, React Three Fiber, drei (homepage only, loaded lazily after idle) |
| `1mh6a-0e61pyc.js` | 229 KB | 72 KB | React DOM and the Next.js client runtime |
| `1gd3h8x2ifg_a.js` | 161 KB | 44 KB | Next.js app router |
| `0lwqukukljpfl.js` | 149 KB | 53 KB | GSAP, ScrollTrigger, useGSAP |
| `0cz1d0mv5g_q7.js` | 113 KB | 39 KB | Not requested by the audited pages (build-time poster route) |
| `3hvv-na3_gp38.js` | 68 KB | 19 KB | Simulation engine and lab panels |
| `09u_tqu68q-7a.js` | 65 KB | 17 KB | Homepage scenes |

Fonts (`.next/static/media`): GeistMono 71 KB, Geist 70 KB, InterTight latin 45 KB.
Posters (`public/posters`, 12 files, 208 KB total): K0 desktop 47 KB WebP / 25 KB AVIF, K0 mobile
18 KB / 10 KB, K2 desktop 34 KB / 17 KB, K2 mobile 13 KB / 8 KB, K3 desktop 15 KB / 8 KB, K3 mobile
8 KB / 4 KB (only the WebP files are referenced; see defect 5). `src/app/opengraph-image.png` and
`twitter-image.png` 46 KB each (1200x630 PNG), `favicon.ico` 26 KB, CV PDF 70 KB.

## Coverage gaps

- Chromium only. Firefox and WebKit are not installed in this environment, so Safari-specific
  behaviour (100svh, backdrop-filter, WebGL context loss, `<dialog>`) is untested.
- No physical devices, no real touch input, no real GPU: the WebGL scene was exercised on
  SwiftShader, so frame rate, thermal behaviour and battery cost on phones are unknown. The video
  recordings inherit the software renderer's frame pacing.
- Lighthouse ran on a shared 2 vCPU container; homepage performance scores are dominated by the
  software GPU and are not comparable to field data.
- No visual-regression baseline: the captures are for human review, not pixel comparison.
- The e2e suite uses an unthrottled localhost network; no slow-network or offline scenarios.
- Accessibility checks are programmatic (roles, names, labels, headings, focus geometry, Lighthouse
  axe subset on three pages). No screen reader session, no manual contrast pass on every state, no
  Windows high-contrast mode.
- Zoom was emulated through deviceScaleFactor 2 at 720 CSS px, not real browser zoom or
  text-only zoom.
- Print styles, the `/poster` build tool route and the mobile menu's motion toggle were not tested.
- Product walkthroughs and the lab were driven through their UI; the deterministic engines are
  covered by the existing unit tests, which were not extended.

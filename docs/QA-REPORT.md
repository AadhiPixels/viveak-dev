# QA report and handover status

Date: 7 September 2026 (updated after the Safari and iOS session the same day). Detailed run logs,
tables and capture manifests are in `docs/QA-RESULTS.md`; this page is the summary and the honest status.

## What was built

- Homepage: eight connected scenes (opening image, pinned sculptural sequence, evidence at
  scale, three selected-work chapters with original conceptual visuals, products with device
  compositions, lab preview, journey, closing frame), one WebGL canvas, poster-first first frame,
  poster cross-fade fallback without WebGL, static layouts for reduced motion, short viewports
  and no JavaScript.
- Pages: `/work` (editorial index), three case studies, `/products` with two working
  synthetic-data walkthroughs, `/experience` with the full chronology and a distinct LEGO.com
  self-returns entry, `/lab/webhook-delivery` with the deterministic simulation and HMAC demo,
  `/contact`, a considered 404, `/cv` (redirect to the PDF built from `cv/`), sitemap, robots, OG and
  Twitter images, Person and BreadcrumbList JSON-LD.
- Content layer with sources and `docs/CLAIMS.md`; the current employer is not named anywhere
  on the site or in the downloadable CV at Viveak's request. The CV is maintained as HTML and CSS in
  `cv/` and printed to PDF by `npm run cv:build` (two pages, real text, metadata set, checked for em
  and en dashes and for the withheld name).

## What was tested

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Clean |
| `npm test` (Vitest) | 101 tests: simulation engine (36), presets (8), HMAC (13), walkthrough reducers (19), ribbon geometry (5), game engine and route (13), SEO helpers (7) |
| `npx playwright test` (Chromium, production build) | 82 tests across home, motion, fallbacks, pages, products, lab, play and a11y specs, including the revealed-visuals regression; all pass on the final build (settle detection now counts animation frames because software rendering starves them) |
| Responsive captures | 320, 375, 390, 768, 1024, 1440, 1920, landscape 844x390, 200 percent zoom emulation; scene start, middle and end; full and reduced motion; every dedicated page at 1440 and 390 (`qa/screens`, 211 files) |
| Scroll recordings | `qa/video/home-1440x900.webm`, `qa/video/home-390x844.webm` (software-rendered, frame pacing not representative) |
| Fallbacks | No JavaScript: whole story readable with still images. WebGL blocked: poster mode with cross-fades. Reduced motion (OS or site setting): no pins, static compositions, no ambient animation. Short viewports (under 640 px tall): static hero layout, actions never clipped |
| Accessibility | One h1 per page, ordered headings, landmarks, labelled controls, visible focus, skip links, keyboard-reachable revealed content (`:focus-within` completes reveals), mobile menu as a native dialog, Lighthouse accessibility 96 to 100 (remaining deduction: small mono labels on graphite at 4.4:1 before the token nudge in this build; re-audit recommended) |
| Direct loads, back/forward, anchors | Case studies load directly (SSG); experience anchors resolve; client-side header navigation verified |

## Safari and iOS (real WebKit, Viveak's Mac)

Run on 7 September 2026 against the dev server on Viveak's MacBook Pro, driven through the Claude
desktop app: an iPhone 16 Pro Max Simulator (iOS 26.2, Safari) with touch scrolling and taps, plus
desktop Safari observed in screenshots (no interaction is permitted there).

| Check on the iPhone Simulator | Result |
| --- | --- |
| First screen | Name, role line, tagline, intro, actions and the WebGL sculpture render; poster hand-off is invisible |
| Pinned hero sequence | Pins, scrubs through the knot, loosening and routes beats with the copy hand-over; releases cleanly; the iOS toolbar collapsing does not re-run it |
| Chapters 03 to 10 | Evidence, three work chapters with their SVG visuals, the warm-white sweep, products previews, lab preview, journey, closing and footer all lay out and animate; motion toggle present |
| Pages | Case study (client-side navigation and direct load), `/play`, `/lab/webhook-delivery`, `/products`, `/experience`, `/contact` (Copy email works); mobile menu dialog; skip link to selected work; CV button opens the anonymised PDF in Safari's viewer |
| Game | WebGL scene runs, tap-left and tap-right steer, pause overlay works |
| Lab | Send, Burst, Fail A update the pipeline, stats, inspectors, deliveries and log; the parameters table scrolls inside its card |
| CocoCard and Fixabee walkthroughs | Record visits to 6 of 6, redeem, back office updates; service filter, request and provider app |
| Desktop Safari (macOS) | First screen with the sculpture renders correctly; deeper checks need interaction, which the desktop app does not allow for browsers, so they are covered by the WebKit engine in the Simulator instead |

Defects found and fixed in this session:

1. Two hero texts stacked on the phone. Cause: the site was loaded by LAN address and Next blocks its
   dev assets for any origin other than localhost, so nothing hydrated and the CSS no-JS fallback
   revealed the second beat. Not a browser issue and not reachable in production; `allowedDevOrigins`
   now covers private LAN ranges and `.local` names so phones and simulators can use the dev server.
2. The lab preview card and the delivery-route diagram's node labels stayed invisible after their
   scroll reveal in every browser: the tweens started from `autoAlpha: 0` and ended on `opacity: 1`,
   leaving `visibility: hidden`. Fixed and covered by an end-to-end regression test that checks the
   revealed visuals end visible on desktop and phone viewports.
3. The CocoCard loyalty card ran off its phone frame in WebKit: Safari stretches a flex item that
   has an `aspect-ratio` to the full container width and ignores its horizontal margins. The margins
   moved to a wrapper.
4. Over plain http on a LAN address the HMAC demo cannot use Web Crypto (secure contexts only); the
   message now says so. Production is https and localhost is exempt.

Also verified on the phone after the fixes: the mobile menu dialog (opens, focuses its close button,
navigates), the Fixabee walkthrough (service filter, request, provider app), `/experience`, `/contact`
with Copy email, and the corrected loyalty card. Not exercised on iOS: an iPad or landscape layout and
a physical iPhone; those remain covered by the Chromium suites only.

## Length budget (7 September 2026, after the trim)

Viveak's review: too much content, especially on phones. The phone composition now leaves out what
the inner pages carry (chapter visuals, ownership copy, technology labels, per-chapter figures that
the headline already states, the lab illustration, milestone details, product descriptions) and
keeps every figure in the evidence chapter, every route and every qualifier. Desktop lost the
duplicated product descriptions and a journey paragraph, and its rhythm tightened.

| Viewport | Before | After |
| --- | --- | --- |
| 390 x 844 (phone) | 15,320 px, 18.1 screens | about 8,700 px, 10.3 screens (2 of them the pinned hero) |
| 430 x 932 (large phone) | about 16.4 screens | about 9.5 screens |
| 768 x 1024 (tablet) | not measured | about 8.3 screens |
| 1440 x 900 (desktop) | 11,787 px, 13.1 screens | about 10,700 px, 11.9 screens |

Measured on the production build with the Playwright probe (document height over viewport height).

## Audit pass (7 September 2026): readability, performance, SEO

Method: fresh responsive captures (261 frames: homepage at 320, 375, 390, 768, 1024, 1440, 1920,
landscape 844x390 and 200 percent zoom; every page at 1440, 1024, 768 and 390 including `/play`
and the 404), axe-core 4.13 on every route at 390 and 1440, a metadata crawl, and Lighthouse 13.4
on the production build with WebGL disabled (mobile: simulated slow 4G, 4x CPU slowdown).

Findings and what changed:

- Performance (homepage, mobile): score 50 → 87 to 93 across five runs (one outlier at 74 while
  the container was busy); total blocking time 1,917 → 120 to 220 ms; speed index 4.9 → 1.6 s;
  LCP 5.0 → 3.0 to 3.6 s. The cause was building every scroll timeline during hydration:
  each ScrollTrigger measures the page as it is created, so around forty creations interleaved
  with GSAP's initial style writes forced forty synchronous layouts. Scenes below the fold now
  build when they come within one and a half viewports (`useSceneGSAP({ lazy })`); the hero and
  evidence chapter still build immediately. Desktop homepage 96 → 100 (TBT 156 → 4 ms).
- Fonts: Geist Sans and Geist Mono subset to Latin plus the punctuation, currency, arrow and
  mathematical symbols the site uses (140 → 91 KB across the two files, same variable axis, same
  OpenType features). The favicon shrank from 26 KB to 2.4 KB; proper 512 px, 192 px, maskable and
  Apple touch icons and a web manifest were added.
- SEO: every meta description now sits between 96 and 163 characters (four were 200 to 400);
  case-study titles are search titles rather than headlines (under 70 characters with the site
  name); the root layout no longer stamps the home canonical on every route (the 404 had one);
  the 404 sets its own tab title; the home page carries `WebSite` schema next to `Person`.
  Lighthouse SEO 100 and best practices 100 on every audited route before and after.
- Accessibility (axe, WCAG 2.2 AA + best practice): three findings, all fixed. The accent on
  light surfaces was 3.5:1 for small text (now `#0b7062`, 5.2:1 on warm); the parameters table
  and the log in the lab were scrollable regions without keyboard access (now focusable, named
  regions); a static, disabled control in the decorative product preview sat at 2.5:1 (now 5.3:1,
  and the previews are marked decorative). Target sizes: breadcrumbs, footer links, section
  navigation, arrow links, the hero skip link and the lab's delivery buttons are now at least 24 px
  tall (WCAG 2.5.8); remaining sub-24 px targets are inline links within sentences, which the
  criterion exempts.
- Readability: the demo interfaces inside the small phone preview no longer scale below 12 px;
  the phone itself is 264 px wide on the smallest screens. Body text stays 16 px with a 1.6 line
  height and 68ch measure; headings, eyebrows and captions keep their scale.
- Visual: the `/play` overlays cleared the HUD on phones but overlapped it at tablet-landscape
  sizes; overlays now start below the HUD at every size. No other layout defects were found at
  320, 375, 390, 768, 1024, 1440 or 1920 wide, in landscape, or at 200 percent zoom.

Lighthouse after the changes (production build, WebGL disabled):

| Route | Mobile perf / a11y / BP / SEO | Desktop perf / a11y / BP / SEO |
| --- | --- | --- |
| `/` | 87 to 93 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/work/external-api-platform` | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/products` | 97 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/experience` | 98 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/lab/webhook-delivery` | 92 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/play` | 95 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |

The mobile homepage LCP (3.5 s simulated) is the display font arriving on a 1.6 Mbps link with
the CPU throttled four times; the fonts are preloaded and subset, and swapping to `font-display:
optional` would trade the typography on first visits for the metric, which is not worth it.

## Lab measurements (conditions matter)

Everything ran in a 2 vCPU Linux container with software WebGL (SwiftShader). That inflates every
homepage number that involves the canvas and is not representative of any real device or GPU.

- Lighthouse, production build (`qa/lighthouse-*.json`): `/` with WebGL disabled 99 desktop / 71
  mobile (TBT 80 ms / 860 ms, LCP 0.9 s / 3.5 s under Lighthouse's simulated 1.6 Mbps); `/` with
  software WebGL 58 to 72 desktop / 48 to 49 mobile, dominated by a single unattributable
  SwiftShader task; `/lab` 100 / 88; `/products` 100 / 89. Best practices and SEO 100 everywhere;
  CLS 0 to 0.01.
- Unthrottled Playwright timings on the production server: homepage TTFB 14 ms, FCP/LCP 408 ms at
  1440 and 140 ms at 390; JavaScript 215 KB on the wire at `load`, 496 KB after the deferred
  three.js chunk (258 KB gzip) loads on idle; lab 162 → 239 KB; products 197 → 239 KB. Fonts 182 KB
  (three self-hosted variable files). Posters 208 KB total in WebP, AVIF served where supported.
- No frame-rate claims are made. The scene renders on demand, stops when the opening chapters are
  off screen or the tab is hidden, caps device pixel ratio by tier and lowers it when frames exceed
  30 ms. Measure on real hardware before tuning further.

## Preview and deployment status

- Local preview: `npm run dev` on Viveak's Mac (running during the build session) and a production
  build served on port 3400 in the build container for the test suites.
- Repository: `main` of `AadhiPixels/viveak-dev` carries the site as one commit on top of the old
  site's history. `vercel.json` pins the Next.js preset (the old file selected Vite with a `dist`
  output directory) and `package.json` pins Node 22. A clean clone installs and builds with
  `npm ci && npm run build` (npm 10, Node 22; 21 static routes). No environment variables, no
  custom server, static and SSG routes only.

## Open items and known limitations

1. Repository history: the build session was published as a single commit on `main` of
   `AadhiPixels/viveak-dev`, so none of the intermediate commits (which carried the earlier, named
   CV) are public. The commits already on GitHub before this work, the previous Vite site
   (`48cb8f6` to `91ad886`), name the employer in that site's own copy; rewriting them is a separate
   decision (an orphaned root and a forced push would remove them from the branch, though not
   from any forks or caches).
2. Browser coverage: automated suites are Chromium only (Firefox and WebKit builds are not installed
   in the container). WebKit was verified by hand in the iPhone 16 Pro Max Simulator and desktop
   Safari's first screen (see above); Android Chrome, Firefox and physical phones were not tested.
3. Software WebGL made the homepage Lighthouse performance numbers untrustworthy; the no-WebGL runs
   are the honest JavaScript cost. Real-device profiling is the next step.
4. Small legibility notes at 320x640 (name sits close to the sculpture's edge) and the deliberately
   dimmed before/after labels in the Dyson visual.
5. Optional audience-focus control from the brief was not built (optional; would add a control
   without changing evidence).
6. The game requested after the brief was delivered as a browser-native 3D game at `/play`
   (`docs/GAME.md`): 13 engine unit tests and 5 end-to-end tests pass; captured on desktop and
   phone viewports in software WebGL. A Unity build was not possible in this environment.

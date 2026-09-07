# Working conventions

Read this before adding code. It keeps the site coherent and truthful.

## Content and truth

- All career facts come from `src/content/*.ts`. Never hard-code a number, date, employer or
  outcome in a component; import it. If something you need is missing from the content layer,
  add it to the relevant content file with a `source` and mention it in your report.
- `docs/CLAIMS.md` lists the qualifiers that must survive: "via Deloitte Digital" for LEGO, Dyson
  and UK Government; 300+ is an organisation size, not a team; ~30% self-returns is a separate
  LEGO.com engagement; no cost-saving percentage for Dyson; no invented metrics anywhere.
- British English in all authored copy (organisation, optimise, colour). No em dashes or en
  dashes in copy: use a full stop, comma, colon, or the middle dot `·` as a separator, and a
  plain hyphen in date ranges ("Jul 2025 - Present").
- Demos are labelled. Anything synthetic says so in place: "Interactive educational simulation.
  Synthetic data. Not connected to employer systems." for the lab; the `walkthroughDisclaimer`
  string from `src/content/products.ts` for product walkthroughs.

## Stack

Next.js 16 App Router (Turbopack), React 19, strict TypeScript, Tailwind CSS v4, GSAP 3.15
with ScrollTrigger, three.js via React Three Fiber (homepage only), Vitest, Playwright 1.56.
Read `node_modules/next/dist/docs/` for anything that looks unfamiliar (params are Promises,
`proxy` not `middleware`, ESLint flat config, and so on).

Do not add dependencies. Do not edit `package.json`, `src/app/globals.css`, `src/app/layout.tsx`,
`next.config.ts`, `src/content/site.ts`, or the header/footer. If you believe a change there is
essential, describe it in your final report instead.

Do not run git commands. The integrator commits.

## Design language

Tokens live in `src/app/globals.css` (`@theme`). Use them through Tailwind utilities:

- Backgrounds: `bg-ink` (page dark), `bg-graphite` / `bg-graphite-2` (raised dark surfaces),
  `bg-warm` (warm-white chapters), `bg-surface` (theme-aware card surface).
- Text: `text-lumen` (primary on dark), `text-silver` / `text-silver-2` / `text-silver-3`
  (secondary on dark), `text-ink` (primary on light), `text-muted` (theme-aware secondary).
- Lines: `border-line` (theme-aware hairline), `border-line-strong`.
- Accent: `text-signal` / `bg-signal` on dark, `text-signal-deep` on light, `text-accent`
  (theme-aware). Use the accent sparingly: one highlight per composition, states, focus rings.
  `text-danger` / `text-amber` for failing and warning states only.
- Chapter theming: wrap a page section in `data-chapter="<name>" data-theme="dark|light|graphite"`.
  The fixed header reads the theme under it. Every page needs at least one `data-chapter`
  element at the top, and light sections must set `data-theme="light"`.

Typography utilities (defined in globals.css): `t-display-xl`, `t-display-l`, `t-display-m`,
`t-display-s` (Inter Tight display), `t-lead`, `t-body` (Geist), `eyebrow` (mono uppercase
label), `mono-label`. Headings are display by default. Keep line lengths under about 70ch
(`prose-site` or `max-w-[64ch]`).

Components you can reuse:

- `Eyebrow` (`@/components/ui/Eyebrow`) with `index="03"` for numbered labels.
- `ButtonLink` / `Button` (`@/components/ui/Button`) with `variant="primary|secondary|ghost"`.
- `ArrowLink` (`@/components/ui/ArrowLink`), `Breadcrumbs`, `CopyEmail`, icons in
  `@/components/ui/Icons`.
- Layout: `container-x` (page gutter, max 96rem), `stage-h` (100svh min height).

Page rhythm: generous vertical space (`py-24 md:py-32` between major blocks), one strong
headline per section, quiet mono labels above it, at most one accent per composition. No cards
with heavy borders and shadows; prefer hairlines (`border-t border-line`) and space. No
gradients other than the stage scrims. Calm layouts on the technical pages; the homepage owns
the choreography.

## Motion

- Import GSAP from `@/lib/motion/gsap` (`gsap`, `ScrollTrigger`, `useSceneGSAP`, `BREAKPOINTS`).
  Never import `gsap/ScrollTrigger` directly.
- Gate every scroll animation behind `useMotionEnabled()` from
  `@/components/motion/MotionProvider`; when it is false, render the final resolved state in
  normal document flow. Never hide essential content with `opacity: 0` in CSS unless the rule is
  scoped to `html[data-motion="full"]` (see the hero for the pattern).
- Small interface feedback (hover, focus, button press, panel open) may use CSS transitions
  under 250ms; they are disabled automatically in reduced motion.
- Native page scrolling only. No wheel or touch interception, no snapping, no nested pins.
- A reveal that starts from `autoAlpha: 0` must end with `autoAlpha: 1` (not `opacity: 1`), or the
  element keeps `visibility: hidden` at full opacity. `tests/e2e/home.spec.ts` checks the revealed
  visuals end visible.
- WebKit stretches a flex item that has an `aspect-ratio` over its horizontal margins. Put the
  margins on a wrapper and give the ratio box `w-full` (see the CocoCard loyalty card).
- Testing against the dev server from a phone or simulator uses the Mac's LAN address, which
  `allowedDevOrigins` in `next.config.ts` permits; Web Crypto (the HMAC demo) still needs https or
  localhost.

## Accessibility

Real headings in order, one `h1` per page, landmarks, labelled controls, visible focus (the
global `:focus-visible` ring is styled), no hover-only content, keyboard operable custom
controls, `aria-live="polite"` for meaningful state changes only (never for logs or animation
frames). Minimum text contrast 4.5:1 (on ink use `text-silver-2` or lighter for body text).

## Quality bar before you report back

`npm run typecheck`, `npm run lint` and `npm test` pass. Pages render at 320px, 390px, 768px,
1024px and 1440px without horizontal overflow (check with the Playwright helper
`node scripts/shot.mjs http://localhost:3000/your-route out.png --w=390 --h=844`). The dev server
runs on port 3000 in this environment; start a second one on another port if you need to.

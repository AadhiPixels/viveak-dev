# Motion specification

Implemented in `src/components/home/*` and `src/components/scene/*`. Values below are the ones
in the code; change them there and here together.

## System rules

- Scroll linkage: GSAP ScrollTrigger with `scrub` (0.35 to 0.6 s of smoothing), native scrolling,
  `ScrollTrigger.config({ ignoreMobileResize: true })` so browser chrome does not re-run pins.
- Breakpoints: desktop `(min-width: 64rem)`, mobile `(max-width: 63.999rem)`; the pinned hero also
  requires `(min-height: 640px)`. Below that height (landscape phones, small windows) the hero uses
  its static layout so the actions are never clipped.
- Reduced motion: `html[data-motion="reduced"]` (set pre-paint from `localStorage["vv-motion"]` or
  `prefers-reduced-motion`). No timelines are created; CSS renders the static compositions;
  SMIL/CSS ambient animation is not rendered; pin spacers do not exist.
- Rebuild discipline: `useSceneGSAP` reverts and rebuilds a scene's timelines when the motion
  preference changes; `scheduleScrollRefresh()` coalesces `ScrollTrigger.refresh()` after each
  build so pinned sections never leave later triggers with stale positions.
- Easing: scrubbed transforms use `none` (the scroll is the ease) or `power2/power3.out` for
  reveals; nothing springs.
- Keyboard: revealed blocks use `opacity`, not `visibility`, and `:focus-within` completes a
  reveal, so links inside are always reachable.

## Scene 01 · The opening image

| | Desktop | Mobile |
| --- | --- | --- |
| Entry | Complete static first frame: poster K0 behind the copy; WebGL canvas fades in over 700 ms when ready | Same; portrait poster |
| Readable hold | Progress 0 to 0.20 of the pinned sequence | Same |
| Composition | Sculpture group at (1.6, -0.12, 0), scale 0.95; camera z 6.4, fov 36 | Group at (0.4, 2.2, 0), scale 0.5; camera z 7.2, fov 50; sculpture above the copy |
| Ambient | Two light pulses per luminous path, 24 to 30 fps ticker, only while hero/evidence are on screen and the tab is visible | Same |
| Reduced | Poster K0, no canvas, copy in normal flow | Same |

## Scene 02 · The system opens (pinned)

| Beat | Progress | Sculpture | DOM |
| --- | --- | --- | --- |
| Hold | 0.00 to 0.20 | K0 knot | Scroll cue fades 0.04 to 0.12 |
| Transform | 0.20 to 0.40 | K0 → K1 (loosening, smoothstep) | Hero copy lifts (y -56 / -36 px) and fades 0.20 to 0.36; label 01 fades 0.22 to 0.30 |
| Transform | 0.40 to 0.58 | K1 → K2 (routes); camera widens (z 6.9 → 7.6); group drifts left | Left scrim fades in 0.50 to 0.62 |
| Hold | 0.58 to 0.80 | K2 routes held | Label 02 at 0.54; "Built to keep moving." lines mask-reveal 0.55 to 0.74 (stagger 0.05); sentence 0.64 to 0.74 |
| Settle | 0.80 to 1.00 | K2 → K3 (lower, dimmer, further; light 0.7, glow 0.6) | Headline holds |

Pin distance: desktop `+=145%` of the viewport (footprint about 245svh); mobile `+=90%`
(about 190svh). Scrub 0.35. Reverse scrolling reverses the same interpolation. Poster fallback
(no WebGL): K2 layer fades in 0.26 to 0.56, K3 layer 0.80 to 1.00, driven by the same trigger.

Exit: the pin releases; the fixed canvas stays behind the evidence chapter and fades out across
the last part of that chapter (`bottom 95%` → `bottom 35%`), then is hidden.

Reduced: "Built to keep moving." is a normal section with the K2 still and a left scrim.

## Scene 03 · Evidence at scale

- Entry: "~1M" mask-reveals from below (`yPercent 108 → 0`, power3.out) between `top 88%` and
  `top 42%` of its block; its copy fades/rises between `top 70%` and `top 40%`.
- Hold: static once revealed; the settled routes remain behind (canvas or K3 still).
- Second fact: "Leading 9 engineers." block fades/rises with a 0.08 stagger between `top 85%`
  and `top 50%`.
- Exit: canvas fade described above; the next chapter is opaque ink.
- Mobile: same beats; the number scales with `clamp(6.5rem, 2rem + 22vw, 23rem)`.
- Reduced: K3 still as a backdrop, no reveals.

## Scene 04 · Selected work

Shared: each chapter's headline mask-reveals (`top 85%` → `top 55%`), its copy fades/rises
(`top 75%` → `top 45%`).

- 04a Routes (ink): SVG paths draw on (`stroke-dashoffset 1 → 0`, stagger 0.05) between
  `top 88%` and `top 30%` of the visual; nodes fade/rise with a 0.06 stagger. Ambient pulses run
  along the live routes (SMIL) with motion on. Two authored layouts: wide (desktop) and tall
  (portrait), both animated, one displayed.
- 04b Fragments (graphite): 24 tiles move from deterministic scattered poses (±140% x, ±110% y,
  ±34°, 0.8 to 1.08 scale, 35% opacity) to the grid between `top 85%` and `center 45%` with a
  centre-out stagger of 18 ms; the plate fades in and the before/after labels swap emphasis.
- 04c Continuity (warm-white): the chapter overlaps the previous one by 28svh (20svh on phones) and
  its surface is revealed by a sloped `clip-path` polygon from `top bottom` to `top 45%`; the flow's crossover
  moves from right to left (handover 0 → 0.72) between `top 80%` and `bottom 45%` of the visual;
  customer dots keep a constant 7 s rhythm on the path (SMIL `mpath`), so they never stop.
  The self-returns block below is static.
- Mobile (below 64rem): the phone composition is deliberately short. Each chapter is eyebrow,
  headline, the one figure and the route to the case study; the ownership copy, technology labels
  and the three conceptual visuals are desktop only (the case studies carry them). The sweep uses a
  shallower polygon (24svh/16svh) with the same trigger.
- Reduced: resolved states (routes drawn, grid assembled, handover complete), no sweep overlap.

## Scene 05 · From platforms to products (warm-white)

- Entry: headline mask-reveal and copy fade as above.
- Devices (desktop): back-office panel from `rotateY -12°, rotateX 4°, y 40`, phone 1 from
  `rotateY -18°, rotateX 6°, y 90`, phone 2 from `rotateY 16°, rotateX 6°, y 140`, all to flat
  between `top 85%` and `top 25%` of the stage (perspective 1600 px), then held. Static after
  settling; no continuous motion.
- Devices (mobile): one phone (TheCocoCard) below 40rem, two side by side between 40 and 64rem;
  each rises 40 px and fades in between `top 90%` and `top 60%`; no tilt. Product descriptions are
  not repeated on the homepage at any size; names, taglines and routes only.
- Reduced: devices flat and visible.

## Scene 06 · Show the engineering (ink)

- Entry: headline and copy reveals; the preview panel rises/fades between `top 85%` and
  `top 45%`.
- Ambient: SMIL pulses and a 2.4 s blink on the failing subscriber, motion only. Never linked to
  scroll; explicitly an illustration.
- Reduced: static.

## Scene 07 · The person and the experience (warm-white)

- Entry: headline and paragraphs reveal; milestones slide in from x -12 px with a 0.08 stagger
  between `top 85%` and `top 45%`.
- Reduced: static.

## Scene 08 · The closing frame (ink)

- Entry: "Let's build what comes next." mask-reveals; contact list fades/rises; the K3 still
  brightens from 35% to 100% opacity across the section.
- Contact actions are plain links and a copy button; nothing depends on motion.
- Reduced: static still at full opacity.

## Header

Fixed, 56 to 64 px. Reads the chapter beneath it (`[data-chapter][data-theme]`) through an
IntersectionObserver band and switches its own theme; gains a translucent backdrop after 24 px
of scroll. No hide-on-scroll.

## Budgets and quality tiers

Sculpture: 6 ribbons (3 metal bands, 3 luminous paths) × 141 to 261 rings × 8 vertices; halos
on paths in medium/high tiers; environment map 128 or 256 px rendered once; DPR cap 1.15 / 1.5 /
1.75 by tier; a frame-time monitor lowers DPR when frames exceed 30 ms; no post-processing; the
canvas renders on demand and stops entirely when the opening chapters are off screen or the tab
is hidden.

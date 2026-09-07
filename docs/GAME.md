# Throughput: the game

`/play` hosts a small 3D arcade game written for the site in TypeScript with Three.js (React
Three Fiber). It reuses the site's visual language and the delivery-platform vocabulary, and it
is deliberately labelled as a game: the numbers are game numbers, never production data.

## Design

You pilot a delivery pulse along a chrome route with three lanes. Objects come towards you:

| Object | In the game | What it borrows from |
| --- | --- | --- |
| Token (emerald) | +1 delivered; ten in a row raise the multiplier (up to ×5) | A subscriber acknowledging a delivery |
| Fault (red block) | Costs a retry, resets the streak; three faults end the run ("Dead-lettered") | A 503 from a failing subscriber and the dead-letter queue |
| Gate (amber bar across all lanes) | Slows the route for 1.6 s unless bursting | A 429 with Retry-After |
| Circuit breaker (silver ring) | Absorbs the next fault | Per-subscription circuit breakers |
| Retry (cyan key) | Restores a lost retry, or +25 delivered when all three are held | Bounded retries with backoff |
| Burst (white cone) | ×1.3 speed and double deliveries for 4.5 s | Auto-scaling headroom after the Lambda-to-EKS re-platform |

Speed rises from 15 to 44 units per second over about 90 seconds; patterns are authored shapes
(straight and zigzag token runs, single faults, fault walls with a gap, gates, shield-then-double-
fault, burst lanes, hidden retries, staggered faults) chosen by weighted difficulty. Milestones at
100, 250, 500, 1,000, 2,500 and 5,000 deliveries surface short captions. There is no ending: the
real service does around a million a day.

## Controls

Left/right arrows or A/D change lane; Space or Enter starts, pauses and restarts; Esc or P pauses;
R restarts. On touch, tap the left or right half or swipe. The tab hides the game pauses it.
Best score lives in `localStorage["vv-throughput-best"]` only.

## Architecture

- `src/lib/game/engine.ts`: pure, seeded (mulberry32), deterministic. `createGame`, `startGame`,
  `pauseGame`, `togglePause`, `moveLane`, `setLane`, `step(state, dt)` (frames clamped to 50 ms),
  `statusText`, `summary`. Same seed and inputs always give the same run.
- `src/lib/game/route.ts`: the winding route as pure functions of distance.
- `src/components/game/session.ts`: owns one state on the client and fans out events and phase
  changes without per-frame React renders.
- `src/components/game/GameScene.tsx`: React Three Fiber view: the deck, lane lines and edge
  rails are the same procedural ribbon geometry as the homepage sculpture, rebuilt around the pulse
  every frame; objects are instanced meshes; a follow camera with a portrait variant; no
  post-processing; pixel ratio capped at 1.5; WebGL context loss falls back to a message.
- `src/components/game/Throughput.tsx`: HUD (updated from a 15 fps timer, not React state),
  overlays (ready, paused, dead-lettered), keyboard, touch and visibility handling, an
  `aria-live` status, and the `window.__throughput` handle used by the end-to-end tests.

## Accessibility and motion

The game is a `role="application"` region with a keyboard-focusable container and a polite live
status. Reduced motion removes the screen flashes and camera shake; the game itself still moves,
because that is what a game is. Nothing autoplays: the route only moves after Play.

## Tests

`tests/unit/game/engine.test.ts` (13): determinism, pause, frame clamping, object bounds,
scoring and multipliers, faults and the invulnerability window, circuit breaker absorption, gates
and bursts, retries, lane easing, milestones, seeded randomness, route geometry.
`tests/e2e/play.spec.ts` (5): start, keyboard steering, pause/resume, forced dead-letter ending
and restart, shortcut suppression while typing, reduced motion, touch steering on a phone.

## Unity

Viveak asked for a Unity build as the preferred option. The build environment used for this work
cannot run the Unity Editor, so the delivered game is browser-native and fully tested here. A
Unity port would reuse the same design (engine rules above) and could be authored as a Unity
project for him to open and export to WebGL; that is an open offer, not part of this delivery.

# Storyboard: Systems in Motion

The homepage is one connected visual story. A single sculptural system, engineered metallic
ribbons carrying luminous pathways, opens from a compact object into interconnected routes,
supports the evidence chapters, and resolves into a quiet closing composition. Dedicated pages
carry the technical depth; the homepage is the cinematic introduction.

Palette: ink `#050507`, graphite `#16181d`, polished silver `#c9ccd3`, luminous white `#f4f5f7`,
signal (emerald/cyan) `#5fe0c6` on dark and `#0f8f7a` on light, warm-white chapter `#f3efe8`.

Type: Inter Tight (display, tight tracking), Geist Sans (body and UI), Geist Mono (labels).

Chapter rhythm: dark (01 to 04b) → warm-white (04c LEGO, 05 products) → dark (06 lab) →
warm-white (07 journey) → dark (08 closing).

## 01 The opening image

Purpose: identify Viveak, explain the work, give CV and contact access on the first screen.

- Composition (desktop): full-bleed ink stage. Name on two lines at the left, role line above,
  "Engineering. In motion." as the display tagline, intro sentence, three actions
  (Explore my work, Download CV, Get in touch) and a visible "Skip to selected work" link.
  The sculpture (keyframe K0, an intact knotted band) sits centre-right, overlapping the
  right third of the stage, lit from above with two rim strips.
- Composition (mobile): portrait camera. Sculpture occupies the upper third behind a scrim;
  name breaks as "Viveak" / "Vadivelkarasan"; role wraps to two lines; actions stack.
- First frame: a locally rendered poster of K0 (per breakpoint) is served as an image behind
  the text; the WebGL scene fades in over it once its first frame is drawn.
- Ambient motion: light pulses travelling along the luminous paths, slow and dim. Optional.

## 02 The system opens (pinned sequence)

Pinned stage, scrub linked to native scroll. Desktop footprint about 245svh (pin distance
145svh); mobile about 190svh (pin distance 90svh). Progress p of the single hero trigger:

- 0.00 to 0.20 hold: hero composition intact and readable (K0).
- 0.20 to 0.55 transform: hero text lifts and fades by 0.34; the object unwinds through K1
  (loosening) to K2 (routes). Camera eases from the K0 framing to a wider, level framing.
- 0.55 to 0.80 hold: "Built to keep moving." reveals at left with one supporting sentence;
  the routes hold as a system-wide composition beside it (K2).
- 0.80 to 1.00 settle: routes lower and dim to K3, leading into the evidence chapter. The
  headline holds; the pin releases; the next chapter scrolls over the still-visible canvas.

Reverse scrolling reverses the same interpolation; there is no separate reverse timeline.

## 03 Evidence at scale

Two facts, composed differently, both real DOM text.

- "~1M" as a monumental typographic composition, mask-revealed from below as it enters,
  with "events per day" and the latest-project delivery-service context attached and a link to
  the case study. The settled routes flow behind it; the canvas fades out as the chapter ends.
- "Leading 9 engineers" as a second, text-led composition with ownership context and a link
  to the experience page. No stat-card grid. Nothing counts up from zero.

## 04 Selected work as chapters

Three chapters in document flow, each with one strong visual, one supported outcome, a
concise ownership statement and a route to detail.

- 04a Latest project (ink): "Designing delivery for ~1M events a day." Visual: routed luminous
  connections drawn on as the chapter enters (SVG, stroke reveal), then held.
- 04b Dyson via Deloitte Digital (graphite): "Changing the platform behind a 300+ engineer
  organisation." Visual: scattered fragments assemble into an ordered platform grid, scrubbed
  on scroll. Labelled conceptual.
- 04c LEGO via Deloitte Digital: "A platform migration. Zero customer-visible disruption."
  The chapter is where the page turns warm-white: a light surface expands across the stage as
  the chapter enters, and the continuity visual (steady traffic while responsibility hands
  over between two rails) draws across it. The separate LEGO.com self-returns result (~30%
  fewer customer-service contacts) follows as its own clearly attributed block.

## 05 From platforms to products (warm-white)

"From the first idea. To the product in your hand." AadhiPixels introduced in one sentence.
Two phone compositions (TheCocoCard consumer card, Fixabee discovery) plus a business
back-office panel on desktop, entering at a presentation angle and settling flat within the
first half of the section; on phones a single readable device, no tilt. All interfaces
are labelled conceptual walkthroughs with synthetic data; the working walkthroughs live on
/products.

Length budget (Sep 2026 trim): the phone composition runs about 9 to 10 screens end to end
(it was 18); desktop about 12 (it was 13). Phones drop the chapter visuals, ownership copy,
technology labels, the lab illustration and milestone details, all of which the inner pages
carry; every figure and every route stays.

## 06 Show the engineering (ink)

"Break the system. See how it recovers." A lightweight illustrative preview of the delivery
pipeline (source, queue, workers, three subscribers, dead-letter queue) with a clear action to
launch /lab/webhook-delivery. The preview is CSS/SVG and explicitly illustrative; the working
simulation has its own state model on the lab page.

## 07 The person and the experience (warm-white)

Editorial section: a short CV-supported statement of progression and leadership, selected
milestones (latest project; Deloitte Digital with named client programmes; earlier roles;
education) and a link to the full chronology. Client names appear as attributed evidence,
never as a "trusted by" strip.

## 08 The closing frame (ink)

"Let's build what comes next." Email, LinkedIn and Download CV as plain links, plus a copy
email control. The settled ribbon composition returns as a quiet still image. Fully useful
with motion disabled.

## Reduced motion (system preference or the site's motion setting)

Same typography, artwork and content. No pinning (no pin spacers), no camera travel, no
parallax. The hero shows the K0 poster; "Built to keep moving." is a normal section with the
K2 still; the evidence chapter uses the K3 still. Chapter visuals render in their final,
resolved state. Ambient pulses stop. Small control feedback (hover, focus, menu) remains.

## WebGL unavailable

The posters for K0, K2 and K3 cross-fade with the same scroll progress, so the sequence keeps
its composition without a canvas. Text, links and navigation are unaffected.

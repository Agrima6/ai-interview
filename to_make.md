# WorkmateIQ — New UI Refinement Plan

## 1. Scope

> Planning only. No implementation performed.

This plan covers only the newly requested refinements to the active WorkmateIQ landing-page carousel, the visual decoration of the three audience cards, and the score-dependent colour of the AI Evaluation `FiberBurstCanvas`. It is based on the current repository implementation and measured renders of the active route. It does not supersede or extend the earlier landing-page plan.

The future implementation must use the existing shared structures and make the smallest changes that satisfy the visual corrections. No React, CSS, image asset, package, or runtime behavior is changed by this planning pass.

## 2. Current Implementation Audit

### 2.1 Carousel shell and viewport

- Active files: `client/src/pages/workmate/VerticalScrollShowcase.jsx` and `client/src/pages/workmate/VerticalScrollShowcase.css`.
- `VerticalScrollShowcase` renders one shared `ShowcaseCard({ strip, isClone })` component for every real slide and clone. There is no separate per-slide component or per-slide positioning markup.
- `STRIPS` contains the content and supplied image for the three real slides: Connected Ecosystem, Interview Insights/Evaluation, and Confident Decisions/Candidate Ranking.
- The infinite track is `[last clone, ...three real slides, first clone]`. It begins at physical index `1`, uses a `500%` track, and each card occupies `20%` of that track.
- `.scroll-showcase-shell` is currently `width: min(1920px, calc(100% - 3rem))`; below the mobile breakpoint it becomes `min(calc(100% - 1.5rem), 560px)`. The desktop shell therefore occupies nearly the full viewport at most tested widths.
- `.scroll-showcase-viewport` is the clipping boundary. Its current height is `472px` at widths of at least 1280px, `496px` at 981–1279px, `540px` at 681–980px, and `600px` at 680px and below.
- `.scroll-showcase` adds `0.25rem` top and `1.5rem` bottom padding on desktop. Its bottom space also accommodates the slide indicators.
- At 1366×768 the measured shell is approximately `1303 × 472px`; the card begins with approximately `48px` horizontal and `28px` vertical padding.

### 2.2 Shared slide component and grid

- The desktop card uses a common three-column grid: `minmax(230px, 1.1fr) minmax(240px, 1fr) minmax(205px, 0.86fr)`.
- The desktop gap is `clamp(1.25rem, 2.25vw, 2.25rem)` and card padding is `28px clamp(2rem, 3.5vw, 3.25rem)`.
- The three columns are the `.showcase-visual`, `.showcase-copy`, and `.showcase-features` elements.
- The shared card grid currently uses vertical centering. `.showcase-copy` and `.showcase-features` are independently centered within the card height.
- The first two slides have a CTA; the ranking slide intentionally has none. Because the ranking copy group is shorter, centering that group moves its eyebrow, heading, and body down even though its markup uses the same component.
- There are no slide-specific CSS offsets in the current implementation. The inconsistency is caused by content-height-sensitive centering, not separate templates.
- Current shared heading rules are already consistent: maximum width approximately `390px`, common responsive font sizing, and common line-height. Natural wrapping is already used.

### 2.3 Measured current alignment at 1366×768

Measurements below are relative to each card’s top-left corner and are recorded as `x / y / width / height` in pixels.

- Connected Ecosystem: visual `48 / 28 / 422 / 416`; eyebrow y `83`; heading y `110`; body y `255`; CTA y `346`; checklist y `165`.
- Evaluation: visual `48 / 28 / 422 / 416`; eyebrow y `83`; heading y `110`; body y `255`; CTA y `346`; checklist y `165`.
- Candidate Ranking: visual `48 / 28 / 422 / 416`; eyebrow y `128`; heading y `154`; body y `299`; no CTA; checklist y `165`.
- Therefore, image wrapper geometry and checklist geometry already match exactly. The ranking copy origin is about `45px` lower because its shorter, CTA-free copy block is centered.

### 2.4 Image wrapper and carousel background

- `.showcase-visual` is a full-height flex container with `overflow: hidden`, a `16px` radius, and `background: rgba(255, 250, 250, 0.12)`.
- The image is `width: 100%`, `height: 100%`, `object-fit: contain`, and `object-position: center`.
- This translucent wrapper background is the source of the visually different muted-maroon/pink areas above and below the contained artwork. The supplied image is not causing those outer bands.
- Different artwork aspect ratios create different amounts of `object-fit: contain` letterboxing inside the same wrapper. The wrapper tint makes that otherwise harmless empty space visible as a separate rectangle.
- No image cropping or source-asset modification is required or appropriate.

### 2.5 Arrow controls and carousel behavior

- Previous and next controls are real buttons with accessible labels, manual navigation, and keyboard-focus behavior.
- The buttons are currently inside the clipped viewport and positioned `16px` from its sides on desktop and `10px` on mobile. They are `44px` desktop and approximately `42px` mobile.
- Autoplay uses a named `10_000ms` delay, a single timeout, hover pause, document-visibility handling, cleanup, reduced-motion handling, and symmetric clone normalization after the approximately `500ms` track transition.
- The carousel dots are positioned below the viewport. Existing behavior is already functional and must be preserved.
- No horizontal overflow was found at 1920, 1536, 1440, 1366, 1024, 768, 430, 390, or 375px during the audit.

### 2.6 Audience card DOM and decoration

- Active audience-card implementation is in `client/src/pages/workmate/WHome.jsx`, primarily the `SolutionPanel` rendering and its `solutions` data.
- Each `.solution-card` preserves the sticky stacked-card interaction. The foreground card is already fully opaque; the prior parent-card opacity ghosting issue is not present in the current tween.
- The card contains a left content half and a right `.solution-audience-visual` illustration half. Existing surfaces, borders, radius, stacking order, text, bullets, and illustrations already match the approved structure.
- The current category icon is an absolutely positioned `44 × 44px` badge near the card’s extreme upper-left, with a `24px` Lucide icon.
- An existing decorative layer is already present, is `aria-hidden`, and does not capture pointer events. It currently spans the whole card and provides two faint Lucide decorations per audience. It is hidden at narrow breakpoints.
- Existing audience decoration data is:
  - Colleges: `GraduationCap` category icon; `BookOpen` and `NotebookTabs` decorations.
  - Candidates: `UserRound` category icon; `FileText` and `Target` decorations.
  - Organizations: `Building2` category icon; `BriefcaseBusiness` and `ChartNoAxesCombined` decorations.
- The current decorations are too few, too small, and too far from the illustration to fill the visual half intentionally. The shared architecture can be enriched without changing the card system.

### 2.7 FiberBurst and score flow

- Active files: `client/src/pages/workmate/WHome.jsx`, `client/src/pages/workmate/AIScorePanel.jsx`, and `client/src/pages/workmate/FiberBurstCanvas.jsx`.
- `EnterpriseAI` in `WHome.jsx` owns `overallScore` state, initially `76`.
- `AIScorePanel` calculates the overall score from the three dynamic skill scores and reports it through `onOverallScoreChange={setOverallScore}`.
- `WHome.jsx` already passes that same dynamic score into `<FiberBurstCanvas overallScore={overallScore} />`. The requested score plumbing therefore already exists.
- `AIScorePanel` already uses the requested semantic thresholds for score display: below 70 is low, 70–89 is medium, and 90+ is high.
- `FiberBurstCanvas` already contains low, medium, and high RGB palettes and smoothly interpolates only the target colour while the canvas animation runs.
- Its current threshold function is inconsistent: below 60 is low, 60–79 is medium, and 80+ is high. Thus scores 60–69 and 80–89 currently receive the wrong FiberBurst colour.
- Existing FiberBurst palettes are subtle, established, and compatible with the score UI: low red (`#e76f6f` family), medium orange (`#d98a2b` family), and high green (`#2f9e5b` family). The future fix should retain these palettes and change only the threshold boundaries.
- The canvas lifecycle, geometry, interaction, dimensions, line and dot motion, opacity behavior, and animation timing do not need architectural changes.

## 3. Master Checklist

### Carousel

- [x] Remove different visual-wrapper color above the image.
- [x] Remove different visual-wrapper color below the image.
- [x] Use the main carousel background outside the supplied image.
- [x] Normalize all three carousel slide layouts.
- [x] Keep the same image position for all three slides.
- [x] Keep the same image container dimensions for all three slides.
- [x] Keep the same eyebrow position for all three slides.
- [x] Keep the same heading position for all three slides.
- [x] Keep the same heading typography for all three slides.
- [x] Keep the same heading width allocation and allow natural wrapping.
- [x] Keep the same body position for all three slides.
- [x] Keep the same CTA slot/position whenever a CTA exists.
- [x] Keep the same checklist position for all three slides.
- [x] Keep identical column widths, padding, gaps, and vertical alignment rules.
- [x] Remove any need for per-slide offset or magic-number layout hacks.
- [ ] Reduce remaining unnecessary top/bottom space by approximately 60% (superseded by the latest request for approximately 40–60px more top and bottom breathing room).
- [x] Reduce overall carousel height further without reducing typography.
- [x] Slightly reduce overall carousel width.
- [x] Reduce unnecessary horizontal gaps and outer padding.
- [x] Preserve existing typography sizes.
- [x] Preserve supplied image aspect ratios.
- [x] Preserve full image visibility and `object-fit: contain` behavior.
- [x] Preserve arrows and manual navigation.
- [x] Preserve autoplay and hover pause.
- [x] Preserve visibility handling, reduced-motion handling, and infinite-loop reset.
- [x] Preserve existing slide content.
- [x] Verify all three slides against one common template.
- [x] Keep carousel dots close enough to read as part of the component.
- [x] Confirm no horizontal page overflow after shell/arrow changes.

### Audience cards

- [x] Move/reposition the Colleges category icon toward the illustration side.
- [x] Increase the Colleges icon size significantly.
- [x] Move/reposition the Candidate icon toward the illustration side.
- [x] Increase the Candidate icon size significantly.
- [x] Move/reposition the Organization icon toward the illustration side.
- [x] Increase the Organization icon size significantly.
- [x] Add 3–5 subtle education-related background elements.
- [x] Add 3–5 subtle candidate/interview-related background elements.
- [x] Add 3–5 subtle organization/hiring-related background elements.
- [x] Evaluate one tiny background data/UI motif per card.
- [x] Keep all decorations behind foreground content and illustrations.
- [x] Ensure decorations cannot capture pointer events.
- [x] Mark the shared decorative layer `aria-hidden="true"`.
- [x] Reduce or hide secondary decorations on narrow mobile widths.
- [x] Preserve the sticky stack exactly.
- [x] Preserve the foreground illustration exactly.
- [x] Preserve all audience copy exactly.
- [x] Preserve the existing card dimensions/design unless a tiny spacing adjustment is unavoidable.
- [x] Preserve card opacity and the existing ghosting fix.
- [x] Verify decorations never cover a face, heading, bullet, or checkmark.

### FiberBurst

- [ ] Inspect and retain the current FiberBurst palette source.
- [ ] Reuse the current parent-owned dynamic overall score.
- [ ] Reuse canonical low/medium/high thresholds.
- [x] Map `<70` to the red FiberBurst palette.
- [x] Map `70–89` to the orange FiberBurst palette.
- [x] Map `90–100` to the green FiberBurst palette.
- [x] Test boundaries 69/70/89/90.
- [x] Test representative values 0/65/82/100.
- [x] Keep FiberBurst geometry exactly unchanged.
- [x] Keep FiberBurst canvas dimensions unchanged.
- [x] Keep hover behavior unchanged.
- [x] Keep animation unchanged.
- [x] Keep line count, length, width, and spread unchanged.
- [x] Keep origin and responsive sizing unchanged.
- [x] Keep opacity behavior unchanged.
- [x] Keep overall score dynamic.
- [x] Avoid duplicate inconsistent threshold logic.
- [x] Confirm colour interpolation remains smooth when a score crosses a boundary.

## 4. Carousel Refinements

### 4.1 Uniform Image-Surrounding Background

**Current implementation**

`.showcase-visual` supplies a translucent light backing surface while the artwork uses `object-fit: contain`. The contained image does not always fill the wrapper vertically, so its unused area reveals that different backing colour.

**Problem**

The wrapper reads as a large inner rectangle and produces different-coloured bars above and below the supplied artwork. The bands vary perceptually with each artwork’s aspect ratio.

**Files/components involved**

- `client/src/pages/workmate/VerticalScrollShowcase.css`
- Existing `.showcase-visual` and `.showcase-visual img` rules
- No image assets need modification

**HOW TO IMPLEMENT**

1. Remove the distinct `.showcase-visual` background paint, or set it to `transparent`, so unused `object-fit` space reveals the large card’s own gradient.
2. Retain the wrapper as the shared geometry and clipping element; do not remove it from the DOM.
3. Keep `object-fit: contain`, `object-position: center`, the shared radius, and overflow behavior unless visual QA shows the radius itself exposes a seam.
4. Confirm that no pseudo-element or child background reintroduces a separate backing surface.
5. Do not edit the three PNG files.

**What must remain unchanged**

Supplied image pixels, aspect ratios, light backgrounds inside the artwork, full-image visibility, card gradient, and carousel content.

**Responsive considerations**

Apply the transparent backing at every breakpoint. On mobile, the fixed visual height can still letterbox the image, but that letterbox must blend into the card rather than form a separate block.

**Edge cases**

Images with transparent edge pixels must remain legible against the maroon card. If any artwork relies on the wrapper tint for contrast, use only a shared, card-matching background value—not an image-specific patch.

**Verification**

Inspect every real slide and both loop clones at desktop, tablet, and mobile widths. Confirm there is no differently coloured top or bottom strip and no crop.

### 4.2 Identical Three-Slide Layout Template

**Current implementation**

All slides already use `ShowcaseCard`, identical desktop columns, identical wrapper geometry, and common typography. At 1366px the first two copy blocks begin at y `83px`, while ranking begins at y `128px`; the ranking slide has no CTA and its shorter copy block is vertically centered.

**Problem**

Common markup alone does not guarantee common top anchors when each content group is vertically centered independently. Ranking therefore looks like a separately positioned slide.

**Files/components involved**

- `client/src/pages/workmate/VerticalScrollShowcase.jsx`
- `client/src/pages/workmate/VerticalScrollShowcase.css`
- `ShowcaseCard`, `.showcase-card`, `.showcase-copy`, `.showcase-heading`, `.showcase-description`, `.showcase-cta`, and `.showcase-features`

**HOW TO IMPLEMENT**

1. Preserve the single `ShowcaseCard` renderer and the single `STRIPS` data shape.
2. Replace content-height-dependent copy centering with a shared internal layout grid whose rows represent eyebrow, heading, description, and CTA slot.
3. Give the heading row a shared breakpoint-aware minimum block size sufficient for the longest natural wrap at that breakpoint. Do not hard-code line breaks or use per-slide font sizes.
4. Give the description row a shared minimum block size where needed so present CTAs share the same top position.
5. Retain an empty CTA slot for the ranking slide without rendering a fake button. The empty slot is structural only and must be `aria-hidden`/non-interactive if an element is required; preferably achieve it with the copy grid rather than extra semantic markup.
6. Anchor `.showcase-copy` to the same top position for every slide. Anchor `.showcase-features` to the same shared top position independently.
7. Keep `.showcase-visual` at the same x/y/dimensions for every slide.
8. At the tablet two-row layout, explicitly define shared grid rows rather than relying on `align-self: end/start` combinations whose result changes with text height.
9. At mobile widths, keep the shared order and typography, but allow the card to grow naturally if translated copy or browser text scaling exceeds the planned slot sizes.
10. Do not add `nth-child`, slide ID, or title-specific offsets.

**What must remain unchanged**

Content, font sizes, line-height, natural heading wrapping, column concept, CTA presence/absence, checklist styling, transition, autoplay, and image assets.

**Responsive considerations**

Use one template per existing layout breakpoint: three-column desktop, two-column tablet, and stacked mobile. Exact pixel y-values may differ between breakpoints, but all three slides must share the same values within each breakpoint.

**Edge cases**

Ranking has no CTA. Long heading lines at 1024/768px and high browser zoom must not overlap body copy. Shared minimum rows should become natural `auto` growth rather than clip content.

**Verification**

Measure all real slides and loop clones with `getBoundingClientRect()`. Within each breakpoint, compare visual, eyebrow, heading, body, CTA slot, and checklist origins. Tolerate only subpixel rounding, not content-dependent offsets.

### 4.3 Reduce Vertical Padding by ~60%

**Current implementation**

The desktop viewport is `472px` high with `28px` card padding. At 1366px the image wrapper is `416px` high but its contained artwork is much shorter, producing substantial unused vertical area. Tablet viewport heights rise to `496px` and `540px`; mobile is `600px` because all content stacks.

**Problem**

The fixed desktop height, full-height visual wrapper, centering strategy, and large contained-image letterbox combine into oversized blank bands. Merely reducing card padding would not remove enough space.

**Files/components involved**

- `client/src/pages/workmate/VerticalScrollShowcase.css`
- `.scroll-showcase`, `.scroll-showcase-viewport`, `.showcase-card`, `.showcase-visual`, and responsive rules

**HOW TO IMPLEMENT**

1. First normalize the layout and remove the visible wrapper tint; height calibration must occur after those changes.
2. Use a desktop starting target around `330–350px` for the viewport rather than `472px`, then tune against the longest slide. This is a calibration range, not a blind final constant.
3. Reduce desktop card top/bottom padding from `28px` toward approximately `16–20px` while retaining comfortable breathing room.
4. Stop stretching `.showcase-visual` to the old full viewport height. Give it a common compact height or aspect-ratio-constrained block that still shows every supplied image at a useful size.
5. Keep image width useful by narrowing the shell only slightly and by reducing gaps before reducing image-column width.
6. Recalculate 981–1279px and 681–980px heights independently; do not inherit the old progressively taller desktop/tablet values.
7. On stacked mobile, reduce only space that is genuinely empty. A `560–580px` starting range may be feasible, but natural content height must win if the fixed target would clip text.
8. Keep section bottom room for indicators and avoid a brittle viewport-height dependency.

**What must remain unchanged**

Typography, checklist line-height, image scale/readability, image containment, slide content, buttons, and accessibility at enlarged text sizes.

**Responsive considerations**

The approximately 60% reduction applies to unnecessary empty space, not to total card height or every breakpoint. Mobile needs more height because content stacks; use `min-height`/natural overflow rather than forcing desktop density.

**Edge cases**

At 375px and 200% text size, fixed heights can clip. At 1920px a very wide image column can increase the contained image’s rendered height. Calibrate height together with the new shell maximum width.

**Verification**

Compare before/after computed empty space at 1920, 1536, 1440, and 1366px. Confirm approximately 60% less unused top/bottom area, no typography reduction, no crop, and no overflow.

### 4.4 Slightly Reduce Carousel Width

**Current implementation**

The shell grows up to `1920px` and keeps only `1.5rem` gutters per side. Card horizontal padding reaches about `52px`, and the two desktop gaps can each reach `36px`.

**Problem**

At large widths the section reads as a full-width panel instead of a centered carousel. Horizontal separation between the image, copy, and checklist is greater than necessary.

**Files/components involved**

- `client/src/pages/workmate/VerticalScrollShowcase.css`
- `.scroll-showcase-shell`, `.showcase-card`, and desktop grid definitions

**HOW TO IMPLEMENT**

1. Introduce a centered desktop shell maximum in the approximate `1500–1560px` range, with responsive page gutters such as `clamp(3rem, 6vw, 7.5rem)`.
2. Use the maximum only as a starting calibration. At 1536 and below, preserve enough width for the three columns and avoid sudden breakpoint jumps.
3. Reduce card horizontal padding modestly before shrinking column minimums.
4. Reduce the inter-column gap from its current maximum toward a compact shared range, keeping the checklist readable and the image sufficiently large.
5. Preserve the current full-width behavior at small tablet/mobile sizes, where artificial outer margins would make content too narrow.
6. Avoid `zoom`, whole-card scaling, or font-size reduction.

**What must remain unchanged**

Three-column concept, content, type, CTA size, bullets/checks, image assets, and centered page alignment.

**Responsive considerations**

The shell should be visibly independent at large desktop sizes but continue using practical gutters at 1366 and 1024px. Below the existing tablet/mobile thresholds, prioritize content width over the desktop max-width effect.

**Edge cases**

The shell plus any outward arrow offset must never create horizontal page overflow. Very wide monitors should not stretch the carousel beyond the selected maximum.

**Verification**

Record shell width and viewport overflow at all required widths. Compare content-column widths before/after and confirm no unintended heading rewrap caused solely by over-narrowing.

### 4.5 Strengthen Carousel Visual Identity

**Current implementation**

Arrows sit inside the clipped viewport near the card edges and dots sit below the card. The component is functionally a carousel, but the nearly full-width shell makes it resemble a static page section.

**Problem**

Navigation controls do not visually frame an independent slider strongly enough.

**Files/components involved**

- `client/src/pages/workmate/VerticalScrollShowcase.jsx`
- `client/src/pages/workmate/VerticalScrollShowcase.css`

**HOW TO IMPLEMENT**

1. Apply the narrower centered shell first; that is the primary carousel cue.
2. Evaluate moving the arrow buttons from inside `.scroll-showcase-viewport` to a positioned shell/stage sibling so they can sit on or slightly outside the card boundary without being clipped.
3. Keep the viewport itself as the strict track-clipping boundary.
4. Use only a small outward desktop offset; keep arrows inside the component at tablet/mobile widths for touch access and overflow safety.
5. Bring indicators modestly closer after the height reduction so they remain visually attached to the card.
6. Do not add adjacent-card peeking unless the centered shell, arrows, and dots still fail to communicate carousel behavior. If evaluated, it must not expose clone seams or reduce readability.
7. Do not add 3D stacking, new colours, or decorative effects inspired literally by the reference.

**What must remain unchanged**

Button semantics, labels, focus visibility, manual movement, autoplay, hover pause, infinite loop, slide transition, dots, and professional WorkmateIQ aesthetic.

**Responsive considerations**

At 430/390/375px keep 42px touch targets and safe in-shell placement. At large widths, a small outside attachment is acceptable only when page overflow remains zero.

**Edge cases**

Outward arrows can be clipped by an ancestor or cause horizontal scrolling. Clone reset must remain visually hidden even if a small adjacent region is ever exposed.

**Verification**

Test click, keyboard activation, autoplay, hover pause, reduced motion, slide 3→1 and 1→3 loops, focus rings, and horizontal overflow at every required width.

## 5. Audience Card Enrichment

### 5.1 Category Icon Repositioning and Scale

**Current implementation**

Each category icon is a `44px` badge near the card’s upper-left. It is visually detached from the right-side illustration.

**HOW TO IMPLEMENT**

1. Keep the category icon data in `solutions`, but render its large decorative treatment inside `.solution-audience-visual` rather than as a card-global upper-left badge.
2. Use the existing semantic icons: `GraduationCap`, `UserRound`, and `Building2`.
3. Use a shared watermark size around `96–140px` on desktop, starting near `6–10%` opacity, then tune per available visual space.
4. Position through shared placement variants in data/classes (for example top-right, upper-left, or behind an empty shoulder area), not arbitrary inline offsets per viewport.
5. Keep it behind the foreground illustration and away from faces. It must be `aria-hidden` and non-interactive.
6. At mobile, reduce toward approximately `72–88px` and lower opacity, or hide if the illustration leaves no safe space.

**What remains unchanged**

Audience headings, label, bullets, foreground illustration, split layout, sticky stack, card size, borders, and checkmarks.

**Verification**

Check all cards through slow forward/reverse stacking and at every breakpoint. The large icon should enrich the image side without becoming a second focal point.

### 5.2 Colleges Background Elements

**Current implementation**

Colleges currently has `BookOpen` and `NotebookTabs` as faint card-level decorations.

**HOW TO IMPLEMENT**

1. Retain or reuse `BookOpen` and `NotebookTabs` inside the visual half.
2. Add one certificate/document icon and one small academic-readiness or placement-chart motif.
3. Optionally add a single faint curved connector line or two tiny spark marks to connect the elements visually.
4. Target 3–5 secondary elements total, excluding the large `GraduationCap` watermark.
5. Use maroon/dusty-pink outlines, approximately `8–15%` icon opacity and `5–8%` connector opacity.
6. Keep every element behind the student illustration and away from the face, books, and card edge.

**Verification**

The panel should communicate education/readiness at a glance without looking like a scattered icon board. No new copy is allowed.

### 5.3 Candidates Background Elements

**Current implementation**

Candidates currently has `FileText` and `Target` as faint card-level decorations.

**HOW TO IMPLEMENT**

1. Retain/reuse `FileText` and `Target` inside the visual half.
2. Add a subtle interview/speech icon and a microphone or checklist icon.
3. Evaluate one abstract mini feedback motif made from two or three short bars and a small score dot; it must remain decorative, not become a functional card.
4. Optionally connect two elements with a faint dotted path.
5. Target 3–5 secondary elements total, excluding the large `UserRound` watermark.
6. Keep all ornament behind the candidate illustration and monitor.

**Verification**

The candidate and screen remain dominant. The scene should suggest preparation, feedback, and interviewing without adding words or fake interactive controls.

### 5.4 Organizations Background Elements

**Current implementation**

Organizations currently has `BriefcaseBusiness` and `ChartNoAxesCombined` as faint card-level decorations.

**HOW TO IMPLEMENT**

1. Retain/reuse `BriefcaseBusiness` and `ChartNoAxesCombined` inside the visual half.
2. Add a small candidate-team outline and a clipboard/check or ranking motif.
3. Evaluate one tiny hiring analytics fragment with two or three bars/points, kept abstract and non-functional.
4. Optionally use one thin connector arc linking the analytics and team elements.
5. Target 3–5 secondary elements total, excluding the large `Building2` watermark.
6. Keep decorations behind the organization illustration and laptop.

**Verification**

The background should communicate hiring and analytics while the illustrated professional remains the clear focal point.

### 5.5 Shared Decoration Layer Architecture

**Current implementation**

An `aria-hidden`, pointer-events-none layer already exists, but it spans the full card and contains only two small data-driven icons.

**HOW TO IMPLEMENT**

1. Extend the existing `solutions` decoration data instead of creating three custom card components.
2. Move the shared decoration layer into `.solution-audience-visual` so all ornament is scoped to the image half.
3. Use one shared renderer for the large watermark, secondary Lucide icons, optional connector, and optional tiny CSS motif.
4. Keep data limited to icon identity, placement variant, size tier, and optional motif type. Avoid arbitrary inline pixel values for every icon.
5. Establish clear z-index layers: visual background/surface → decorations/connectors → foreground illustration. Keep the content column independently above all decoration.
6. Keep `pointer-events: none` and `aria-hidden="true"` on the decoration wrapper. Decorative children must not be focusable.
7. Reuse `lucide-react`; do not install another package or create raster assets.
8. Use responsive CSS to hide low-priority decorations progressively: full set on desktop, 2–3 elements on tablet, watermark plus at most one secondary element on narrow mobile.
9. Preserve the current card opacity and GSAP scale/y stacking behavior exactly.

**Responsive considerations**

At 1024 and 768px the image half remains large enough for a reduced set. On 430/390/375px, hide connector lines and micro-data motifs first. Never solve overlap by changing foreground illustration dimensions or moving audience copy.

**Edge cases**

Sticky overlaps and reverse scrolling can reveal elements from the previous card if z-index or opacity is wrong. Decorations must remain inside the fully opaque foreground card and must not establish a new stacking context above subsequent cards.

**Verification**

Test Colleges→Candidates→Organizations and the reverse direction at fractional scroll positions. Confirm no decoration bleed-through, pointer interception, accessibility-tree noise, or mobile clutter.

## 6. Dynamic FiberBurst Score Colour

### Current score ownership and flow

`EnterpriseAI` in `WHome.jsx` owns `overallScore`. `AIScorePanel` derives the average score and reports updates to that parent. The parent already passes `overallScore` into `FiberBurstCanvas`. No new state, context, event bus, or prop chain is required.

### Current colour implementation

`FiberBurstCanvas.jsx` already defines low, medium, and high palettes and interpolates toward a target palette without changing geometry. The only defect is its threshold function: `<60`, `<80`, otherwise high.

### HOW TO IMPLEMENT

1. Change only the palette-classification boundaries in `getScorePalette` to `<70`, `<90`, otherwise high.
2. Retain the existing low/medium/high FiberBurst RGB palettes; they are subtle and visually compatible with the existing score colours.
3. Do not refactor the existing parent score flow or pass a second semantic state unless implementation discovers that the prop can be invalid. Current architecture is already sufficient and is the smallest safe solution.
4. Optionally centralize thresholds only if an existing shared helper already exists. Do not create a new cross-file abstraction solely for three comparisons.
5. Clamp or handle non-finite input only if the current component already does so; do not alter score behavior unrelated to colour.
6. Keep the palette interpolation mechanism so colour changes remain smooth when scores cross 69→70 or 89→90.

### Exact boundaries

- Low: `0–69` → existing red palette.
- Medium: `70–89` → existing orange palette.
- High: `90–100` → existing green palette.

### What must remain unchanged

Canvas width/height, responsive dimensions, device-pixel-ratio handling, origin, line count, line length, line width, minimum/maximum spread, dots, animation timing/easing/direction, hover intensity, pointer behavior, opacity, and lifecycle cleanup.

### Boundary verification

Drive the dynamic score through `0, 69, 70, 82, 89, 90, 100`. Confirm only the rendered colour family changes and compare canvas geometry snapshots before/after at the same size and pointer state.

## 7. File-by-file Change Map

| File | Current responsibility | Future change | Risk |
| ---- | ---------------------- | ------------- | ---- |
| `client/src/pages/workmate/VerticalScrollShowcase.css` | Carousel shell, viewport, shared card grid, visual wrapper, arrows, dots, and responsive layout | Remove wrapper tint; introduce shared alignment slots; reduce height/padding/gaps; add centered shell maximum; recalibrate arrows/dots | Medium: geometry changes can affect clipping, responsive wrapping, and loop perception |
| `client/src/pages/workmate/VerticalScrollShowcase.jsx` | Shared slide renderer, slide data, autoplay, controls, clones, transition reset | Only if needed, preserve a structural CTA slot and/or move arrow buttons to the shell stage; do not change timers or content | Medium: changing control placement or clone markup can affect carousel behavior |
| `client/src/pages/workmate/WHome.jsx` | Audience solution data/rendering, sticky cards, AI Evaluation parent score state | Move/extend the shared visual decoration layer and its data; keep score prop flow unchanged | Medium: audience z-index changes can reintroduce stacking/ghosting issues |
| `client/src/pages/workmate/FiberBurstCanvas.jsx` | Animated canvas geometry, interaction, palettes, and current score-to-palette mapping | Change only palette thresholds from 60/80 to 70/90 | Low: small classification change; geometry must remain untouched |
| `client/src/pages/workmate/AIScorePanel.jsx` | Dynamic skill scores, overall-score calculation, score display colours | No expected code change; use as the canonical threshold reference during verification | Low: audit/verification only |

No asset, package, global stylesheet, navbar, footer, Journey, chatbot, backend, or legacy component belongs in this change set.

## 8. Layout Consistency Table

Current values are measured at 1366×768 and are relative to the top-left of each real `.showcase-card`.

| Property | Ecosystem | Evaluation | Ranking | Required |
| -------------------- | --------- | ---------- | ------- | --------- |
| Image container X/Y | `48 / 28px` | `48 / 28px` | `48 / 28px` | Identical; already satisfied |
| Image container size | `422 × 416px` | `422 × 416px` | `422 × 416px` | Identical; compact together |
| Eyebrow top | `83px` | `83px` | `128px` | Identical shared top anchor |
| Heading font/line-height | Shared CSS | Shared CSS | Shared CSS | Identical; already satisfied |
| Heading top | `110px` | `110px` | `154px` | Identical shared top anchor |
| Heading width/height | `384 × 128px` | `384 × 128px` | `384 × 128px` | Identical; already satisfied at this width |
| Body top | `255px` | `255px` | `299px` | Identical shared row origin |
| Body height | `67px` | `67px` | `45px` | Natural height allowed inside shared row |
| CTA top | `346px` | `346px` | Not rendered | Same structural slot; no fake ranking CTA |
| Content column width | `384px` | `384px` | `384px` | Identical; already satisfied |
| Checklist X/Y | `925 / 165px` | `925 / 165px` | `925 / 165px` | Identical; already satisfied |
| Checklist size | `330 × 142px` | `330 × 142px` | `330 × 142px` | Identical; already satisfied |
| Root cause | Copy group includes CTA | Copy group includes CTA | Shorter group, no CTA, vertically centered | Shared top-anchored row template |

The table demonstrates that no per-slide layout rewrite is needed. A shared copy-grid/top-anchor correction resolves the inconsistency.

## 9. Score / Color Matrix

| Score | Classification | FiberBurst |
| -----: | -------------- | ---------- |
| 0–69 | Low | Red |
| 70–89 | Medium | Orange |
| 90–100 | High | Green |

Boundary and representative tests: `0, 69, 70, 82, 89, 90, 100`.

Expected results:

- `0`, `65`, and `69` use the low red palette.
- `70`, `82`, and `89` use the medium orange palette.
- `90` and `100` use the high green palette.

## 10. Responsive Plan

| Viewport | Carousel plan | Audience decoration plan | FiberBurst plan |
| -------- | ------------- | ------------------------ | --------------- |
| 1920×1080 | Apply desktop max-width around 1500–1560px; compact height around the calibrated 330–350px range; arrows may attach slightly outside the card | Full watermark plus 3–5 secondary elements and optional motif; verify safe face clearance | Only colour changes; dimensions/geometry remain current |
| 1536×864 | Use responsive gutters without an abrupt max-width jump; keep all three columns | Full or nearly full decoration set; verify visual balance | Same current canvas behavior |
| 1440×900 | Keep compact desktop template and identical row anchors | Full set if no overlaps; reduce lowest-priority motif if necessary | Same current canvas behavior |
| 1366×768 | Primary calibration viewport; verify 60% empty-space reduction, natural heading wraps, and no CTA/checklist collision | Full set with careful placement; test sticky overlap both directions | Test dynamic threshold changes in the current one-view layout |
| 1024px | Recalibrate the existing mid-width height; maintain readable image and shared row slots | Reduce to watermark plus 2–3 secondary elements | Same current responsive geometry |
| 768px | Normalize the current two-column/two-row template; allow natural height if text needs it; keep arrows inside | Watermark plus 1–2 elements; hide connector/micro-data first | Same current responsive geometry |
| 430px | Stacked slide, approximately 560–580px only if content fits; 42px in-shell arrows; no crop | Small watermark plus at most one safe secondary icon | Same current responsive geometry and hover/touch behavior |
| 390px | Same mobile template; permit natural height and wrapping | Same reduced decoration set or watermark only | Colour only |
| 375px | Narrowest audit; prioritize readable text, full images, safe touch targets, and zero overflow | Hide all optional elements if they compete with illustration | Colour only |

Across all widths:

- Do not reduce font sizes to make the carousel fit.
- Keep supplied images fully visible with their aspect ratios intact.
- Exact alignment must be consistent between slides within the same breakpoint.
- Keep arrows reachable and focus-visible.
- Use natural growth rather than clipping at browser zoom or increased text size.
- Keep the audience sticky interaction, z-index order, and foreground opacity unchanged.
- FiberBurst must retain identical canvas size and geometry; only palette selection changes.
- Recheck 80%, 100%, and 125% browser zoom for overflow and clipping.

## 11. DO NOT CHANGE

- No carousel copy changes.
- No carousel font-size changes unless a proven existing inconsistency violates the shared template.
- No CTA content changes.
- No checklist content changes.
- No supplied image modifications.
- No image cropping.
- No per-slide magic-number offsets.
- No autoplay, transition, clone-reset, hover-pause, visibility, or reduced-motion changes.
- No redesign of audience cards.
- No audience-copy edits.
- No character illustration replacement or resizing to make decorations fit.
- No sticky-stack architecture changes.
- No audience parent-card opacity changes or regression of the ghosting fix.
- No FiberBurst geometry changes.
- No FiberBurst animation changes.
- No FiberBurst size changes.
- No FiberBurst origin, spread, line, dot, or opacity changes.
- No hover behavior changes.
- No navbar changes.
- No footer changes.
- No chatbot changes.
- No Journey changes.
- No backend changes.
- No package/dependency changes.
- No global scale, `zoom`, or whole-component `transform: scale()` workaround.
- No unrelated refactors.

## 12. Implementation Order

1. Capture baseline screenshots and DOM measurements for all three slides at the required widths.
2. Remove the `.showcase-visual` backing tint and verify all supplied images remain intact.
3. Normalize the shared carousel copy rows/top anchors without slide-specific CSS.
4. Reduce carousel viewport height, wrapper stretch, and vertical padding using the longest slide as the constraint.
5. Reduce horizontal whitespace and introduce the centered shell maximum.
6. Reposition arrows/dots only as needed to strengthen carousel identity after final shell geometry is known.
7. Re-test autoplay, manual controls, clones, hover pause, visibility handling, and reduced motion.
8. Move the existing audience decoration layer into the illustration half.
9. Add the shared watermark and category-specific decoration data/motifs.
10. Test audience sticky stacking, opacity, z-index, and mobile simplification.
11. Correct only the FiberBurst score boundaries from 60/80 to 70/90.
12. Run boundary tests and confirm canvas geometry/interaction did not change.
13. Run full responsive, zoom, accessibility, and interaction QA.
14. Review the final diff and remove any file or change outside this plan.

## 13. Final Verification Checklist

### Carousel

- [ ] All three slides use the exact same shared layout template.
- [ ] All three image containers have the same placement and dimensions per breakpoint.
- [ ] All three eyebrows and headings share the same top alignment.
- [ ] All three use the same heading font size, width, and line-height.
- [ ] Body copy begins in the same shared row.
- [ ] Existing CTAs share the same position; ranking still has no CTA.
- [ ] All checklists share the same position and spacing.
- [ ] No differently coloured visual-wrapper bars remain above or below images.
- [ ] Outside-image space uses the main carousel background.
- [ ] Unnecessary top/bottom space is reduced by approximately 60%.
- [ ] Carousel total height is visibly shorter without reduced typography.
- [ ] Carousel width is somewhat reduced and centered.
- [ ] Horizontal gaps are cleaner without making content cramped.
- [ ] All content remains unchanged.
- [ ] Supplied images remain fully visible and uncropped.
- [ ] Arrows work by click, touch, and keyboard.
- [ ] Autoplay, pause, visibility handling, reduced motion, and infinite wrap work.
- [ ] Dots remain synchronized and visually attached.
- [ ] Carousel clearly reads as a slider.
- [ ] No horizontal page overflow occurs at any required width.

### Audience Cards

- [ ] Each category icon is substantially larger.
- [ ] Each category icon is positioned toward the illustration side.
- [ ] Colleges has 3–5 relevant education/readiness background elements.
- [ ] Candidates has 3–5 relevant interview/feedback background elements.
- [ ] Organizations has 3–5 relevant hiring/analytics background elements.
- [ ] Any mini data motif remains abstract, decorative, and non-functional.
- [ ] Cards feel less empty without adding copy.
- [ ] Decorations remain subtle and outline-based.
- [ ] The character remains the dominant visual.
- [ ] No decoration covers a face, illustration detail, heading, copy, bullet, or checkmark.
- [ ] Foreground copy remains perfectly readable.
- [ ] Decoration wrapper is `aria-hidden` and pointer-events none.
- [ ] Sticky behavior, z-index order, scale/y motion, and opacity remain unchanged.
- [ ] Forward and reverse scroll show no ghosting or decoration bleed-through.
- [ ] Mobile layouts are not cluttered.

### AI Evaluation

- [ ] Scores below 70 render the red FiberBurst palette.
- [ ] Scores 70–89 render the orange FiberBurst palette.
- [ ] Scores 90–100 render the green FiberBurst palette.
- [ ] Values `0, 69, 70, 82, 89, 90, 100` pass.
- [ ] Overall score remains dynamic.
- [ ] Palette interpolation remains smooth.
- [ ] FiberBurst geometry is unchanged.
- [ ] Hover behavior is unchanged.
- [ ] Animation timing, easing, direction, lines, and dots are unchanged.
- [ ] Canvas width/height and responsive dimensions are unchanged.
- [ ] Origin, spread, opacity, and interaction are unchanged.

### Final change-scope audit

- [ ] Only the files listed in Section 7 are changed during implementation.
- [ ] No assets or packages are changed.
- [ ] No navbar, footer, Journey, chatbot, backend, or unrelated route is changed.
- [ ] Build and relevant lint checks pass, with pre-existing failures documented separately.
- [ ] Final responsive screenshots and measurements are recorded for all required widths.

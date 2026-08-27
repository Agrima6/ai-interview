# WorkmateIQ Landing Page Change Plan

## 0. Scope and Non-Implementation Rule

- [x] This phase is analysis and planning only.
- [x] No React, CSS, route, content, timing, animation, asset, or configuration implementation has been changed.
- [x] `PROJECT_GUIDE.md`, `client/plan.md`, and `server/plan.md` were read completely.
- [x] The tracked repository was inventoried: 384 tracked files (167 client, 48 server, 165 services, plus root files).
- [x] The active landing route and its dependent components, CSS, assets, animations, carousel, audience stack, evaluation section, footer, and chatbot were traced.
- [x] All supplied screenshots were reviewed in order and mapped to the current code.
- [ ] Implementation must not begin until this plan is approved.

### Documentation-name discrepancy

There is no file literally named `project.md` anywhere in the repository. The available project-level document is `PROJECT_GUIDE.md`; `client/plan.md`, `server/plan.md`, and `services/README.md` provide additional current implementation context. This plan uses those real sources and the code itself. `PROJECT_GUIDE.md` still calls the original mock-interview app “InterviewIQ” and predates the newer WorkmateIQ marketing/platform work, so current code and `services/README.md` are authoritative where they conflict. Do not rename or edit any of those documents as part of this landing-page task.

### Screenshot mapping note

The brief says 13 screenshots, but 14 PNG attachments were supplied. They map as follows:

1. Current hero at browser 100%.
2. Current hero at browser 125%; global scale reference.
3. Dark-maroon Interview Insights carousel.
4. Colleges & Institutions audience card.
5. Candidates audience card.
6. Organizations audience card.
7. Audience ghosting close-up.
8. Second audience ghosting close-up.
9. Current five-step vertical journey design.
10. Journey content/reference artwork.
11. Powerful Features section.
12. Current white footer.
13. Upper AI Evaluation content.
14. Lower AI Evaluation/security card.

The brief’s later image numbers are offset by the extra ghosting close-up. Implementation should follow the semantic section names above, not rely on the inconsistent later numbering.

### Protected scope

Unless a later section explicitly permits it, keep all of the following as-is:

- The WorkmateIQ name and established terminology.
- Manrope typography family.
- Existing page order, section concepts, card shapes, radii, borders, shadows, and button hierarchy.
- Hero interview mockup design and content.
- Interview Insights slide content and transition design.
- Audience card order, sticky stacking concept, illustrations, and illustration placement.
- Journey timeline structure, central line, markers, alternating alignment, numbering, colors, typography, spacing, and GSAP animation.
- Powerful Features titles, descriptions, containers, layout, and hover behavior.
- AI Evaluation colors, score controls, gauge concept, FiberBurst golden/maroon line effect, capability-card design, and interaction.
- Navbar behavior, chatbot design, pricing, FAQ, enquiry form, unrelated routes, dashboard/application UI, server, and services.

## 1. Current Architecture Audit

### Relevant routes and page composition

- `client/src/App.jsx`
  - `/` and `/welcome` both render `WHome`.
  - Experimental hero routes also use `WorkmateLayout`, but they are not the active landing page.
  - The older `client/src/pages/Home.jsx` is routed only at `/dashboard` and is not the WorkmateIQ landing page.
- `client/src/pages/workmate/WHome.jsx`
  - Active landing-page composition: Hero → Quote → About → Interview Insights carousel → Audience cards → Journey → Powerful Features → AI Evaluation → Pricing/FAQ → Contact → Nexa chatbot.
  - Owns hero copy, audience data, pricing/FAQ data, AI capability rotation, and most landing section layout utilities.
- `client/src/pages/workmate/WorkmateLayout.jsx`
  - Owns the fixed landing navbar, active-section observer, smooth anchor navigation, the actual landing footer, ambient background, and cursor spotlight.
  - The similarly named `client/src/components/Footer.jsx` and `client/src/components/Navbar.jsx` are legacy/shared components and are not rendered by `WHome`.

### Styling system and design tokens

- Tailwind CSS 4 is imported from `client/src/index.css`; there is no separate Tailwind config file.
- `client/src/index.css` contains the shared theme and typography tokens.
- Current brand/theme values:
  - `--color-ink: #1a1215`
  - `--color-accent: #c4161f` (current brighter landing red)
  - `--color-accent-dark: #8b0e16` (existing dark-maroon token and best current code-level match for the requested primary maroon)
  - `--color-bg: #faf7f7`
  - `--color-card: #ffffff`
  - `--color-text-secondary: #6b5f60`
- Current desktop typography tokens:
  - Display: 64px / 1.06.
  - H1: 52px / 1.1.
  - H2: 44px / 1.12.
  - H3: 30px / 1.2.
  - Card title: 20px.
  - Component title/brand: 16px.
  - Lead: 18px.
  - Body: 16px.
  - Small body/nav/footer links: 14px.
  - Eyebrow/caption: 12px.
- Current mobile overrides at 767px and below:
  - Display 42px, H1 36px, H2 32px, H3 24px, card title 18px, lead 17px, metric 36px.
- Most page spacing and dimensions remain inline Tailwind utilities in JSX rather than tokens.

### Current container and spacing system

- Navbar, footer, hero, quote, about, audience, journey, and pricing commonly use `max-w-[1280px]` with `px-6 lg:px-8`.
- Powerful Features uses `max-w-[1400px]` with `px-6 sm:px-8 lg:px-10`.
- AI Evaluation uses `max-w-[1440px]` with `px-6 sm:px-8 lg:px-10`.
- The Interview Insights CSS shell uses `min(1280px, calc(100% - 3rem))`.
- Main desktop layout switches are predominantly Tailwind `lg` (1024px). Pricing uses `md` (768px).
- Dedicated CSS breakpoints:
  - Typography/mobile: 767px.
  - Interview preview: 1100px, 767px, 420px.
  - Interview Insights: 980px and 680px.
- Fixed/current section dimensions that matter:
  - Navbar: 76px at top, 62px after scrolling.
  - Interview Insights viewport: 460px desktop, 560px at ≤980px, 620px at ≤680px.
  - Audience illustration area: minimum 360px, 470px on desktop; image max-height 470px.
  - Audience sticky offset: 96px, 112px on desktop; first two panel wrappers reserve 86–90vh.
  - Journey steps: 142px minimum, 158px at `md`.
  - Evaluation gauge: 148px high; capability slot/card: 220px/210px minimum.
  - Chatbot launcher: fixed bottom/right 20px, 28px from `sm`; 56px/64px diameter.

### Animation and interaction libraries

- GSAP + ScrollTrigger:
  - Reusable entrance reveals (`useReveal.js`).
  - Hero pointer tilt.
  - Audience entrance and scroll-scrubbed card transform.
  - Journey reveal/timeline progress.
  - Background/contact decoration.
- Motion (`motion/react`): buttons, AI capability card transitions, chatbot.
- Custom canvas: `FiberBurstCanvas.jsx` sizes itself from the AI Evaluation section with `ResizeObserver`; its origin and reach depend on section dimensions.
- Custom carousel: `VerticalScrollShowcase.jsx`; no Swiper or external slider library.
- Reduced-motion paths exist for the carousel, reveals, preview, canvas, and chatbot and must remain intact.

### Asset system

- The WorkmateIQ logo used in the navbar/footer is `client/src/assets/logo.png`, a 1254×1254 24-bit raster PNG with no transparent alpha channel and no SVG alternative in the repository.
- Audience illustrations are opaque 24-bit PNGs:
  - `client/src/assets/workmate/audience-colleges.png` — 1221×1289.
  - `client/src/assets/workmate/audience-candidates.png` — 1345×1170.
  - `client/src/assets/workmate/audience-organizations.png` — 1220×1289.
- Because these audience files are opaque, their source alpha is not the ghosting cause.
- Powerful Features icons are already rendered as inline SVGs by the installed `lucide-react` package.

### Product capability evidence used for copy

- Candidate mock-interview flow supports resume-informed setup, role/experience/interview mode, timed questions, per-answer scoring, personalized feedback, history, and reports (`PROJECT_GUIDE.md`, interview client/server code).
- Scored dimensions in current code include confidence, communication, correctness, answer/final score, and feedback.
- Organization interview tooling supports question banks, role-based AI generation, multi-round templates, candidate invitations, progress states, reports, and score trends.
- WorkmateIQ platform services support type-specific registration for organizations, colleges, and candidates; onboarding invitations; autosave; file submission; review; request changes; approve/reject; and approved organization/college client creation (`services/README.md` and onboarding/client service code).
- Cohort analytics, guaranteed hiring outcomes, bias elimination, and production SOC 2 certification are not established by the audited implementation and must not be newly claimed in audience copy.

## 2. Global 100% = Current 125% Scale

### Current State

- At a wide desktop viewport, most content stops at 1280px even when approximately 1900px is available, leaving large outer margins.
- Hero display text is 64px and the remaining typography/spacing is tuned to the current smaller baseline.
- Browser 125% zoom both enlarges CSS pixels and reduces the effective CSS viewport, which makes the 1280px shell occupy much more of the physical screen. A transform alone would not reproduce that layout behavior safely.
- Shared typography tokens are centralized, but container width, padding, gaps, fixed heights, and component dimensions are split between JSX utilities and two dedicated CSS files.

### Requested State

- Browser 100% should have approximately the perceived scale/density of the current browser 125% screenshot across the entire desktop landing page.
- Do not use `zoom: 1.25`, a whole-page `transform: scale(1.25)`, or root-level scaling that affects platform/dashboard routes.
- Preserve usable tablet/mobile sizing, sticky behavior, animations, fixed chatbot positioning, and no horizontal overflow.

### Likely Root Cause / Existing Implementation

- The small appearance is a combined result of the 1280px desktop shell, conservative typography tokens, and many section/component measurements that do not expand beyond fixed maxima.
- A single token change cannot safely cover every dimension because Tailwind utilities such as `max-w-[1280px]`, `h-[460px]`, `p-8`, and `gap-14` are hardcoded in markup/CSS.
- Changing the root `html` font size would scale `rem`-based utilities across every application route, not just the landing page.

### Files / Components Involved

- `client/src/index.css`
- `client/src/pages/workmate/WorkmateLayout.jsx`
- `client/src/pages/workmate/WHome.jsx`
- `client/src/pages/workmate/VerticalScrollShowcase.css`
- `client/src/pages/workmate/JourneySection.jsx`
- `client/src/pages/workmate/PowerfulFeatures.jsx`
- `client/src/pages/workmate/AIScorePanel.jsx`
- `client/src/pages/workmate/InterviewPreview.css`
- `client/src/components/Button.jsx` (inspect only; avoid app-wide size changes if landing-scoped overrides suffice)
- `client/src/components/NexaChatbot.jsx` (verification and selective desktop sizing only)

### HOW TO IMPLEMENT

1. Add a landing-only scope class such as `workmate-marketing` to the root element in `WorkmateLayout`. Do not change `html` font size and do not alter global application/dashboard sizing.
2. Centralize most desktop scaling in `client/src/index.css` under that landing scope and a desktop-only media query. Use responsive `clamp()` values rather than one fixed 1.25 multiplier.
3. Initial visual targets for desktop review (not immutable values):
   - Display: 72–80px (80px is the mathematical 1.25× reference; use the smallest value that visually matches without bad wrapping at 1366px).
   - H2: 50–55px; H3: 36–38px.
   - Card title: 22–24px; component title: 18px.
   - Lead: 20–22px; body: 17–18px; small body/nav/footer: 15–16px.
   - Keep current mobile values; do not multiply them by 1.25.
4. Create one reusable landing shell rule/class for the repeated container system and migrate only active landing sections to it. Target roughly 1500–1600px maximum on large desktop with 32–40px side padding, while allowing smaller desktops to remain fluid. Keep special-purpose 1400/1440 sections explicit where their layout requires it.
5. Increase major desktop section padding/gaps and visual maxima selectively by approximately one Tailwind spacing step, then compare against Screenshot 2. Do not mechanically multiply fixed heights; the AI Evaluation section needs the opposite compensation described in Section 9.
6. Scale the hero preview through its grid allocation/max shell and dedicated CSS dimensions, not a page transform. Recheck the 1100px/767px InterviewPreview breakpoints after the larger desktop shell.
7. Keep navbar fixed and preserve its 76px/62px state change unless visual comparison shows a modest desktop-only increase is needed. If increased, update all `scroll-mt-20`, sticky offsets, and anchor alignment together so headings are not hidden.
8. Keep shared `Button.jsx` safe for the application. Prefer landing-scoped typography plus explicit landing call-site padding overrides over globally enlarging every dashboard button.
9. Preserve the chatbot’s viewport-based panel width/max-height. At most enlarge only the desktop launcher if Screenshot 2 requires it; keep the existing mobile dimensions and safe-area spacing.
10. After dimensional changes, call `ScrollTrigger.refresh()` once after layout/fonts/assets settle if runtime testing shows stale trigger positions. Do not add repeated refresh listeners or a new resize system; GSAP and the canvas already have lifecycle handling.

### What Must Stay AS IS

- No whole-page scale/zoom hack.
- No font-family change.
- No mobile 1.25× multiplication.
- No page-order, layout-concept, illustration, route, or unrelated dashboard changes.
- No replacement of existing GSAP/Motion logic merely to achieve size changes.

### Responsive Impact

- Large desktop (≥1280px): apply the fuller shell and larger type.
- 1024–1279px: use a moderated interpolation; ensure hero/audience two-column layouts still fit without squeezed copy.
- ≤1023px: preserve current tablet stacking and near-current type scale.
- ≤767px: retain current mobile token overrides and existing single-column layouts.
- Long content and browser text scaling must still reflow; avoid fixed desktop heights for text-bearing cards.

### Animation / Interaction Impact

- Larger sections change ScrollTrigger start/end positions and audience sticky travel distance.
- Hero tilt uses `getBoundingClientRect()` and should adapt automatically, but must be retested after visual resizing.
- FiberBurstCanvas adapts via `ResizeObserver`; its origin/reach will change with evaluation compaction and needs visual QA.
- Carousel viewport dimensions and transform percentages are independent of page scale, but card content must remain inside its clipped height.

### Risks / Edge Cases

- Hero heading/button wrapping at 1366px.
- Horizontal overflow from 1600px shells, absolute glows, preview hover scale, or audience imagery.
- Fixed navbar covering anchor targets.
- Sticky audience offsets no longer matching navbar height.
- 980/1100px dedicated CSS breakpoints conflicting with Tailwind’s 1024px `lg` breakpoint.
- Chatbot covering larger footer links or evaluation content.
- Desktop-height constraints at 1366×768 even when width is sufficient.

### Verification Checklist

- [ ] At browser 100%, 1920×1080 visually approximates the current 125% reference.
- [ ] At browser 100%, 1536×864, 1440×900, and 1366×768 preserve the intended hierarchy without clipping.
- [ ] No `zoom`, root-font scaling, or whole-page transform is used.
- [ ] No horizontal scrollbar appears at any required width.
- [ ] Hero heading and all three buttons remain readable and unbroken.
- [ ] Navbar state change and active indicator remain correct.
- [ ] Every anchor lands below the fixed navbar.
- [ ] Mobile typography remains close to the current mobile baseline.
- [ ] Fixed chatbot launcher/panel remain fully inside the viewport.
- [ ] Reduced-motion behavior still works.

## 3. Interview Insights — 10 Second Slide Duration

### Current State

- `VerticalScrollShowcase.jsx` implements a custom infinite carousel with cloned first/last slides.
- It uses `window.setTimeout`, not `setInterval`, Swiper, GSAP, or Motion.
- The normal display delay is exactly 2200ms.
- A separate 350ms timeout handles the invisible clone-to-real-index seam after wrapping; the visual transform transition itself is 500ms in inline style.
- Hover pauses autoplay; mouse leave restarts a fresh delay.
- Page visibility clears the timeout while hidden and schedules a fresh delay when visible.
- Progress dots are indicators only; there is currently no manual dot/arrow navigation.
- Cleanup clears the active timeout, including under React StrictMode, so the current design guards against duplicate timers.

### Requested State

- Each of the three slides must remain visibly stable for approximately 10 seconds before the existing transition begins.
- The transition itself must remain 500ms, not become 10 seconds.

### Likely Root Cause / Existing Implementation

- The short dwell is the hardcoded `2200` normal-delay branch in `scheduleAutoplay`.
- Do not confuse this with the unrelated `4200ms` `enterpriseCapabilities` rotation in `WHome.jsx`; that rotates lower AI Evaluation capability cards and is outside this request.

### Files / Components Involved

- `client/src/pages/workmate/VerticalScrollShowcase.jsx`
- `client/src/pages/workmate/VerticalScrollShowcase.css` (verification only; transition remains unchanged)

### HOW TO IMPLEMENT

1. Introduce one local named constant such as `AUTOPLAY_DELAY_MS = 10_000` near `STRIPS`.
2. Replace only the 2200ms normal-delay branch with that constant.
3. Keep the 350ms clone reset and 500ms transform transition unchanged unless testing exposes a seam; the 350ms reset swaps visually identical first-slide clones and is not the slide dwell.
4. Preserve `clearAutoplay`, visibility handling, reduced-motion handling, hover pause, and effect cleanup.
5. Do not add manual navigation for this request. If manual dots are added in a later request, they should clear and restart one timeout after selection.

### What Must Stay AS IS

- Three slides, their order/content, maroon design, cloned infinite-loop structure, 500ms transition, hover pause, progress indicators, and reduced-motion path.

### Responsive Impact

- Timing is viewport-independent. Confirm the longer dwell on desktop, tablet, and mobile.

### Animation / Interaction Impact

- Hovering for more than 10 seconds must not advance the slide.
- Leaving hover or returning to a visible tab begins a fresh 10-second dwell; it does not resume a partial timer under current semantics.

### Risks / Edge Cases

- Accidentally changing the 350ms seam reset or 500ms transition.
- Creating a second timer in StrictMode.
- Testing only the first slide and missing wrap behavior after slide three.

### Verification Checklist

- [ ] Slide 1 remains visible for approximately 10 seconds before transition.
- [ ] Slide 2 remains visible for approximately 10 seconds before transition.
- [ ] Slide 3 remains visible for approximately 10 seconds before transition.
- [ ] Transition duration remains approximately 500ms.
- [ ] Slide 3 → Slide 1 wrap has no flash/jump.
- [ ] Hover pause and mouse-leave restart work.
- [ ] Hidden tabs do not accumulate/duplicate timers.
- [ ] `prefers-reduced-motion` path remains stable.

## 4. Audience Sections — Typography & Content

### Current State

- Audience data is a local `panels` array in `WHome.jsx`, not CMS/JSON or separate components.
- Shared `SolutionPanel` renders all three audiences.
- Current type:
  - Audience heading: `.type-h3` = 30px desktop / 24px mobile.
  - Supporting statement: `.type-component-title` = 16px.
  - Bullets: `.type-body-small` = 14px.
  - Eyebrow: 12px.
- Every card has one statement plus four bullets. On a 470px-tall desktop illustration area, the copy column appears under-filled.

### Requested State

- Make all three cards feel richer after the new larger desktop baseline.
- Increase type appropriately and add useful, project-supported content without creating text walls or changing the illustration-side concept.

### Likely Root Cause / Existing Implementation

- Four short 14px bullets and a 16px statement occupy substantially less vertical space than the 470px illustration.
- Global scaling helps legibility but will not alone create enough content depth or balance.

### Files / Components Involved

- `client/src/pages/workmate/WHome.jsx`
- `client/src/index.css`
- Audience PNGs are verification-only and must not be replaced.

### HOW TO IMPLEMENT

1. Keep the shared `panels` data structure and `SolutionPanel`; update data and landing-scoped typography only.
2. Desktop typography direction after global scaling:
   - Heading: approximately 36–38px.
   - Statement: approximately 18–20px.
   - Bullets: approximately 15–16px with 1.5–1.6 line-height.
   - Keep eyebrow at 12–13px with current tracking.
3. Use five concise bullets per audience. This provides richer content with less wall-of-text risk than six bullets plus a paragraph.
4. Keep the text column line length near 460–520px. Do not widen it across the illustration.
5. Proposed copy for approval:

#### Colleges & Institutions

Statement: **Prepare students for real interview success.**

- Identify interview-ready students through structured AI scores and reports.
- Give students timed, role-specific practice in a realistic interview environment.
- Assess answer quality, communication, confidence, and correctness consistently.
- Use personalized feedback to surface strengths and clear improvement areas.
- Support placement preparation with more consistent readiness signals.

Evidence/limits: timed AI interviews, scoring, reports, and personalized feedback exist. Do not claim an implemented cohort dashboard or guaranteed placement outcomes.

#### Candidates

Statement: **Practice with purpose. Improve with clarity.**

- Practice role- and experience-specific AI interviews using resume-informed questions.
- Prepare for HR and technical interview modes with realistic time limits.
- Receive personalized feedback on confidence, communication, and correctness.
- Review detailed scores, answer feedback, and past interview reports.
- Focus on strengths and gaps before the real interview.

Evidence/limits: all items map to the current interview lifecycle and report/history implementation. Prefer “personalized feedback,” which matches existing terminology.

#### Organizations

Statement: **Evaluate the right talent, faster.**

- Build role-specific interview templates with structured rounds and question sources.
- Invite candidates and track progress from sent to completed.
- Run consistent AI interviews with timed questions and security checks.
- Review detailed scores, feedback, reports, and organization-level trends.
- Benchmark and shortlist candidates against the role’s evaluation criteria.

Evidence/limits: templates, invitations, progress states, scores, reports, and trends exist. Keep “benchmark” aligned with existing product positioning; do not claim automated hiring decisions or guaranteed cost savings.

### What Must Stay AS IS

- Three cards, order, audience labels, sticky stack, card shape/surface, illustration side, images, checkmark style, and overall two-column concept.

### Responsive Impact

- Desktop: five bullets should better balance the enlarged illustration without exceeding it.
- Tablet: two-column layout begins at 1024px; test 1024 carefully for heading/bullet wrapping.
- Mobile: cards already stack internally; retain current mobile heading scale and allow natural height. Do not force a fixed card height.

### Animation / Interaction Impact

- `querySelectorAll('.solution-pointer')` automatically includes the fifth bullet; existing stagger adds approximately 80ms per bullet.
- Confirm the added bullet does not make the reveal feel sluggish; retain timing unless visibly necessary.

### Risks / Edge Cases

- Copy exceeding the illustration height at 1024px.
- Long lines making the sticky card taller than the available viewport.
- Unsupported claims drifting beyond implemented platform capabilities.

### Verification Checklist

- [ ] Colleges copy contains only supported interview/readiness capabilities.
- [ ] Candidates copy uses “personalized feedback” and maps to current flows.
- [ ] Organizations copy maps to templates, invitations, scoring, reports, and trends.
- [ ] Each audience has five concise bullets.
- [ ] Desktop type is larger and balanced with the illustration.
- [ ] No text overlaps/clips at 1024px or required mobile widths.
- [ ] Illustrations, card structure, order, and design are unchanged.

## 5. Audience Stacked Card Ghosting Bug

### Current State

- Each `SolutionPanel` is `position: sticky` with an explicit increasing z-index (`1`, `2`, `3`).
- Every card has an opaque hex surface class and the illustration images themselves have no alpha channel.
- GSAP explicitly scroll-tweens the entire `.solution-card` to `opacity: 0.86`, `scale: 0.975`, and `y: -8` as its panel crosses from `top 12%` to `top -12%`.
- Because opacity is applied to the parent card, the entire composited foreground—including its opaque background—becomes translucent. The previous sticky card can therefore appear through it exactly as shown in both ghosting screenshots.

### Requested State

- Keep the stacked-card behavior and order.
- Once a card is on top, it must remain visually opaque; earlier cards and illustrations must never bleed through.

### Likely Root Cause / Existing Implementation

- The root cause is the parent-card `opacity: 0.86` GSAP tween in `SolutionPanel`, not PNG transparency, missing z-index, mix-blend mode, or a transparent surface color.
- Transforms create stacking contexts, but the existing increasing z-index order is correct. No `mix-blend-mode`, backdrop filter, or pseudo-element opacity currently causes this defect.

### Files / Components Involved

- `client/src/pages/workmate/WHome.jsx` — `SolutionPanel` GSAP tween and card classes.
- All three audience assets — regression verification only.

### HOW TO IMPLEMENT

1. Remove opacity from the scroll-scrubbed parent-card tween; keep the current scale, y-offset, easing, trigger start/end, sticky offsets, and z-index sequence.
2. Ensure `.solution-card` remains on an explicit fully opaque surface (`p.surface`) throughout the tween. Add `isolate` only if runtime compositing tests show a browser-specific stacking artifact; it should not be needed for the primary fix.
3. Do not fade the active card’s illustration or content. If a visual “recede” cue is still desired, scale/y already provide it without transparency.
4. Test every handoff: Colleges → Candidates and Candidates → Organizations, scrolling both downward and upward, including slow fractional scrolling around trigger boundaries.

### What Must Stay AS IS

- Sticky stack, order, z-index progression, scale/y transition, card design, images, surfaces, and reveal animation.

### Responsive Impact

- Sticky behavior occurs where current layout permits it; mobile cards still need opaque backgrounds even if stack overlap is shorter.
- Recheck 1024px where sticky two-column cards and longer copy meet.

### Animation / Interaction Impact

- Removing opacity does not change scroll duration or card position.
- Entrance opacity for child intro/pointer/visual elements remains separate and should still complete before overlap.

### Risks / Edge Cases

- Mistakenly removing child entrance fades along with the parent scroll fade.
- A card surface becoming translucent through a future `bg-*/opacity` utility.
- Upward scrolling revealing a previously faded card if GSAP state is not reverted correctly.

### Verification Checklist

- [ ] Colleges is never visible through Candidates.
- [ ] Candidates is never visible through Organizations.
- [ ] All three active cards remain fully opaque during slow scroll.
- [ ] Reverse scrolling has no ghosting.
- [ ] Sticky order and scale/y motion are unchanged.
- [ ] No image, z-index, or layout redesign was introduced.

## 6. Journey Section — Content-Only Replacement

### Current State

- `JourneySection.jsx` stores exactly five items in the local `JOURNEY_STEPS` array.
- `JourneyStep` derives `STEP 01`…`STEP 05`, marker numbers, and alternating alignment from the array index.
- GSAP queries the existing five `.journey-step` elements and animates the same timeline/central progress line.

### Requested State

- Keep the current Screenshot 9 design exactly.
- Change only the five data items to Discover, Register, Onboard, Review, Begin Your Journey.
- Do not include Connect; replace the reference’s Move Forward concept with Begin Your Journey.

### Likely Root Cause / Existing Implementation

- Current titles describe an older interview-specific journey rather than the newer registration/onboarding/review platform flow.
- Because content is already isolated in one array, no component or animation restructuring is necessary.

### Files / Components Involved

- `client/src/pages/workmate/JourneySection.jsx` — `JOURNEY_STEPS` data only.

### HOW TO IMPLEMENT

Replace only `JOURNEY_STEPS` with this approved five-item data structure:

```js
const JOURNEY_STEPS = [
    {
        title: 'Discover',
        description: 'See how WorkmateIQ fits your hiring, placement or interview-preparation flow.',
    },
    {
        title: 'Register',
        description: 'Complete a short, structured registration based on whether you are joining as an organization, college or candidate.',
    },
    {
        title: 'Onboard',
        description: 'Follow a personalized onboarding flow for your user type, including the required information and documents.',
    },
    {
        title: 'Review',
        description: 'Keep submitted information, documents and requested updates together for structured review.',
    },
    {
        title: 'Begin Your Journey',
        description: 'Once setup is approved or complete, continue into the relevant WorkmateIQ interview, hiring or placement workflow.',
    },
]
```

### What Must Stay AS IS

- **Only textual content/data changes. No design changes.**
- Preserve component structure, five-item count, line, alternation, circles, numbering, `STEP 01` labels, type, spacing, colors, alignment, and animation.

### Responsive Impact

- Longer Register/Begin descriptions may wrap more on mobile; allow natural wrapping without changing design tokens or marker alignment.

### Animation / Interaction Impact

- None expected; item count remains five and keys remain unique.

### Risks / Edge Cases

- Accidentally adding the Connect phase from the reference image.
- Editing `JourneyHeader`, step markup, or GSAP timing during a content-only change.

### Verification Checklist

- [ ] Exactly five steps render.
- [ ] Step 1 is Discover.
- [ ] Step 2 is Register.
- [ ] Step 3 is Onboard.
- [ ] Step 4 is Review.
- [ ] Step 5 is Begin Your Journey.
- [ ] Connect does not appear.
- [ ] Move Forward does not appear.
- [ ] DOM structure, classes, layout, and GSAP code are unchanged.

## 7. Powerful Features — Professional SVG Upgrade

### Current State

- `PowerfulFeatures.jsx` imports five Lucide icons: `ShieldCheck`, `BrainCircuit`, `BarChart3`, `FileText`, and `UserSearch`.
- Lucide renders inline outline SVGs at 23px with a common 1.8 stroke width inside identical 44px rounded containers.
- There are no custom feature SVG files.

### Requested State

- Improve only the iconography while keeping all section content, layout, containers, colors, spacing, and hover design.
- Use one coherent, professional outline family.

### Likely Root Cause / Existing Implementation

- The icons are technically consistent, but the selected glyphs are generic/basic and do not communicate the feature depth as strongly as the rest of the section.

### Files / Components Involved

- `client/src/pages/workmate/PowerfulFeatures.jsx`
- Existing installed dependency: `lucide-react`; no dependency change required.

### HOW TO IMPLEMENT

Use stronger glyphs from the already installed Lucide family (all were verified present locally), keeping a shared size/stroke:

- Advanced Security → `ShieldEllipsis` (layered/protected access rather than a generic check).
- AI Evaluation → `BrainCog` (analysis/configured intelligence).
- Benchmark & Rank → `ChartNoAxesCombined` (comparative performance/trend).
- Detailed Reports → `FileChartColumn` (report plus structured data).
- AI Talent Sourcing → `UserRoundSearch` (professional search/discovery).

Render all at 24px and approximately 1.75–1.8 stroke width. Keep `currentColor`, round linecaps/joins supplied by Lucide, the existing 44px icon container, and the current accent color. Do not add a new icon package, emojis, filled/cartoon artwork, or asset files.

### What Must Stay AS IS

- Powerful Features title badge, five-column/card layout, feature titles/descriptions, icon container shape, colors, spacing, dividers, and hover behavior.

### Responsive Impact

- Inline SVGs remain fixed within current containers; verify two-column tablet and one-column mobile centering.

### Animation / Interaction Impact

- Existing container hover lift/color remains; no new icon animation.

### Risks / Edge Cases

- Inconsistent optical weight despite identical numeric size.
- Importing an icon name not present in the installed version (the proposed names have already been verified).

### Verification Checklist

- [ ] All five icons use Lucide outline SVGs.
- [ ] All five share the same size and stroke width.
- [ ] Each glyph communicates its feature clearly.
- [ ] No titles, descriptions, layout, spacing, colors, or containers changed.
- [ ] No new dependency was added.

## 8. Footer — Primary Maroon + Logo Colour Inversion

### Current State

- The active footer is the `WorkmateFooter` function inside `WorkmateLayout.jsx`.
- It uses `bg-card`/white, dark text, `border-line`, the same `logo.png` as the navbar, and a 1280px shell.
- `logo.png` is a high-resolution raster with a red/maroon circular field, white mark/text, white square corners clipped by `rounded-full`, and no alpha channel.
- No vector or inverse logo variant exists in the repository.
- The chatbot is fixed at z-index 45 over the footer.

### Requested State

- Use the established primary dark maroon as the footer background.
- Invert/interchange the footer logo’s light and maroon roles without altering any geometry.
- Adjust all footer text, divider, link, hover, and chatbot-over-footer contrast appropriately.

### Likely Root Cause / Existing Implementation

- Footer classes are still configured for a light surface, and the only available logo asset is the light-page version.
- A CSS `filter: invert()` would not safely swap the brand colors: it would turn maroon toward cyan/green and affect shadows/anti-aliasing.

### Files / Components Involved

- `client/src/pages/workmate/WorkmateLayout.jsx`
- `client/src/index.css` for a canonical landing brand-primary alias if approved.
- `client/src/assets/logo.png` — source only; do not overwrite.
- Proposed new footer-only asset: `client/src/assets/logo-footer.png` (exact final name can be confirmed during implementation).
- `client/src/components/NexaChatbot.jsx` — verification only.

### HOW TO IMPLEMENT

1. Treat existing `--color-accent-dark: #8b0e16` as the current canonical dark-maroon code token. To make intent explicit without changing every accent on the site, optionally alias a landing token such as `--color-brand-primary: var(--color-accent-dark)` rather than redefining `--color-accent` globally.
2. Change only the active `WorkmateFooter` surface to that token.
3. Use off-white `#faf7f7`/`--color-bg` for primary footer headings/brand text; use a controlled translucent off-white for body, links, and copyright. Use a subtle light divider/border and a clear off-white or lighter-red hover/focus state with WCAG contrast checks.
4. Create a separate footer logo from the existing 1254×1254 source using a deterministic color-mask/remap workflow, not generative redraw:
   - Preserve canvas size, circle boundary, mark geometry, proportions, letters, brain/Q detail, and edge locations.
   - Remap the red/maroon circular field to the site off-white.
   - Remap the original light mark/text to `#8b0e16` (with maroon-tinted tonal/shadow handling that preserves edges).
   - Retain antialiased edge coverage and export at full source resolution.
   - Compare the source and derivative silhouettes/edge masks before use.
5. Import the new asset only in `WorkmateFooter`; keep the navbar using the original logo.
6. Do not use CSS `filter`, recreate the logo with text/SVG approximations, or ask an image generator to redraw it.
7. Check the fixed chatbot launcher and open panel over the dark footer; add no footer-specific chatbot redesign unless contrast/visibility actually fails.

### What Must Stay AS IS

- Footer column structure, copy, links, spacing concept, logo geometry, and navbar logo.
- No logo redesign, new emblem, font recreation, or proportion change.

### Responsive Impact

- Preserve the existing one/two/four-column grid behavior.
- Confirm enlarged global footer type does not wrap awkwardly at 768/1024px.
- Ensure the chatbot does not cover the last link/copyright on 375–430px screens.

### Animation / Interaction Impact

- Smooth anchor links and link hover/focus behavior remain.
- Chatbot z-index remains below navbar and above footer.

### Risks / Edge Cases

- Losing fine logo detail during color masking.
- Low-contrast muted links on maroon.
- Accidentally replacing the navbar logo.
- Treating bright `--color-accent` as the requested dark-maroon footer color.

### Verification Checklist

- [ ] Footer background uses the approved canonical dark-maroon token/value.
- [ ] Heading, body, link, hover/focus, copyright, and divider contrast are accessible.
- [ ] Footer logo has an off-white field and maroon mark.
- [ ] Footer logo geometry/pixels align with the source silhouette.
- [ ] Navbar logo remains unchanged.
- [ ] Footer layout/content remain unchanged.
- [ ] Chatbot launcher and panel remain legible over the footer.

## 9. AI Evaluation — Fit Entire Section in One Desktop Viewport

### Current State

- `EnterpriseAI` in `WHome.jsx` renders `AIScorePanel`, then a rotating capability card below it.
- The section has no `height`, `min-height`, `100vh`, sticky behavior, or internal scrolling; its natural content height is the issue.
- Current vertical contributors:
  - Outer padding: 48px top/bottom, 64px at `sm` and above.
  - Score panel padding: 32px desktop.
  - Skill rows: 24px vertical gaps; legend margin/top padding.
  - Gauge: 148px plus title/description margins.
  - Gap before lower capability area: 40/48px.
  - Capability slot/card: 220/210px minimum plus dot row.
- Screenshots 13 and 14 show the lower card falling below the first desktop view.
- The capability card rotates every 4200ms with Motion; this timer is unrelated to the Interview Insights 10-second request.
- `FiberBurstCanvas` derives its geometry from the section’s bounding box and redraws on resize.

### Requested State

- On normal desktop viewports, Communication, Problem Solving, Technical Skills, legend, AI Evaluation heading, candidate score/gauge, readiness description, and the main lower capability/security card should be visible together in approximately one viewport.
- Keep design, score controls, colors, gauge, lower card, FiberBurst effect, and overall two-column/stacked concept.

### Likely Root Cause / Existing Implementation

- Natural vertical spacing totals are already close to or greater than the usable height of 1366×768 once the fixed navbar is considered.
- Applying the global larger desktop scale without a local compact mode would increase the overflow.
- There is no internal continuation mechanism to fix; the section simply needs desktop-specific vertical compaction.

### Files / Components Involved

- `client/src/pages/workmate/WHome.jsx` — `EnterpriseAI` outer padding/gaps/capability card.
- `client/src/pages/workmate/AIScorePanel.jsx` — panel padding, skill gaps, legend, gauge, and description spacing.
- `client/src/pages/workmate/FiberBurstCanvas.jsx` — verification only unless origin/reach needs a small proportional adjustment after compaction.
- `client/src/index.css` — optional landing-scoped/desktop-height compact rules.

### HOW TO IMPLEMENT

1. Add a desktop-only compact treatment for this section after the global scale work. Do not give the section an internal scrollbar or blindly set `height: 100vh`.
2. Target a natural section height no greater than approximately `calc(100svh - 62px)` at 1366×768 when content fits, while allowing natural overflow on unusually short viewports or enlarged user text.
3. Reduce desktop-only outer padding from 64px toward 28–36px per side.
4. Reduce score panel desktop padding from 32px toward 20–24px, skill-row gaps from 24px toward 16–18px, and legend top spacing while keeping touch targets/readability.
5. Reduce the gauge box from 148px toward approximately 118–128px and its max width proportionally; retain the same SVG path/stroke concept and readable percentage.
6. Reduce the gap before the capability area from 48px toward 16–24px.
7. Reduce capability slot/card minimum height from 220/210px toward approximately 150–170px and padding from 36px toward 24px; keep its icon, title, description, border, radius, hover, and rotation.
8. Keep the score panel’s desktop two-column grid. Do not move/remove required content or redesign it into tabs.
9. Apply full natural stacking at tablet/mobile; the one-viewport target is desktop-only and must not force tiny controls on narrow screens.
10. After compaction, inspect FiberBurst origin (`height * 0.82`) and reach (`min(width * 0.42, height * 0.58)`). Adjust only if the burst no longer sits behind/below the lower card; `ResizeObserver` already handles redraws.
11. Leave the 4200ms lower capability rotation unchanged unless separately requested.

### What Must Stay AS IS

- All score labels/values, editable controls, legend, candidate score, readiness text, lower capability content, colors, gauge design, golden/maroon fibers, card design, and capability rotation behavior.

### Responsive Impact

- Desktop widths ≥1024px and viewport heights ≥700px: compact target.
- Short desktop heights: allow normal document scroll rather than clipping.
- Tablet/mobile: retain stacked score/readiness columns and natural section height; no one-screen requirement.

### Animation / Interaction Impact

- Motion card enter/exit/hover uses transforms and should remain unchanged.
- Canvas must resize and remain pointer-transparent.
- Range and number inputs must retain focus styles, keyboard use, and adequate target sizes.

### Risks / Edge Cases

- Over-compacting text or score controls at 1366×768.
- Clipping the absolutely positioned capability card by shrinking only its wrapper.
- Canvas burst becoming visually misplaced after height reduction.
- A fixed height clipping content at 200% text zoom.

### Verification Checklist

- [ ] Required upper and lower content is visible together at 1366×768, subject to normal browser chrome/usable viewport.
- [ ] The section comfortably fits at 1440×900, 1536×864, and 1920×1080.
- [ ] No internal scrollbar is introduced.
- [ ] No content is clipped at larger text settings; short viewports can scroll naturally.
- [ ] Gauge and controls remain readable and operable.
- [ ] Capability card rotation/hover remains unchanged.
- [ ] FiberBurst remains correctly positioned and performant.
- [ ] Tablet/mobile retain natural stacking.

## 10. Hero Primary Colour Correction

### Current State

- Hero `Better Decisions.` uses `text-accent`, currently `#c4161f`, the brighter landing red.
- The existing darker canonical maroon token is `--color-accent-dark: #8b0e16`.
- The hero text itself has no color animation; its parent reveal animates opacity/position.

### Requested State

- `Better Decisions.` must use the true primary WorkmateIQ dark maroon, matching the logo/primary theme rather than the brighter red.

### Likely Root Cause / Existing Implementation

- The span uses the generic accent token chosen for CTAs and highlights, not the existing dark-maroon token.

### Files / Components Involved

- `client/src/pages/workmate/WHome.jsx` — hero span class.
- `client/src/index.css` — canonical token/alias only if approved.

### HOW TO IMPLEMENT

1. Use the same approved dark-maroon token as the footer (`#8b0e16` based on current code evidence), ideally through `text-accent-dark` or an explicit `brand-primary` alias.
2. Do not globally redefine `--color-accent`; that would recolor buttons, borders, icons, animations, and unrelated sections outside this request.
3. Keep hero reveal/tilt and heading markup otherwise unchanged.

### What Must Stay AS IS

- Hero wording, line structure, font, weight, size strategy, reveal, mockup, buttons, and other colors.

### Responsive Impact

- Color-only; verify contrast on the light hero background at all widths.

### Animation / Interaction Impact

- None; the reveal is on the parent heading and should remain unchanged.

### Risks / Edge Cases

- Using bright `--color-accent` again by mistake.
- Globally changing the accent token and unintentionally recoloring the page.

### Verification Checklist

- [ ] `Better Decisions.` uses the approved canonical dark maroon.
- [ ] Other hero lines remain ink-colored.
- [ ] No global accent colors changed unintentionally.
- [ ] Reveal and responsive wrapping remain correct.

## 11. Cross-Section Regression Risks

- Fixed navbar height vs. `scroll-mt-20`, audience sticky `top-24/lg:top-28`, and IntersectionObserver active-nav root margin.
- Hero fold and CTA wrapping after desktop enlargement.
- InterviewPreview 1100px breakpoint and hover scale causing overflow.
- Interview Insights fixed viewport heights clipping enlarged type/content.
- Audience sticky wrappers (`86/90vh`) becoming too short for richer copy.
- GSAP ScrollTrigger positions becoming stale after font/layout changes.
- Journey descriptions wrapping without changing marker alignment.
- Powerful Features five-column optical balance after icon replacement.
- AI Evaluation canvas geometry after vertical compaction.
- Pricing/contact/footer enlargement increasing chatbot overlap.
- Absolute glows/backgrounds causing horizontal overflow.
- Browser zoom at 80%, 100%, 125%, and 200% text scaling.
- `prefers-reduced-motion` final states and cleanup under React StrictMode.
- Existing untracked `output/` and `tmp/` directories are user-owned and must remain untouched.

## 12. Responsive Verification Matrix

| Viewport | Global scale | Key checks |
|---|---|---|
| 1920×1080 | Full new desktop baseline | Match current 125%-like density; max-width/margins; complete AI Evaluation; footer/chatbot. |
| 1536×864 | Full/moderated desktop | Hero wrapping; carousel clipping; audience sticky travel; evaluation fits. |
| 1440×900 | Moderated desktop | Buttons, five-column features, audience copy balance, no overflow. |
| 1366×768 | Tight desktop | Hero fold, nav/anchors, one-viewport evaluation, sticky stack, no clipping. |
| ~1024px width | Tablet/desktop boundary | `lg` two-column activation, 980/1100 CSS breakpoint interactions, audience height, navbar mobile menu. |
| ~768px width | Tablet | Stacked hero/evaluation, two-column features, journey alternation threshold, footer grid. |
| ~430px width | Mobile | Current-scale typography, carousel 620px viewport, chatbot panel/launcher, footer overlap. |
| ~390px width | Mobile | Button/text wrapping, audience natural height, journey marker/line, no x-overflow. |
| ~375px width | Small mobile | Minimum safe gutters, feature cards, form fields, logo/footer/chatbot clearance. |

For every row:

- [ ] Browser zoom 100% has no horizontal overflow.
- [ ] Navbar/menu, active indicator, and smooth anchors work.
- [ ] Carousel remains clipped correctly and dwells for 10 seconds.
- [ ] Audience foreground card is opaque in both scroll directions.
- [ ] Journey structure is unchanged.
- [ ] Chatbot launcher opens, closes, and stays inside viewport.
- [ ] Keyboard focus is visible and text remains readable.
- [ ] Reduced motion shows complete content without stuck opacity.

## 13. Final Implementation Order

1. Confirm the approved canonical dark-maroon value and proposed copy/logo strategy.
2. Add the landing-only scope and centralized desktop typography/container treatment.
3. Adjust section-specific desktop dimensions, protecting tablet/mobile.
4. Correct the hero highlight token.
5. Change the Interview Insights normal autoplay delay to 10 seconds.
6. Update audience copy/type and remove only the parent opacity tween.
7. Replace only the Journey data array.
8. Swap the five Lucide glyphs with consistent size/stroke.
9. Create and wire the deterministic footer-only inverse logo; convert footer colors.
10. Compact AI Evaluation after the global baseline is visible, then recheck FiberBurst.
11. Refresh/check ScrollTrigger geometry and run the full responsive matrix.
12. Review the final diff to ensure only approved files/content changed.

## 14. Master Acceptance Checklist

- [ ] New desktop 100% visual scale approximately equals current 125% view.
- [ ] Global scale is implemented without `zoom: 1.25`, root scaling, or a fragile whole-page transform.
- [ ] Desktop layout remains responsive.
- [ ] Tablet/mobile remain appropriately sized.
- [ ] Current typography/container values were changed through landing-scoped tokens/rules where possible.
- [ ] Interview Insights slides stay visible for 10 seconds.
- [ ] Interview Insights transition remains approximately 500ms.
- [ ] Audience typography is larger.
- [ ] Audience content is richer and supported by audited project capabilities.
- [ ] All three audience cards are checked for ghosting.
- [ ] No previous audience card is visible through the active card.
- [ ] Stacked-card design remains unchanged.
- [ ] Journey still uses the exact existing design.
- [ ] Journey contains exactly five steps.
- [ ] Journey step 1 = Discover.
- [ ] Journey step 2 = Register.
- [ ] Journey step 3 = Onboard.
- [ ] Journey step 4 = Review.
- [ ] Journey step 5 = Begin Your Journey.
- [ ] Connect is removed/not added.
- [ ] Move Forward is replaced by Begin Your Journey.
- [ ] Powerful Features icons use a coherent professional Lucide SVG set.
- [ ] Powerful Features layout/content remain unchanged.
- [ ] Footer uses the approved actual primary dark maroon.
- [ ] Footer logo geometry remains exactly unchanged.
- [ ] Footer logo light/maroon colors are inverted appropriately.
- [ ] Footer text/divider/hover states have sufficient contrast.
- [ ] AI Evaluation main content fits within approximately one normal desktop viewport.
- [ ] AI Evaluation design and colors remain unchanged.
- [ ] `Better Decisions.` uses the canonical primary brand maroon.
- [ ] Chatbot still works and remains positioned correctly.
- [ ] No horizontal overflow exists at required widths.
- [ ] No sticky, carousel, GSAP ScrollTrigger, Motion, canvas, or reduced-motion behavior is broken.
- [ ] Navbar height, anchor offsets, and active navigation remain aligned.
- [ ] No unsupported claims are introduced.
- [ ] No unrelated routes, components, server/services, assets, or styling are changed.
- [x] No implementation was performed during this planning phase.

# HOW TO MAKE THESE CHANGES

This section extends the approved plan with an implementation-ready checklist for the newest carousel, audience-card, scoring, brand-consistency, and feature-icon references. It is based on the active WorkmateIQ route and the current post-implementation baseline; it does not authorize changes outside the files named below.

## Reference Mapping and Measured Baseline

The attached files should be identified by subject rather than by the ambiguous numbering used in the pasted brief:

| Reference | Subject | Planned use |
|---|---|---|
| Reference 1 | Three people collaborating around a laptop | Replacement visual for `One Platform. Endless Possibilities.` |
| Reference 2 | Candidate ranking and top performer | Replacement visual for `Rank Candidates. Hire with Confidence.` |
| Reference 3 | AI interview evaluation and radar overview | Replacement visual for `Evaluation That Sees the Real Potential` |
| References 4–8 | Current Interview Insights carousel at desktop/browser scale | Height, padding, background, clipping, navigation, and motion comparison |
| References 9–11 | Current Colleges, Candidates, and Organizations sticky cards | Decoration placement and regression baseline |
| Reference 12 | Earlier compact three-card audience treatment | Inspiration for category-specific professional icons only; not a layout target |
| Reference 13 | Current AI Evaluation score panel | Gauge-number sizing and threshold verification |
| Reference 14 | Hero heading crop | Primary-maroon consistency verification |
| Reference 15 | Current Powerful Features AI Evaluation icon | Icon replacement target |

Measured current behavior:

- At 1920×1080 and 1366×768, `.scroll-showcase-viewport` is 560px high, each `.showcase-card` has 44px vertical and 64px horizontal padding, and the carousel section occupies 636px including outer spacing.
- At 768px, the viewport remains 560px high. At 430px, it becomes 620px high with 24px 20px 30px card padding.
- The current carousel gradient resolves to `#771a35 → #90233f → #71162f` at 125 degrees.
- The overall readiness number is 52px on desktop, 44px at tablet width, and 36px at 430px.
- The three supplied replacement PNGs are approximately 1.4–1.7 MB each and approximately 1.82–2.00:1. They require asset optimization and responsive containment, but not cropping or redrawing.
- The active page has no positive horizontal overflow at the measured 1920, 1366, 768, and 430px widths.

## Implementation Checklist

- [ ] Stage and optimize the three supplied carousel visuals under stable WorkmateIQ asset names.
- [ ] Replace all three carousel visual implementations with image-backed visuals while preserving slide copy and CTAs.
- [ ] Lighten only the Interview Insights card gradient within the existing wine/maroon family.
- [ ] Reduce desktop carousel height, outer whitespace, and internal vertical padding without clipping content.
- [ ] Add accessible left/right manual navigation controls.
- [ ] Preserve 10-second autoplay and restart the full dwell after each manual navigation.
- [ ] Make clone resets symmetric so previous and next navigation both loop seamlessly.
- [ ] Keep the 500ms horizontal track transition and make directional movement visually clear.
- [ ] Add restrained, category-specific audience-card decorations behind existing content.
- [ ] Reduce only the overall readiness percentage size on desktop.
- [ ] Verify the existing low/medium/high score thresholds at every boundary; do not rewrite them if unchanged.
- [ ] Verify hero, Interview Insights, footer, and feature accents use the established brand tokens appropriately.
- [ ] Replace only the Powerful Features AI Evaluation glyph with a clearer professional Lucide icon.
- [ ] Run responsive, interaction, accessibility, reduced-motion, build, and final-diff checks.

## Change 1 — Replace Current Carousel Visuals

### Current implementation

`VerticalScrollShowcase.jsx` defines three textual entries in `STRIPS`, then chooses a separate visual with `ShowcaseVisual`:

- `CollaborationVisual` renders `showcase-collaboration.png`.
- `EvaluationVisual` is hand-built JSX/CSS using `REPORT_METRICS` and an inline radar SVG.
- `RankingVisual` is hand-built JSX/CSS using `RANKED_CANDIDATES`.

The carousel renders five physical cards (`last clone + three real slides + first clone`), so every visual must also work correctly in clone positions.

### Reference image(s)

- Reference 1: connected ecosystem/collaboration visual.
- Reference 3: interview evaluation/radar visual.
- Reference 2: candidate ranking/top performer visual.

### Files/components involved

- `client/src/pages/workmate/VerticalScrollShowcase.jsx`
- `client/src/pages/workmate/VerticalScrollShowcase.css`
- Three new files in `client/src/assets/workmate/`
- Potential deletion of `client/src/assets/workmate/showcase-collaboration.png` only after confirming no remaining import

### Problem

The three slides use inconsistent visual construction. One uses a raster asset while two reproduce report UIs in component markup. The supplied references are the approved, more polished visuals and should become the complete visual source for each slide.

### How to make the change

1. Copy the supplied source images into the repository with these stable names:
   - `showcase-connected-ecosystem.png`
   - `showcase-interview-evaluation.png`
   - `showcase-candidate-ranking.png`
2. Optimize the PNGs losslessly first. If a high-quality WebP conversion materially reduces weight without visible degradation, use `.webp` consistently and update the proposed paths; otherwise retain PNG. Preserve original proportions and fine text/line detail.
3. Import all three assets in `VerticalScrollShowcase.jsx` and add `image` and `imageAlt` properties to the existing `STRIPS` entries. Keep content and visual data together instead of switching on numeric indexes.
4. Replace `ShowcaseVisual`, `CollaborationVisual`, `EvaluationVisual`, and `RankingVisual` with one small image renderer inside the existing `.showcase-visual` area.
5. Remove `REPORT_METRICS`, `RANKED_CANDIDATES`, and any imports used only by the deleted generated visuals.
6. Render each image with a real `<img>`, descriptive alt text, `decoding="async"`, `width`/`height` attributes matching the stored asset, and native loading behavior. The initially visible slide may load eagerly; the other unique slide images may use `loading="lazy"`. Do not add a custom preloader.
7. Use `object-fit: contain` and centered positioning. The entire supplied artwork must remain visible; do not crop embedded labels, portraits, charts, or borders.
8. Keep a light neutral backing surface and a restrained radius around the image so small subpixel gaps at the edges do not reveal maroon.

### Things that must remain unchanged

- All three slide eyebrows, headings, descriptions, bullets, CTA labels, and CTA destinations.
- Slide order: ecosystem, evaluation, ranking.
- Existing outer card radius, shadow language, text colors, checkmark styling, indicator dots, and clipping.
- Autoplay duration, hover pause, visibility handling, reduced-motion behavior, and cleanup except where Change 4 requires symmetric manual navigation.
- The supplied artwork itself: no redraw, generative replacement, CSS recreation, or destructive crop.

### Responsive considerations

- Desktop: keep the visual in the left column and size it by available height; do not let its intrinsic width force the copy column narrower.
- Tablet: preserve the current two-column breakpoint behavior until the established stack breakpoint; reduce the visual basis rather than cropping.
- Mobile: retain the current stacked order, use `width: 100%`, `height: auto`, and cap the visual height only with `object-fit: contain`.
- Avoid rendering the embedded reference-image text so small that it becomes visual noise. If necessary, slightly increase the mobile visual allocation while keeping the card within the planned mobile height range.

### Edge cases

- The first and last clones will repeat asset URLs; the browser should reuse the resource cache rather than receive separate generated data.
- A slow image load must not collapse the slide. Reserve space using dimensions/aspect ratio.
- If optimization changes file extensions, ensure every import and asset-map entry changes together.
- Run `rg` before deleting `showcase-collaboration.png`; leave it in place if any active import remains.

### Verification

- [ ] Each slide shows the correct approved image and no generated visual remains.
- [ ] All embedded text and borders are fully visible at desktop, tablet, and mobile widths.
- [ ] No image is stretched, cropped, pixelated, or surrounded by an unintended maroon strip.
- [ ] Clone slides render the same image as their corresponding real slide.
- [ ] The browser network view shows one cached resource per unique visual, not repeated data generation.

## Change 2 — Lighten the Carousel Background

### Current implementation

`.showcase-card` uses `linear-gradient(125deg, #771a35 0%, #90233f 48%, #71162f 100%)`.

### Reference image(s)

- References 4–8 show the current dark carousel field.
- References 1–3 show the light artwork that must remain visually separated from the maroon field.

### Files/components involved

- `client/src/pages/workmate/VerticalScrollShowcase.css`

### Problem

The current field is darker than requested and visually heavier than the rest of the landing page. The replacement visuals should sit within a wine/maroon frame that is approximately two tonal steps lighter without turning bright red or pink.

### How to make the change

1. Change only `.showcase-card`'s gradient.
2. Use the existing wine hue and the canonical dark-maroon token as the visual reference. Start with:
   - start `#8f2442`
   - midpoint `#a33250`
   - end `#861e39`
   - retain the current 125-degree direction and 0/48/100% stops.
3. Compare the result beside the footer (`#8b0e16`) and hero accent. The carousel should read as the lighter wine surface, while the footer and headline remain the strongest primary maroon.
4. If tuning is required, adjust lightness by small increments only; keep hue and saturation coherent across all three stops.

### Things that must remain unchanged

- Text/check/CTA colors and contrast treatment.
- Card radius, border, shadow, content order, and layout.
- Global color tokens. Do not redefine `--color-accent` or `--color-accent-dark` to achieve this local effect.
- Footer and hero colors.

### Responsive considerations

- Use the same local gradient at all breakpoints.
- Confirm white copy remains comfortably readable on the lightest midpoint.

### Edge cases

- Do not use opacity on the whole card; that would expose the page background and weaken contrast.
- Do not derive the gradient from a browser-dependent blend without a fallback if support is uncertain.

### Verification

- [ ] Carousel is visibly lighter than the current baseline but remains wine/maroon.
- [ ] White headings, body text, bullets, and controls maintain reasonable contrast.
- [ ] No unrelated red or maroon surface changes.

## Change 3 — Reduce Carousel Height, Whitespace, and Padding

### Current implementation

Desktop currently uses a 560px fixed viewport, a 636px total carousel section, 44px 64px card padding, and up to 48px internal gap. Mobile uses a 620px fixed viewport.

### Reference image(s)

- References 4–8 show excessive blank vertical space in the current card.
- References 1–3 establish the aspect ratio and internal whitespace already present within the approved art.

### Files/components involved

- `client/src/pages/workmate/VerticalScrollShowcase.css`

### Problem

The current fixed height and large desktop padding leave unnecessary open space, particularly after switching to artwork that already includes its own light margins.

### How to make the change

1. Tune after Change 1 is complete so the actual asset ratios drive the final values.
2. Desktop at 1280px and above:
   - target viewport height: 460–480px; start at 472px.
   - target card padding: 26–30px vertically and 48–56px horizontally; start at `28px 52px`.
   - target card gap: 32–40px; start at 36px.
   - target section bottom padding: 24px rather than 64px.
3. 981–1279px:
   - target viewport height: 480–510px; start at 496px.
   - use the existing fluid padding formula but cap vertical padding near 26px.
4. 681–980px:
   - retain enough height for the existing layout transition, approximately 520–550px.
   - validate copy wrapping at 768px before reducing below 530px.
5. 680px and below:
   - retain the stacked card and use approximately 590–610px as the starting range.
   - reduce the visual's flex basis/max height before removing text spacing.
   - do not force a desktop-like 472px height that clips mobile content.
6. Reduce `.scroll-showcase` top/bottom padding only where it contributes empty space; do not erase the visual separation between About, carousel, and Audience sections.
7. Keep the viewport fixed per breakpoint for a stable transform track. Do not change to per-slide dynamic heights that cause the page to jump on autoplay.

### Things that must remain unchanged

- Horizontal shell width and page gutters.
- Card clipping, radius, shadows, columns/stack order, copy, and controls.
- The 500ms motion duration.
- Natural page scrolling; do not add an internal scrollbar.

### Responsive considerations

- Verify 1920×1080, 1536×864, 1440×900, and 1366×768 before locking the desktop value.
- Verify 1024, 768, 430, 390, and 375px for wrapping and visual readability.
- High browser zoom or larger user text may require natural overflow; do not hide overflowing text to preserve a target height.

### Edge cases

- The tallest slide copy must determine the safe height, not the shortest slide.
- The artwork has internal whitespace; do not compensate by cropping it.
- Avoid `100vh`, `zoom`, or whole-card transforms as sizing tools.

### Verification

- [ ] Desktop carousel is materially shorter and no longer feels padded vertically.
- [ ] Every slide fits without clipped copy, CTA, checklist, visual, arrows, or indicators.
- [ ] Slide changes do not shift the page vertically.
- [ ] No internal scrollbar or horizontal page overflow appears.

## Change 4 — Add Manual Left/Right Carousel Navigation

### Current implementation

The carousel advances automatically every `AUTOPLAY_DELAY_MS = 10_000`, pauses on hover, responds to document visibility, and uses clone slides. It has indicator dots but no previous/next controls. The current clone reset handles only the forward autoplay seam.

### Reference image(s)

- References 4–8 show the carousel surface and available control space.

### Files/components involved

- `client/src/pages/workmate/VerticalScrollShowcase.jsx`
- `client/src/pages/workmate/VerticalScrollShowcase.css`

### Problem

Users cannot manually inspect a prior or next slide, and the one-direction reset logic is insufficient once backward navigation is introduced.

### How to make the change

1. Add two semantic `<button type="button">` controls inside the existing viewport, one previous and one next.
2. Use installed Lucide `ChevronLeft` and `ChevronRight`; do not add an icon dependency.
3. Give buttons explicit accessible names: `Previous insight` and `Next insight`.
4. Position controls vertically centered near the viewport edges, above card content but away from the chatbot. Use a light/off-white circular surface, primary-maroon icon, restrained border/shadow, and visible hover/focus-visible states.
5. Implement one small navigation function that:
   - clears the pending autoplay timeout;
   - enables transition;
   - increments or decrements `physicalIndex` by one;
   - allows the normal scheduling effect to arm a fresh 10-second dwell after the state settles.
6. Make clone reset symmetric:
   - physical index 0 is the last-slide clone and resets without animation to physical index 3 after the visible backward transition.
   - physical index 4 is the first-slide clone and resets without animation to physical index 1 after the visible forward transition.
7. Prefer the track's `transitionend` event for clone reset rather than guessing transition completion with another timer. Keep a defensive fallback only if testing reveals that reduced motion prevents the event.
8. Disable repeated arrow activation only for the brief 500ms transition if rapid clicks can skip beyond clone bounds; do not leave the controls disabled during the 10-second dwell.
9. Treat keyboard activation exactly like pointer activation and restore the autoplay timer in the same way.

### Things that must remain unchanged

- 10-second normal dwell.
- Hover pause, visibility handling, reduced-motion behavior, timeout cleanup, slide order, infinite loop, dots, and copy.
- Approximately 500ms visual transition.
- Chatbot layout and z-index.

### Responsive considerations

- Desktop/tablet: keep controls inside the viewport edge with at least a 44×44px hit area.
- Mobile: reduce visual diameter if needed, but retain a minimum 40–44px interactive target and move controls so they do not cover text/CTA.
- If inside-edge placement obscures mobile content, align arrows near the pagination row rather than outside the shell.

### Edge cases

- Clicking next on slide 3 must animate to the first-slide clone, then reset invisibly to the real slide 1.
- Clicking previous on slide 1 must animate to the last-slide clone, then reset invisibly to the real slide 3.
- A manual click at 9.5 seconds must cancel the nearly due timer and provide a full new 10-second dwell.
- Hovering after a manual click must not create a second timer on mouse leave.
- React StrictMode mounting must still result in only one live timeout.
- A hidden tab must not advance or accumulate overdue transitions.

### Verification

- [ ] Left/right controls work with mouse, touch, Enter, and Space.
- [ ] Controls have visible focus and descriptive accessible names.
- [ ] Manual navigation resets the dwell to a full 10 seconds.
- [ ] Forward and backward seams are visually seamless.
- [ ] Rapid click, hover, hidden-tab, and StrictMode tests produce no duplicate advances.

## Change 5 — Make the Carousel Motion Read as a True Horizontal Slider

### Current implementation

The track already uses a horizontal percentage transform and a 500ms cubic-bezier transition. Because the visuals are visually quiet and the card fills the viewport, the motion can read as a content swap rather than a directional slide.

### Reference image(s)

- References 4–8 provide the current transition context.

### Files/components involved

- `client/src/pages/workmate/VerticalScrollShowcase.jsx`
- `client/src/pages/workmate/VerticalScrollShowcase.css`

### Problem

The transition direction is not sufficiently apparent, especially during autoplay.

### How to make the change

1. Keep the existing translate-based track; it is already the simplest correct horizontal-carousel architecture.
2. Preserve the current 500ms `cubic-bezier(0.22, 1, 0.36, 1)` motion.
3. Ensure the transition is applied whenever the physical index changes and disabled only during clone teleport resets.
4. Use index direction consistently:
   - next increments index, moving the track left so the next slide enters from the right;
   - previous decrements index, moving the track right so the previous slide enters from the left.
5. Add an active-state class or `aria-hidden` state to physical cards. If a subtle content reinforcement is still needed after the new imagery is installed, use only a restrained opacity change (for example 0.92 to 1) over the same duration. Do not add a second large translate to card contents.
6. Keep `will-change: transform` limited to the moving track. Do not promote every descendant indefinitely.
7. Under `prefers-reduced-motion: reduce`, remove the animated transition and update slides immediately while keeping controls and state correct.

### Things that must remain unchanged

- Existing horizontal track and viewport clipping.
- 10-second dwell, 500ms normal duration, indicators, ordering, content, and infinite loop.
- No Framer Motion, GSAP, Swiper, or new carousel library.

### Responsive considerations

- Use the same directional model at every width.
- Do not add large motion distances to copy or artwork on narrow screens.

### Edge cases

- Clone teleports must never animate across multiple slides.
- Reduced motion must not wait for `transitionend` indefinitely; run the reset synchronously or on the next animation frame.
- If an opacity reinforcement is added, clones must receive the correct active state during seam transitions.

### Verification

- [ ] Next visibly enters from the right and previous visibly enters from the left.
- [ ] Autoplay movement is clearly horizontal.
- [ ] There is no flash, blank frame, double transition, or multi-slide sweep at either seam.
- [ ] Reduced-motion mode changes slides without animation.

## Change 6 — Add Subtle Audience-Card Illustrative Icons

### Current implementation

The three audience cards are defined by the `panels` data in `WHome.jsx` and rendered by `SolutionPanel`. Each card already has a faint ring and glow, sticky stacking, a left copy column, and a right illustration. Bullet rows use Lucide `Check` icons.

### Reference image(s)

- References 9–11: current large sticky-card layout.
- Reference 12: professional category-icon inspiration only.

### Files/components involved

- `client/src/pages/workmate/WHome.jsx`

### Problem

The cards have unused negative space and limited category-specific visual texture, but their approved layout, typography, illustrations, and sticky behavior should not be redesigned.

### How to make the change

1. Keep all decoration logic in `WHome.jsx`; do not create a new component file or asset pipeline.
2. Add one primary category icon to each panel's data:
   - Colleges & Institutions: `GraduationCap`
   - Candidates: `UserRound`
   - Organizations: `Building2`
3. Render the primary icon as a restrained outline badge in available card space, separate from the heading and bullet checks. Use the existing pale accent surface, primary red/maroon stroke, approximately 24–28px icon size, and `strokeWidth` around 1.7–1.8.
4. Add no more than two secondary outline decorations per card, selected from installed Lucide icons:
   - Colleges: `BookOpen` and `NotebookTabs`.
   - Candidates: `FileText` and `Target`.
   - Organizations: `BriefcaseBusiness` and `ChartNoAxesCombined`.
5. Render secondary decorations absolutely behind the content with `pointer-events-none`, `aria-hidden="true"`, low opacity (approximately 0.04–0.08), and no animation.
6. Position decorations in genuinely unused corners/negative space. Keep them out of the reading path, checkmark column, and illustration face/body.
7. Reuse the existing card `relative` positioning and z-index layers. Add `relative z-10` only to content wrappers that need to stay above the decorative layer.

### Things that must remain unchanged

- Card layout, dimensions, surfaces, radii, borders, shadows, padding, typography, copy, and audience order.
- Sticky behavior, z-index progression, scale/y interaction, and full opacity.
- Existing audience illustrations and their sizing concept.
- Bullet checkmarks and entrance animations.

### Responsive considerations

- Hide secondary decorations below the small/tablet breakpoint if they compete with copy or imagery.
- Keep the primary category badge modest at mobile widths and ensure it does not increase card height.
- Recheck 1024px carefully because richer copy and the illustration already share limited space.

### Edge cases

- Decorations must not capture pointer events or appear in the accessibility tree.
- They must not show through the foreground card during sticky overlaps.
- Avoid CSS opacity on `.solution-card`; apply opacity only to individual decorative icons.

### Verification

- [ ] Each audience has a clearly relevant but restrained category icon.
- [ ] Decoration remains behind existing content and illustrations.
- [ ] No layout, card-height, sticky, or ghosting regression occurs.
- [ ] Mobile cards remain uncluttered and readable.

## Change 7 — Slightly Reduce the Dynamic Overall Score Number

### Current implementation

`AIScorePanel.jsx` renders `{overallScore}%` in `.score-num.type-metric`. The landing typography rules make it 52px on desktop, 44px at tablet width, and 36px at 430px.

### Reference image(s)

- Reference 13: current AI Evaluation gauge and score number.

### Files/components involved

- `client/src/pages/workmate/AIScorePanel.jsx`
- `client/src/index.css`

### Problem

The dynamic overall percentage dominates the gauge more than necessary at desktop sizes. The request is a local, slight reduction, not a change to all landing metrics.

### How to make the change

1. Retain the existing `.score-num` hook and add a landing-scoped rule more specific than the shared `.type-metric` rule.
2. Set the desktop score number to approximately 46px instead of 52px.
3. Keep tablet near 42–44px and mobile near the current 36px unless visual testing shows crowding.
4. Preserve `tabular-nums`, weight, line-height, maroon color, percentage suffix, and exact gauge centering.
5. Do not alter the shared `.type-metric` scale because it can affect unrelated landing metrics.

### Things that must remain unchanged

- The dynamic numeric value and percent sign.
- Gauge size, arc geometry, score calculation, headings, description, and capability-card timer.
- All other typography tokens and application routes.

### Responsive considerations

- Use a scoped breakpoint or clamp that never makes the mobile score larger than the current value.
- Check `100%` as well as two-digit values so the three-digit number remains centered.

### Edge cases

- Test 0%, 9%, 76%, and 100% for centering.
- Browser zoom and larger user text must not clip the number inside the SVG/gauge area.

### Verification

- [ ] Desktop number is subtly smaller and visually balanced.
- [ ] Mobile/tablet readability is unchanged.
- [ ] Score remains centered for one-, two-, and three-digit values.
- [ ] No other `.type-metric` element changes.

## Change 8 — Verify and Preserve Score Colour Ranges

### Current implementation

`scoreColor(score)` already implements the requested thresholds exactly:

- `score >= 90`: `var(--color-success)`
- `score >= 70`: `var(--color-accent-cyan)`
- otherwise: `#f58b91`

The legend already states `Below 70%`, `70–89%`, and `90%+` with the same three colors. The overall readiness gauge uses the fixed primary maroon rather than this classification helper.

### Reference image(s)

- Reference 13: skill bars, legend, and fixed-maroon readiness gauge.

### Files/components involved

- `client/src/pages/workmate/AIScorePanel.jsx` — verification only unless the implementation has changed before this phase

### Problem

There is no current threshold defect. Rewriting working logic would add risk without changing behavior.

### How to make the change

1. Do not modify `scoreColor` if it still matches the audited implementation.
2. Confirm each skill bar calls the same helper for fill and thumb color.
3. Confirm legend labels and dots match the helper.
4. Keep the overall readiness gauge maroon; it does not currently use the low/medium/high classification and therefore should not be recolored.
5. Add a lightweight unit test only if a relevant test harness already exists for this component. Do not introduce a new testing framework solely for three branches.

### Things that must remain unchanged

- Low color `#f58b91`.
- Medium color `var(--color-accent-cyan)`.
- High color `var(--color-success)`.
- Legend wording/order and gauge color.

### Responsive considerations

- None beyond confirming the legend still fits at narrow widths.

### Edge cases

- Clamp behavior must still keep inputs within 0–100 before coloring.
- Boundary expectations are exact: 69 is low, 70 is medium, 89 is medium, 90 is high.

### Verification

- [ ] 0 and 69 render low.
- [ ] 70 and 89 render medium.
- [ ] 90 and 100 render high.
- [ ] Legend colors match the bars/thumbs.
- [ ] Readiness gauge stays primary maroon.

## Change 9 — Verify Primary Maroon Consistency

### Current implementation

The active theme defines `--color-accent-dark: #8b0e16`. The hero's `Better Decisions.` uses `text-accent-dark`, and the active WorkmateIQ footer uses `bg-accent-dark`. These already resolve to the same canonical dark-maroon value.

### Reference image(s)

- Reference 14: hero accent.
- References 4–8: carousel context.
- The current active dark footer from the approved implementation baseline.

### Files/components involved

- `client/src/index.css` — token verification
- `client/src/pages/workmate/WHome.jsx` — hero class verification
- `client/src/pages/workmate/WorkmateLayout.jsx` — active footer class verification
- `client/src/pages/workmate/VerticalScrollShowcase.css` — intentionally lighter local carousel treatment

### Problem

There is no active hero/footer mismatch in the audited code. The remaining risk is accidentally redefining a global token while lightening the carousel.

### How to make the change

1. Keep `--color-accent-dark: #8b0e16` as the canonical primary maroon.
2. Keep hero and active footer connected to that token.
3. Keep the new carousel gradient local to `.showcase-card`; it is intentionally a lighter supporting wine surface, not a replacement primary token.
4. Verify the footer-only inverse logo still uses its separate asset and the navbar continues to use `logo.png`.
5. Make no code edit for this change if the classes/tokens remain as audited.

### Things that must remain unchanged

- `client/src/assets/logo.png` and navbar logo usage.
- Footer-only inverse asset and footer structure.
- Bright accent token and unrelated components.
- Application/dashboard/admin route colors.

### Responsive considerations

- Verify the same token-driven result at every breakpoint; no responsive color override should exist.

### Edge cases

- Do not replace `#8b0e16` with a new sampled color simply because the carousel is being lightened.
- Do not globally redefine `--color-accent` or `--color-accent-dark`.

### Verification

- [ ] Hero accent and footer background resolve to `#8b0e16`.
- [ ] Carousel is lighter by local CSS only.
- [ ] Navbar logo is unchanged and footer uses only its footer asset.
- [ ] No unrelated route is recolored.

## Change 10 — Replace the Powerful Features AI Evaluation Icon

### Current implementation

`PowerfulFeatures.jsx` uses installed Lucide icons at 24px with `strokeWidth={1.8}`. The AI Evaluation feature currently uses `BrainCog`.

### Reference image(s)

- Reference 15: current AI Evaluation icon presentation.

### Files/components involved

- `client/src/pages/workmate/PowerfulFeatures.jsx`

### Problem

`BrainCog` is visually busy at the existing small size. A simpler evaluation/checking metaphor will read more clearly while the adjacent copy continues to communicate AI.

### How to make the change

1. Replace the `BrainCog` import and the AI Evaluation feature's `Icon` value with Lucide `ClipboardCheck`.
2. Preserve the existing shared renderer, 24px size, 1.8 stroke, icon container, background, color, spacing, copy, columns, and hover behavior.
3. Do not add animation or another icon library.

### Things that must remain unchanged

- The other four approved feature icons.
- Feature titles/descriptions, section layout, badge, card styling, and hover behavior.
- Icon size/stroke/container treatment.

### Responsive considerations

- Confirm the new glyph remains centered and legible at the existing mobile size.

### Edge cases

- Remove the unused `BrainCog` import so lint/build output stays clean.
- Confirm the installed `lucide-react` version exports `ClipboardCheck` before editing.

### Verification

- [ ] AI Evaluation uses `ClipboardCheck`.
- [ ] No dependency or lockfile changes.
- [ ] Other icons and all Powerful Features content/layout remain unchanged.

## Asset Replacement Map

| Carousel slide | Current visual source | Approved reference | Proposed repository asset | Import/render change |
|---|---|---|---|---|
| One Platform. Endless Possibilities. | `showcase-collaboration.png` via `CollaborationVisual` | Reference 1 | `client/src/assets/workmate/showcase-connected-ecosystem.png` | Add to `STRIPS`; render through common `<img>` visual |
| Evaluation That Sees the Real Potential | Generated `EvaluationVisual`, `REPORT_METRICS`, and radar SVG | Reference 3 | `client/src/assets/workmate/showcase-interview-evaluation.png` | Remove generated JSX/data; add asset to `STRIPS` |
| Rank Candidates. Hire with Confidence. | Generated `RankingVisual` and `RANKED_CANDIDATES` | Reference 2 | `client/src/assets/workmate/showcase-candidate-ranking.png` | Remove generated JSX/data; add asset to `STRIPS` |

Asset handling rules:

- Preserve the supplied geometry/aspect ratio and optimize without visible degradation.
- Do not modify unrelated audience, hero, logo, chatbot, or AI Evaluation assets.
- Delete `showcase-collaboration.png` only after `rg` confirms it is no longer referenced.
- Do not place generated output in user-owned `output/` or `tmp/` directories.

## Carousel State Behavior

### Logical behavior

| Active logical slide | Previous action | Next action | Autoplay action |
|---|---|---|---|
| 1 — Ecosystem | Animate right to slide 3 clone, then teleport to real slide 3 | Animate left to slide 2 | After 10s, animate left to slide 2 |
| 2 — Evaluation | Animate right to slide 1 | Animate left to slide 3 | After 10s, animate left to slide 3 |
| 3 — Ranking | Animate right to slide 2 | Animate left to slide 1 clone, then teleport to real slide 1 | After 10s, animate left to slide 1 clone, then teleport to real slide 1 |

### Physical index map

| Physical index | Rendered content | Post-transition reset |
|---|---|---|
| 0 | Clone of logical slide 3 | Reset without transition to physical index 3 |
| 1 | Logical slide 1 | None |
| 2 | Logical slide 2 | None |
| 3 | Logical slide 3 | None |
| 4 | Clone of logical slide 1 | Reset without transition to physical index 1 |

### Timer and event rules

- Maintain a single timeout, never an interval.
- Every autoplay advance, manual navigation, hover pause/resume, visibility change, and unmount must clear the previous timeout before scheduling another.
- A manual action starts a complete new 10,000ms dwell after the requested slide becomes active.
- Hovering longer than 10 seconds must not advance; leaving hover starts a fresh dwell.
- Hidden documents must not advance; visibility restoration starts a fresh dwell.
- `transitionend` should perform clone teleport resets. Reduced motion must perform the equivalent reset synchronously or on the next animation frame.
- Pagination reflects logical index, never clone index.
- If pagination dots are not clickable today, keep them indicators only; adding arrows does not authorize a second direct-jump navigation model.

## Score Thresholds

| Normalized score | Classification | Existing color | Boundary tests |
|---|---|---|---|
| 0–69 | Low | `#f58b91` | 0, 1, 69 |
| 70–89 | Medium | `var(--color-accent-cyan)` | 70, 71, 89 |
| 90–100 | High | `var(--color-success)` | 90, 99, 100 |

The overall readiness gauge remains `var(--color-accent-dark)` because it is a separate aggregate presentation and does not currently use `scoreColor`.

## File-by-File Change Map

| File | Planned change | Risk | Required regression focus |
|---|---|---|---|
| `client/src/pages/workmate/VerticalScrollShowcase.jsx` | Import/configure three image assets; remove generated report/ranking visuals; add arrows; add symmetric directional clone handling and manual timer reset | Medium | Autoplay, seams, StrictMode, visibility, hover, keyboard, reduced motion |
| `client/src/pages/workmate/VerticalScrollShowcase.css` | Image containment, lighter local gradient, shorter responsive heights/padding, arrow styling, active/directional motion polish | Medium | Clipping, contrast, mobile stacking, chatbot overlap, no overflow |
| `client/src/pages/workmate/WHome.jsx` | Add category and low-opacity decorative Lucide icons to existing audience cards only | Medium | Sticky opacity/stacking, 1024px fit, mobile clutter, animation layers |
| `client/src/pages/workmate/AIScorePanel.jsx` | Retain score logic; preserve/add the local `.score-num` hook only if needed | Low | Dynamic values and gauge centering |
| `client/src/index.css` | Add only a landing-scoped `.score-num` desktop size override | Low | No shared metric/application typography changes |
| `client/src/pages/workmate/PowerfulFeatures.jsx` | Swap `BrainCog` for `ClipboardCheck` | Low | Import validity and unchanged layout |
| `client/src/pages/workmate/WorkmateLayout.jsx` | Verification only; no planned edit | Low | Footer token and footer-only logo remain correct |
| `client/src/assets/workmate/showcase-connected-ecosystem.png` | New optimized approved asset | Low | Fidelity, dimensions, weight |
| `client/src/assets/workmate/showcase-interview-evaluation.png` | New optimized approved asset | Low | Fine chart/text fidelity, dimensions, weight |
| `client/src/assets/workmate/showcase-candidate-ranking.png` | New optimized approved asset | Low | Fine table/text fidelity, dimensions, weight |
| `client/src/assets/workmate/showcase-collaboration.png` | Delete only if unused after replacement | Low | `rg` confirms zero references |

No other file should be needed. In particular, do not edit Journey, footer structure/logo generation, chatbot, server, routes, package manifests, or lockfiles for this request.

## Dependencies and Implementation Order

1. **Asset preparation:** copy, name, inspect, and optimize the three references. Record final dimensions and file sizes.
2. **Carousel visual replacement:** move image paths into `STRIPS`, replace generated visuals, and verify all static slides before changing motion.
3. **Carousel sizing/background:** calibrate height, padding, gap, image containment, and lighter local gradient against the final asset ratios.
4. **Carousel controls/state:** add arrows, symmetric clone reset, timer reset, and directional transition behavior. Validate all state transitions before continuing.
5. **Audience decoration:** add category/decorative Lucide icons without changing the sticky-card design.
6. **Score presentation:** reduce only `.score-num`, then execute the threshold boundary matrix without rewriting correct logic.
7. **Feature icon:** replace `BrainCog` with `ClipboardCheck` and remove the unused import.
8. **Brand no-op audit:** verify `#8b0e16` still drives hero/footer and the carousel remains a local lighter derivative.
9. **Full responsive/accessibility QA:** run all required viewports, zoom levels, reduced motion, keyboard, interaction, build, lint, and final-diff checks.

Dependencies:

- Final carousel height depends on the stored asset dimensions and image containment from Changes 1 and 3.
- Manual previous navigation depends on symmetric clone handling from Change 4.
- Directional motion validation depends on both arrow controls and clone reset behavior.
- Audience decorations must be layered only after confirming the existing foreground card remains fully opaque.
- Score-color and primary-maroon items are verification gates, not reasons to refactor already-correct code.

## DO NOT CHANGE

- Do not change carousel slide text, bullets, CTA labels, CTA behavior, order, pagination style, 10-second dwell, or approximately 500ms transition.
- Do not change the separate 4200ms AI Evaluation capability-card rotation.
- Do not add a carousel, animation, icon, or image-loading package.
- Do not rebuild supplied carousel images in JSX/SVG/CSS or with generative AI.
- Do not crop or distort the supplied visuals.
- Do not change audience copy, typography, layout, card dimensions, surfaces, radii, illustrations, sticky behavior, z-index ordering, scale/y travel, or checkmarks.
- Do not reintroduce parent-card opacity in the sticky audience tween.
- Do not globally change root font size, use `zoom`, or scale the whole page.
- Do not redefine global primary/bright accent tokens to lighten the carousel.
- Do not modify `client/src/assets/logo.png`, the navbar logo, or the footer-only inverse logo.
- Do not alter Journey data/design, AI Evaluation layout/capability timing/FiberBurst, chatbot design, FAQ, pricing, enquiry, authentication, dashboard, admin, backend, or services.
- Do not modify dependency versions, package manifests, or lockfiles.
- Do not touch user-owned `output/` or `tmp/` directories.
- Do not perform unrelated refactors, formatting churn, copy edits, or legacy component edits.

## Final Verification Plan

### Static visual verification

- [ ] Compare all three carousel slides with References 1–3 at 1920×1080 and 1366×768.
- [ ] Confirm complete image containment and preserved aspect ratios.
- [ ] Confirm the lighter gradient remains maroon/wine and all copy passes reasonable contrast.
- [ ] Confirm the shorter card has no clipped content or excessive blank area.
- [ ] Confirm audience decorations are relevant, subtle, and behind content.
- [ ] Confirm the score number is slightly smaller without moving the gauge.
- [ ] Confirm AI Evaluation uses `ClipboardCheck` and the other four feature icons are unchanged.

### Carousel interaction matrix

- [ ] Observe 1→2→3→1 autoplay with approximately 10 seconds on every logical slide.
- [ ] Test 1→3 and 3→1 with arrow controls.
- [ ] Test repeated next, repeated previous, and alternating directions.
- [ ] Click manually just before autoplay would fire and confirm a full timer restart.
- [ ] Hover longer than 10 seconds, then leave and confirm one delayed advance.
- [ ] Hide/show the tab and confirm no catch-up or duplicate timer.
- [ ] Run in React StrictMode and confirm one advance per dwell.
- [ ] Confirm forward enters from the right, backward enters from the left, and clone resets are invisible.
- [ ] Confirm dots always identify the logical slide.

### Responsive viewport verification

- [ ] Desktop: 1920×1080, 1536×864, 1440×900, 1366×768.
- [ ] Tablet: approximately 1024px and 768px.
- [ ] Mobile: approximately 430px, 390px, and 375px.
- [ ] At every width, confirm no horizontal overflow, image crop, text/CTA clipping, arrow/chatbot collision, or audience decoration overlap.
- [ ] At browser zoom 80%, 100%, and 125%, confirm no catastrophic wrapping or inaccessible content.

### Accessibility and motion verification

- [ ] Arrow buttons have accessible names, visible focus, logical tab order, and minimum practical hit areas.
- [ ] Keyboard activation works and resets autoplay like pointer activation.
- [ ] Decorative audience icons are `aria-hidden` and non-interactive.
- [ ] Carousel images have accurate alt text; clones do not create confusing duplicate announcements (use `aria-hidden` on clone cards).
- [ ] Reduced-motion mode disables animated sliding while preserving correct state and loop resets.
- [ ] Color is not the only means of communicating score ranges because the numeric values and legend labels remain present.

### Score and brand verification

- [ ] Execute score boundary checks at 0, 69, 70, 89, 90, and 100.
- [ ] Confirm bars, thumbs, and legend agree.
- [ ] Confirm readiness gauge remains primary maroon.
- [ ] Confirm hero `Better Decisions.` and active footer resolve to `#8b0e16`.
- [ ] Confirm the carousel's lighter gradient is scoped locally.
- [ ] Confirm navbar and footer logos remain unchanged.

### Build and diff verification

- [ ] Run the configured client build.
- [ ] Run relevant lint/type checks if configured and distinguish pre-existing failures from introduced ones.
- [ ] Inspect browser console for runtime warnings, missing assets, invalid Lucide imports, timer warnings, or key warnings.
- [ ] Inspect the complete diff and verify every changed file appears in the file map above.
- [ ] Confirm no dependency/lockfile churn, no unrelated formatting, and no edits to protected areas.
- [ ] Confirm the old collaboration asset is deleted only if it has zero remaining references.
- [ ] Confirm this planning phase changed only `LANDING_PAGE_CHANGE_CHECKLIST.md`.

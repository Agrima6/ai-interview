# 1. List of all the changes

## Mobile AI Evaluation (`<768px`)

- [ ] Keep the current `AIScorePanel` score state, `clampScore`, average calculation, score thresholds, number inputs, range inputs, ARIA labels, meter animation, and reduced-motion behavior unchanged.
- [ ] Reduce the mobile-only outer height created by `EnterpriseAI`'s `py-10`, `AIScorePanel`'s `p-4`, the score panel's stacked `gap-6`, and the capability area's `mt-6` without changing the approved `md`/`lg` spacing.
- [ ] Reflow the existing score summary on mobile so the eyebrow and section title remain first, followed by a compact two-column row containing the smaller meter beside the existing “Overall Interview Readiness” title and supporting copy.
- [ ] Keep the three editable score rows below the summary, but reduce their mobile-only `space-y-4`, label `mb-2`, and surrounding gaps while retaining an 8px range track and usable 14px thumbs.
- [ ] Keep the complete score legend, but reduce its mobile-only `mt-5`, `pt-3`, and wrapping gaps so it normally remains on one line at 360–430px.
- [ ] Replace the mobile capability card's vertical illustration/title/description stack with one horizontal grid: illustration on the left, title and full description on the right.
- [ ] Reduce the capability wrapper reservation from `min-h-[200px]` and the card's `min-h-[170px]` to a measured mobile height that accommodates the longest current copy (“Enterprise Security” and “Real-Time Analytics”) without clipping.
- [ ] Reduce the capability card's mobile `p-5`, illustration `mb-3`, and dot `mt-2.5` while preserving all three capabilities, their current order, 4.2-second rotation, Framer Motion transition, hover behavior, `aria-live`, and indicators.
- [ ] Confirm the whole AI Evaluation experience is substantially shorter and fits within one typical mobile viewport as closely as readability allows; do not use clipping, hidden overflow, text truncation, or globally smaller typography to force a literal `100vh` fit.

## Mobile enquiry form (`<768px`)

- [ ] Keep Name, Email, Mobile number, Company / Organization, Subject, Message, and Submit Enquiry in one mobile column; move the existing two-column form breakpoint from `sm` to `md` so it starts at 768px.
- [ ] Reduce only mobile section padding from the current `pt-16 pb-20`, while restoring the current `sm:pt-20 sm:pb-24` proportions at the tablet/desktop breakpoint.
- [ ] Reduce the mobile heading-to-form gap from `mb-10` without changing the heading hierarchy or copy.
- [ ] Reduce the mobile form-card padding from `p-8` to approximately 20–24px; preserve `sm:p-10`-equivalent spacing for tablet/desktop.
- [ ] Replace the normal controls' content-driven `px-4 py-3.5` sizing with a consistent approximately 50px mobile height, retaining comfortable horizontal padding and the existing focus ring/border states.
- [ ] Reduce both the form-level `space-y-4` and nested grid `gap-4` to a consistent 12–14px mobile rhythm.
- [ ] Give the textarea an explicit usable mobile height around 116–120px instead of allowing `rows={4}` plus the normal control's `py-3.5` to produce an oversized box; keep `resize-none`.
- [ ] Keep the shared large `Button` and submission/status behavior unchanged, but ensure the rendered button remains approximately 50–54px high and fully visible.
- [ ] Recover horizontal room for the native Company / Organization select by reducing the card's mobile inset, keeping the select `w-full min-w-0`, and using compact control padding; keep the native arrow and full selected text rather than truncating it or adding a custom select component.
- [ ] Verify the fixed Nexa launcher can temporarily overlay the visual area but cannot make the final field or submit button unreachable by scrolling; do not change `NexaChatbot`.

## Tablet maroon showcase (`768–1023px`)

- [ ] Replace the current partial `@media (max-width: 980px)` mode with an explicit `768–1023px` tablet mode so widths 981–1023px no longer receive the squeezed three-column desktop card.
- [ ] Keep one shared `ShowcaseCard` for all three slides; do not duplicate slide-specific responsive markup.
- [ ] Group the copy, feature list, and optional CTA in one shared content wrapper so tablet can render them in normal flow as eyebrow, heading, description, bullets, CTA.
- [ ] Move the optional CTA after the feature list in the DOM; do not absolutely position it.
- [ ] Use a compact two-column tablet card with an approximately 43/57 image/content ratio, `minmax(0, ...)` tracks, and deliberate column gap.
- [ ] Make the tablet viewport/track height content-driven instead of the current fixed `460px` viewport and `height: 100%` track.
- [ ] Remove the two artificial row tracks `minmax(170px, 0.9fr) minmax(0, 1.1fr)` that currently split copy and features and allow the CTA to collide with the second row.
- [ ] Remove tablet inheritance of desktop `.showcase-copy { min-height: 330px; }`, heading `min-height: 3.12em`, description `min-height: 4.8em`, and feature `padding-top: 120px/130px` where they reserve unnecessary space.
- [ ] Vertically center the image column and size the current 1.825:1, 1.859:1, and 2:1 assets with `width: 100%`, a bounded `max-width`/`max-height`, `height: auto`, and `object-fit: contain`; do not crop or stretch them.
- [ ] Reduce tablet card padding, paragraph margin, bullet gap, and CTA margin while retaining readable line lengths.
- [ ] Keep previous/next buttons near the tablet card's horizontal edges and vertically centered, with enough content inset that they do not cover image details, text, bullets, or CTA.
- [ ] Preserve slide order, cloned-loop transition, 10-second autoplay, pause-on-hover, active index, previous/next behavior, progress state, ARIA labels, and reduced-motion handling.

## Mobile maroon showcase (`<768px`)

- [ ] Replace the current `@media (max-width: 680px)` cutoff with an explicit `<768px` mobile mode so 681–767px does not fall into the tablet grid.
- [ ] Use the required shared order: image, eyebrow, heading, bullets, optional CTA.
- [ ] Hide `.showcase-description` only inside the mobile media query; keep every description in `STRIPS` and keep it visible at 768px and above.
- [ ] Remove the mobile fixed `height: 620px` viewport, track `height: 100%`, `.showcase-visual { flex: 0 0 205px; }`, and `.showcase-copy { min-height: 217px; }` reservations in favor of a compact, content-driven slide.
- [ ] Give the wide showcase assets a compact responsive image block at the top using their natural aspect ratios and `object-fit: contain`, with no extra blank area below the image.
- [ ] Keep the heading prominent but use the existing responsive scale with a narrower mobile-specific size/line-height only where the current fixed `29px` heading causes avoidable wrapping.
- [ ] Place the existing four bullets immediately below the heading with compact list gaps and preserved wording/check icons.
- [ ] Render the optional CTA after all bullets in normal flow with a controlled top margin; slides without a CTA must remain valid.
- [ ] Position the previous/next arrows over the left/right edges of the known mobile image region, using the same responsive image-height value for both the image and arrow `top` calculation so the controls never drift over the heading or bullets; do not add JavaScript breakpoint measurements.
- [ ] Keep mobile card horizontal padding around 20px and use compact 12–20px hierarchy gaps without clipping copy or introducing horizontal scrolling.
- [ ] Allow the flex track to derive its height from slide content rather than introducing per-slide JavaScript height synchronization; accept only the small height equalization produced by the longest shared slide.

## Scope and regression safeguards

- [ ] Limit implementation to `client/src/pages/workmate/AIScorePanel.jsx`, `client/src/pages/workmate/WHome.jsx`, `client/src/pages/workmate/VerticalScrollShowcase.jsx`, and `client/src/pages/workmate/VerticalScrollShowcase.css` unless verification exposes a concrete blocker.
- [ ] Do not change `client/src/index.css` typography tokens or `.score-range` behavior; reuse them.
- [ ] Do not change `client/src/components/Button.jsx`, `client/src/components/NexaChatbot.jsx`, `client/src/pages/workmate/WorkmateLayout.jsx`, navbar, footer, brand colors, logos, icons, copy, unrelated landing sections, or approved desktop layouts.
- [ ] Do not add a dependency, carousel library, duplicate card component, resize listener, or new global responsive system.
- [ ] Run `npm run build` from `client` after implementation.
- [ ] Run targeted ESLint on the four changed source files; report unrelated existing repository lint failures separately rather than broad-refactoring them.

## Required viewport testing

- [ ] Test mobile at 360×800, 375×812, 390×844, 412×915, and 430×932.
- [ ] At every mobile size, verify AI Evaluation height, editable score controls, average/meter updates, threshold colors, legend, complete capability copy, rotation, dots, no clipping, and no horizontal overflow.
- [ ] At every mobile size, verify all enquiry controls, vertically centered input text, full select label, textarea usability, submit/error/success behavior, consistent gaps, scroll reachability around the chatbot launcher, and no horizontal overflow.
- [ ] At every mobile size and on every showcase slide, verify image-first order, visible eyebrow/heading, hidden description, all bullets, CTA after bullets where present, image-aligned arrows, compact natural height, preserved carousel behavior, and no overlap/overflow.
- [ ] Test tablet at 768×1024, 820×1180, 900×800, and 1023×768.
- [ ] At every tablet size and on every showcase slide, verify the compact two-column layout, centered/uncropped image, visible description, all bullets, CTA after bullets, content-driven height, no giant bottom space, and non-overlapping arrows.
- [ ] Test desktop regression at 1024×768, 1280×800, and 1440×900, verifying the approved score, form, and maroon showcase presentation remains intact.
- [ ] Test breakpoint transitions at 767→768 and 1023→1024, including description visibility, card layout mode, viewport height behavior, form columns, and absence of one-pixel overflow.
- [ ] Test carousel previous/next controls, autoplay, clone wraparound, hover pause, focus visibility, ARIA labels, and `prefers-reduced-motion: reduce` after the layout changes.

# 2. How to implement these changes

## `client/src/pages/workmate/AIScorePanel.jsx` — `AIScorePanel`

### Current behavior

`AIScorePanel` owns the three scores in local state (`SKILLS` defaults 62/76/90), calculates `overallScore` as their rounded mean, maps each score through `scoreColor`, and renders paired number/range inputs. Its mobile grid uses one column with the summary first (`order-1`) and controls second (`order-2`); `md` switches to controls-left/summary-right. The component currently adds `p-4`, a `gap-6`, a 128px-high meter wrapper, `space-y-4` score rows, and a legend with `mt-5 pt-3`.

### Root cause

The mobile height is primarily caused by stacking the entire summary block above all controls. Inside that stack, the `h-[128px] max-w-[196px]` meter sits between the title and readiness copy, the summary adds `pb-5`, the parent adds `gap-6`, each score row adds `mb-2` plus `space-y-4`, and the legend adds `mt-5 pt-3`. These independent vertical reservations accumulate even though the tablet layout proves the content can sit side by side. The score logic and `.score-range` itself are not the cause.

### Required change

Compress only the mobile presentation by putting the meter and readiness copy beside each other, tightening local spacing, and retaining every control and label. Leave the `md` two-column architecture and all state/calculation behavior intact.

### How to implement

- Keep `SKILLS`, `scoreColor`, `clampScore`, `scores`, `overallScore`, `meterOffset`, and `updateScore` unchanged.
- Change the outer mobile padding to a compact value (prefer `p-0` or minimal vertical padding) and restore the current padding at `md`/`lg`.
- Make the summary container a mobile grid such as `grid-cols-[minmax(104px,126px)_minmax(0,1fr)]`, then revert it to `md:block`.
- Let the eyebrow and `Candidate Score, generated instantly.` heading span both mobile columns.
- Reduce the mobile meter to roughly 112–126px wide and 76–84px high, and adjust its score-number `bottom` value to match the unchanged SVG view box. Restore the current 116–195px responsive dimensions at `md`/`lg`.
- Place the readiness block in column two with `min-w-0`, no artificial height, and a small top alignment adjustment; keep its complete supporting sentence.
- Reduce the mobile summary bottom padding/border gap, score-list spacing to roughly 10–12px, label-to-slider margin to roughly 4px, and legend top/padding spacing to roughly 8–12px. Restore current tablet/desktop values with `md:` utilities.
- Keep the range inputs full width and do not alter their `id`, `value`, `onChange`, inline `--score` variables, or ARIA labels.

### Mobile behavior

The title remains full-width. A compact meter sits beside readiness copy; the three controls and one-line legend follow. At 360px, the grid may give the copy more width than the meter; readability wins over a forced single-screen fit on unusually short devices.

### Tablet behavior

At 768px, retain the existing two-column controls-left/summary-right layout and its vertical divider. No score content is hidden.

### Desktop behavior

Retain the current `lg` padding, meter sizing, typography tokens, and score presentation.

## `client/src/pages/workmate/WHome.jsx` — `EnterpriseAI`

### Current behavior

`EnterpriseAI` renders `AIScorePanel`, then a separate animated capability carousel. The section uses `py-10`; the capability block starts at `mt-6`; its positioning wrapper reserves `min-h-[200px]`; and the absolutely positioned card reserves another `min-h-[170px]`, uses `p-5`, and lays illustration, heading, and description vertically. Tablet reduces the wrapper/card to 180/144px, demonstrating that the larger mobile reservation is not content-driven.

### Root cause

After the already-tall mobile score panel, the section adds 80px of vertical padding, 24px before the carousel, a hard 200px carousel slot, a 170px card minimum, vertical illustration margin, and dot margin. Because the animated cards are absolute, the outer `min-h-[200px]` is the height that keeps them in flow; reducing only the inner card would leave the same blank reservation.

### Required change

Tighten mobile section spacing and make the absolute capability card a compact horizontal grid whose wrapper and card reservations are derived from the longest current copy. Preserve timer/state/animation behavior.

### How to implement

- Keep `enterpriseCapabilities`, `activeCapability`, the 4,200ms interval, `AnimatePresence`, `Motion.article`, hover transition, and `aria-live` unchanged.
- Reduce mobile section padding to roughly `py-6` and capability top margin to roughly `mt-4`; retain the current `md:py-8 md:mt-5` and `lg` values.
- On mobile, change the capability article from `flex-col justify-center` to a two-column grid with a 64–72px illustration column, `minmax(0,1fr)` copy column, compact 16px padding, and approximately 12px column gap.
- Make the illustration span the title/description rows and remove its mobile `mb-3`; retain existing `lg` illustration dimensions.
- Keep the full title and description as separate grid items with the current typography tokens and a smaller local description margin.
- Measure all three current strings at 360px and set both the absolute-card minimum and wrapper reservation to the smallest common safe value, expected around 128–140px. Do not set the wrapper shorter than the longest animated card.
- Reduce the mobile indicator top margin while retaining all three visual indicators and their active widths/colors.

### Mobile behavior

The capability illustration and text share one compact row. Transitions remain within a stable reserved slot, so changing from short “Fast by Design” copy to longer capability copy does not move surrounding content or clip text.

### Tablet behavior

Keep the current compact capability presentation at `md`; only reconcile breakpoint utility ordering if the new mobile grid needs an explicit `md:flex md:flex-col` reset.

### Desktop behavior

Keep the current 160px card minimum, 520px maximum width, `p-6`, larger illustration, hover lift, and section spacing.

## `client/src/pages/workmate/WHome.jsx` — `EnquiryForm` and contact section

### Current behavior

The contact section uses `pt-16 pb-20`, a heading wrapper with `mb-10`, and a card with `p-8`. `EnquiryForm` then uses `space-y-4`; both paired field groups use `sm:grid-cols-2 gap-4`; every input/select/textarea shares `px-4 py-3.5`; and the textarea adds `rows={4}` on top of that padding. The submit button uses the shared `lg` size (`px-8 py-3.5`).

### Root cause

Mobile combines 144px of section padding, 40px before the card, 64px of card padding, 16px form gaps, another 16px inside each of the two stacked field groups, roughly 54px normal controls, and a four-line textarea plus 28px vertical padding. The Company / Organization label is constrained by the section's 24px gutter plus the card's 32px inset on each side; the long native option must also share the remaining width with control padding and the browser arrow, so it clips first at narrow widths.

### Required change

Keep the mobile one-column form and existing data/submission behavior, but remove compounded padding, normalize control heights, reduce gaps, and recover select width. Restore the current spacious layout from 768px upward.

### How to implement

- Keep the `form` shape, `status`, `error`, `set`, required fields, `submitPlatformEnquiry` payload, success state, and error state unchanged.
- Split the current all-purpose `inputCls` into one shared visual base plus normal-control and textarea sizing, or define two explicit class strings; do not add a form library.
- Use approximately `h-[50px] px-4 py-0` for normal inputs/select and approximately `h-[116px] px-4 py-3` for the textarea. Add `min-w-0` to controls and preserve the current focus ring/border transitions.
- Change form and nested field gaps from 16px to approximately 12px on mobile, restoring 16px at `md` if needed.
- Change paired grids from `sm:grid-cols-2` to `md:grid-cols-2`, matching the requested `<768px` single-column mode.
- Reduce the outer contact section to roughly `pt-10 pb-12`, heading gap to roughly 24px, and form-card padding to 20–24px on mobile. Restore current `md:pt-20 md:pb-24 md:mb-10 md:p-10` behavior.
- Keep the native `<select>` and its options. The recovered content width plus compact padding should show “Company / Organization” at 360px; if verification still finds a browser-specific clip, reduce only the select's mobile horizontal padding before considering any font adjustment.
- Keep the shared `Button` component unchanged. Verify its current `py-3.5` produces the target height and use only a local class override if measurement proves it exceeds 54px.

### Mobile behavior

All fields stay in one column with consistent 50px controls, 12px gaps, a usable compact textarea, full select copy, and a reachable full-width submit button.

### Tablet behavior

At 768px, restore two-column pairs, larger card padding, and the current section rhythm. Subject, message, and submit remain full width.

### Desktop behavior

Preserve the current centered 640px form within its 900px heading container and the approved two-column field layout.

## `client/src/pages/workmate/VerticalScrollShowcase.jsx` — `STRIPS`, `ShowcaseCard`, and `VerticalScrollShowcase`

### Current behavior

All three slides already share `STRIPS` and `ShowcaseCard`. `ShowcaseCard` currently renders visual, copy (including optional CTA), then feature list. `VerticalScrollShowcase` owns clone-based looping, active state, transitions, 10-second autoplay, visibility handling, pause-on-hover, and previous/next controls outside the track. Only the first two slide records have a CTA; the ranking slide intentionally has none.

### Root cause

The CTA overlap/order is rooted in markup, not absolute CTA CSS: `.showcase-cta` is inside `.showcase-copy` before `.showcase-features`. Tablet places copy and features into separate fixed grid rows, so a long description plus CTA can exceed the copy row and paint into the feature row. Mobile flex order is visual → copy/CTA → features, which guarantees the CTA appears before and can visually collide with bullets when the 620px clipped viewport runs out of room. The arrow buttons are positioned at `top: 50%` of the entire fixed viewport, so on mobile that midpoint falls over the heading/content region rather than the image.

### Required change

Preserve one shared card and all carousel state behavior, but introduce one content wrapper and move the CTA after the list in the DOM. Let CSS provide the three intentional layouts.

### How to implement

- Do not change `STRIPS` copy, feature arrays, image references, slide order, hrefs, variants, or alt text.
- Keep `.showcase-visual` first.
- Add a `.showcase-content` wrapper containing `.showcase-copy`, `.showcase-features`, and the optional `.showcase-cta` in that order. The copy wrapper keeps only eyebrow, heading, and description.
- Keep a single CTA conditional (`strip.cta && ...`) and a single feature map; do not branch JSX by viewport or slide.
- Keep the two arrow buttons as the only interactive navigation controls and retain their labels/click handlers.
- Do not modify timer refs, `physicalIndex`, transition normalization, transform math, clone creation, mouse pause, visibility listener, progress calculation, or reduced-motion checks.

### Mobile behavior

CSS makes the card image-first and `.showcase-content` a normal vertical flow. The description is hidden by CSS only; features and optional CTA follow the heading. Arrows move to image-edge positions while retaining their original DOM and handlers.

### Tablet behavior

CSS makes the article a two-column image/content grid. `.showcase-content` is a vertical sequence containing visible description, bullets, and CTA, so content length cannot cross an artificial row boundary.

### Desktop behavior

Use `.showcase-content` as an internal two-column grid to preserve the approved visual three-column composition: copy/CTA in the center region and features in the right region. The CTA remains after the list in DOM order but can occupy the center column's second grid row on desktop without absolute positioning.

## `client/src/pages/workmate/VerticalScrollShowcase.css` — showcase layout and breakpoints

### Current behavior

The base desktop viewport is fixed at 430px, changes to 440px below 1280px, and to 460px below 980px. The track is always `height: 100%`. Base cards have three columns; copy reserves 330px, headings reserve 3.12em, descriptions reserve 4.8em, and features start after 120px (130px below 1280px). Below 980px, the card becomes two columns plus two fractional rows while the visual spans both rows. Only below 680px does it become a column, but it then fixes the viewport to 620px, image to 205px, and copy to 217px. Arrows always use `top: 50%`.

### Root cause

- Tablet widths 981–1023px never enter the current tablet query and therefore squeeze the three-column desktop grid into too little space.
- Tablet widths at or below 980px still sit inside a fixed 460px clipped viewport and split copy/features across fractional rows; content does not determine row or card height.
- Desktop minimum heights and feature top padding continue to reserve space unless each breakpoint explicitly resets them.
- Mobile widths 681–767px never enter the mobile query.
- At 680px and below, 620px viewport + 205px visual + 217px copy + card gaps/padding + feature list can exceed the clipped area; that is the source of missing/overlapping lower content and large blank regions on shorter slides.
- `top: 50%` positions arrows relative to the whole 620px viewport, placing them around 310px—after the 205px image and directly across mobile headings.

### Required change

Define non-overlapping mobile, tablet, and desktop modes; use content-derived heights below desktop; reset inherited reservations; and align arrows to the intended region in each mode.

### How to implement

- Keep the existing desktop rules as the base. Adapt the base grid to account for the new `.showcase-content` wrapper while preserving the same effective visual/copy/features proportions.
- Retain desktop fixed 430/440px viewport behavior at `>=1024px` because that approved presentation is outside the requested redesign.
- Replace `@media (max-width: 980px)` with `@media (min-width: 768px) and (max-width: 1023px)`.
- In tablet mode, set viewport and track to `height: auto`; use a two-column card such as `minmax(0,43fr) minmax(0,57fr)`; remove fractional rows; use compact 20–24px padding; set `.showcase-content` to flex column; reset copy/heading/description minimum heights; and set features to `padding-top: 0` with roughly 10–12px gaps.
- Size tablet visuals with `height: auto`, `max-height` derived from the compact content column, `object-fit: contain`, and centered alignment. The source assets are 1694×928, 1710×920, and 1774×887, so a wide bounded box matches their natural proportions.
- Keep tablet arrows at card edges near `top: 50%`, reduce their size if necessary, and reserve enough inner column inset that they cannot cover content.
- Replace `@media (max-width: 680px)` with `@media (max-width: 767px)`.
- In mobile mode, set viewport/track to `height: auto`, card to compact column flow, and `.showcase-content` to flex column. Remove the 620px viewport, 205px visual flex basis, and 217px copy minimum.
- Introduce one mobile custom property for the responsive visual block height (for example a `clamp()` around 150–190px). Use it for `.showcase-visual` and in the arrows' `top: calc(card-padding + visual-height / 2)`. This keeps arrows tied to the image without JavaScript.
- Hide `.showcase-description` only in this mobile query. Reset copy/heading minimum heights, place feature list after the heading with compact gaps, and give CTA a small top margin after the list.
- Keep `overflow: hidden` on the viewport for horizontal slide isolation, but do not use it to conceal vertical content; the auto-height track must fully contain the longest slide.
- Preserve the reduced-motion rule and add no new transitions beyond the existing track/hover effects.

### Mobile behavior

Every slide is a compact maroon column with a bounded wide image, image-aligned arrows, eyebrow, responsive heading, bullets, and optional CTA. Description is hidden only here. The viewport grows to the shared content height, so no slide is vertically clipped.

### Tablet behavior

Every slide is a compact two-column card with a centered image and fully flowing content. Description remains visible. The longest slide establishes the track's natural height without a hard viewport reservation.

### Desktop behavior

At 1024px and above, keep the current fixed-height showcase, gradient, radii, shadows, typography, image treatment, navigation, and effective three-column proportions. Only the shared wrapper/CTA grid placement changes as required by the common markup.

## Inspected shared files that should remain unchanged

### `client/src/index.css`

#### Current behavior

This file defines the shared WorkmateIQ typography tokens, the `<768px` type scale, the `workmate-shell` gutters, and `.score-range` track/thumb/focus styles.

#### Root cause

None of these global rules creates the component-specific stacking, fixed carousel heights, or form-card padding described above. Changing them would risk unrelated sections.

#### Required change

No source change planned.

#### How to implement

Reuse `type-*` tokens and `.score-range` unchanged; express the requested differences with component-local Tailwind classes and `VerticalScrollShowcase.css` media queries.

### `client/src/components/Button.jsx`

#### Current behavior

The shared `lg` button uses `px-8 py-3.5` with the common rounded, focus, disabled, hover, and tap behavior.

#### Root cause

The form's excessive height comes mainly from its wrappers, repeated gaps, inputs, and textarea—not from the single submit button.

#### Required change

No shared source change planned.

#### How to implement

Keep the component intact and use a local class only if browser measurement shows the form button exceeds the requested mobile height.

### `client/src/components/NexaChatbot.jsx`

#### Current behavior

The launcher is fixed at `bottom-5 right-5`, grows at `sm`, and the open panel uses a viewport-bounded internal scroll area.

#### Root cause

It can visually cover content behind it, but it does not cause the AI, form, or showcase sections' intrinsic height. The reported unreachable-content risk comes from clipped/fixed section heights and insufficient scroll position, not the launcher implementation.

#### Required change

No source change planned, as explicitly required.

#### How to implement

Verify forms and slide content can scroll past the launcher in closed and open states; solve reachability in the affected section's natural flow, not by modifying chatbot placement.

### `client/src/pages/workmate/WorkmateLayout.jsx`

#### Current behavior

It supplies the `workmate-marketing` scope, fixed navbar, shared shell, footer, ambient background, and cursor spotlight.

#### Root cause

It does not impose the fixed heights or element order responsible for the four requested defects.

#### Required change

No source change planned.

#### How to implement

Keep layout/navigation/footer behavior unchanged and scope all new responsive rules beneath the existing component classes.

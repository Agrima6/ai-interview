# Pricing Section Responsive Improvements

## Scope and outcome

This document is an implementation plan only. It covers the public WorkmateIQ landing-page pricing section with the Starter, Growth, and Enterprise plans. No implementation should be performed while preparing or reviewing this plan.

The eventual responsive result should be:

- **Mobile below 768px:** a manual, native horizontal scroll-snap carousel with Growth first, content-driven card heights, an adjacent-card peek, and a small active-plan indicator.
- **Tablet from 768px through 1023px:** all three cards remain in one row, but use compact card padding and gaps, single-line CTA labels, stable price/unit alignment, and bottom-aligned CTAs.
- **Desktop at 1024px and above:** retain the approved three-card visual design, spacing, typography, Growth emphasis, hover behavior, and plan order.

No pricing values, names, descriptions, features, CTA labels, brand colors, surrounding sections, header, footer, or authenticated product pricing flow should change.

## Current Implementation Audit

### Public pricing section and data

The pricing section shown in the supplied screenshots is implemented directly in:

- `client/src/pages/workmate/WHome.jsx`

`WHome` is used for `/` and `/welcome`. The relevant implementation currently includes:

- `plans` data in Starter, Growth, Enterprise order.
- A single `plans.map(...)` that renders all three cards.
- `useReveal('.plan')` attached to the plan-grid wrapper.
- A section shell using `workmate-shell`.
- A container using `grid md:grid-cols-3 gap-6 mb-14`.
- Cards using `rounded-2xl p-8 border` at every viewport size.
- Growth-specific classes `pricing-card-growth`, `gradient-border-sweep`, `border-transparent`, and `bg-accent/[0.03]`.
- Default-size shared `Button` components with `w-full`.

The pricing copy is currently defined as:

- Starter: `₹4,999`, `/month`, three features, `Send an Enquiry`.
- Growth: `₹9,999`, `/month`, four features, `Most popular`, `Send an Enquiry`.
- Enterprise: `Custom`, three features, `Talk to us`.

This data and copy are already correct and must remain unchanged.

### Current responsive breakpoints

The project uses Tailwind CSS v4 through `@import "tailwindcss"` and does not contain a custom Tailwind breakpoint configuration. The relevant existing breakpoint values therefore align with Tailwind defaults and the marketing CSS already in `client/src/index.css`:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- Mobile typography override: `@media (max-width: 767px)`
- Desktop shell/type overrides: `@media (min-width: 1024px)` and `@media (min-width: 1280px)`

The required mobile/tablet/desktop boundaries already match the project's breakpoint system. No new arbitrary structural breakpoint is needed.

### Current shell, card, and typography behavior

`client/src/index.css` currently defines:

- `.workmate-shell` with 24px horizontal padding below 1024px.
- `.workmate-shell` with 32–40px horizontal padding at 1024px and above.
- `.type-card-title` at 18px on mobile, 20px on tablet and smaller desktop, and 23px at 1280px and above.
- `.type-body-small` at 14px below 1280px and 16px at 1280px and above.
- `.type-metric` at 36px on mobile, 44px on tablet/smaller desktop, and 52px at 1280px and above.

These shared typography tokens are not the root problem and should not be globally changed.

The current plan container changes from a one-column grid to a three-column grid at `md`/768px. At 768px, the 24px shell padding leaves 720px for the grid. Two 24px gaps leave roughly 224px per card; the current 32px card padding then leaves only about 160px of content width. This is why descriptions, feature text, prices, and `Send an Enquiry` wrap aggressively at tablet widths.

At 900px, the same structure provides roughly 268px per card before padding and about 204px after the current 32px card padding. This remains unnecessarily narrow for the shared button's default 24px horizontal padding.

### Current mobile behavior

Below 768px:

- The plan wrapper remains a one-column grid.
- The three cards remain in source order: Starter, Growth, Enterprise.
- Each card takes the available shell width.
- Cards are stacked vertically, producing the long comparison flow shown in the screenshots.
- Every card keeps `p-8` (32px on every side), `mb-5` below the description, `mb-6` below the price, `space-y-2.5` in the feature list, `mb-8` before the CTA, and the shared button's default padding.

Important: the current cards do **not** use a fixed height, `min-height`, or viewport-height reservation. Their heights are already content-driven. The excessive visual height comes from the vertical stack, 32px card padding, internal spacing, wrapped lines, and the inability to compare plans side by side. The eventual implementation should compact those values and prevent flex cross-axis stretching, not remove a nonexistent fixed height.

### Current tablet behavior

At 768–1023px:

- `md:grid-cols-3` correctly keeps all three plans in one row.
- The grid's default stretch behavior gives the cards a shared outer row height.
- The cards themselves are not flex columns, so their CTAs follow their individual content rather than aligning near a common bottom edge.
- Growth contains one extra feature and the `Most popular` label, so its CTA is pushed substantially lower.
- The full 32px card padding and 24px inter-card gap consume too much of the available width.
- The shared Button's default `px-6` plus a 15px label allows `Send an Enquiry` to wrap when the card becomes narrow.
- The price and `/month` label share one paragraph but are not an explicit non-wrapping layout unit.

The three-column tablet structure is correct. The card internals need compaction and alignment; the tablet layout should not become a carousel.

### Current desktop behavior

At 1024px and above:

- The three cards remain in Starter, Growth, Enterprise order.
- The wider shell and columns make the existing design broadly successful.
- The Growth card remains clearly emphasized.
- Desktop typography scales through the existing marketing tokens.
- Hover lift/glow is limited to devices with a fine pointer and real hover support.
- Reduced-motion CSS removes hover transforms while keeping non-motion styling.

The desktop design should remain visually unchanged apart from a non-disruptive flex structure needed to keep tablet/desktop CTAs safely inside equal-height cards.

### Price and `/month` markup

The current markup applies `type-metric` to the parent paragraph and nests a `type-body-small` span for `/month`. This preserves hierarchy but does not explicitly guarantee that the amount and unit remain together or baseline-aligned. The eventual implementation should make the amount and period an `inline-flex` non-wrapping unit with baseline alignment.

### Shared button behavior

`client/src/components/Button.jsx` supplies:

- Default medium padding of `px-6 py-3`.
- 15px button typography.
- Existing primary/secondary colors, borders, hover states, disabled behavior, and tap feedback.

These defaults are used throughout the application and should not be changed globally. Pricing-specific tablet overrides should be applied through `pricing-card-cta` or local responsive classes.

### Growth emphasis and animation

`client/src/index.css` already provides:

- `.pricing-card` hover transitions.
- Stronger `.pricing-card-growth` hover emphasis.
- `.gradient-border-sweep::before` for the featured card's animated border.
- Fine-pointer hover gating.
- Reduced-motion handling for card transforms.

These rules are already scoped and should be preserved. The carousel work must not remove the Growth tint, label, red CTA, border sweep, or hover treatment.

### Reveal interaction

`useReveal('.plan')` in `WHome.jsx` uses GSAP/ScrollTrigger for a one-time vertical entrance reveal. It does not provide carousel behavior. It can remain responsible for revealing the pricing cards when the pricing section reaches the viewport.

The implementation should move the reveal ref from the scrolling track to a stable pricing-section or pricing-list parent if a second ref is needed for carousel scrolling. Do not replace the existing reveal with a carousel animation, and do not animate cards automatically between plans.

### Nexa/chatbot overlay

The launcher is rendered by `client/src/components/NexaChatbot.jsx` as a fixed overlay. Current hooks and responsive styles already include:

- `.nexa-launcher-wrap`, `.nexa-launcher`, `.nexa-launcher__avatar`, `.nexa-launcher__status`, and `.nexa-panel` class hooks.
- A 52px launcher at widths up to 480px.
- 16px right spacing and safe-area-aware bottom spacing at widths up to 480px.
- A 56px base launcher before the `sm` breakpoint.
- A 64px launcher and 28px offsets at `sm` and above.
- Accessible open/close labels, visible focus ring, Escape handling, reduced-motion behavior, and a responsive open panel.

The phone-width reduction and safe-area handling are already implemented correctly and should not be rewritten. The only likely gap is 640–767px, where the `sm:` utilities enlarge the launcher to 64px even though pricing is still in its mobile carousel state. The cleanest eventual adjustment is a narrow, scoped CSS override for that range if testing confirms content overlap; no chatbot component redesign or section-aware JavaScript is warranted.

### Separate authenticated pricing page

`client/src/pages/Pricing.jsx` implements the authenticated `/pricing` product-credit page. It uses different plans, payment behavior, selection state, navigation, and layout. It is not the pricing section shown in the supplied screenshots and must not be modified for this task.

## Already Correct / Preserve

The implementation must preserve the following:

- The public plan data, prices, names, descriptions, feature copy, and CTA copy in `WHome.jsx`.
- The existing section heading, eyebrow, supporting sentence, FAQ block, and contact navigation.
- Starter, Growth, Enterprise order at 768px and above.
- Three columns at 768px and above.
- The existing desktop shell, typography hierarchy, 24px desktop grid gap, 32px desktop card padding, rounded corners, borders, and colors.
- Growth's `Most popular` label, tint, primary CTA, gradient border sweep, and enhanced hover treatment.
- Starter and Enterprise secondary CTA hierarchy.
- Existing card content-driven sizing on mobile; do not add fixed or equal mobile heights.
- Existing fine-pointer hover gating and reduced-motion treatment.
- Existing `useReveal('.plan')` entrance reveal, adjusted only as needed to coexist with a carousel ref.
- Existing shared `Button` variants and global size definitions.
- Existing ≤480px Nexa size, position, safe-area handling, panel behavior, accessibility, and visual design.
- `WorkmateLayout`, the header, footer, FAQs, contact form, and all other landing-page sections.
- The separate authenticated `client/src/pages/Pricing.jsx` page.

## Mobile Changes

### 1. Convert the pricing list to a manual horizontal scroll-snap carousel

In `client/src/pages/workmate/WHome.jsx`, keep one pricing-card rendering path and convert the list's mobile layout from a one-column grid to a horizontal flex track.

The mobile track should use the equivalent of:

- `display: flex`
- `align-items: flex-start`
- `overflow-x: auto`
- `overscroll-behavior-inline: contain`
- `touch-action: pan-y`
- `scroll-snap-type: x mandatory`
- 16px card gap
- no autoplay, timer, drag library, or momentum override

`align-items: flex-start` is required. A row flex container defaults to stretching its children to the tallest card, which would violate the content-driven mobile-height requirement.

The horizontal overflow must belong only to the pricing track. The page body must not gain horizontal overflow. Use a controlled mobile breakout equal to the shell's existing 24px padding, for example a `-mx-6` track with matching `px-6` and `scroll-padding-inline: 24px`. Restore normal margins/padding and a grid at `md`.

Use `snap-center` or an equivalently centered snap target on each card. Add `scroll-snap-stop: always` only if browser testing shows that a normal swipe skips cards too easily; do not make touch scrolling feel sticky or trap vertical page movement.

No carousel package should be installed. There is no existing shared carousel in `client/src` suitable for reuse, and native CSS scroll snap is sufficient for three cards.

### 2. Make Growth first only on mobile

Required visual/data order:

- Mobile: Growth, Starter, Enterprise.
- Tablet/desktop: Starter, Growth, Enterprise.

Do not use CSS `order` alone. CSS visual reordering would make keyboard focus and screen-reader DOM order disagree with the displayed order because every card contains a focusable CTA.

Use a single mapped list with responsive data ordering:

1. Keep the canonical `plans` array unchanged in Starter, Growth, Enterprise order.
2. Track whether `(max-width: 767px)` matches with a small local `matchMedia` state/effect in `WHome.jsx`.
3. Derive `displayedPlans` as Growth, Starter, Enterprise only while the mobile query matches; otherwise use the canonical array.
4. Listen for media-query changes so continuous resizing across 767/768 restores the correct order without a reload.
5. Reset the active mobile indicator and the track's scroll position to the first mobile card when entering the mobile state.

This keeps one card template and one `map`, avoids duplicated hidden markup, and preserves accessible DOM/focus order at every breakpoint. The application is a client-rendered Vite SPA, so this local media-query state does not introduce an SSR hydration mismatch.

### 3. Add deliberate mobile width and adjacent-card peek

Each mobile card should use approximately:

- `flex: 0 0 86vw`
- `max-width: 360px`
- `width: 86vw` or an equivalent flex-basis
- `min-width: 0`
- `height: auto`
- `scroll-snap-align: center`

The 86vw target plus a 16px gap and the track breakout leaves a useful portion of the next card visible on common 320–430px phones. The 360px maximum prevents cards from becoming oversized at 600–767px; wider mobile viewports may naturally show more than a 12% peek because of that maximum, which is preferable to inflating the cards.

At `md`, remove the mobile width, max-width, flex-basis, shrink, and snap behavior so each card fills its grid cell.

### 4. Preserve content-driven height and compact spacing

Mobile cards should remain naturally sized and must not receive `height`, `min-height`, or equal-height JavaScript.

Recommended mobile card values:

- Horizontal padding: 24px.
- Vertical padding: approximately 28px.
- Description bottom margin: approximately 16px rather than the current 20px.
- Price bottom margin: approximately 20px rather than the current 24px.
- Feature row gap: approximately 12–14px, tuned by browser testing without reducing readable line-height.
- Feature-list-to-CTA gap: approximately 28px rather than the current 32px.
- CTA: full card-content width.

Do not reduce the existing mobile 18px plan title, 14px body/feature text, or 36px price merely to make the cards shorter. The current phone typography is readable. The primary improvements are the carousel, narrower card padding, and tighter block spacing.

Add `min-w-0` to the card content and feature-text span. Keep the dash as a `shrink-0` decorative marker and allow the feature copy to wrap normally. Do not use clipping, fixed feature-row heights, or `nowrap` on feature text.

### 5. Add an active mobile pagination indicator

Add a small mobile-only control below the track:

- Three quiet dot buttons.
- The first dot represents Growth because Growth is first on mobile.
- Use `aria-label` values such as `Show Growth plan`.
- Use `aria-current="true"` on the active dot.
- Preserve a visible `focus-visible` ring.
- Keep each dot's visual mark subtle while wrapping it in an adequate button hit area.

The active state should update from manual scrolling. For only three cards, the clean implementation is:

1. Hold a `pricingTrackRef` and `activePricingIndex` in `WHome.jsx`.
2. On a passive track scroll, calculate which card center is nearest the track viewport center.
3. Throttle the calculation with one `requestAnimationFrame` guard and update state only when the nearest index changes.
4. Cancel any queued frame during cleanup.
5. Clicking a dot scrolls the corresponding card into the track center.
6. Use instant scrolling when `REDUCE_MOTION` is true and smooth scrolling otherwise.

This is more deterministic than a basic IntersectionObserver at 600–767px, where the 360px maximum can allow more than one card to be fully visible at once.

Do not add autoplay or automatically advance the active card. Do not add a `Swipe to compare` caption initially; the card peek and dots already communicate the interaction. Add text only if user testing proves those two native cues insufficient.

### 6. Preserve keyboard and touch behavior

The track should receive a descriptive accessible label and may use `tabIndex="0"` so native keyboard horizontal scrolling is available. Do not intercept vertical wheel/touch movement. Dot buttons provide an explicit keyboard-accessible way to choose a card.

Keep the plan CTA buttons in normal tab order. Because the DOM order changes with the mobile media query, keyboard order will match Growth, Starter, Enterprise on mobile and Starter, Growth, Enterprise at `md` and above.

### 7. Nexa positioning on mobile

Do not alter `NexaChatbot.jsx` initially. Its current class hooks and ≤480px rules already provide a 52px accessible touch target, 16px right spacing, and safe-area-aware bottom spacing.

During implementation verification:

- Confirm that card CTAs can be scrolled above and clear of the fixed launcher.
- Keep sufficient space below the carousel indicator before the FAQ block.
- Confirm that the launcher does not cause or participate in the horizontal scroll area.

If overlap remains specifically at 640–767px, add a scoped `@media (min-width: 481px) and (max-width: 767px)` override in `client/src/index.css` that keeps the launcher at 56px and uses approximately 20px bottom/right offsets. This overrides the current `sm:h-16 sm:w-16`/28px positioning only while pricing still uses its mobile structure. Do not add section-aware IntersectionObserver logic, move the chatbot in the DOM, hide it, or change desktop/tablet chatbot behavior.

## Tablet Changes

### 1. Preserve the three-column row

At `md`/768px, switch the track back to a normal three-column grid:

- `grid-template-columns: repeat(3, minmax(0, 1fr))`
- no horizontal overflow
- no scroll snap
- no negative mobile breakout
- no mobile pagination indicator
- canonical Starter, Growth, Enterprise order

Use a 16px tablet gap, restoring the existing 24px gap at `lg`/1024px. This recovers 16px of total row width at the narrowest tablet without changing the global shell.

Do not reduce `.workmate-shell` padding globally. With a 16px grid gap and compact card padding, the existing 24px tablet shell padding is sufficient. A pricing-only 8px horizontal breakout can remain a last-resort adjustment only if 768px browser testing still shows clipping.

### 2. Compact tablet card padding without shrinking shared typography

Use approximately 20px card padding at 768–1023px and restore 32px at 1024px. This changes the current `p-8` behavior to the equivalent of:

- Mobile: `px-6 py-7`.
- Tablet: `p-5`.
- Desktop: `lg:p-8`.

Retain the existing tablet typography tokens initially:

- Plan title: 20px.
- Description and features: 14px.
- Price: 44px.

Those values are already compact. Do not change the global `.type-card-title`, `.type-body-small`, or `.type-metric` rules. Only consider a pricing-scoped tablet adjustment after testing at 768px, and never reduce feature text below a readable 13.5–14px range.

Use the tighter mobile/tablet block margins described above and restore the current desktop margins at `lg`.

### 3. Keep CTA labels on one line

Add `white-space: nowrap` to `.pricing-card-cta` and use a pricing-only tablet override for the shared button's horizontal padding and font size:

- 768–1023px horizontal padding: approximately 12–16px.
- 768–1023px font size: approximately 13.5–14px.
- Keep the current button height and readable touch target.
- Restore shared default button sizing at 1024px.

Do not modify `client/src/components/Button.jsx`; that would affect buttons throughout the application.

Verify `Send an Enquiry`, `Talk to us`, and the Growth CTA at 768px. The CTA must stay completely inside the card and must not wrap or clip.

### 4. Balance tablet card heights and CTA alignment

At `md` and above, make each pricing card a full-height flex column. Keep the grid's natural row stretching and push the CTA toward the bottom with `margin-top: auto` or an equivalent utility.

Implementation details:

- Card: `display: flex; flex-direction: column; height: 100%` at `md` and above.
- Feature list: retain a defined bottom gap.
- CTA: `margin-top: auto` at `md` and above.
- Mobile: do not use a forced height or stretch alignment; the same flex column may remain, but the CTA must follow content naturally.

This avoids brittle pixel heights while keeping all tablet CTAs inside the row and visually balanced. It also produces a modest alignment improvement on desktop without changing card surfaces, type, color, width, or outer spacing.

### 5. Make feature wrapping safe

Change each feature row so the dash marker and text are explicit flex children:

- Dash marker: `shrink-0` and `aria-hidden="true"`.
- Text span: `min-w-0` and normal wrapping.
- Row: `min-w-0`, `align-items: flex-start`, and the existing accent/text colors.

Do not use `white-space: nowrap` for feature copy. Tablet feature text may wrap, but it must wrap predictably and remain fully visible.

## Shared Pricing Fixes

### Price and `/month` alignment

Refactor only the amount line in the pricing-card template:

- Use an outer `inline-flex` container.
- Align children on the text baseline.
- Apply `white-space: nowrap` to the amount/unit group.
- Keep the amount in `type-metric`.
- Keep `/month` in `type-body-small text-text-secondary`.
- Use a very small explicit gap if needed; do not let the period drift away from the amount.
- Render no period span for Enterprise because its period remains empty.

This is safer than relying on adjacent inline text inside a metric paragraph and preserves the existing visual hierarchy.

### Responsive CTA behavior

- Mobile: full width, current primary/secondary hierarchy, no label wrapping.
- Tablet: full width, pricing-scoped compact horizontal padding/font, no label wrapping, bottom aligned.
- Desktop: restore current default Button sizing and visual states.
- All viewports: preserve click behavior that scrolls to `#contact`, motion tap feedback, focus behavior, and CTA copy.

### Reveal behavior

- Preserve the current one-time `.plan` reveal.
- Use a stable reveal parent plus a separate carousel-track ref.
- Do not couple reveal state to the active pagination dot.
- Do not animate card changes, auto-scroll, or introduce a timer.
- Confirm reduced-motion users get instant dot navigation and no newly introduced smooth motion.

## Responsive Breakpoint Plan

| Viewport | Project boundary | Pricing layout | Card sizing and behavior |
|---|---:|---|---|
| Mobile | `< 768px` / below `md` | Horizontal manual scroll-snap flex track | Growth first; `86vw` basis; `max-width: 360px`; 16px gap; adjacent peek; `items-start`; content-driven height; mobile dots |
| Tablet | `768–1023px` / `md` to below `lg` | Three-column grid | Starter/Growth/Enterprise; 16px gap; about 20px card padding; compact CTA padding; no carousel/dots; full-height flex cards and bottom-aligned CTAs |
| Desktop | `>= 1024px` / `lg+` | Three-column grid | Existing 24px gap, 32px card padding, typography scaling, Growth emphasis, hover treatment, and overall appearance |

At the critical boundaries:

- `767 → 768`: stop horizontal scrolling, remove mobile width/snap/breakout, hide dots, restore canonical order, and use the three-column grid.
- `1023 → 1024`: restore the existing desktop gap, card padding, CTA sizing, and shell behavior without a visual jump or content clip.

Avoid any additional structural breakpoint. The optional 481–767 Nexa override is a targeted overlay-size correction, not a pricing layout breakpoint.

## File-by-File Implementation Plan

### `client/src/pages/workmate/WHome.jsx`

Current responsibility:

- Owns the public pricing data, section markup, reveal ref, card rendering, CTA behavior, FAQ block, and surrounding landing-page composition.

Planned changes:

1. Keep the canonical `plans` data and copy unchanged.
2. Add local mobile-media-query state aligned to `(max-width: 767px)`.
3. Derive Growth-first `displayedPlans` only on mobile.
4. Add a dedicated horizontal-track ref and active mobile plan index.
5. Move the existing reveal ref to a stable ancestor so reveal and scroll tracking can use separate refs.
6. Change the plan wrapper utilities to mobile flex/overflow/snap and `md` three-column grid behavior.
7. Add responsive card width, max-width, snap, padding, flex, and height utilities.
8. Refactor the price/unit line to an inline-flex baseline-aligned non-wrapping group.
9. Wrap feature text in a `min-w-0` span and mark the visual dash as decorative.
10. Add pricing-specific responsive CTA classes and `md` bottom alignment.
11. Add a mobile-only active-dot control under the track.
12. Add the small scroll-position calculation and dot click handler, with reduced-motion-safe behavior and cleanup.
13. Preserve the FAQ block, section spacing at desktop, contact jump behavior, and all other landing sections.

No new component, hook, or carousel abstraction is necessary. Keep the single card template inline in `WHome.jsx`; three cards do not justify another reusable layer.

### `client/src/index.css`

Current responsibility:

- Owns WorkmateIQ typography/shell tokens, Growth border animation, pricing hover states, reduced-motion styling, and Nexa responsive overrides.

Planned changes:

1. Add narrowly scoped `.workmate-marketing .pricing-*` rules only where Tailwind utilities would be awkward or fragile.
2. Hide only the pricing track's scrollbar while retaining scrollability, using `scrollbar-width: none` and a WebKit scrollbar rule.
3. Add any required `scroll-snap-stop`, `scroll-padding`, or touch/overscroll declarations not expressed cleanly in JSX.
4. Add tablet-only `.pricing-card-cta` padding/font-size/nowrap rules and restore defaults automatically outside 768–1023px.
5. If and only if verification finds overlap at 640–767px, add the scoped 481–767 Nexa launcher-size/offset override described above.
6. Preserve existing `.pricing-card`, `.pricing-card-growth`, `.gradient-border-sweep`, hover, and reduced-motion rules.
7. Do not alter shared marketing typography tokens or `.workmate-shell` globally.

### `client/src/components/NexaChatbot.jsx`

Inspected, but no planned markup or behavior change.

The existing named class hooks are sufficient for a CSS-only 481–767px adjustment if verification requires one. Preserve launcher/panel behavior, visual design, accessibility, and desktop/tablet positioning.

### `client/src/components/Button.jsx`

Inspected, but no planned change.

Pricing-specific CTA compaction must not change shared button sizes, variants, animation, or application-wide behavior.

### `client/src/pages/workmate/useReveal.js`

Inspected, but no planned change.

The reveal hook already supports the pricing entrance effect. Adjust its ref placement in `WHome.jsx`; do not rewrite the hook.

### `client/src/pages/workmate/WorkmateLayout.jsx`

Inspected for the shell and fixed header context, but no planned change. The header, footer, section navigation, and shell structure are outside scope.

### `client/src/pages/Pricing.jsx`

Inspected only to distinguish it from the supplied screenshots. Do not change it; it is a separate authenticated credit-purchase page.

## Implementation Order

1. Re-read this plan and re-inspect the current working-tree versions of `WHome.jsx`, `index.css`, `Button.jsx`, and `NexaChatbot.jsx` before editing; preserve unrelated uncommitted work.
2. Keep the `plans` data unchanged and add the mobile breakpoint state/derived Growth-first ordering in `WHome.jsx`.
3. Separate the reveal parent ref from the new carousel track ref.
4. Convert only the mobile plan wrapper to a flex overflow track with controlled shell breakout, native scrolling, `items-start`, and scroll snap.
5. Restore the three-column grid at `md` and the approved gap/padding values at `lg`.
6. Add mobile card basis/max-width/padding and remove those constraints at `md`.
7. Make cards flex columns at `md+` and bottom-align CTAs without fixed heights.
8. Refactor price/unit and feature-row markup for safe wrapping/alignment.
9. Add pricing-scoped tablet CTA compaction and single-line behavior.
10. Add the mobile active-dot state, scroll calculation, accessible dot buttons, and reduced-motion-safe click navigation.
11. Add only the minimal pricing-specific CSS needed for scrollbar hiding and range-scoped styles.
12. Test Nexa with the completed carousel. Add the 481–767 CSS override only if the current launcher overlaps pricing content; leave `NexaChatbot.jsx` untouched.
13. Run continuous responsive testing, keyboard/touch checks, build, lint, and a final diff review.

## Risks and Layout Interactions

### DOM order and accessibility

Using CSS `order` would create a visual/focus-order mismatch. Use responsive data ordering so DOM, keyboard, and screen-reader order agree.

### Flex stretching mobile cards

A horizontal flex track without `align-items: flex-start` would equalize every mobile card to Growth's height. Explicitly prevent this.

### Negative-margin breakout and body overflow

The mobile track needs to extend through the shell padding to create a convincing peek. Negative margin and matching inner padding must be equal, and overflow must remain on the track. Verify the document width never exceeds the viewport.

### Tablet width pressure

At 768px, three columns are inherently narrow. Solve this first with a 16px grid gap, 20px card padding, safe price grouping, and pricing-only CTA compaction. Do not globally reduce page padding or typography unless those measures fail in real-browser testing.

### Active-dot synchronization

At wider mobile widths, more than one capped 360px card may be largely visible. Use nearest-center detection rather than assuming the card with the largest basic intersection ratio is always the intended active card.

### Resize across 767/768

Responsive data ordering changes card positions. Reset the track only when entering mobile, and ensure no stale scroll offset, active dot, GSAP transform, or invisible card survives the breakpoint change.

### Reveal ref interaction

One DOM element cannot directly own both refs without merging them. Prefer moving the reveal ref to a stable ancestor and keeping the track ref dedicated to scrolling. Verify that all cards still reveal once and are visible under reduced motion.

### Growth border and overflow

Do not put `overflow: hidden` on the individual Growth card solely for carousel layout. Its pseudo-element extends to `inset: -1.5px`; clipping could damage the approved border sweep. The track can own horizontal overflow.

### Fixed chatbot overlay

Nexa is intentionally fixed and will overlay page content near the viewport corner. Avoid complex section-aware repositioning. Keep the launcher compact at mobile widths and ensure users can scroll every CTA clear of it.

### Shared style regressions

Do not modify global type tokens, shared Button sizes, or generic shell padding for a pricing-only issue. Scope new CSS beneath `.workmate-marketing` and a pricing-specific class.

### Dirty working tree

The repository currently contains unrelated modified/untracked files. The eventual implementation must edit only the intended pricing lines in shared files, must not revert existing user changes, and must review the final diff carefully.

## Verification Checklist

### Desktop: 1024px, 1280px, 1440px

- [ ] Starter, Growth, Enterprise remain in one row and in that order.
- [ ] Existing desktop section width, heading, spacing, 24px card gap, and 32px card padding are preserved.
- [ ] Growth remains tinted, labeled `Most popular`, border-accented, and uses the red CTA.
- [ ] Starter and Enterprise remain white/light cards with secondary CTAs.
- [ ] Existing desktop typography hierarchy and plan copy are unchanged.
- [ ] Card hover lift/glow still works only on fine-pointer hover devices.
- [ ] Growth border sweep remains visible and is not clipped.
- [ ] CTA alignment does not push any button outside its card.
- [ ] The pricing entrance reveal still runs once without affecting scroll behavior.
- [ ] FAQs and the following contact section remain unchanged.

### Tablet: 768px, 900px, 1023px

- [ ] All three cards remain in one row; no carousel or dots are present.
- [ ] Starter, Growth, Enterprise remain in canonical order.
- [ ] Grid gap is compact and cards use tablet padding rather than desktop `p-8`.
- [ ] No card or CTA is clipped.
- [ ] `Send an Enquiry` remains on one line.
- [ ] `Talk to us` remains on one line.
- [ ] Growth's CTA is fully inside the Growth card.
- [ ] CTAs align toward a common bottom edge without fixed card heights.
- [ ] Price and `/month` remain together and baseline-aligned.
- [ ] Feature text wraps normally, remains readable, and does not overflow.
- [ ] No horizontal page overflow appears.
- [ ] Nexa remains accessible and does not obscure a CTA at the end of the section.

### Mobile: 767px, 600px, 430px, 390px, 375px, 320px

- [ ] The pricing plans are a horizontal manual swipe track, not a vertical stack.
- [ ] Growth is the first/default card.
- [ ] Starter is second and Enterprise is third.
- [ ] Every plan remains reachable by touch swipe, trackpad, keyboard, and dot controls.
- [ ] No autoplay, timer, or unexpected card movement exists.
- [ ] Cards use approximately 86vw with a 360px maximum.
- [ ] An adjacent card is visibly discoverable at common phone widths.
- [ ] Cards snap naturally to a centered resting position.
- [ ] Vertical page scrolling remains natural and is not trapped by the track.
- [ ] Cards use content-driven height and are not stretched to Growth's height.
- [ ] Starter and Enterprise may be shorter than Growth.
- [ ] Card padding and internal gaps feel compact but not cramped.
- [ ] Feature copy is fully readable, with no clipping or fixed-height rows.
- [ ] CTA labels remain on one line and buttons stay inside their cards.
- [ ] The active dot follows the card nearest the track center.
- [ ] Dot controls have labels, focus states, and correct `aria-current` state.
- [ ] Dot navigation is instant under reduced motion.
- [ ] The horizontal scrollbar may be visually hidden, but scrolling remains available.
- [ ] No horizontal body overflow exists outside the intended track.
- [ ] Nexa does not block a pricing CTA or indicator and retains a suitable touch target.
- [ ] The FAQ block below pricing remains vertically scrollable and unchanged.

### Price and copy checks

- [ ] `₹4,999` remains attached to `/month` at every tested width.
- [ ] `₹9,999` remains attached to `/month` at every tested width.
- [ ] Enterprise remains `Custom` with no empty unit gap.
- [ ] No plan name, price, description, feature, label, or CTA copy changes.

### Continuous resize checks

- [ ] Resize through 320, 375, 390, 430, 600, 767, 768, 900, 1023, 1024, 1280, and 1440px.
- [ ] At 767→768, order, overflow, snap, dots, widths, and grid state switch cleanly.
- [ ] At 1023→1024, desktop gap/padding/button sizing returns without clipping or layout jump.
- [ ] Resizing back into mobile returns Growth to the first position and resets the active dot correctly.

### Functional and quality checks after eventual implementation

- [ ] All three CTA buttons still scroll to `#contact`.
- [ ] Focus remains visible on CTAs, the track, and pagination controls.
- [ ] Reduced-motion behavior is respected.
- [ ] No new dependency is added.
- [ ] `npm run build` passes from `client`.
- [ ] `npm run lint` is run from `client`; fix only new issues introduced by the pricing implementation and report unrelated pre-existing findings separately.
- [ ] Search the final diff for accidental pricing copy/data changes.
- [ ] Confirm only the intended files changed for this implementation.

## Non-Goals / Boundaries

- Do not implement any of the changes while this planning file is being created.
- Do not redesign the pricing cards or color system.
- Do not change prices, plan names, descriptions, features, labels, or CTA copy.
- Do not alter the pricing heading, FAQs, contact form, header, footer, or unrelated landing sections.
- Do not modify the separate authenticated `client/src/pages/Pricing.jsx` flow.
- Do not globally change `.workmate-shell`, marketing typography tokens, or shared Button definitions.
- Do not replace the Growth border/hover treatment.
- Do not add a carousel library or any package.
- Do not add autoplay.
- Do not add brittle fixed card heights.
- Do not add section-aware chatbot movement or redesign Nexa.
- Do not stage, commit, push, or create a pull request.

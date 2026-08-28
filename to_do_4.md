# 1. List of all the changes

1. Add a shared mobile-only gap after every Discovery timeline item except the last so STEP 03, STEP 04, and STEP 05 receive the same breathing room automatically.
2. Keep the Discovery step label, title, description, marker, and vertical line driven by the existing repeated `JOURNEY_STEPS`/`JourneyStep` structure; do not add index-specific spacing branches.
3. Preserve the current 34px mobile marker column, 32px marker, `left-[16px]` timeline axis, and tablet/desktop alternating layout.
4. Replace the phone Powerful Features item anatomy with compact horizontal rows: icon at the left, title and description at the right, and one readable text column.
5. Keep Powerful Features single-column below 768px; a two-column phone grid would make the descriptions too narrow at 360–430px.
6. Keep Powerful Features in one column through the entire mobile and tablet range; do not introduce a second tablet column.
7. Use the same compact horizontal row/card anatomy on mobile and tablet, with the icon at left and title/description at right.
8. Reduce Powerful Features phone/tablet outer padding, item padding, inter-item gaps, and icon size enough to shorten the section without shrinking the shared typography tokens.
9. Replace the current tablet border logic with simple one-column row separators or compact individual-card borders; do not add column-specific borders.
10. Keep the Powerful Features badge centered over the outer card and preserve its current red palette, wording, shadow, and pill treatment.
11. Restore the existing five-column, vertically oriented feature layout and vertical dividers at `lg` (`>=1024px`).
12. Move the AI score panel's internal two-column layout from `lg` to `md`, so tablets place the three skill controls beside the overall-readiness summary instead of stacking both large blocks.
13. Reduce tablet AI Evaluation section padding from the current `sm:py-16`, while leaving the approved desktop `lg:py-8` rule intact.
14. Reduce mobile/tablet `AIScorePanel` padding, internal grid gap, skill-row spacing, meter dimensions, meter margins, divider spacing, and legend spacing as a coordinated set.
15. Keep all three score rows, editable number inputs, range controls, overall average, ring transition, legend, and exact `<=70`, `71–89`, and `>=90` color thresholds unchanged.
16. Move the capability carousel closer to the score panel by replacing the current `mt-10 sm:mt-12` spacing with compact mobile/tablet values.
17. Make the capability carousel reservation responsive instead of using the same 220px wrapper and 210px card minimum throughout phone and tablet widths.
18. Reduce capability-card mobile/tablet padding and illustration size; keep its text readable and its height safely large enough for the longest capability description.
19. Tighten the capability-dot top margin on mobile/tablet while preserving the same three indicators, active-state width, rotation order, automatic timer, transitions, hover behavior, and `aria-live` behavior.
20. Keep the capability card close to the viewport width minus page gutters on mobile, use a smaller capped width on tablet, and restore the current desktop cap and dimensions at `lg`.
21. Center the main audience-card heading at tablet widths using the shared `SolutionPanel` markup and responsive classes, not three per-card exceptions.
22. Give the tablet audience text column enough usable width for “For Colleges & Institutions” by reducing the image-column cap/gap slightly and removing the heading's unnecessary tablet max-width constraint.
23. Use only a small tablet-specific heading adjustment if measurement at 768px requires it; do not materially shrink the shared `type-h3` scale.
24. Vertically center all tablet audience visuals by changing the tablet grid alignment, wrapper self-alignment, and wrapper content alignment from `end` to `center`.
25. Use symmetric tablet visual padding and retain `object-contain` so the three differently proportioned source images remain fully visible.
26. Preserve the existing mobile audience behavior: normal document flow, natural card height, all five bullets, and the complete `.solution-audience-visual` hidden below 768px.
27. Preserve the existing desktop audience grid ratio, sticky stack, image sizes, candidate decoration, typography, shadows, and bottom-aligned full-height visual behavior from 1024px upward.
28. Keep the shared audience reveal and desktop stack animation intact; responsive alignment changes must not alter GSAP targets or timing.
29. Do not change `client/src/index.css` score-range controls, global typography tokens, chatbot positioning, copy, icons, assets, brand colors, navbar, footer, pricing, or unrelated landing sections.
30. Verify Discovery at 360, 375, 390, 412, and 430 widths for consistent spacing before STEP 03/04/05 and unchanged line/marker geometry.
31. Verify Powerful Features at 360, 375, 390, 412, 430, 600, 767, 768, 900, 1023, 1024, 1280, and 1440 widths for readable text, one-column row separation, compact height, and no horizontal overflow.
32. Verify AI Evaluation at the same continuous widths, especially 767→768 and 1023→1024, and confirm that tablet shows the heading, meter, all score rows, legend, capability card, and dots within one viewport as closely as the 768/800px heights allow.
33. Verify all three audience cards at 768×1024 and 900×800 for centered headings, practical one-line titles, vertically centered uncropped images, complete bullets, and correct sticky behavior.
34. Regression-test desktop at 1024×768, 1280×800, and 1440×900 and mobile at 430×932, 412×915, 390×844, 375×812, and 360×800.
35. After the eventual implementation, run `npm run build` and `npm run lint` from `client`; fix only issues introduced by these responsive changes.

# 2. How to implement these changes

## `client/src/pages/workmate/JourneySection.jsx`

### Current behavior

- `JOURNEY_STEPS` is mapped through one shared `JourneyStep`; this is the correct place to solve all transitions.
- Each mobile `<li>` uses `grid min-h-[142px] grid-cols-[34px_minmax(0,1fr)] items-center gap-4`.
- The content has internal spacing (`mb-2` before the title and `mt-2` before the description), but the list item has no bottom padding, the `<ol>` has no row gap, and the description has no bottom margin.
- Adjacent rows therefore touch as soon as a long description consumes the 142px minimum. The apparent space is only leftover `min-height`, so it varies with line wrapping and nearly disappears for four-line descriptions.
- The marker and content share the same centered grid row. The two timeline spans independently stay on the mobile axis with `left-[16px]`, `top-7`, and `bottom-7`; at `md` they move to `left-1/2`.
- At `md`, each row becomes a three-column alternating timeline with `md:min-h-[158px]` and the marker in column 2.

### Problem

The missing space before STEP 03/04/05 is not caused by the label margins. It comes from relying on `min-h-[142px]` as both row geometry and inter-item spacing. A long description can make the row content-driven, leaving no guaranteed gap before the next row's red eyebrow. Increasing the label's top margin would move only the text and could separate it from its marker; increasing the description margin per step would be repetitive.

### Change required

Add a guaranteed, shared mobile separation after each complete timeline row while retaining the marker and content as one aligned unit. Tablet and desktop spacing should remain unchanged.

### How to implement

- Add mobile bottom padding to the repeated `<li>`, for example `pb-8 last:pb-0 md:pb-0`. A 32px transition is large enough to separate the previous description from the next red label without producing the “huge gap” failure shown in the requirements.
- Keep the padding on `.journey-step`, not on `.type-eyebrow` or only the description. This makes the whole marker/content row end together and applies to every transition.
- Keep `items-center`, `grid-cols-[34px_minmax(0,1fr)]`, the 32px marker, `gap-4`, and both timeline-span positions unchanged. The extra trailing row space does not move the mobile axis or decouple the marker from its content.
- Keep `md:pb-0`, `md:min-h-[158px]`, the alternating columns, and all GSAP selectors unchanged so the tablet/desktop geometry and reveal sequence are preserved.
- If browser measurement shows 32px too open at 430px, use `pb-7` (28px); do not go below 24px because the current long-description transitions already consume nearly all of the 142px row.

Suggested class shape:

```jsx
<li className='journey-step relative grid min-h-[142px] grid-cols-[34px_minmax(0,1fr)] items-center gap-4 pb-8 last:pb-0 md:min-h-[158px] md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:gap-0 md:pb-0'>
```

## `client/src/pages/workmate/PowerfulFeatures.jsx`

### Current behavior

- All five features live inside one rounded outer card. The badge is absolutely centered at `left-1/2 top-0` and translated upward by half its height.
- The section uses `py-12 sm:py-14 lg:py-16`; the outer card uses `px-4 pb-7 pt-10`, then `sm:px-6 sm:pb-8 sm:pt-12`, and `lg:px-8 lg:pb-9`.
- The feature grid is one column by default, two columns at `sm` (640px), and five columns at `lg` (1024px). The requested direction is to keep it one column through `lg - 1px`, so the existing `sm:grid-cols-2` rule must be removed/replaced.
- Every item remains a centered vertical stack at every width: 44px icon, `mt-4` heading, `mt-2` description, `px-4 py-6` on mobile, `sm:px-5 sm:py-5`, and `lg:px-6 lg:py-4`.
- Mobile uses `divide-y`. At `sm`, row dividers are removed and every item after index 0 receives `sm:border-l`; that tablet rule is tied to the old multi-column idea and should be removed. A one-column tablet can use the same horizontal row separator as mobile.
- Descriptions keep `max-w-[220px]`. On phone and tablet, the combination of five vertical stacks, five 44px icons, large top gaps, and 48px vertical padding per item makes the single outer card very tall. Tablet has enough width for broader horizontal rows, so it should use that width rather than introduce a second column.

### Problem

The main height is not a fixed-height bug. It is the repeated vertical composition and padding. The tablet still inherits that same tall vertical item anatomy even though its available width would support a broader icon-plus-text row. The old `sm` border expression is also unnecessary once both phone and tablet are one column.

### Change required

Use a compact horizontal feature row below `lg`, keep that row in one column on both phone and tablet, and restore the approved five-column vertical presentation at `lg`.

### How to implement

- Keep `POWERFUL_FEATURES`, its titles/descriptions/icons, the outer card, and badge unchanged.
- Change the grid breakpoint sequence to `grid-cols-1 lg:grid-cols-5`; do not add a tablet column split. Keeping one column through 1023px avoids narrow tracks and gives each feature a broad, clean text area.
- Make each `<article>` a two-column grid such as `grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 px-2 py-4 text-left` below `lg`. Put the icon in column 1 and wrap heading/body in a small text container in column 2. The cleanest JSX change is to add one wrapper around `<h3>` and `<p>`; no new component or CSS file is needed.
- Use a 40px icon holder and a 22px Lucide icon below `lg`; restore `lg:h-11 lg:w-11` and the existing 24px SVG at desktop. If passing a responsive numeric `size` is awkward, keep `size={24}` and size the SVG with a scoped class on the holder (`[&>svg]:h-[22px] [&>svg]:w-[22px] lg:[&>svg]:h-6 lg:[&>svg]:w-6`).
- At tablet, keep the one-column rows content-driven with `md:px-4 md:py-4` (slightly roomier than mobile) and a compact `md:gap-x-4`. Keep horizontal icon/text anatomy through tablet; it uses the available width better than the current centered vertical stacks.
- Remove the fifth-item span/centering logic entirely. Every item participates in the same one-column flow through tablet.
- Use `divide-y divide-line/80` or equivalent compact individual-card borders at both mobile and tablet. Remove the current `${index > 0 ? 'sm:border-l ...' : ''}` expression because no tablet column edge exists. At `lg`, remove row borders and restore `lg:divide-x lg:divide-y-0` on the parent, so the desktop card remains visually the same.
- At `lg`, restore `flex flex-col items-center text-center`, the 44px icon holder, `mt-4` heading, `max-w-[220px]` centered body, and current item padding. The desktop grid remains five equal columns.
- Keep the badge above the card. The existing outer `pt-10 sm:pt-12` can become `pt-9 md:pt-10 lg:pt-12`; retain enough clearance that the first row never touches the pill.

| Element | Mobile `<768px` | Tablet `768–1023px` | Desktop `>=1024px` |
|---|---|---|---|
| Columns | 1 | 1 | Existing 5 |
| Outer width | Existing `workmate-shell`, full available width | Existing `workmate-shell`, full available width | Existing |
| Outer wrapper | Compact; no giant stretched visual block | Compact; broad one-column rows, no giant stretched visual block | Existing desktop card |
| Outer padding | `px-4 pt-9 pb-5` | `px-5 pt-10 pb-6` | Restore `lg:px-8 lg:pt-12 lg:pb-9` |
| Item height | Content-driven; no `min-height` | Content-driven; no `min-height` | Existing content-driven |
| Item padding | `px-2 py-4` | `px-4 py-4` (slightly roomier, still compact) | Existing `lg:px-6 lg:py-4` |
| Anatomy | 40px icon left, text right | 40px icon left, text right | Icon above centered text |
| Icon | 40px holder / 22px SVG | 40px holder / 22px SVG | Existing 44px / 24px |
| Heading | Existing `type-component-title`; remove vertical `mt-4` in row layout | Same | Restore existing `mt-4` |
| Body width | `max-w-none`, natural wrapping | `max-w-none`, broad row text track | Existing `max-w-[220px]` |
| Gap | `gap-x-3`; horizontal divider between rows | `gap-x-4`; same one-column row separation | Existing no grid gap/divide-x |
| Separators | Horizontal `divide-y` or compact card borders | Same one-column row separation; no column-specific borders | Existing vertical dividers |
| Badge | Existing centered absolute pill | Existing centered absolute pill | Existing centered absolute pill |

## `client/src/pages/workmate/AIScorePanel.jsx`

### Current behavior

- The panel wrapper uses `p-5 sm:p-7 lg:p-6`.
- Its internal grid is stacked with `gap-8` until `lg`, when it becomes `lg:grid-cols-[minmax(0,1.45fr)_minmax(210px,0.85fr)]`.
- The overall score block is `order-1` below 1024px and includes the heading, a `mt-5 h-[148px] max-w-[218px]` meter, and readiness copy. It has `border-b pb-7` while stacked.
- The skill block is `order-2`; its three rows use `space-y-6`, each label/range pair uses `mb-2`, and the legend uses `mt-7 border-t pt-4`.
- Only at `lg` do the meter and skills sit side by side, with reduced meter size (`h-[124px] max-w-[195px]`), tighter skill spacing, and a vertical divider.

### Problem

At 768–1023px the component still follows its phone stack even though the viewport is wide enough for its desktop-style two-column information layout. This duplicates the vertical footprint of the overall summary and the three skill controls. `sm:p-7`, `gap-8`, a 148px meter, `space-y-6`, `pb-7`, and the legend's `mt-7 pt-4` compound that footprint.

### Change required

Use the compact two-column score layout from `md` upward, with a slightly smaller tablet meter and tighter spacing. Mobile stays one column but loses surplus padding/gaps rather than losing content or type size.

### How to implement

- Change the grid breakpoint from `lg:grid-cols-...` to `md:grid-cols-[minmax(0,1.45fr)_minmax(210px,0.85fr)] md:gap-0` and move its order/divider/pr classes from `lg:` to `md:`. Preserve `lg:` only for desktop-specific final values where needed.
- Use wrapper padding around `p-4 sm:p-5 lg:p-6`, not the current tablet `sm:p-7`.
- Mobile: reduce the grid to `gap-6`, skill rows to `space-y-4`, the meter to approximately `h-[128px] max-w-[196px]`, the stacked divider to `pb-5`, and the legend to `mt-5 pt-3 gap-x-3`.
- Tablet: use no cross-column gap and keep the existing vertical divider pattern (`md:border-l md:pl-5`, skill side `md:pr-5`). Use a meter around `h-[116px] max-w-[180px]` with `mt-3`; adjust the numeric overlay bottom proportionally (approximately `bottom-[25px]`).
- Tablet skill rows should use `md:space-y-4`; the legend should use `md:mt-4 md:pt-3`. Keep the score labels, inputs, and bars at their current readable token sizes.
- Desktop can retain the approved proportions and current `lg:p-6`, meter cap near 195px/124px, and column ratio. The only visual effect of moving the split to `md` should be that tablet gains the same efficient information grouping.
- Do not touch `scoreColor`, `clampScore`, `overallScore`, `meterOffset`, input attributes, ARIA labels, range classes, or `REDUCE_MOTION`.

Suggested breakpoint direction:

```jsx
<div className='relative grid gap-6 md:grid-cols-[minmax(0,1.45fr)_minmax(210px,0.85fr)] md:gap-0'>
```

## `client/src/pages/workmate/WHome.jsx`

### Current behavior

#### AI Evaluation / `EnterpriseAI`

- The section uses `py-12 sm:py-16 lg:py-8`, so tablet receives the largest vertical padding: 64px at both top and bottom.
- `AIScorePanel` and the capability carousel are separate vertical blocks.
- The carousel wrapper uses `mt-10 sm:mt-12 lg:mt-5`; tablet therefore inserts 48px after the already-stacked score panel.
- A relative wrapper reserves `min-h-[220px]` until `lg`. Inside it, the animated article is absolutely positioned and reserves `min-h-[210px]`, `max-w-[520px]`, `p-7`, then the tablet rule increases padding to `sm:p-9`.
- The illustration is always `h-16 w-24` with `mb-4`; dots add `mt-4` after the 220px wrapper.
- Absolute positioning is serving a real purpose: entering/exiting cards overlap during `AnimatePresence` without changing page height. The fix should retain that behavior but reduce the reservation.

#### Audience / `SolutionPanel`

- Tablet starts at the existing Tailwind `md` breakpoint (768px); desktop restoration starts at `lg` (1024px).
- The current tablet grid is `minmax(0,1fr) minmax(220px,280px)`, `gap-8`, and `md:items-end`.
- The intro column includes a right-aligned badge, left-aligned eyebrow, `h3` with `max-w-[460px]`, subtitle, and all five bullets.
- At 768px, after the shell's 48px horizontal padding and the card's 64px `sm` padding, about 656px remains. Reserving up to 280px for the image plus a 32px gap can leave roughly 344px for the title. The 30px `type-h3` College title cannot reliably stay on one line in that width; the `max-w-[460px]` does not help because the actual grid track is narrower.
- The tablet visual wrapper is explicitly `md:self-end`, the grid is `md:items-end`, and the wrapper uses `items-end` with top-only padding. The image is therefore anchored to the bottom rather than centered in the row. Because the wrapper has no tablet minimum height and collapses around the image, it cannot create a centered visual region.
- Mobile already hides the complete visual wrapper and removes sticky/min-height behavior. Desktop restores the approved `0.92fr/1.08fr` ratio, stretch alignment, large visual minimum heights, larger image bounds, and candidate decoration.

### Problem

The AI section's height comes from stacked tablet score content plus a second, fixed-reservation carousel block and unusually large tablet padding/margins. The audience title wrapping is a track-width issue, not primarily a font issue. The audience image placement is a direct result of three bottom-alignment rules (`md:items-end`, `md:self-end`, and wrapper `items-end`).

### Change required

Compress AI Evaluation at phone/tablet without changing its logic, and adjust only the tablet audience alignment/track allocation while retaining the existing mobile and desktop modes.

### How to implement

#### AI Evaluation section and capability carousel

- Use section padding near `py-10 sm:py-10 md:py-8 lg:py-8`. This removes the current jump to `sm:py-16` and saves up to 64px on tablet while preserving separation from adjacent sections.
- Reduce the carousel gap to `mt-6 md:mt-5 lg:mt-5` instead of `mt-10 sm:mt-12`.
- Keep the carousel below `AIScorePanel`. Once that panel splits at `md`, a second outer two-column layout is unnecessary and would make the score controls too narrow at 768px. The simplest robust tablet layout is a compact score two-column row followed immediately by the capability card.
- Mobile capability sizing: wrapper `min-h-[180px]`, article `min-h-[170px]`, width `w-full max-w-[520px]`, and `p-5`; illustration about `h-12 w-20 mb-3`; dots `mt-2.5`.
- Tablet capability sizing: wrapper about `md:min-h-[154px]`, article `md:min-h-[144px] md:max-w-[480px] md:p-5`; illustration remains about 48×80px. This is enough for all three current descriptions at 14px without clipping.
- Desktop: restore `lg:min-h-[170px]` on the wrapper, `lg:min-h-[160px] lg:max-w-[520px] lg:p-6` on the card, and `lg:h-16 lg:w-24 lg:mb-4` for the approved current look.
- Keep `absolute inset-x-0 top-0`, `AnimatePresence`, keys, motion variants, 4200ms timer, capability order, dot mapping, and hover transitions unchanged.
- Do not add `height`, `overflow-y`, text clamping, or smaller global typography. Confirm the longest “Enterprise Security” copy fits at every target width before accepting the smaller reservation.

#### Tablet audience heading

- Change only the `md` track allocation to approximately `md:grid-cols-[minmax(0,1fr)_minmax(210px,240px)] md:gap-6`. This returns 48–72px to the text column versus the current maximum image track/gap at narrow tablet widths.
- Add `md:max-w-none md:text-center` to the shared heading and restore `lg:max-w-[460px] lg:text-left` at desktop.
- Use a tablet-only 28px heading if the 768px browser measurement still wraps: for example `md:text-[28px] lg:text-[32px] xl:text-[34px]`, matching the current global/desktop scale. A 2px tablet reduction is acceptable; a much smaller heading is not.
- After the track adjustment, `md:whitespace-nowrap` may be used only if 768px measurement proves the College title fits inside its own track. Do not use nowrap if it produces overflow; natural wrapping is preferable at the genuinely narrow edge.
- Apply these classes to the one shared `h3`; do not branch on `p.category`.

#### Tablet audience image

- Change the grid's `md:items-end` to `md:items-center`, restoring `lg:items-stretch` exactly as today.
- Change the wrapper from base `items-end`/`md:self-end` to `items-center md:self-center`; restore `lg:items-end lg:self-stretch` for desktop.
- Replace tablet `md:pt-3` with symmetric `md:p-3`, and use `md:justify-center`. Keep `overflow-hidden`, the rounded pink visual surface, and `object-contain`.
- Cap tablet images around `max-h-[280px] max-w-[240px]`; restore the current `lg:h-full lg:max-h-[470px] lg:max-w-[520px]` and `xl` limits.
- Keep the College image's `mix-blend-multiply`, category object-position choices at desktop, and candidate decoration's `hidden lg:block` unchanged.
- Keep `.solution-audience-visual` hidden below 768px and keep `relative md:sticky`, `md:min-h-[86vh]`, and the GSAP selectors/tweens unchanged.

## `client/src/index.css`

### Current behavior

- Tailwind 4 is imported directly. The implementation consistently uses the standard `sm` 640px, `md` 768px, and `lg` 1024px breakpoints.
- Shared typography is already responsive: mobile `type-h3` is 24px, the base/tablet value is 30px, and landing-page desktop overrides begin at 1024px.
- `.workmate-shell` contributes 24px side padding below 1024px and 32–40px above it.
- `.score-range` owns the functional score-control track, thumb, and focus styles.

### Problem

No global CSS selector is the root cause of the four requested issues. Adding broad media-query overrides here would duplicate component-level Tailwind rules and risk changing unrelated sections.

### Change required

Prefer no changes to this file. Use the existing breakpoint and typography system from the JSX files.

### How to implement

- Do not change `.score-range`, its pseudo-elements, typography tokens, `.workmate-shell`, or chatbot media queries.
- If the eventual implementation cannot express a measured image/title rule with Tailwind utilities, add one narrowly scoped `.solution-card` tablet media query under `@media (min-width: 768px) and (max-width: 1023px)`; do not add a new global breakpoint.
- Verify the compiled rules at 767/768 and 1023/1024 because `md` and `lg` are the intended mode boundaries.

## `client/src/components/NexaChatbot.jsx`

### Current behavior

- The launcher is a fixed overlay (`fixed bottom-5 right-5 z-[45]`, with `sm:bottom-7 sm:right-7`).
- Its responsive size/position is already scoped in `index.css` for narrow screens.

### Problem

The launcher overlaps screenshots because it is intentionally fixed; it does not create the Discovery, feature-grid, score-section, or audience-card layout height/alignment problems.

### Change required

No source change.

### How to implement

- Treat the launcher as an overlay during viewport testing.
- Scroll each final item clear of it and verify content remains reachable. Do not reposition, resize, restyle, or change its z-index for this task.

## Verification after the eventual implementation

### Viewport matrix

| Viewport | Discovery | Powerful Features | AI Evaluation | Audience |
|---|---|---|---|---|
| 360×800, 375×812, 390×844, 412×915, 430×932 | Check every transition, line, and marker | Compact horizontal rows; no horizontal scroll | Compact stack, all scores/legend/card readable | Existing text-only natural flow unchanged |
| 600px and 767px continuous widths | No spacing jump | Still compact one column | No overflow before `md` split | Visual remains fully hidden |
| 768×1024 and 900×800 | Desktop/tablet timeline unchanged | Balanced 2+2+1 grid | Score summary/skills side by side; capability close below | Centered heading and visual on all three cards |
| 1023px and 1024×768 | Check clean breakpoint handoff | 2-column → approved 5-column | Compact tablet → approved desktop | Centered tablet → approved desktop alignment/sticky visual |
| 1280×800 and 1440×900 | Approved layout unchanged | Approved layout unchanged | Approved layout unchanged | Approved layout unchanged |

### Functional and visual assertions

- Discovery: STEP 03/04/05 each has the same 24–32px visual separation above it; markers stay aligned to their own content and both line layers remain continuous.
- Powerful Features: all five names/descriptions/icons remain unchanged; the final tablet item is centered; no incorrect left border appears on a later left-column item; no clipped or tiny text.
- AI Evaluation: number and range inputs both update the same score; 70 is pink, 71 and 89 are orange, 90 is green; the overall average and ring update; all three capability cards rotate in the current order and the dots follow them.
- Tablet AI target: at 900×800 the section should fit within one viewport; at 768×1024 it should fit comfortably. If browser chrome reduces the usable height, prioritize complete readable content over forcing a hard viewport height.
- Audience: all five bullets and each image remain complete; the College title stays one line where its measured track permits; no `nowrap` overflow; mobile and desktop modes are unchanged.
- Run `npm run build` and `npm run lint` from `client`. Report unrelated pre-existing lint findings separately instead of modifying unrelated files.

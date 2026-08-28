# Hero Mobile Responsiveness Audit

## Scope and outcome

This plan covers the live WorkmateIQ landing-page hero at `/` and `/welcome`, including the fixed header, hero copy, benefit chips, all three CTAs, interview preview, and the floating Nexa launcher where it overlaps the first viewport.

This document is an implementation plan only. No application code has been changed.

The recommended mobile composition is:

1. Compact fixed header
2. Three intentionally wrapped title lines
3. Short, readable description block
4. Three equal compact benefit chips in one row
5. Three aligned CTA buttons in a vertical stack
6. No interview mockup below 768px

The desktop design, colors, wording, logo, and overall visual language remain unchanged.

## 1. Current structure

### Live route and component tree

- `client/src/App.jsx`
  - `/` and `/welcome` both render `WHome`.
  - The older `client/src/pages/Home.jsx` and `client/src/components/HeroMockup.jsx` are not part of the live landing page and must not be edited for this task.
- `client/src/pages/workmate/WHome.jsx`
  - `WHome` renders `WorkmateLayout`, the `Hero`, the rest of the landing page, and `NexaChatbot`.
  - `Hero` owns the heading, description, benefit chips, CTAs, background glows, GSAP pointer tilt, and the `InterviewPreview` wrapper.
- `client/src/pages/workmate/WorkmateLayout.jsx`
  - `WorkmateNav` is the fixed landing-page header.
  - The outer `.workmate-marketing` class activates the enlarged marketing typography tokens.
- `client/src/pages/workmate/InterviewPreview.jsx`
  - Builds the interview browser mockup from several nested panels rather than using one responsive image.
- `client/src/pages/workmate/InterviewPreview.css`
  - Controls the mockup's internal grid, minimum heights, scores, controls, and mobile stacking.
- `client/src/components/Button.jsx`
  - Defines shared pill shape, typography, padding, and button variants. The hero uses the `lg` size (`px-8 py-3.5`) and adds larger `lg:` padding.
- `client/src/components/NexaChatbot.jsx`
  - Owns the fixed launcher and its open panel.
- `client/src/index.css`
  - Defines `.type-display`, `.type-lead`, `.type-body-small`, `.type-button-*`, `.workmate-shell`, and the marketing-page desktop overrides.

### Current layout system

- Tailwind CSS v4 utilities are used directly in JSX.
- Shared typography and shell rules are in `client/src/index.css`.
- The interview mockup has component-specific plain CSS in `InterviewPreview.css`.
- The hero shell is a one-column CSS grid by default and changes to `grid-template-columns: 1fr 1.05fr` at `lg` (1024px).
- The visual is therefore stacked below the text from 0–1023px and shown beside it from 1024px upward.
- The hero has `overflow-hidden`; this is appropriate for the decorative radial glows, but it currently also conceals real content overflow.

### Current breakpoint system

The project follows Tailwind's default breakpoints:

| Token | Width | Current hero effect |
|---|---:|---|
| Base | `< 640px` | One column; 24px shell padding; full visual shown |
| `sm` | `>= 640px` | Hero top padding rises from 96px to 112px |
| `md` | `>= 768px` | Header auth buttons appear; global mobile type override stops |
| `lg` | `>= 1024px` | Two-column hero; 32–40px shell padding; larger CTA padding |
| `xl` | `>= 1280px` | Hero gap increases and enlarged marketing type tokens apply |

One additional small-mobile query is justified for `<= 480px`, plus a narrow padding adjustment at `<= 375px`. These should be kept together in the hero/header section of `index.css`, not scattered through multiple components.

### Measured current behavior

The live page was inspected at every requested viewport. Browser scrollbars reduce the content viewport by about 15px in these measurements, which is important at narrow widths.

| Viewport | H1 | Description | Visual | Total hero | Current CTA layout |
|---|---:|---:|---:|---:|---|
| 1440×900 | 72px / 229px high | 21px / 134px high | 524px high | 819px | 2 + 1 |
| 1280×800 | 72px / 229px high | 21px / 168px high | 535px high | 853px | 2 + 1 |
| 1024×768 | 56px / 178px high | 18px / 144px high | 510px high | 772px | 2 + 1 |
| 768×1024 | **64px** / 204px high | 18px / 86px high | 526px high | 1,216px | 3 in one row |
| 430×932 | 42px / 136px high | 17px / 136px high | 713px high | 1,432px | 2 + 1 |
| 412×915 | 42px / 136px high | 17px / 163px high | 820px high | 1,565px | 2 + 1 |
| 390×844 | 42px / 136px high | 17px / 163px high | 806px high | 1,612px | stacked after first wrap |
| 375×812 | 42px / 136px high | 17px / 163px high | 806px high | 1,612px | stacked |
| 360×800 | 42px / 136px high | 17px / 163px high | 806px high | 1,612px | stacked |

## 2. Problems found

### 2.1 The title has a discontinuous type scale

- **Component:** `Hero` in `WHome.jsx`; `.type-display` in `index.css`.
- **Current behavior:** 42px through 767px, then 64px at 768–1023px, 56px at 1024–1279px, then 72–80px at 1280px+.
- **Exact cause:** the `@media (max-width: 767px)` override ends at 768px, exposing the 64px base token. A separate 56px marketing override begins only at 1024px.
- **Affected widths:** especially 768–1023px. The title gets larger at 768px and then smaller again at 1024px.
- **Impact:** tablet feels like enlarged desktop typography placed over a single-column layout.

### 2.2 `whitespace-nowrap` creates the narrow-screen clipping

- **Component:** highlighted `Better Decisions.` span in `WHome.jsx`.
- **Current behavior:** the highlighted phrase may not wrap under any condition.
- **Exact cause:** `whitespace-nowrap` gives the hero grid item a large min-content width. At 390px and below, the measured grid content stays approximately 332px wide even when the available width after scrollbar and padding is smaller (approximately 297px at the 360px test). The section's `overflow-hidden` then clips the real content.
- **Affected widths:** visible risk around 390px; definite clipping at 375px and 360px, and worse on 320–359px devices or at browser zoom above 100%.
- **Impact:** title, paragraph, chips, and buttons appear to disappear at the right edge even though the document itself does not report a horizontal scrollbar.

### 2.3 The hero relies on clipping instead of having shrinkable grid children

- **Component:** hero section and shell in `WHome.jsx`.
- **Current behavior:** the section hides overflow; the grid and both direct children do not explicitly set `min-width: 0`.
- **Exact cause:** CSS Grid's default `min-width: auto` lets min-content from the non-wrapping heading define a track wider than the available content box.
- **Affected widths:** narrow mobile and zoomed layouts.
- **Impact:** the page can look scroll-free while still losing content.

### 2.4 Mobile title wrapping is incidental, not authored

- **Component:** hero `h1` in `WHome.jsx`.
- **Current behavior:** the title is one text flow with only the red phrase protected by `nowrap`.
- **Exact cause:** line breaks depend on available width and the phrase's min-content width.
- **Affected widths:** all widths, most visibly 360–768px.
- **Impact:** wrapping can change unpredictably between “AI Interviews.”, the highlighted phrase, and “Faster Hiring.”

### 2.5 The description consumes too much of the mobile first viewport

- **Component:** hero lead paragraph in `WHome.jsx`; `.type-lead` in `index.css`.
- **Current behavior:** 17px with 1.6 line-height below 768px and 24px bottom margin. It becomes 163px high at 412px and below.
- **Exact cause:** the type token is only reduced by 1px from its default, while the column is narrowed by fixed 24px padding on each side. Overflow inherited from the title's grid min-content width also makes the paragraph look cropped at very narrow widths.
- **Affected widths:** 360–430px.
- **Impact:** the copy occupies six lines and pushes chips/CTAs down without improving readability.

### 2.6 Chips are content-sized inside a wrapping flex row

- **Component:** benefit row in `WHome.jsx`.
- **Current behavior:** each chip uses `px-3 py-2`, 14px text, 15px icon, 8px inner gap, and the row uses 10px gaps.
- **Exact cause:** three independent intrinsic widths are allowed to wrap wherever space runs out; there is no equal-column or small-screen rule.
- **Affected widths:** very narrow screens, zoomed screens, and any future label/font change.
- **Impact:** current labels happen to fit at common widths, but the arrangement is fragile and inherits the hero's oversized min-content track. The user screenshots show the right chip near/crossing the visible edge.

### 2.7 CTA wrapping is driven by intrinsic widths

- **Component:** CTA row in `WHome.jsx`; shared `Button.jsx`.
- **Current behavior:** buttons use content width with `px-8 py-3.5`; at `lg`, padding rises to 40px × 17px. The row merely uses `flex-wrap` and a 12px gap.
- **Exact cause:** there is no hero-specific width strategy. The three buttons form 2 + 1 at 412–430px, stack at 390px and below, and also form 2 + 1 at 1024, 1280, and 1440 because the text column is narrower than their combined intrinsic widths.
- **Affected widths:** all layouts where available text-column width changes.
- **Impact:** hierarchy and alignment look accidental. The secondary and tertiary buttons do not share a width or left/right edge.

### 2.8 The interview mockup is structurally too tall for mobile

- **Component:** `InterviewPreview` and its wrapper.
- **Current behavior:** the complete mockup remains visible at every width.
- **Exact cause:** below 768px, `InterviewPreview.css` changes the main panel to one column, retains a minimum 240px video, places sidebar cards in two columns, and places four score cards in two columns. At `<= 420px`, the sidebar becomes another one-column stack. This is correct for preserving the mockup's contents but wrong for the landing-page hero's mobile hierarchy.
- **Affected widths:** 0–767px, especially `<= 420px` where the visual grows again.
- **Impact:** the visual alone measures 713px at 430px, about 820px at 412px, and about 806px at 390px and below. The total hero reaches roughly 1.4–1.6k pixels.

### 2.9 Tablet keeps the full visual after an oversized text block

- **Component:** hero grid and visual wrapper.
- **Current behavior:** 768–1023px is still one column, with the full mockup placed below the text and a 56px grid gap.
- **Exact cause:** the two-column layout starts only at `lg` (1024px), but no tablet-specific visual width/gap exists.
- **Affected widths:** 768–1023px.
- **Impact:** at 768px the hero is 1,216px tall. The mockup is useful at this width, but it should be constrained and centered.

### 2.10 Header height and controls are not optimized for mobile

- **Component:** `WorkmateNav` in `WorkmateLayout.jsx`.
- **Current behavior:** unscrolled header is 76px high on mobile; scrolled is 62px. The logo is 36px, brand is 16px, and the hamburger has only a 20px visual area with no 44px hit target.
- **Exact cause:** desktop/mobile height changes are limited to `lg`; the hamburger button has no explicit width, height, or centering box.
- **Affected widths:** 0–767px.
- **Impact:** the header consumes more vertical room than necessary while the menu control has a smaller-than-recommended touch target.

### 2.11 The 768–1023px header shows both auth buttons and a hamburger

- **Component:** `WorkmateNav`.
- **Current behavior:** auth actions become visible at `md` (768px), navigation links remain hidden until `lg` (1024px), and the hamburger also remains visible until `lg`.
- **Exact cause:** intentionally different `md:flex` and `lg:hidden`/`lg:flex` thresholds.
- **Affected widths:** 768–1023px.
- **Impact:** it fits at 768px today, but the state should be explicitly retained and tested rather than being treated as a mobile header. Its height should sit between mobile and desktop values.

### 2.12 The chatbot is large relative to narrow viewports

- **Component:** `NexaChatbot.jsx`.
- **Current behavior:** launcher is 56px at base, 64px at `sm`, offset 20px at base and 28px at `sm`. The open panel can be `calc(100vw - 24px)` wide.
- **Exact cause:** `sm` increases launcher size at 640px, but there is no compact-phone rule or safe-area-aware bottom offset.
- **Affected widths:** 360–480px and landscape mobile.
- **Impact:** the launcher can cover CTA or lower mockup content. The open panel leaves only 12px per side at its maximum width.

### 2.13 Hover/tilt work is initialized even where the visual should not exist

- **Component:** hero `useEffect` in `WHome.jsx` and hover styles in `InterviewPreview.css`.
- **Current behavior:** pointer listeners are registered whenever motion is allowed, regardless of width or pointer type.
- **Exact cause:** the effect only checks reduced-motion and element existence.
- **Affected widths:** mobile/touch devices.
- **Impact:** unnecessary event setup and transform logic remain active for a visual that should be hidden on mobile.

### 2.14 Fixed viewport height is not the problem

- **Component:** hero shell.
- **Current behavior:** the hero uses natural content height with padding; it does not use `height: 100vh`.
- **Conclusion:** retain content-driven height. Do not introduce `100vh`, `100dvh`, or a forced `min-height` for the hero.

## 3. Responsive strategy

### Desktop: 1280px and above

- Preserve the existing two-column composition, enlarged marketing type scale, visual, colors, and pointer tilt.
- Preserve current 32–40px shell padding.
- Let CTAs wrap when the available text column cannot hold all three; do not reduce desktop buttons solely to force one row.
- Keep the visual full fidelity and responsive within its grid column.

### Compact desktop: 1024–1279px

- Preserve the two-column layout.
- Keep the current 56px heading scale and full mockup.
- Make both grid children explicitly shrinkable.
- Keep CTA wrapping, but make it deterministic with normal intrinsic widths and no overflow.

### Tablet: 768–1023px

- Use a deliberate one-column layout.
- Scale the heading fluidly from about 50px to 56px; eliminate the 64px jump.
- Keep the mockup, but constrain it to `min(100%, 620px)`, center it, and reduce text-to-visual gap to 40px.
- Keep buttons inline when they fit and allow a clean wrap without fixed desktop padding.

### Mobile: 481–767px

- Use one text column with 20px side padding.
- Render the title as three explicit visual lines.
- Hide the interview mockup entirely.
- Use one equal three-column chip row.
- Stack all CTAs to the same width, capped at 320px.
- Keep natural content height; target a compact hero that ends within or close to the first viewport depending on device height.

### Small mobile: up to 480px

- Use a 34–38px fluid title and 16–17px body size.
- Keep 20px side padding, dropping to 16px at `<= 375px`.
- Retain all three chips in one row with slightly tighter internal padding.
- Use 50–52px CTA height and a maximum width of 320px.
- Use a 52px chatbot launcher with 16px safe-area-aware offsets.

## 4. Exact changes

### Hero container and grid

**Current**

- `workmate-shell relative grid items-center gap-14 pb-16 pt-24 sm:pt-28 lg:grid-cols-[1fr_1.05fr] lg:pb-20 lg:pt-32 xl:gap-16`
- Default shell padding is 24px.
- No explicit `min-width: 0` on the grid children.

**Change**

- Add scoped semantic hooks such as `workmate-hero`, `workmate-hero__shell`, `workmate-hero__content`, and `workmate-hero__visual` in `WHome.jsx`.
- Keep `#home` and current scroll target.
- Use CSS scoped under `.workmate-marketing .workmate-hero` so the global typography used by unrelated landing sections is not changed.
- Set `width: 100%`, `max-width: 1920px`, and `min-width: 0` on the hero shell and both grid children.
- Do not add `body { overflow-x: hidden; }`.

**Suggested values**

```css
.workmate-hero__shell {
  width: min(100%, 1920px);
  min-width: 0;
  margin-inline: auto;
  padding: 92px 20px 40px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}

.workmate-hero__shell > * {
  min-width: 0;
  max-width: 100%;
}

@media (max-width: 375px) {
  .workmate-hero__shell {
    padding: 88px 16px 36px;
  }
}

@media (min-width: 768px) {
  .workmate-hero__shell {
    padding: 112px 24px 64px;
    gap: 40px;
  }
}

@media (min-width: 1024px) {
  .workmate-hero__shell {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    padding: 128px clamp(32px, 2.5vw, 40px) 80px;
    gap: 56px;
  }
}

@media (min-width: 1280px) {
  .workmate-hero__shell { gap: 64px; }
}
```

**Why**

The `minmax(0, ...)` tracks and `min-width: 0` children remove the grid min-content trap. Hero-specific mobile padding meets the requested 20px/16px target without changing unrelated sections that also use `.workmate-shell`.

### H1 and highlighted line

**Current**

- Global size is 64px.
- Mobile override is a fixed 42px through 767px.
- Compact desktop is 56px.
- Large desktop is `clamp(72px, 4.2vw, 80px)`.
- Only `Better Decisions.` uses `whitespace-nowrap`.

**Change**

- Split the three sentences into three `<span>` elements while preserving the exact text and red accent.
- Give each span `display: block` so the three intended lines do not depend on incidental browser wrapping.
- Remove `whitespace-nowrap` completely.
- Keep `overflow: visible`; solve the width instead of clipping text.
- Add `text-wrap: balance` only to the title container if desired, but it is not required once each sentence is a block.
- Use a hero-scoped fluid scale rather than changing `.type-display` globally.

**Suggested values**

| Range | Font size | Line-height | Letter-spacing | Max width |
|---|---|---:|---:|---:|
| `>= 1280px` | existing `clamp(72px, 4.2vw, 80px)` | 1.06 | `-0.035em` | 760px |
| `1024–1279px` | 56px | 1.06 | `-0.035em` | 760px |
| `768–1023px` | `clamp(48px, 6.5vw, 56px)` | 1.06 | `-0.03em` | 680px |
| `481–767px` | `clamp(38px, 7.5vw, 44px)` | 1.06 | `-0.03em` | 100% |
| `<= 480px` | `clamp(34px, 9vw, 38px)` | 1.06 | `-0.028em` | 100% |

- Use `margin-bottom: 24px` on desktop, 20px on tablet, 18px on mobile, and 16px at `<= 375px`.
- Expected small-mobile results: about 34px at 360px, 35px at 390px, and 38px at 430px.

**Why**

This preserves desktop impact, removes the 768px jump, and guarantees the requested three-line narrative without creating a non-shrinkable inline phrase.

### Description

**Current**

- 21px at 1280px+, 18px from 768–1279px, 17px below 768px.
- Line-height is 1.6 and max-width is 640px.

**Change**

- Keep current desktop size.
- Use a fluid mobile value scoped only to the hero lead.
- Add `width: 100%`, `max-width: 640px`, `min-width: 0`, and `overflow-wrap: break-word`.
- Preserve the exact wording; copy editing is outside this responsiveness task.

**Suggested values**

| Range | Font size | Line-height | Max width | Bottom margin |
|---|---:|---:|---:|---:|
| `>= 1280px` | 21px | 1.6 | 640px | 24px |
| `1024–1279px` | 18px | 1.55 | 640px | 24px |
| `768–1023px` | 18px | 1.55 | 620px | 22px |
| `481–767px` | `clamp(16px, 2.4vw, 17px)` | 1.55 | 576px | 20px |
| `<= 480px` | `clamp(15.5px, 4vw, 17px)` | 1.55 | 100% | 20px |
| `<= 375px` | 15.5px | 1.5 | 100% | 18px |

**Why**

The text remains readable but uses fewer vertical pixels. Shrinkability and normal wrapping address the observed clipping directly.

### Feature chips

**Selected option: A — three compact, equal chips in one row.**

The current labels are short and can fit comfortably at 360px once the grid min-content bug is removed. A 2 + 1 layout would add height and create an unnecessarily weak final row; horizontal scrolling is not acceptable.

**Change**

- Add `workmate-hero__benefits` and `workmate-hero__benefit` hooks.
- On mobile, change the row to a three-column grid: `repeat(3, minmax(0, 1fr))`.
- Give every chip the same height and center its contents.
- Keep the existing border, fill, radius, icons, and hover styling.
- Revert to current intrinsic-width flex behavior at 768px+.

**Suggested values**

| Range | Layout | Height | Text | Icon | Inner gap | Horizontal padding | Row gap |
|---|---|---:|---:|---:|---:|---:|---:|
| `>= 768px` | current flex/wrap | auto (~39–42px) | 14px (16px at 1280+) | 15px | 8px | 12px | 10px |
| `481–767px` | 3 equal columns | 42px | 14px | 14px | 6px | 10px | 8px |
| `<= 480px` | 3 equal columns | 42px | 13.5px | 14px | 6px | 8px | 6px |
| `<= 375px` | 3 equal columns | 40px | 13px | 13px | 5px | 7px | 6px |

- Mobile row: `width: 100%; max-width: 360px; margin-bottom: 24px`.
- Every chip: `min-width: 0; white-space: nowrap; justify-content: center`.
- At 360px with 16px side padding, the 328px content width provides about 105px per chip after gaps, which is enough for all three current labels.

### CTA buttons

**Current**

- Shared `lg` size uses 15px text, 32px horizontal padding, and 14px vertical padding.
- At `lg`, the hero forces 40px horizontal and 17px vertical padding.
- Width is always intrinsic.

**Change**

- Add `workmate-hero__actions` and `workmate-hero__action` hooks in the hero only; do not change the shared `Button` sizing for the whole application.
- At `< 768px`, use a vertical flex stack aligned to the left.
- Give all three buttons `width: min(100%, 320px)` so their edges align.
- Keep label text on one line and keep the primary arrow at 16px.
- Do not stretch buttons beyond 320px on larger phones; the restrained width matches the left-aligned copy better than 100%-wide pills across a 430px viewport.
- At 768px+, return to intrinsic width and existing wrap behavior.

**Suggested values**

| Range | Width | Min height | Font | Horizontal padding | Group gap |
|---|---|---:|---:|---:|---:|
| `>= 1280px` | auto | current ~57px | 16px | 40px | 12px |
| `1024–1279px` | auto | 56px | 15px | 40px | 12px |
| `768–1023px` | auto | 52px | 15px | 28px | 10px |
| `481–767px` | `min(100%, 320px)` | 52px | 16px | 20px | 10px |
| `<= 480px` | `min(100%, 320px)` | 50px | 15.5px | 20px | 10px |

- Add `white-space: nowrap; min-width: 0` to each hero action.
- Preserve all variants and click behavior: enquiry scroll, registration navigation, and solution scroll.

**Why**

This makes the mobile hierarchy explicit: primary, secondary, tertiary. It also prevents the arbitrary 2 + 1 state seen at 412–430px.

### Interview mockup / hero visual

**Decision: hide the visual below 768px.**

The mockup is useful proof of product at tablet and desktop sizes, but its current mobile cost (713–820px) is disproportionate. Hiding it preserves the more important heading → description → benefits → CTA hierarchy and does not remove product visuals from the rest of the landing page.

**Implementation**

```css
.workmate-hero__visual {
  display: none;
  min-width: 0;
  max-width: 100%;
}

@media (min-width: 768px) {
  .workmate-hero__visual {
    display: block;
    width: min(100%, 620px);
    justify-self: center;
  }
}

@media (min-width: 1024px) {
  .workmate-hero__visual {
    width: 100%;
    justify-self: stretch;
  }
}
```

- Do not use `transform: scale(...)` to make the whole mockup fit.
- Retain `.interview-preview { width: 100%; min-width: 0; }` and existing internal responsive CSS for tablet/desktop.
- Keep the source in the DOM but `display: none` on mobile. If performance profiling later shows the image decode is material, a follow-up can conditionally render with `matchMedia`; that is not required for the first implementation.
- Update the GSAP effect to return early unless `(min-width: 1024px) and (hover: hover) and (pointer: fine)` matches. Keep reduced-motion handling.
- Disable hover scale on coarse pointers in `InterviewPreview.css` by wrapping hover-only rules in `@media (hover: hover) and (pointer: fine)`.

### Navbar

**Current**

- Mobile unscrolled/scrolled height: 76px / 62px.
- Logo: 36px; brand: 16px.
- Hamburger bars: 20px wide, but the button has no explicit touch target.
- Mobile dropdown uses 24px horizontal padding.

**Change**

- Add a `workmate-nav__shell` hook while retaining `workmate-shell`.
- Use hero-aligned 20px padding, falling to 16px at `<= 375px`.
- Give the hamburger a 44×44px centered button with a 22px visual icon.
- Preserve desktop navigation and existing mobile menu behavior.
- Keep the existing tablet state (auth buttons plus hamburger) but use tablet height values and verify it at 768 and 1024.

**Suggested values**

| Range | Unscrolled / scrolled height | Logo | Brand | Horizontal padding | Menu target |
|---|---:|---:|---:|---:|---:|
| `>= 1024px` | existing 80px / 66px | 44px | existing marketing 18px at 1280+ | 32–40px | n/a |
| `768–1023px` | 72px / 64px | 38px | 16px | 24px | 44px |
| `481–767px` | 68px / 60px | 34px | 15px | 20px | 44px |
| `<= 375px` | 64px / 58px | 32px | 15px | 16px | 44px |

- Dropdown horizontal padding must match the header: 20px, then 16px at `<= 375px`.
- Add `aria-expanded` and `aria-controls` to the hamburger while implementing; this does not alter design and keeps the responsive menu state accessible.

### Chatbot / floating control

**Current**

- Launcher: 56px at base, 64px at `sm`.
- Offset: 20px at base, 28px at `sm`.
- Open panel width: `min(380px, calc(100vw - 24px))`.

**Change**

- Add named classes for the fixed wrapper, launcher, and panel rather than extending the already long utility strings.
- At `<= 480px`, reduce the launcher to 52px, use a 38px avatar, and use 16px offsets.
- Make the bottom offset safe-area aware.
- Give the open panel at least 16px side clearance.
- Keep the launcher at 64px on tablet/desktop.

**Suggested mobile rules**

```css
.nexa-launcher-wrap {
  right: 16px;
  bottom: max(16px, env(safe-area-inset-bottom));
}

.nexa-launcher {
  width: 52px;
  height: 52px;
}

.nexa-panel {
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100dvh - 120px);
}
```

- Keep `z-index: 45`, below the navbar's `z-index: 50`.
- After the visual is hidden, verify the launcher does not cover any of the three CTAs at 360×800, 375×812, 390×844, 412×915, or 430×932.

### Spacing map

| Relationship | Desktop `>=1280` | Compact desktop `1024–1279` | Tablet `768–1023` | Mobile `481–767` | Small `<=480` |
|---|---:|---:|---:|---:|---:|
| Header bottom → title | ~48px | ~48px | 40px | 24px | 24px |
| Title → description | 24px | 24px | 20px | 18px | 16–18px |
| Description → chips | 24px | 24px | 22px | 20px | 18–20px |
| Chips → CTA group | 32px | 32px | 28px | 24px | 22px |
| CTA → CTA | 12px/wrap | 12px/wrap | 10px/wrap | 10px vertical | 10px vertical |
| Text → visual | 64px horizontal | 56px horizontal | 40px vertical | hidden | hidden |
| Hero bottom padding | 80px | 80px | 64px | 40px | 36–40px |

The following `QuoteStrip` has its own 16px base top padding. With a 36–40px hero bottom, the visual handoff remains separated by 52–56px without the current mockup creating a multi-screen gap.

### Overflow prevention

**Root-cause changes**

1. Remove `whitespace-nowrap` from `Better Decisions.`.
2. Use block title-line spans.
3. Set the hero grid columns to `minmax(0, ...)`.
4. Set `min-width: 0; max-width: 100%` on the hero content, visual wrapper, title, description, chips, CTA group, and grid children.
5. Use `width: min(100%, 320px)` for mobile buttons rather than fixed pixel widths.
6. Use a three-column `minmax(0, 1fr)` chip grid.
7. Keep all remaining media at `max-width: 100%; height: auto` where applicable.

**What not to do**

- Do not add global `body { overflow-x: hidden; }`.
- Do not use a whole-hero `transform: scale(...)`.
- Do not use `width: 100vw` inside the padded hero.
- Do not add negative margins or horizontal translations to compensate for width.
- Do not remove the hero section's decorative overflow clipping until the background glows are separately contained. After root causes are fixed, `overflow: hidden` may remain on `#home` only for those glows.

## 5. Breakpoint map

| Element | Desktop `>=1280` | Compact desktop `1024–1279` | Tablet `768–1023` | Mobile `481–767` | Small mobile `<=480` |
|---|---|---|---|---|---|
| Layout | 2 columns `1fr / 1.05fr` | 2 columns `1fr / 1.05fr` | 1 column | 1 text column | 1 text column |
| H1 | `clamp(72px,4.2vw,80px)` | 56px | `clamp(48px,6.5vw,56px)` | `clamp(38px,7.5vw,44px)` | `clamp(34px,9vw,38px)` |
| H1 line-height | 1.06 | 1.06 | 1.06 | 1.06 | 1.06 |
| H1 wrapping | 3 authored lines | 3 authored lines | 3 authored lines | 3 authored lines | 3 authored lines |
| Body | 21px / 1.6 | 18px / 1.55 | 18px / 1.55 | 16–17px / 1.55 | 15.5–17px / 1.5–1.55 |
| Hero side padding | 32–40px | 32–40px | 24px | 20px | 20px; 16px at `<=375` |
| Chips | intrinsic flex | intrinsic flex | intrinsic flex | 3 equal columns | 3 equal compact columns |
| Chip height | current | current | current | 42px | 40–42px |
| Button width | auto | auto | auto | `min(100%,320px)` | `min(100%,320px)` |
| Button height | ~57px | 56px | 52px | 52px | 50px |
| CTA layout | wrap as needed | wrap as needed | row/wrap | vertical stack | vertical stack |
| Visual | show full | show full | show, max 620px | hide | hide |
| Header | existing desktop | existing desktop | 72/64px | 68/60px | 64–68/58–60px |
| Chatbot | 64px / 28px offset | 64px / 28px | 64px / 28px | 56px / 20px | 52px / 16px safe-area offset |

## 6. Files that will be modified

### `client/src/pages/workmate/WHome.jsx`

- Add hero-scoped class hooks.
- Restructure the `h1` into three semantic line spans.
- Remove `whitespace-nowrap`.
- Add benefit, CTA, content, and visual hooks.
- Gate GSAP tilt setup to desktop fine-pointer devices.
- Do not change labels, colors, routing, other landing sections, or hero wording.

### `client/src/index.css`

- Add one grouped, mobile-first, hero/header responsive section using the existing 768, 1024, and 1280 breakpoints plus `<= 480` and `<= 375` refinements.
- Add scoped fluid type, spacing, chip-grid, CTA, grid-shrink, and visual visibility rules.
- Do not change `.type-display`, `.type-lead`, or `.workmate-shell` globally unless a later regression test proves a shared-token fix is safe.

### `client/src/pages/workmate/WorkmateLayout.jsx`

- Add header shell/menu hooks.
- Apply responsive heights, aligned padding, logo/brand sizing, and a 44px hamburger target.
- Add hamburger state ARIA attributes.
- Keep desktop navigation behavior unchanged.

### `client/src/components/NexaChatbot.jsx`

- Add wrapper/panel/launcher hooks.
- Apply the compact-phone launcher and safe-area offsets.
- Reduce the open panel's maximum mobile width to preserve 16px side clearance.

### `client/src/pages/workmate/InterviewPreview.css`

- Wrap hover-only scale/glow behavior in a fine-pointer media query.
- No internal mobile redesign is needed because the entire visual will be hidden below 768px.

### Files explicitly not to modify

- `client/src/pages/Home.jsx`
- `client/src/components/HeroMockup.jsx`
- `client/src/components/Navbar.jsx`
- Unrelated landing-page sections and dashboard/application styles

These files are either not used by the live route or outside the requested hero scope.

## 7. Implementation order

1. Add hero-scoped class hooks and three title-line spans in `WHome.jsx` without changing behavior yet.
2. Fix shrinkability first: remove `nowrap`, use `minmax(0, ...)`, and apply `min-width: 0`/`max-width: 100%` to the hero subtree.
3. Add the hero-scoped fluid title and description scale. Verify there is no 767→768 or 1023→1024 size reversal.
4. Implement 20px/16px hero padding and the responsive vertical-spacing map.
5. Implement the one-row mobile chip grid and test at 360px before proceeding.
6. Implement the aligned mobile CTA stack and verify every label remains on one line.
7. Hide the visual below 768px; constrain and center it at 768–1023px.
8. Gate pointer tilt/hover behavior to fine-pointer desktop devices.
9. Compact the navbar and add the 44px menu target, then verify the 768–1023 auth-actions-plus-menu state.
10. Compact the chatbot launcher/panel and apply safe-area offsets.
11. Run build and lint checks.
12. Run the viewport matrix and continuous resize pass. Only after every width passes should the task be considered complete.

## 8. Verification checklist

### Automated measurements at every viewport

For each viewport, collect and assert:

- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
- `h1.getBoundingClientRect().right <= clientWidth`
- description, chip row, every chip, every button, header, and visible visual have `left >= 0` and `right <= clientWidth`
- no hero child has a computed fixed/min width larger than its parent
- title font size and line count match the breakpoint map
- button text has one rendered line
- visual computed display matches the breakpoint map
- closed chatbot launcher does not intersect any CTA rectangle

### 1440 × 900

- Two-column hero and full mockup remain visually unchanged.
- Title remains 72–80px and all three authored lines are visible.
- Description, chips, and wrapped CTAs stay within the left grid column.
- Chatbot remains 64px with desktop offset.
- No horizontal scroll.

### 1280 × 800

- Two-column layout remains stable at the `xl` boundary.
- Existing desktop title hierarchy and visual are preserved.
- A 2 + 1 CTA wrap is acceptable if the third button does not overflow and spacing is even.
- Hero-to-quote spacing remains intentional.

### 1024 × 768

- Two-column layout begins cleanly at `lg`.
- Title is 56px, not larger than at the immediately narrower tablet width.
- Mockup's sidebar and score content remain legible within its column.
- CTA wrapping does not collide with the visual.
- Header navigation/auth layout fits.

### 768 × 1024

- One-column tablet layout is retained.
- Title is approximately 50px, not the current 64px jump.
- All three title lines are clean.
- Mockup is shown, centered, and no wider than 620px.
- Text-to-visual gap is 40px, not 56px.
- Header auth actions and hamburger fit together.

### 430 × 932

- Visual is hidden.
- Title is no larger than 38px and has exactly three intentional lines.
- Description remains inside the 20px gutters.
- Three chips occupy one equal row without clipping.
- Three CTAs form an aligned stack, no wider than 320px.
- Chatbot does not cover the CTA stack.

### 412 × 915

- Same mobile composition as 430px.
- Description line count remains reasonable and no phrase is clipped.
- The former `<= 420px` mockup height increase is irrelevant because the visual is hidden.
- No horizontal scroll or concealed content.

### 390 × 844

- The highlighted phrase no longer establishes a 332px minimum grid width.
- Title, paragraph, chips, and buttons stay within the content box.
- All chip labels remain one line.
- Chatbot maintains at least 16px edge clearance and does not cover Explore WorkmateIQ.

### 375 × 812

- 16px side padding activates.
- Title remains around 34px and fully visible.
- Equal chip columns remain readable at 13px+.
- Button width resolves to the available width or 320px, whichever is smaller.
- No horizontal scroll at 100% zoom and 200% text zoom spot-check.

### 360 × 800

- 16px side padding leaves approximately 328px of content width before scrollbar effects.
- Every hero child shrinks to that content width.
- Chips remain one row; buttons remain one-line labels.
- The compact hero's final CTA is visible without traversing an 800px mockup.
- Chatbot does not obstruct CTAs.

### Continuous resize and interaction pass

- Drag continuously from 1440px down to 320px and back up.
- Watch specifically at 1280, 1024, 768, 640, 480, 420, 390, and 375px for jumps or one-frame overflow.
- Test at browser zoom 100%, 125%, and 200% text zoom.
- Open and close the mobile menu at 360, 430, 768, and 1024px.
- Scroll enough to switch the header between unscrolled and scrolled heights and confirm the hero remains correctly offset.
- Open/close Nexa at 360×800 and 430×932; confirm the panel stays within 16px gutters and within `100dvh`.
- Test `prefers-reduced-motion: reduce` and a coarse-pointer/mobile emulation to ensure no hidden visual tilt work runs.
- Run `npm run build` and `npm run lint`; distinguish pre-existing lint failures from regressions introduced by the hero work.

## Acceptance criteria

Implementation is complete only when:

- There is no horizontal document scroll and no content is merely hidden by the hero's overflow clipping.
- The title has three clean, fully visible lines at all tested widths.
- The 768px type jump is gone.
- Mobile chips use one stable, scroll-free row.
- Mobile CTAs share a deliberate width and stack order.
- The interview preview is hidden below 768px, constrained on tablet, and unchanged on desktop.
- Header and chatbot controls fit and retain accessible touch targets.
- The hero remains content-driven and does not use fixed viewport height or whole-section scaling.
- Desktop visual design and all unrelated sections remain unchanged.

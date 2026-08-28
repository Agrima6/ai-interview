# 1. List of all the changes

1. Remove the two-line hamburger trigger from the WorkmateIQ landing header at every viewport below the existing desktop breakpoint.
2. Remove the expandable tablet/mobile dropdown and its duplicate Home, About, Who It Works For, Solution, Contact, Demo Login, and Login controls.
3. Keep the existing desktop navigation unchanged at `lg` (`1024px`) and above: branding on the left, the five regular navigation links in the middle, and the two authentication controls on the right.
4. Keep the existing `hidden lg:flex` rule on the regular navigation list so Home, About, Who It Works For, Solution, and Contact remain unavailable in the tablet/mobile header.
5. Change the primary authentication group from `hidden md:flex` to an always-rendered flex group. Below `lg`, this group will be the only content on the right side of the header.
6. Preserve the existing destinations: Demo Login continues to call `navigate('/login')`, while Login continues to call `goToPlatformLogin()` and navigates to `/platform/login`.
7. Preserve the existing visual hierarchy of the authentication controls: Demo Login remains the secondary `ghost` button and Login remains the red `primary` pill with its current hover, shadow, and press treatment.
8. Keep tablet widths (`768px` through `1023px`) as a single row containing the logo/brand at the left and Demo Login/Login at the right. Remove the hamburger without retaining a spacer for it.
9. Keep mobile widths below `768px` as the same two-sided, single-row layout. Do not stack, hide, iconize, or move either authentication control into another menu.
10. Add stable, header-specific class hooks for the identity group and authentication group/buttons so mobile fit can be adjusted without changing the shared `Button` component or other buttons across the application.
11. Make both identity and authentication groups non-wrapping and prevent the logo or buttons from being squeezed. Demo Login and Login must each stay on one line.
12. Compact only the tablet/mobile header dimensions that need it: horizontal gutters, identity gap, logo size, brand font size, authentication gap, button font size, button horizontal padding, and button minimum height.
13. Use the existing breakpoint convention rather than adding a new behavioral breakpoint: `lg`/`1024px` continues to separate full desktop navigation from the simplified tablet/mobile header, and `md`/`768px` continues to separate tablet sizing from mobile sizing.
14. Use one narrow-phone refinement at the already relevant `375px` boundary so the one-row layout remains comfortable at 375px and 360px without changing the behavioral model.
15. Preserve the fixed positioning, `z-50`, background blur, border, shadow, and transition behavior of the outer header.
16. Preserve the current scroll-state behavior. The header remains 80px high when unscrolled and 66px when scrolled on desktop, 72px/64px on tablet, 68px/60px on regular mobile, and 64px/58px on narrow mobile unless visual testing proves a one- or two-pixel fit correction is necessary.
17. Keep the `scrolled` state and scroll listener because they still control header background treatment and compact height at all sizes.
18. Keep the `active` state, `IntersectionObserver`, `NAV_LINKS`, and smooth-scroll `jump` function because desktop navigation still uses them.
19. Remove only the now-unused `open` state and `setOpen` calls. In particular, remove `setOpen(false)` from `jump`; do not remove `useState` because `active` and `scrolled` still require it.
20. Remove the obsolete hamburger click handler, `aria-label="Menu"`, `aria-expanded`, `aria-controls`, `workmate-mobile-menu` id, conditional `{open && (...)}` render, and all dropdown-only keyboard/menu behavior that disappears with that JSX.
21. Delete the unused `.workmate-nav__menu-button`, `.workmate-nav__menu-button > span`, and `.workmate-nav__mobile-menu` CSS rules, including the 375px and 480px menu-padding overrides.
22. Do not change the logo asset, WorkmateIQ wording, brand colors, button wording, desktop link hover/active treatment, footer branding, hero content, chatbot, or any unrelated landing/application UI.
23. Verify that no horizontal scrollbar, clipping, button wrapping, or identity compression occurs at 430px, 412px, 390px, 375px, or 360px, in both unscrolled and scrolled states.
24. Verify the final header at 1440×900, 1280×800, 1024×768, 900×800, 768×1024, 430×932, 412×915, 390×844, 375×812, and 360×800, then continuously resize across 768px and 1024px to catch breakpoint jumps.

# 2. How to implement these changes

## `client/src/pages/workmate/WorkmateLayout.jsx`

### Current behavior

`WHome.jsx` renders the landing page inside `WorkmateLayout`, and `WorkmateLayout` renders the local `WorkmateNav` above the page content. This is the navbar used by `/`, `/welcome`, and the Workmate hero experiment routes; it is separate from `client/src/components/Navbar.jsx`, which is used by authenticated/dashboard pages.

Inside `WorkmateNav`:

- `NAV_LINKS` defines Home, About, Who It Works For, Solution, and Contact.
- `active` plus an `IntersectionObserver` highlights the corresponding desktop link.
- `scrolled` becomes true after `window.scrollY > 24` and changes the fixed header background and height.
- The regular link group is `hidden lg:flex`, so it appears from Tailwind's standard `lg` boundary (`1024px`) upward.
- The main auth group is `hidden md:flex`, so Demo Login and Login are visible from `md` (`768px`) upward.
- The two-line button is `lg:hidden`, so it appears at every width below `1024px`. Consequently, tablet currently shows both auth buttons and the hamburger, while mobile below `768px` hides the main auth group and shows only the hamburger.
- `open` is toggled by the hamburger. When true, the conditional `workmate-nav__mobile-menu` duplicates all five links and both auth controls below the header.
- The main shell already uses `flex items-center justify-between`, which is the correct architecture for a two-sided tablet/mobile layout once the menu button is removed and the auth group is made visible.

### Change required

Remove the menu trigger and dropdown implementation, expose the existing main authentication group below `md`, and add only the class hooks needed for localized responsive sizing. Desktop rendering and navigation behavior must not change.

### How to implement

1. Delete only this state declaration:

   ```jsx
   const [open, setOpen] = useState(false)
   ```

   Keep the `useState` import because `active` and `scrolled` still use it.

2. Remove `setOpen(false)` from `jump`. The function should still prevent the anchor default and smooth-scroll to the requested section for the desktop links and brand link:

   ```jsx
   const jump = (id) => (event) => {
       event.preventDefault()
       document.getElementById(id)?.scrollIntoView({
           behavior: 'smooth',
           block: 'start',
       })
   }
   ```

3. Add a local identity hook to the existing brand anchor and keep its shrink protection. Reducing the mobile gap through CSS is preferable to changing desktop utility classes:

   ```jsx
   <a
       href='#home'
       onClick={jump('home')}
       className='workmate-nav__identity flex items-center gap-2.5 shrink-0 group'
   >
   ```

4. Keep the desktop navigation block exactly as `hidden lg:flex items-center gap-1`. Do not render a second copy below `lg`.

5. Replace the auth wrapper's `hidden md:flex` with an always-present, non-shrinking flex group. Add `ml-auto` so it consumes the right edge cleanly when the desktop links are hidden:

   ```jsx
   <div className='workmate-nav__auth flex items-center gap-3 ml-auto shrink-0'>
       <Button
           variant='ghost'
           size='sm'
           className='workmate-nav__auth-button workmate-nav__auth-button--demo lg:!px-5 lg:!py-2.5'
           onClick={() => navigate('/login')}
       >
           Demo Login
       </Button>
       <Button
           variant='primary'
           size='sm'
           className='workmate-nav__auth-button workmate-nav__auth-button--login lg:!px-5 lg:!py-2.5'
           onClick={goToPlatformLogin}
       >
           Login
       </Button>
   </div>
   ```

   The `lg:` overrides preserve the existing desktop button padding. Do not modify the `ghost` or `primary` variants.

6. Delete the entire `workmate-nav__menu-button` button, including both line spans, the toggle handler, and its three menu ARIA attributes.

7. Delete the entire `{open && (...)}` block after the shell. This removes the duplicate links, duplicate auth buttons, `workmate-mobile-menu` id, and dropdown container in one operation.

8. Leave the shell's fixed-header classes, `scrolled` conditional classes, brand image and text, desktop link mapping, auth destinations, and hover/focus styles intact. At desktop there will still be three flex children; below desktop there will be only identity and auth, with `justify-between` and `ml-auto` providing the intended two-side alignment.

## `client/src/index.css`

### Current behavior

The shared `.workmate-shell` is full-width with 24px gutters, changing to `clamp(32px, 2.5vw, 40px)` at 1024px. The landing-header block later in the file overrides it more specifically:

- Base/mobile: 68px shell, 60px scrolled shell, 20px gutters, 34px logo, 15px brand.
- `max-width: 375px`: 64px shell, 58px scrolled shell, 16px gutters, 32px logo.
- `min-width: 768px`: 72px shell, 64px scrolled shell, 24px gutters, 38px logo, 16px brand.
- `min-width: 1024px`: 80px shell, 66px scrolled shell, 32–40px gutters, 44px logo.
- `min-width: 1280px`: the marketing typography rules raise `.type-brand` to 18px and `.type-button-sm` to 15px.

The same header block currently contains all custom sizing for `.workmate-nav__menu-button` and `.workmate-nav__mobile-menu`. The shared `Button` component supplies `type-button-sm px-4 py-2`; therefore its current small buttons start at 13.5px text with 16px horizontal padding, while desktop receives the existing `lg:!px-5 lg:!py-2.5` JSX overrides.

### Change required

Remove orphaned menu CSS and add header-scoped tablet/mobile fit rules. Do not alter global `.type-brand`, `.type-button-sm`, `.workmate-shell`, or the shared button variants, because doing so would affect unrelated UI.

### How to implement

1. Delete these complete rules:

   - `.workmate-marketing .workmate-nav__menu-button`
   - `.workmate-marketing .workmate-nav__menu-button > span`
   - `.workmate-marketing .workmate-nav__mobile-menu`
   - the `.workmate-nav__mobile-menu` declaration inside `@media (max-width: 375px)`
   - the entire `@media (max-width: 480px)` block if its menu-padding rule is its only declaration

2. Add wrapping and flex safeguards only below desktop:

   ```css
   @media (max-width: 1023px) {
     .workmate-marketing .workmate-nav__identity,
     .workmate-marketing .workmate-nav__auth {
       white-space: nowrap;
     }

     .workmate-marketing .workmate-nav__identity,
     .workmate-marketing .workmate-nav__auth,
     .workmate-marketing .workmate-nav__auth-button {
       flex-shrink: 0;
     }
   }
   ```

   This leaves the 1024px-and-up desktop geometry untouched.

3. For mobile below 768px, use the available width more efficiently while keeping the existing one-row structure:

   ```css
   @media (max-width: 767px) {
     .workmate-marketing .workmate-nav__shell {
       padding-inline: 12px;
     }

     .workmate-marketing .workmate-nav__identity {
       gap: 8px;
     }

     .workmate-marketing .workmate-nav__logo {
       width: 30px;
       height: 30px;
     }

     .workmate-marketing .workmate-nav__brand {
       font-size: 14px;
     }

     .workmate-marketing .workmate-nav__auth {
       gap: 6px;
       margin-left: 8px;
     }

     .workmate-marketing .workmate-nav__auth-button {
       min-height: 36px;
       padding: 8px 12px;
       font-size: 13px;
       line-height: 1.2;
       white-space: nowrap;
     }

     .workmate-marketing .workmate-nav__auth-button--demo {
       padding-inline: 8px;
     }
   }
   ```

   These values are localized overrides of the actual 34px/15px identity and `px-4`/13.5px small-button defaults. They preserve readable text while reclaiming enough width for 430px, 412px, and 390px viewports.

4. Refine the existing `max-width: 375px` rule for 375px and 360px. Keep its current 64px/58px shell heights, but use the following compact identity and controls:

   ```css
   @media (max-width: 375px) {
     .workmate-marketing .workmate-nav__shell {
       height: 64px;
       padding-inline: 12px;
     }

     .workmate-marketing .workmate-nav__shell--scrolled {
       height: 58px;
     }

     .workmate-marketing .workmate-nav__identity {
       gap: 6px;
     }

     .workmate-marketing .workmate-nav__logo {
       width: 28px;
       height: 28px;
     }

     .workmate-marketing .workmate-nav__brand {
       font-size: 13px;
     }

     .workmate-marketing .workmate-nav__auth {
       gap: 6px;
       margin-left: 8px;
     }

     .workmate-marketing .workmate-nav__auth-button {
       min-height: 36px;
       padding-inline: 10px;
       font-size: 12.5px;
     }

     .workmate-marketing .workmate-nav__auth-button--demo {
       padding-inline: 6px;
     }
   }
   ```

   At 360px, 12px outer gutters leave 336px of content width. The 28px logo, 6px identity gap, 13px brand label, 8px group separation, compact Demo Login, compact Login, and 6px auth gap fit within that width without wrapping. Confirm the actual rendered font metrics in the browser rather than relying only on this estimate.

5. Keep the existing `min-width: 768px` rules as the tablet sizing strategy: 24px gutters, 38px logo, 16px brand, 72px unscrolled height, and 64px scrolled height. The existing `gap-3` auth group and `size='sm'` buttons are already compact enough for 768–1023px once the 44px hamburger is removed.

6. Keep the existing `min-width: 1024px` and `min-width: 1280px` rules unchanged. They preserve the approved desktop logo, gutters, button sizing, navigation, and scroll compaction.

7. Update the nearby header comment so it describes branding/auth fit and no longer refers to hamburger touch targets or mobile-menu gutters.

## `client/src/components/Button.jsx`

### Current behavior

`Button` renders a `motion.button`, combines shared base, size, variant, and caller-provided classes, and applies a press scale. `size='sm'` provides `type-button-sm px-4 py-2`; `ghost` provides the secondary Demo Login appearance and `primary` provides the red Login pill.

### Change required

No source change is required in this file.

### How to implement

Continue using `size='sm'`, `variant='ghost'`, and `variant='primary'` from `WorkmateLayout.jsx`. Apply the mobile-only fit through the new header-specific classes in `index.css`. This avoids changing every small button in the product and preserves both controls' semantics, focusability, motion, disabled behavior, and visual identity.

## `client/src/pages/workmate/WHome.jsx` and `client/src/App.jsx`

### Current behavior

`WHome.jsx` wraps the landing content in `WorkmateLayout`. `App.jsx` maps both `/` and `/welcome` to `WHome`, maps the Workmate hero experiment routes through the same layout, maps Demo Login to `/login`, and maps the platform Login destination to `/platform/login`.

### Change required

No source change is required in either file.

### How to implement

Use these files only as routing and ownership verification. Do not modify landing content or routes as part of the navbar change. During testing, click both auth controls at desktop, tablet, and mobile sizes and confirm that their existing destinations still resolve.

## Verification procedure

### Desktop: 1440×900, 1280×800, and 1024×768

1. Confirm the 1024px `lg` boundary still displays WorkmateIQ branding, all five navigation links, Demo Login, and Login.
2. Confirm there is no hamburger and no geometry, typography, color, hover, focus, active-link, or spacing regression compared with the current desktop header.
3. Click every desktop section link and confirm smooth scrolling and active-section highlighting still work.
4. Click Demo Login and Login and confirm `/login` and `/platform/login` respectively.
5. Scroll past 24px and back to the top. Confirm the fixed header keeps its current blur/border/shadow transition and changes between 80px and 66px without shifting or wrapping controls.

### Tablet: 900×800 and 768×1024

1. Confirm only the identity group and the two auth controls appear in the header.
2. Confirm Home, About, Who It Works For, Solution, and Contact do not appear, and no hidden dropdown can be opened.
3. Confirm the two-line hamburger is completely absent and no empty 44px slot remains.
4. Confirm branding is left-aligned, auth is right-aligned, and both buttons remain horizontal.
5. Confirm the 24px gutters, 38px logo, 16px brand, and current small buttons fit without overflow.
6. Test top-of-page and scrolled states and confirm the 72px/64px heights remain stable.

### Mobile: 430×932, 412×915, 390×844, 375×812, and 360×800

1. Confirm the same two-sided row at every size: logo plus WorkmateIQ on the left, Demo Login plus Login on the right.
2. Confirm the hamburger and dropdown are absent and the five regular navigation links are not accessible from the header.
3. Confirm WorkmateIQ is not clipped, both auth labels remain on one line, the logo stays circular, and neither group is squeezed.
4. Confirm no element crosses the viewport edge and `document.documentElement.scrollWidth` does not exceed `document.documentElement.clientWidth`.
5. Confirm Demo Login remains visually secondary and Login retains its red pill, hover/focus treatment, and sensible mobile proportions.
6. Confirm both buttons remain usable and navigate to their unchanged destinations.
7. Repeat after scrolling past 24px: regular mobile must transition from 68px to 60px, while 375px/360px must transition from 64px to 58px without vertical misalignment.

### Continuous resizing and cleanup checks

1. Drag continuously from 360px through 1440px, paying particular attention just below/above 375px, 768px, and 1024px. No intermediate width should wrap, overflow, flicker, or briefly expose the regular links/hamburger/dropdown.
2. At 1023px, confirm the simplified branding/auth layout; at 1024px, confirm the full existing desktop layout.
3. Search for `open`, `setOpen`, `workmate-nav__menu-button`, `workmate-nav__mobile-menu`, and `workmate-mobile-menu` after implementation. None should remain in the landing navbar or its CSS.
4. Confirm `active`, `scrolled`, `NAV_LINKS`, `jump`, the section observer, and the scroll listener remain because desktop and scroll behavior still depend on them.
5. Run the existing lint/build checks after the eventual implementation. Inspect the diff and confirm it changes only `client/src/pages/workmate/WorkmateLayout.jsx` and `client/src/index.css`; do not include this plan file in a commit unless explicitly requested later.

# Landing page redesign

The public front page (`/`, `/welcome`) and the public pricing page (`/plans`), built from the design export
**"WorkmateIQ Redesign"** (Landing page + Pricing).

| File | What it is |
|---|---|
| `LandingPage.jsx` | The front page. Markup is a direct translation of the design; the data blocks at the top drive the product tour, step cards, audience accordion and enquiry form. |
| `PricingPage.jsx` | The public pricing page (credit packs, comparison table, FAQ). Buying a pack still happens on the signed-in `/pricing` page. |
| `LandingMocks.jsx` | "Candidate report" and "Shortlist & rank" screens, drawn in code (see below). |
| `landing.css`, `pricing.css` | Design CSS, scoped to `.wiq-landing` / `.wiq-pricing`; keyframes are prefixed `wl-` / `wp-` so nothing leaks into the app. |
| `landing-fonts.css` | Plus Jakarta Sans (variable, self-hosted from `assets/landing/fonts`). |
| `landingAssets.js` | Every image/video in one place - swap a photo here without touching the layout. |

## Behaviour that is wired to the real app
* "Submit enquiry" posts to the existing enquiry API (`submitPlatformEnquiry`) with `type` = `ORGANIZATION` / `COLLEGE` / `CANDIDATE`.
* Contact e-mail comes from `VITE_SUPPORT_EMAIL` (default `support@workmateiq.com`).
* Log in / Join now / Register go to `/login` and `/register`; paid packs go to the existing `/pricing` purchase flow.
* The previous front page is still available at `/welcome-classic`.

## Where this differs from the design export
The export did not contain 16 images the design references (product screenshots, step photos, audience photos). What was done:

| Slot | Used instead |
|---|---|
| Tour: Hiring dashboard | Cropped from the exported PDF render (`screen-dashboard.webp`) |
| Tour: Candidate report, Shortlist & rank | Drawn in code (`LandingMocks.jsx`) |
| Tour: Candidate app | The phone screen from the hero (`app-phone.webp`) |
| Step 3 photo | Cropped from the PDF render (`step-hiring-manager.webp`); it already carries its own evaluation card, so no live overlay is drawn on it |
| Shortlist avatars | Cropped from the dashboard render |
| Audience cards (3) | The recruiter / campus / student photos already used in the "About" section |

Replace any of these by dropping the original file into `src/assets/landing/` and updating `landingAssets.js`.
Also: the design shipped two FAQ answers as `[bracketed placeholders]`; the pricing page words them neutrally ("send us an
enquiry and the team will confirm") until the product team writes the real credit-usage and expiry policy.
The design also hides the whole nav under 980px; a small menu button was added so Log in and Pricing are reachable on phones.

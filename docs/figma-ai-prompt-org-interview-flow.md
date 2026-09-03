# WorkmateIQ — HR/Organization Interview Flow — Figma AI Prompt

Copy everything in the fenced block below into Figma AI (First Draft) as one prompt. Context above the block explains the thinking — not part of the prompt itself.

---

## Why this scope

WorkmateIQ for organizations is **not a job board**. There is no job posting, no public candidate marketplace, no "apply" flow. An HR user already has a list of candidates (sourced from a college drive, referrals, another ATS, wherever) and comes to WorkmateIQ to do exactly one thing well: **run AI-assisted interviews on that list and walk away with a hiring decision.** Every screen below exists to serve that one loop:

```
Define the interview → Import candidates (CSV) → Invite them → Watch them move
through the funnel → Read the AI report → Decide (shortlist/reject) → Repeat for next round
```

Nothing in the prompt below asks for a jobs marketplace, a careers page, or public candidate browsing — deliberately.

---

## The prompt

```
Design a complete web application UI for "WorkmateIQ" — an AI-powered interview
platform for HR teams. This is NOT a job board and NOT a job-posting product
(not Naukri, not Internshala, not LinkedIn Jobs). There is no job listing, no
public candidate marketplace, no "apply now" flow. HR already has a list of
candidates from elsewhere (a campus drive, referrals, another ATS) — this
product exists purely to run AI-assisted interviews on that list, from sending
the invite to reading the evaluation to making the hire/reject call.

═══════════════════════════════════════
VISUAL SYSTEM — apply identically on every screen
═══════════════════════════════════════

Brand color (primary, use sparingly and only for primary actions, active
states, focus rings, key data highlights): #C4161F — a deep confident maroon-red,
NOT bright red, NOT orange. Never introduce blue as a primary or accent color.

Neutrals (light theme only, no dark mode):
- Ink / primary text: #1A1215 (warm near-black, not pure #000)
- Secondary text: #6B6570 (warm grey with a faint red bias, not flat grey)
- Page background: #F7F5F5 (warm off-white)
- Card / surface background: #FFFFFF
- Border / hairline: #EAE3E3

Semantic colors (status only — never used as the brand accent):
- Success / Shortlisted / Completed: #1A7A3D on #EEFAF1 background
- Warning / In Progress / Pending: #B45309 on #FDF1E0 background
- Danger / Rejected / Flagged: #B91C1C on #FDEAEA background
- Info / Scheduled / Invited: #1D4ED8 on #EAF0FE background (the ONLY
  permitted use of blue — status-only, never structural)
- Neutral / Not Started: #6B6570 on #F1EEEE background

Typography: a confident geometric-humanist display face for headings
(headings should feel modern SaaS, not corporate-serif, not generic-AI-safe),
paired with a clean, highly legible grotesk for body text and data-dense UI.
Two weights of numeric/tabular figures for anywhere digits line up in a
column (scores, counts, percentages) — always use tabular figures in tables
and stat tiles.

Shape language: rounded corners (12–16px on cards, 10px on inputs/buttons),
soft single-layer shadows (no heavy drop shadows), generous internal padding,
1px hairline borders in preference to shadows for card separation.

Explicitly avoid: purple-to-blue gradients, warm-cream-with-serif "AI generic"
look, emoji as section markers, centered-everything layouts, glassmorphism,
neon/dark hero sections. This should read as a clean, confident, slightly
serious enterprise SaaS tool — the kind an HR director trusts with a hiring
decision, not a consumer app.

Data visualization: every chart, funnel, and score visual uses the accent
maroon as the single highlight color against neutral grey for everything
else — never a rainbow palette. Funnels are horizontal bar-style, not 3D.
Score displays use a radial/gauge treatment for the single "overall AI
score" and small bar charts for per-skill breakdowns.

═══════════════════════════════════════
GLOBAL LAYOUT
═══════════════════════════════════════

This product is white-labeled per organization. The sidebar header shows the
ORGANIZATION's own logo and name (e.g. "Acme Corp") — NOT "WorkmateIQ." A
candidate or a client-side HR user should feel like they're inside Acme
Corp's own hiring tool, not a third-party product. A small, muted "Powered
by WorkmateIQ" wordmark sits fixed at the very bottom of the sidebar only —
unobtrusive, not a header, not repeated elsewhere on the page.

Persistent left sidebar (organization admin shell): org logo + org name at
top, nav items — Dashboard, Interview Drives, Candidates, Team, Templates,
Settings — with active-state using the maroon accent as a left rail + tinted
background, not a filled pill, "Powered by WorkmateIQ" pinned at the bottom.
Top bar: search, notification bell with unread dot, admin avatar + dropdown
(Profile, Switch org, Log out). Content area max-width contained, generous
gutters.

Every list/table screen needs: search, relevant filters, an empty state
(icon + message + primary CTA, not just blank white space), a loading
skeleton state, and pagination (cursor-style "Load more," not numbered pages).

═══════════════════════════════════════
SCREENS — design every one of these
═══════════════════════════════════════

1. ORG DASHBOARD (home)
   Overview the moment HR logs in. Top row of 4 stat tiles: Active Interview
   Drives, Candidates Invited This Month, Avg. Completion Rate, Candidates
   Awaiting Review — each tile has a small trend sparkline. Below: a
   horizontal funnel visual (Invited → Started → Completed → Shortlisted)
   for the org's most active drive. A "Needs Your Attention" panel listing
   candidates who finished but haven't been reviewed yet, with a one-click
   "Review" action per row. A recent-activity feed (candidate X completed
   interview, drive Y closed, etc.) with cursor-based "Load more."

2. INTERVIEW DRIVES — LIST VIEW
   A "drive" = one interview campaign (e.g. "SDE Intern — Aug 2026 Batch").
   Card-grid or table (toggle both). Each drive card shows: name, role/tag,
   status badge (Draft / Active / Closed), candidate count, completion %,
   date range, and a mini progress bar. Primary button top-right: "+ New
   Interview Drive." Filter by status; search by name.

3. CREATE NEW INTERVIEW DRIVE — multi-step wizard (this is the core
   creation flow, design all steps as one connected flow with a step
   indicator matching the existing onboarding-wizard pattern — numbered
   circles connected by a line, current step filled maroon):
   Step 1 — Basics: drive name, role/position title, department, short
     description, target headcount.
   Step 2 — Interview Structure: add one or more rounds (e.g. "Technical
     Screening," "Behavioral"), each round has: duration, question
     source (pick from a question-bank library OR upload custom
     questions), and whether it's AI-only or requires a live human
     follow-up. Rounds are reorderable (drag handles).
   Step 3 — Evaluation Criteria: a checklist/weight editor — e.g.
     Technical Accuracy 40%, Communication 25%, Problem-Solving 25%,
     Culture Fit 10% — with sliders that must sum to 100%, live-updating
     a small pie/bar preview as they adjust.
   Step 4 — Schedule & Access: open window (start/end date-time pickers),
     link expiry per invite, whether candidates can retake, proctoring
     toggle (webcam/tab-switch detection) with a plain-language
     explanation of what it does.
   Step 5 — Review & Publish: full summary card of everything configured,
     "Save as Draft" and "Publish Drive" buttons.

4. IMPORT CANDIDATES — CSV UPLOAD FLOW (design as 3 connected sub-screens)
   4a. Upload: a large dashed-border drop zone ("Drag CSV here or browse"),
       a "Download sample template" link, accepted format note
       (.csv, up to 5MB, up to 2,000 rows).
   4b. Column Mapping: a two-column mapper — left is the detected CSV
       headers with a live preview of the first 3 rows under each, right
       is a dropdown to map each to a system field (Name, Email, Phone,
       Resume Link, Custom Field 1/2). Required fields marked with *.
   4c. Validation Preview: a table of every parsed row with a status icon
       per row (✓ valid / ⚠ duplicate email / ✗ missing required field),
       a summary bar ("187 valid · 3 duplicates · 2 errors"), inline-
       editable cells to fix errors without re-uploading, and a final
       "Import 187 Candidates" button. Also show a lighter-weight "Add
       manually" alternate entry point (single-candidate form: name,
       email, phone) reachable from the same screen for one-off adds.

5. SEND INVITES
   After import, a review-and-send screen: recipient count summary,
   an editable invite message (subject + body, with a live preview pane
   showing exactly what the candidate's email will look like — reuse the
   organization's own logo/brand color from their profile in the preview),
   channel toggle (Email / Email + WhatsApp), and a send-timing choice
   (Send Now / Schedule for later with a date-time picker). Confirmation
   step before the final send ("You're about to invite 187 candidates —
   this can't be undone").

6. CANDIDATE TRACKING BOARD (the main day-to-day screen)
   Toggle between Kanban view and Table view for the same data.
   Kanban columns: Invited → Opened Link → In Progress → Completed →
   Reviewed. Each card: candidate name, avatar-initial, small AI-score
   badge once completed, time-in-column indicator. Table view: sortable
   columns for Name, Status (colored badge), AI Score, Completed At,
   Reviewer. Bulk-select checkboxes enable a bulk action bar (Shortlist
   Selected, Reject Selected, Export Selected, Send Reminder). Filter
   sidebar: status, score range slider, round, date range. A prominent
   "X candidates haven't started yet — Send Reminder" nudge banner when
   relevant.

7. CANDIDATE DETAIL — AI INTERVIEW REPORT (the highest-value screen —
   design this one with the most care)
   Header: candidate name, contact info, applied round, overall AI score
   as a large radial gauge (0–100, colored by band: red <40, amber 40–70,
   green 70+). Tab strip: Overview / Transcript / Per-Question Breakdown /
   Notes.
   - Overview tab: skill-breakdown horizontal bar chart (Technical,
     Communication, Problem-Solving, etc. per the drive's weighted
     criteria), a short AI-generated summary paragraph, flagged concerns
     (if any — e.g. "Long pauses on question 4," "Possible tab-switch
     detected") shown as amber inline chips, and a comparison chip showing
     this candidate's score vs the drive's average.
   - Transcript tab: question-by-question scroll, each question shows the
     question text, candidate's answer (text or embedded audio/video
     player with waveform), a per-answer micro-score, and an AI
     rationale line explaining the score.
   - Notes tab: HR's own free-text notes and a star/thumbs internal
     rating, visible only to the org's team, with @mention support for
     tagging a teammate.
   Sticky action bar at the bottom: Shortlist / Move to Next Round /
   Reject buttons, plus a "Download PDF Report" and "Share with team"
   option.

8. COMPARE CANDIDATES
   Select 2–5 candidates from the tracking board to compare side by side:
   a column per candidate with their photo/initial, overall score, and
   the same skill-breakdown bars aligned in a row per skill so it's a
   scannable grid, not separate cards. Sort columns by score. Bulk
   shortlist/reject directly from this view.

9. DRIVE ANALYTICS (per-drive deep dive, reachable from a drive's detail
   page)
   Full-width funnel chart (Invited → Opened → Started → Completed →
   Shortlisted) with drop-off percentages labeled between each stage.
   Score distribution histogram. Average completion time. A
   "candidates dropped off here" callout on whichever funnel stage has
   the steepest drop, with a suggested action (e.g. "12 candidates opened
   the link but never started — consider a reminder").

10. TEAM & ROLES (settings)
    List of teammates with role badges (Admin / Recruiter / Interviewer-
    only-view), invite-teammate-by-email flow, per-drive assignment
    (which recruiter owns which drive).

11. TEMPLATES & BRANDING (settings)
    Reuse the org's already-configured logo and primary/secondary theme
    color (pulled from their profile) to preview how invite emails and
    the candidate-facing interview page will look. Editable email/
    WhatsApp templates for: Invite, Reminder, Rejected, Shortlisted —
    each with a live preview pane exactly like the invite-composer screen.

12. EMPTY, LOADING, AND ERROR STATES
    Design a dedicated empty state for: no drives yet ("Create your first
    interview drive" with a friendly illustration-free icon + CTA), a
    drive with zero candidates imported yet, a tracking board with no
    completed interviews yet, and a generic error state (network/
    something-went-wrong) with a retry action. Keep these calm and
    functional — no cartoon illustrations, a simple icon + one sentence
    + one action button is enough.

═══════════════════════════════════════
INTERACTION DETAIL
═══════════════════════════════════════

Every primary action button uses the maroon accent, solid fill, white
text, 10px radius. Secondary actions are outlined/ghost with ink text.
Destructive actions (Reject, Delete) use the danger red but only on
confirm — the trigger button itself stays neutral/outlined until a
confirm dialog appears. All async actions show a loading state on the
button itself (spinner replacing the label) rather than blocking the
whole screen. Toasts confirm every completed action bottom-right,
auto-dismissing.

═══════════════════════════════════════
RESPONSIVE
═══════════════════════════════════════

Design desktop-first (this is a work tool used at a desk), but the
Candidate Tracking Board, Candidate Detail report, and Dashboard must
also work at tablet width — sidebar collapses to icons-only, table views
switch to stacked cards.
```

---

### Notes for you before pasting this in

- This deliberately reuses WorkmateIQ's real brand tokens (`#C4161F` maroon, warm neutrals) so anything Figma generates stays consistent with the live product rather than inventing a new identity.
- If Figma AI's output feels too text-heavy per screen, you can paste the prompt in sections (Visual System first, then one screen block at a time) — First Draft tends to do better with 3–5 screens per generation than 12 at once.
- Screens 3–5 (Create Drive → Import CSV → Send Invites) are the actual product differentiator versus a generic ATS — worth generating those first and iterating before moving to the rest.

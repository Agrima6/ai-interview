# HirePro / WorkmateIQ — Current State Audit & Remaining Work Plan

Source of truth for "what should exist": `plan(1).md` (target architecture, provided by user).
This document reports what actually exists today across the two codebases and what remains.

Repos audited:
- **`interviewIQ`** — the web app (organization dashboard + candidate-facing site). `client/` = React frontend, `services/` = microservices backend actually in use, `server/` = legacy unused Express/Mongoose app.
- **`workmate-iq-agent`** — the AI interview agent (Python, LiveKit + FastAPI).

---

## 1. Tech stack actually in use today

### interviewIQ (web app)
- **Frontend**: React 19 + Vite 7, React Router 7, Redux Toolkit + TanStack Query 5, Tailwind CSS 4 (`@theme` tokens), `lucide-react` icons, Motion (Framer Motion), Axios.
- **Backend**: `services/client-service` (the one the dashboard actually calls, via `/api/v1/...`) + `api-gateway`, `auth-service`, `communication-service`. **`server/` is a legacy dead Express+Mongoose app — not wired to the current frontend.**
- **DB**: MongoDB via Mongoose.
- No vector DB, no Redis, no SQS present in this repo.

### workmate-iq-agent (AI agent)
- **LLM**: Groq (`openai/gpt-oss-120b`) via OpenAI-compatible SDK.
- **STT**: Groq Whisper (`whisper-large-v3-turbo`) via `livekit.plugins.groq`.
- **TTS**: pluggable — Sarvam (default in `.env.example`), Edge TTS (code default), ElevenLabs, OpenAI TTS.
- **VAD**: Silero VAD only; no dedicated turn-detector model, plus a manual `commit_turn` data-channel escape hatch.
- **DB**: SQLAlchemy ORM, SQLite by default (`workmate.db`), Postgres supported via `DATABASE_URL` env swap. **No pgvector, no vector column anywhere.**
- **Queue/async**: none — no Redis, no SQS/Celery/Kafka. Everything runs synchronously in-request or in-process.
- **Web framework**: FastAPI + Uvicorn, LiveKit orchestration via `livekit-agents`/`livekit-api`.
- **Question bank**: flat `question_bank.json` (15 static entries), selected by keyword/tag overlap — not embeddings.

---

## 2. What's already done (do not rebuild — extend only)

These items from the spec are **already implemented correctly** in `interviewIQ` and should be reused as-is:

| Spec item | Status | Where |
|---|---|---|
| Drive status colors (green/gray/red, no purple) | ✅ Done | `DrivesListPage.jsx` `STATUS_BADGE`, `Badge.jsx` using `--color-success/-neutral/-danger` |
| Role/department enum formatting | ✅ Done | `formatEnumLabel()` used throughout |
| Drive created/updated dates displayed | ✅ Done | `DrivesListPage.jsx:299-306` |
| Public link "card grows" layout bug | ✅ Fixed | `PublicLinkPopover.jsx` — portal-rendered fixed popover, explicit comment referencing the fix |
| z-index scale | ✅ Done | `client/src/index.css` matches spec's 100/200/300/400/500/600 scale exactly |
| Candidate server-side pagination | ✅ Done | `CandidatesListPage.jsx` |
| Candidate Experience field in CSV import | ✅ Done | `candidateSchema.js` — contrary to spec's claimed gap, this already exists with validation |
| Duplicate/invalid detection on import | ✅ Done | `validateCandidateRecord()` in `candidateSchema.js` |
| View Questions as modal (not page nav) | ✅ Done | `QuestionSetsPage.jsx` uses `Modal` |
| Communication channels (Email/WhatsApp/Call) | ✅ Done | `TemplatesPage.jsx`, `notificationTemplate.service.js` |
| Call templates never auto-sent (script only) | ✅ Done | `interviewDrive.service.js:1051-1053` |
| SMTP password never returned to frontend | ✅ Done | `hasPassword` boolean only, form field always blank |
| SMTP Test Connection | ✅ Done | `smtpSettings.service.js` |
| Primary/from email defaults to login email | ✅ Done | `smtpSettings.service.js:19` |
| Rejection only on explicit recruiter action, not on score alone | ✅ Done | `interviewDrive.service.js:1089` |
| Consistent API envelope (`{success, data, error}`) | ✅ Done | `utils/response.js` (pagination lives under `meta`, minor naming deviation only) |
| Icon consistency (lucide-react only) | ✅ Done | verified across 22+ organization files |
| No z-index hacks | ✅ Done | verified |
| Responsive Tailwind classes, skeletons, empty/error states w/ retry | ✅ Done | `DrivesListPage.jsx` and others |
| Tenant-scoped mutations (`tenantId` from session, not client) | ✅ Done | e.g. `interviewDrive.service.js:1042` |
| Reusable UI primitives (Badge, Modal, Drawer, Pagination, Skeleton, Toast, ConfirmModal, EmptyState, etc.) | ✅ Done | `client/src/components/ui/` |
| Create Interview form untouched | ✅ Confirmed present, 6-step, `CreateDriveModal.jsx` — **leave as-is** |

And in `workmate-iq-agent`:

| Spec item | Status |
|---|---|
| Single LiveKit conversational agent (VAD→STT→LLM→TTS) | ✅ Done |
| Coverage Judge (LLM-backed) | ✅ Done — `policy.py:6-31` |
| Deterministic next-action decision (not LLM-delegated) | ✅ Done — `policy.py:44-55` |
| Frozen/pre-generated question plan at interview creation | ✅ Done — `planner.py`, stored on `Interview.plan` |
| Resume text extraction + LLM structured evidence extraction | ✅ Done (basic) — `resume_parser.py` |

**Given the audit result, the redesign work in the 60-section product spec (`CLAUDE.md`) is mostly already complete on the web-app side.** The real remaining work is concentrated in two places: (a) a handful of specific web-app gaps below, and (b) the AI agent, which is missing most of the production-hardening items from `plan(1).md`.

---

## 3. Remaining gaps — interviewIQ (web app)

### 3.1 Public link uses `window.location.origin` instead of `PUBLIC_APP_URL` (frontend only)
- **Where**: `PublicLinkPopover.jsx:19`, `DriveDetailPage.jsx:311,320,339` — build the candidate URL as `` `${window.location.origin}/apply/${publicLink}` ``.
- **Backend is already correct**: `interviewDrive.service.js:32` `buildFrontendUrl()` uses `process.env.FRONTEND_BASE_URL` for emails.
- **Fix**: add `VITE_PUBLIC_APP_URL` to `client/.env`/`.env.example`, replace all 3 `window.location.origin` usages with it, fall back to `window.location.origin` only if unset in local dev.

### 3.2 Settings branding (font, primary/secondary color) is saved + previewed but never applied globally
- **Where**: `SettingsPage.jsx:236-257` — only sets inline `style={{fontFamily}}` on the settings preview block itself.
- **Missing**: a `ThemeProvider` that reads the saved branding from the API on app load and writes it to `document.documentElement.style.setProperty('--font-family', ...)` / `--color-primary` / `--color-secondary`, consumed by `index.css` tokens app-wide.
- **Fix**: build `client/src/theme/ThemeProvider.jsx`, wrap `App.jsx`, fetch branding once via React Query, apply CSS custom properties on mount and on save. This directly satisfies CLAUDE.md §4 ("Settings must be the source of truth").

### 3.3 API pagination shape — minor naming deviation
- Current: `{success, data, meta: {total, page, pageSize}}`.
- Spec wants: `{success, data, pagination: {page, pageSize, total, totalPages}}`.
- **Low priority** — functionally equivalent. Only worth changing if a shared frontend pagination helper needs a single consistent shape across services; otherwise leave alone (avoid needless churn per house rule "reuse → refactor → extend → create new").

### 3.4 Legacy dead code
- `server/` (Express + Mongoose) is unused by the current frontend. Confirm no other consumer depends on it, then remove it to stop it from drifting further out of sync and confusing future audits — do not delete without checking `render.yaml`/deploy scripts for references first.

---

## 4. Remaining gaps — workmate-iq-agent (AI interview agent)

This is where the bulk of real engineering work remains, per `plan(1).md`.

### 4.1 CRITICAL — End Interview / in-flight response bug (plan(1).md §24-26, §68)
- **Current state**: no session/generation versioning exists at all. Ending relies on `raise StopResponse()` (`agent.py:328,382,394`) plus a `runner.done` event to keep the process alive until `/complete` is POSTed.
- **Gap**: if TTS/LLM is already generating when end-intent fires, nothing cancels it — a response can still play after the candidate has ended the interview.
- **Fix** (do this first, before any other agent work):
  1. Add `sessionVersion`/`generationId` to the in-memory `InterviewRunner`/`QuestionState`.
  2. Before starting each LLM/TTS call, capture the current generation id.
  3. On completion of that call, check `session.status == ACTIVE AND generationId == currentGeneration` before speaking/persisting; discard otherwise.
  4. On `end_interview()`, atomically flip status to a terminal state, bump `generationId`, cancel any in-flight asyncio task for LLM/TTS/STT, then disconnect from LiveKit.
  5. Make `/complete` idempotent — return `409 INTERVIEW_ALREADY_COMPLETED` on a second call instead of re-running scoring.
  6. Add regression tests reproducing: candidate answers → LLM call starts → candidate clicks End → session COMPLETED → LLM returns late → assert no TTS/new turn/new question is produced. Also test double-End, refresh-after-End, reconnect-after-End.

### 4.2 Interview state machine
- **Current**: `Interview.status` is a free string; only `"planned"`, `"completed"`, and default `"created"` are ever set. No enum, no transition guards, nothing stops `/complete` firing twice today (ties into 4.1.5 above).
- **Fix**: introduce the full state enum from plan(1).md §22 (`CREATED → INVITED → PRECHECK → READY → INTRO → QUESTION → WAITING_FOR_ANSWER → ANALYZING → COMPLETION → FINALIZING → COMPLETED`, plus terminal failure states), persist every transition as an event row, and guard transitions server-side.

### 4.3 `coverage_threshold` not actually wired at runtime
- **Current**: `Interview.coverage_threshold` column exists (`db.py:49`) and defaults to 0.7, but `agent.py:248` builds `QuestionState` with hardcoded defaults, ignoring the per-interview DB value.
- **Fix**: read `interview.coverage_threshold` when constructing `QuestionState` so HR-configured thresholds actually take effect.

### 4.4 `CoverageResult` table defined but never written
- **Current**: `db.py:71-78` defines the model; nothing inserts into it.
- **Fix**: persist a `CoverageResult` row after each `judge_coverage()` call so coverage decisions are auditable (needed for report "evidence" sections per plan(1).md §41).

### 4.5 Question bank: flat JSON → pgvector-backed semantic retrieval
- **Current**: `question_bank.json`, 15 static questions, keyword/tag-overlap selection (`planner.py:75-92`). No embeddings, no dedup beyond exact tag match, no diversity/MMR selection.
- **Fix** (plan(1).md §12-14):
  1. Migrate `workmate-iq-agent` to Postgres (already supported via `DATABASE_URL`) if not already the deployed target.
  2. `CREATE EXTENSION vector;` and add a `questions` table with an `embedding vector(N)` column, migrating the 15 JSON entries in.
  3. Add an embedding worker (can be a simple synchronous call at question create/update time initially — no need for a queue at this scale).
  4. Replace `planner.py`'s tag-overlap scoring with: metadata filter (role/level/status) → cosine similarity top-N → lexical de-dup → MMR-style diversity selection → plan-level exclusion of already-used questions.
  5. Keep the "freeze plan at interview start" behavior — already correct.

### 4.6 Async post-interview scoring pipeline
- **Current**: `complete_interview()` (`api.py:214-262`) runs `score_answer_content`, `score_communication`, `aggregate_final_score`, `generate_overall_summary` all synchronously inside the `/complete` HTTP request — explicitly flagged as a known gap in the project's own README.
- **Fix**: at minimum, move scoring off the request thread into a background task (FastAPI `BackgroundTasks` is a pragmatic first step; a real SQS/Redis-backed worker per plan(1).md §30-31 is the eventual target once volume justifies it — don't over-build this immediately). Return `202`/`PENDING` from `/complete` and add a report status field (`PENDING/PROCESSING/READY/FAILED`) so the frontend can poll instead of blocking.

### 4.7 No Redis hot-state layer
- **Current**: all live interview state lives in-process Python objects inside the agent worker. A worker crash loses in-flight state entirely (plan(1).md §32, §37 — stateless workers requirement).
- **Fix**: not urgent at current scale (single-tenant, low concurrency). Revisit once running more than one agent worker process or needing crash-recovery — premature to add now per house rule against building for hypothetical scale.

### 4.8 No integrity/proctoring events
- **Current**: confirmed absent — no fullscreen/visibility/camera event capture anywhere in the agent or (per the web-app audit) the candidate-facing client.
- **Fix**: this is a candidate-frontend feature (visibility/fullscreen listeners + an events API), not purely an agent-side change. Needs: `integrity_events` table, an API endpoint to record events, three-flag policy config on the drive, and the candidate frontend wiring (`document.addEventListener('visibilitychange', ...)`, `fullscreenchange`). Sequence per plan(1).md Phase 6 — do this after 4.1 (End Interview fix) and 4.2 (state machine), since flag-triggered termination needs the state machine to exist first.

### 4.9 No auth on the agent's API
- **Current**: `api.py` has zero authentication/authorization on any endpoint (confirmed by the project's own README).
- **Fix**: at minimum, validate the public interview token server-side before minting a LiveKit room token, and add service-to-service auth between `interviewIQ`'s backend and this agent API if they're meant to be separate trust boundaries. This is a prerequisite for exposing any of this via a real public link — treat as high priority alongside 4.1.

### 4.10 VAD / turn detection
- Silero VAD only, no dedicated turn-detector model. Spec doesn't strictly require more than this — flagging as a possible latency/interruption-quality improvement, not a correctness gap. Low priority.

---

## 5. Recommended order of work

Following `plan(1).md` §69's phased approach, adapted to what's actually left:

1. **Agent: fix the End Interview / in-flight response bug (4.1)** — highest severity, explicitly called out as critical in the spec, currently completely unaddressed.
2. **Agent: introduce the real interview state machine + idempotent `/complete` (4.2)** — needed to make fix #1 durable and to unblock #4.8.
3. **Agent: add basic auth to the agent API (4.9)** — required before any real public exposure.
4. **Web app: fix `PUBLIC_APP_URL` leak (3.1)** — small, isolated, ships independently.
5. **Web app: wire Settings branding through a real ThemeProvider (3.2)** — small, isolated.
6. **Agent: wire `coverage_threshold` from DB (4.3)** and **persist `CoverageResult` rows (4.4)** — small, unblocks report evidence quality.
7. **Agent: pgvector question retrieval + dedup + diversity selection (4.5)** — medium effort, no urgency until question bank grows past what tag-matching can handle well.
8. **Agent: move scoring off the request thread (4.6)** — medium effort.
9. **Integrity/proctoring (4.8)** — full-stack feature, do once the state machine (#2) exists.
10. Everything else (Redis, regional LiveKit, SQS-based workers, 1M-scale infra) — explicitly deferred per plan(1).md's own guidance not to build for hypothetical scale before load-testing justifies it.

Web app items 3.3 and 3.4 (pagination naming, legacy `server/` removal) are cleanup, not blockers — pick up opportunistically.

See [changes.md](changes.md) for a plain description of exactly what changed vs. what's proposed, organized by file.

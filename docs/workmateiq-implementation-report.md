# WorkmateIQ - Implementation Report

Covers `workmateiq-bug-review-and-implementation-plan.md`, in its own priority order.
Nothing here has been deployed. Everything is uncommitted in the working trees (see "Deployment verification").

## Status at a glance

| Priority | Item | Status |
|---|---|---|
| P0 | Browser permission readiness | Done, unit + browser-pane tested (earlier this session) |
| P0 | AI interview intelligence (HR + resume + role + state) | Done in the agent and recruiter modal; **not yet run in a live voice interview** |
| P1 | Scheduling (time picker, timezone, slots, no double booking) | Done; race safety verified against the real database |
| P1 | Selection / rejection communication, idempotency, status | Done; verified against the real database with a stub communication service |
| P1 | Dashboard | Prototype + aggregate APIs done; **the React dashboard page is not switched to the new APIs** |

## Root cause per bug

| Observed behavior | Root cause | Component | Fix |
|---|---|---|---|
| Interview started with permissions missing / stale | Permission API state was trusted without checking a live stream | `InterviewRoomPage.jsx` | Real `getUserMedia` / `getDisplayMedia` checks, per-mode requirements, screen-track lifecycle (`mediaPermissions.js`) |
| HR guidance did not shape the interview | Weighted skills (`skillRubrics`) were never sent to the agent; the planner only saw role competencies | client-service to agent | `focus_areas` is now sent and turned into HIGH/MEDIUM/LOW priorities (`focus.py`) |
| Resume claims never used | Parser output (`claims`) was stored but no code read it | `planner.py` | Up to `MAX_VALIDATION_QUESTIONS` claims become validation questions; injected text is dropped |
| Report showed scores without evidence | Judge returned no evidence and the report had no coverage section | `policy.py`, `_run_scoring_job` | Grounded evidence, ownership, human-review flags; `hr_focus_coverage`, `resume_validation`, `contradictions` in the report |
| Any time of day could be booked, in any timezone | Slots were a fixed 30-minute grid in the browser's own timezone and the server only checked "in the future" | `slotRules.js`, service | `slotPolicy.js`: hours evaluated in the organization's IANA timezone, configurable interval / notice / blocked periods |
| Two candidates could take the same slot | No capacity check or booking record | service | Atomic per-slot counter (`SlotBooking`, unique index); overlap check per candidate |
| "Sent" shown when only queued | `status = "SENT"` was set as soon as the request to the communication service returned | `communicateWithCandidates` | QUEUED / SENT / DELIVERED / FAILED, mapped from the service; refresh endpoint reconciles later |
| Double click sent messages twice | No idempotency | same | `planDispatch` + atomic claim per candidate + idempotency key from the dialog |
| Selected candidate could get a rejection | No exclusion between the two purposes | same | `ALREADY_SELECTED` / `ALREADY_REJECTED` skips; congratulations now records SHORTLISTED |
| Booking email showed server-locale time | `slot.toLocaleString()` on the server | `completeCandidateApplication` | Formatted in the organization's timezone with the zone named |
| Booking confirmation failures invisible | Fire-and-forget `.catch(console.error)` | same | Awaited; response carries `confirmation: {status}` (a failure never fails the booking) |

One bug I introduced and caught: my first claim query used `modifiedCount` to detect a lost race, but Mongoose `timestamps` rewrites `updatedAt` on every update, so lost claims looked like wins (3 of 4 concurrent requests "won"). Fixed with `timestamps: false`; re-verified 1 winner of 8.

## Files changed

Agent (`workmate-iq-agent`): `focus.py` (new), `intelligence_report.py` (new), `planner.py`, `policy.py`, `runner.py`, `conductor.py`, `api.py`, tests `test_focus.py`, `test_planner_intelligence.py`, `test_intelligence_report.py`, `test_api_interview_config.py`.

interviewIQ:
- Scheduling: `utils/slotPolicy.js` (new), `models/slotBooking.model.js` (new), `services/slotBooking.service.js` (new), `services/interviewDrive.service.js`, `models/interviewDrive.model.js`, client `utils/slotRules.js`, `CandidateCalendarPicker.jsx`, `RescheduleSlotModal.jsx`, `CompleteApplicationModal.jsx`.
- Communication: `utils/communicationPlan.js` (new), `SendRoundCommunicationModal.jsx`, controller + routes.
- Intelligence UI: `InterviewIntelligence.jsx` (new), `CandidateDetailModal.jsx`, `agentServiceClient.js`.
- Dashboard: `services/dashboard.service.js` (new), `utils/dashboardMetrics.js` (new), `docs/hiring-control-center-prototype.html` (new).
- Tests: `tests/slotPolicy.test.js`, `communicationPlan.test.js`, `dashboardMetrics.test.js`.

## API changes

- Agent `POST /v1/interviews`: new optional `focus_areas` (JSON list of `{name, weight?, priority?, note?}`); malformed input is a 422. Plan is now `plan_version: 2` with `focus_areas`, `resume_claims`, `hr_guidance`; questions carry `focus`, `focus_priority`.
- Agent report `content`: adds `hr_focus_coverage`, `resume_validation`, `contradictions`, `unasked_high_priority`, `decision_support_only`, `notice`.
- Public drive and `getMyInterviews`: adds `availability` (timezone, hours, interval, duration, notice, blocked periods).
- Booking errors now carry codes: `SLOT_TOO_SOON`, `SLOT_OUTSIDE_HOURS`, `SLOT_OFF_INTERVAL`, `SLOT_OUTSIDE_WINDOW`, `SLOT_BLOCKED`, `SLOT_FULL` (409), `CANDIDATE_DOUBLE_BOOKED` (409).
- `POST .../candidates/communicate`: accepts `idempotencyKey`; returns `queuedCount`, `skippedCount`, per-candidate `status` (`QUEUED|SENT|DELIVERED|FAILED|SKIPPED`) and `reason`. `sentCount` is kept for old callers and means "accepted".
- New `POST /drives/:id/rounds/:n/communications/refresh`.
- New `GET /api/v1/organizations/me/hiring-analytics/{summary|funnel|velocity|interview-intelligence|sources|attention|hiring-health}`. The plan's `/api/v1/dashboard/*` prefix is taken by the platform-admin dashboard-service in the gateway route table, so this path reuses the already-routed `/organizations` prefix.

## Database changes

- `InterviewDrive.availability` (optional subdocument); no backfill needed - unset means defaults.
- New collection `SlotBooking {tenantId, slotKey, count}` with a unique `(tenantId, slotKey)` index. It is only written when `maxConcurrent > 0` (default 0 = unlimited).
- `candidate.communications[]`: status enum now `QUEUED|SENT|DELIVERED|FAILED`; new `communicationId`, `idempotencyKey`, `error`, `updatedAt`. Old `SENT`/`FAILED` rows remain valid.
- New index `(tenantId, department)`.
- Agent: no schema change (JSON columns).

## AI interview changes

```
HR focus areas (weights -> HIGH/MEDIUM/LOW)  ─┐
Resume claims (requires_verification)         ├─> plan v2 ─> per-question focus + depth budget
Role competencies                             │             ─> judge sees CLAIM / FOCUS
Interview state (existing runner progress)   ─┘             ─> evidence, ownership, inconsistency
                                                            ─> report sections + human-review flags
```

- HR wins conflicts; HIGH/MEDIUM HR areas nothing covers get a question (LLM-written, deterministic fallback so a provider outage never leaves a HIGH area unasked).
- Depth is configurable: `FOCUS_BUDGETS`, `FOCUS_FOLLOWUP_DELTA`, `FOCUS_HIGH_SHARE`, `FOCUS_MEDIUM_SHARE`, `MAX_VALIDATION_QUESTIONS`, `PLAN_QUESTION_CEILING`. HIGH questions get one more follow-up, LOW one fewer.
- Generated filler is dropped first when the plan hits the ceiling; HR, validation and focus questions are never dropped.
- New questions go through the existing semantic duplicate check, so nothing is asked twice in different words.
- Contradictions never change a score or what the candidate hears; they are listed for a human.
- Not done: an inconsistency check between two different *answers* (only answer-vs-claim). A mid-interview HR-focus "coverage so far" state is not tracked; coverage is derived after the fact from persisted evaluations.

## Scheduling changes

```
availability (drive or env)  ->  validateSlot (org timezone, hours, interval, notice, blocked)
                             ->  bookSlot: overlap check + atomic capacity  ->  save  (release on failure)
                             ->  confirmation email (awaited, status returned)
```

- Times are stored as UTC instants; hours are evaluated in the organization's IANA timezone (default from `DEFAULT_TIMEZONE`, else `Asia/Kolkata`).
- The candidate picker keeps the slot grid and adds an exact-time control (hour / minute / AM-PM), validated with the same rules; the server is the authority.
- A reschedule takes the new place before releasing the old one, so a failed reschedule keeps the original slot.
- Not done: per-candidate timezone is displayed, not stored; the plan's "22nd interview" flow was verified at the code level (booking, then a confirmation with real status), not by an end-to-end run through the real SMTP provider.

## Dashboard

KPI definitions (all computed server-side):
- Candidates: rows matching the filters, by activity date (attempted, else slot, else drive creation).
- Applied: has a resume or a slot. Scheduled: has a slot. AI started: has an agent interview. AI completed: has a report.
- AI completion % = completed / started. Shortlist rate = shortlisted / AI completed.
- No-show: slot + grace has passed, nothing started. Rate = no-shows / scheduled. Median is used for velocity.
- Every percentage returns `null` (not 0) when its denominator is 0; deltas are `null` when there is no previous value.

Filters (one model, validated and whitelisted): `from`, `to`, `compare`, `department`, `jobId`, `round`, `candidateStatus`/`interviewStatus`, `aiStatus`, `language`, `experience`, `scoreMin`, `scoreMax`. Filters the data cannot support (`organizationId`, `locationId`, `recruiterId`, `hiringManagerId`, `source`, `jobType`, `employmentType`) are accepted and echoed as `unsupportedFilters`.

Aggregation: `$match` by tenant first, `$group` in MongoDB, `maxTimeMS` 15s, 30s in-memory cache (bounded). The median comes from `$sort/$skip/$limit`, not from loading rows.

Honest gaps (returned as `{available:false, reason}`, never faked): hires, time to hire, offer acceptance, source effectiveness, recruiter workload, geography, and every velocity stage except "booked slot to interview start". These need data the platform does not record yet: source at application, offers/hires, stage history, job location, recruiter assignment.

The prototype (`docs/hiring-control-center-prototype.html`) is standalone, uses a clearly labelled seeded demo dataset generated in the page, and every filter recomputes the numbers. It shows all the plan's filters, KPIs, funnel with drill-down, velocity, AI intelligence, sources, needs-attention, job health table (search/status/sort), workload, geography, comparison toggle, modal, tooltips and a "Data model" page. It is responsive and was checked at phone width with no horizontal overflow; it was not checked at every breakpoint.

## Tests

| Area | Result |
|---|---|
| Agent (pytest) | 474 pass (450 existing + focus, planner, report, API) |
| Permissions (client, node) | 7 pass |
| Scheduling (slotPolicy) | 6 pass |
| Communication (communicationPlan) | 6 pass |
| Dashboard metrics | 5 pass; client-service total 21 pass |
| Client build | passes |
| Concurrency, real Mongo, throwaway tenant | capacity 3: 3 of 10 concurrent bookings win; release then re-reserve works; atomic communication claim: 1 winner of 8 |
| Communication flow, real Mongo + stub service | first send QUEUED; second click all `SKIPPED(ALREADY_SENT)`; rejecting a selected candidate skipped; refresh moves QUEUED to SENT to DELIVERED |
| Dashboard aggregation, real Mongo | totals, funnel, velocity, intelligence, attention and health matched hand-computed values; a different tenant saw 0 |

Not tested: the new HTTP routes over the wire (service functions were called directly); DST-specific timezones; a live voice interview using the new planner; the recruiter modal with a real report; provider-side delivery (real SMTP/WhatsApp).

## The 30 additional bugs

Fixed: 1, 2, 5, 7, 8, 9, 10, 12, 13, 15, 16, 17, 18, 19 (new API), 20 (one filter model), 21 (median), 22 (documented denominators), 25 (tested), 26 (aggregates only), 28 (prototype is a separate file), 29.
Partly: 3 (device changes after approval - track-end handled, a device-change listener was not added), 6 (Intl-based, not DST-tested), 24 (one index added; others not measured), 30 (statuses reconcile via refresh, but no UI shows them yet).
Not addressed: 4 (page-refresh state was not re-audited this round), 11 (duplicate invitation from queue retries - communication-service retry semantics untouched), 14 (context growth: the judge already receives one answer at a time; not changed), 23 (load not measured), 27 (existing export endpoints share the list permission; unchanged).

## Deployment verification

Not done. To ship:
1. Commit the agent and interviewIQ changes (the interviewIQ tree also holds a teammate's uncommitted edits, e.g. `services/communication-service/worker.js`; review before committing).
2. Server: `git pull`, set `AGENT_NAME=workmate-prod`, rebuild (`docker compose --env-file .env.production up -d --build`), restart the SSH tunnel.
3. Verify with a real interview that a HIGH-priority HR area is asked and that the report shows HR focus coverage.
4. Set `SLOT_MAX_CONCURRENT` only if you want a per-slot cap; leave unset for unlimited.
5. Rotate the Sarvam key and the server root password that were pasted into chat earlier.

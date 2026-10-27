# Engineering report: recording, progression, rejection email, security audit

Branch `fix/auth-session-isolation` (PR with everything below). Each line says what was **reproduced / tested** and what was **not**.

## 1. Interview recording

| Question | Finding (before) | Now |
|---|---|---|
| Is the whole interview captured? | Camera track only. On the LiveKit path the saved file had **no audio** (no mic, no interviewer). | Camera + one mixed audio track (candidate mic + interviewer voice). Verified in a real browser: the assembled file decodes, has video and audible audio. |
| Uploaded during the session? | No - held in browser memory, one upload at the end. Tab close or crash = everything lost. | Slices (2 s) uploaded while the interview runs, ordered, retried with backoff, idempotent by `recordingId + index`. Verified: forced network failures were retried and arrived in order. |
| Failure visible? | Upload errors only `console.error`. | Candidate sees a slow-connection notice; HR sees the stored state per capture. |
| Finalized / durable? | No manifest, no state. | Atomic finalize: assemble -> store -> read back -> compare size. Only then COMPLETED. States: RECORDING, FINALIZING, COMPLETED, INCOMPLETE, FAILED. Abandoned captures are closed out as INCOMPLETE (never complete). |
| Linked to right tenant/candidate? | By candidate id inside the tenant's drive. | Same, plus every chunk/finalize/manifest call is tenant- and candidate-scoped. Tested: other tenant -> DRIVE_NOT_FOUND, other candidate -> NOT_APPLIED. |
| Playback authorization | Tenant-scoped, range streaming. | Unchanged; now also selects a segment (`?segment=`). Only verified objects are served. |
| Retention | None. | `scripts/purge-recordings.mjs` (opt-in `RECORDING_RETENTION_DAYS`, dry-run by default). |

Tests: `tests/recording.test.js` (9), `scripts/verify-recording-pipeline.mjs --memory` (real Mongo, in-memory storage) passes.
**Not yet proven:** the same script against the production object store - run `node scripts/verify-recording-pipeline.mjs` on the server (see the PR notes). Until it prints PASS there, "recordings are stored and retrievable in production" is unverified.
Limits: assembly happens in memory (cap 600 MB); the last <2 s can be lost if the tab is killed; AI audio is mixed only on the LiveKit path (the local browser-speech demo mode records the candidate only).

## 2. Candidate progression / rounds

| Item | Status |
|---|---|
| Advancing into Round 2 carried no resume/language/agent id and inherited Round 1's SHORTLISTED + score | **Fixed and verified** (merged earlier, PR #25; 3 tests + throwaway-tenant repro) |
| Re-saving a round wiped resume/slot | **Fixed and verified** |
| `addRoundToDrive` silently skipped advancing candidates | **Fixed** (tested) |
| Round 2 invitation used the drive deadline and the Round 1 apply link | **Fixed** (tested: `roundWording`): round's own deadline, candidate-room link, "moving forward" wording |
| Selection email copy | **Fixed** for new organisations (default template). Existing organisations keep their stored template until edited. |
| Resume reuse / slot-only | Backend accepts a carried-over resume; the apply modal already skips the upload when one is on file. **Code-read, not run end to end in a browser.** |
| Exact date + timezone on the card | **Added** (weekday, date, time, zone). Not screenshot-verified. |
| Countdown, Start disabled before the window | Existed; backend enforces TOO_EARLY / SLOT_EXPIRED. Not re-run. |
| Round-level start gate | **Added**: new starts refused unless drive ACTIVE and round ACTIVE (a started interview can still be resumed). Not covered by an automated test. |
| Duplicate emails | Round communications are claim-guarded (verified with concurrent requests). |

## 3. Rejection email
Decision is now persisted in the same atomic write that claims the send, so no email goes out for an unsaved decision; select/reject cannot both win; sender recorded; rejected candidates cannot start an interview. Verified against real Mongo with the email sender stubbed; **a real mailbox delivery has not been observed.** Merged as PR #26.

## 4. Security / correctness fixes (this PR)
- `/` and `/login` redirect a signed-in visitor to their own dashboard (shared `resolvePostLoginPath`).
- Login/logout clear all cached account data, other tabs re-sync (BroadcastChannel), previous refresh-token family revoked on login, JWT verification pinned to HS256 in all services.
- Backend authorization audit: all candidate endpoints require the CANDIDATE role; org endpoints require `CLIENT_SELF_*` (candidates don't hold them); drive access is always `{_id, tenantId}`. No gap found beyond the above.
- Drive list filters: object/array query values no longer reach Mongo; search regex escaped; status allow-listed.
- Public prefill link token compared in constant time; no default signing secret.
- CAPTCHA: Turnstile (server-verified) when `TURNSTILE_SECRET_KEY` + `TURNSTILE_SITE_KEY` are set, otherwise a single-use challenge whose token no longer contains the answer; refresh button; client-side answer check removed. Direct API calls without a valid token fail (tested).
- Registration contact-number fields validated server-side even if typed as text; stored as 10 digits.
- Completed vs Closed: closing a round/drive with unfinished candidates is CLOSED, not COMPLETED (tested); `scripts/reconcile-drive-status.js` corrects old records (dry run first).
- "Opened" tag removed from the UI (tracking data kept).
- Question banks: idempotent default seeding, validated create, new update/delete/get, tenant-scoped (verified on real Mongo); templates with unfillable placeholders are refused before sending.

## 5. Not done / risks
- Phone-number uniqueness across registrations (a business rule that was not defined).
- Turnstile needs the two keys set (and the site key allowed for the domain) to take effect; until then the built-in challenge is used.
- No browser automation of the full candidate journey (Round 1 -> Round 2 -> countdown); only unit tests, real-DB scripts and one browser harness for the recorder.
- Access tokens remain valid until their short expiry after logout (stateless JWT).
- Existing production data: run the reconcile script (dry run) and the recording verification script on the server.

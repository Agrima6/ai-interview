# Online Assessment

A separate room for running proctored written tests: MCQ, multi-select, short answer, long answer and coding, in one test or across rounds. It has its own sign-in, its own navigation and its own data, so the same email can also be an organization, a college, a candidate and an Online Assessment admin.

## The two sides

**Organizer (admin)** at `/oa/login`
1. Registers at `/oa/register`. A WorkmateIQ super admin approves it (maker-checker): Platform admin → **Online Assessment** → Approve, Ask for changes or Reject. Nothing works until then.
2. Creates an assessment, adds sections, adds questions by writing them, uploading a CSV/JSON, or describing a topic for AI to draft (reviewed before anything is added).
3. Uploads students (name and email are enough). Each student gets a personal access code.
4. Sets the date, start time, closing time, duration, rules and proctoring level, then publishes and emails invitations.
5. Watches the **Live** tab during the test, then reads ranked **Results**, grades long answers and code, reviews proctoring evidence, exports CSV, and can create the next round from the qualifiers.

**Student** at `/oa/exam` (the invitation email links here with the test and email filled in)
1. Signs in with email and access code.
2. Reads the instructions and runs the system check (webcam, entire screen share, one monitor), then agrees to the rules.
3. When the start time arrives everyone can begin. The clock is the server's. Each student sees questions and options in an order of their own.
4. Answers save automatically. Submitting, running out of time, or too many violations ends the attempt.

## Proctoring

| Signal | How |
|---|---|
| Webcam video shown to the student | Required for HARD |
| Face checks: none, several, looking away | MediaPipe in the browser (existing `ProctoringCamera`) |
| Entire screen shared | `getDisplayMedia`, rejects window/tab sharing |
| Full screen enforced | Exit is recorded and the test is hidden until restored |
| Tab or window switch | `visibilitychange` and blur |
| Copy, cut, paste, right-click | Blocked and recorded |
| Developer tools, second monitor | Heuristics (`screen.isExtended`, window size) |
| Webcam snapshots | Every N seconds, plus one at each violation |
| Dropped connection | Heartbeat gaps are logged |

After N violations (default 5) the attempt ends automatically as **Ended by proctor**. The organizer can **Clear flags** or **Disqualify**, which changes who is ranked.

## Roles and rooms

Separate collections (`OaAccount`, `OaStudent`, ...), separate token secret and audience. A platform token is never accepted in this room, and the reverse. Because the identities are separate, an email registered as an organization, a college or a candidate can also be an Online Assessment admin or student, without any clash.

## Settings (environment)

| Variable | Where | Purpose |
|---|---|---|
| `FRONTEND_BASE_URL` | client-service | Base of the links in invitation emails |
| `OA_TOKEN_SECRET` | client-service | Signs OA tokens (falls back to a value derived from `ACCESS_TOKEN_SECRET`) |
| `OA_AI_API_KEY` | client-service | Turns on AI question drafting. Any OpenAI-compatible endpoint |
| `OA_AI_BASE_URL` | client-service | Default `https://api.openai.com/v1` |
| `OA_AI_MODEL` | client-service | Default `gpt-4o-mini` |

Without `OA_AI_API_KEY` the AI button says it is not set up and everything else works. Emails go through communication-service with event types `OA_INVITE` and `OA_ACCOUNT_DECISION` (custom subject and body, no template needed).

## Test credentials

Run the seed against a **non-production** database:

```bash
cd services/client-service
node scripts/seed-oa-demo.js
```

It refuses to run with `NODE_ENV=production`, and re-running resets the demo and reopens the test for six hours.

| Who | Sign in | Credentials |
|---|---|---|
| Organizer | `/oa/login` | `oa.demo@workmateiq.test` / `OaDemo#2026` |
| Student | `/oa/exam?a=<test id printed by the seed>` | `asha.demo@workmateiq.test` / `DEMO2026A` |
| Student | same | `rahul.demo@workmateiq.test` / `DEMO2026B` |
| Student | same | `meera.demo@workmateiq.test` / `DEMO2026C` |

These are test values for this repository only.

## Tests

```bash
cd services/client-service
node --test tests/oaLogic.test.js                  # shuffling, grading, schedule, ranking, passwords
node --test tests/oaFlow.integration.test.js       # the whole flow over HTTP against a throwaway local mongod
```

The integration test is skipped when `mongod` is not installed.

## Known limits

- **Coding questions are not run automatically.** Students write code in an editor and the organizer reads and marks it. Auto-running test cases needs a sandbox (for example Judge0) and is the natural next step. Test cases are stored for that.
- **No video recording.** The student sees their own live video; the organizer gets periodic snapshots and a snapshot at each violation. Browser-based proctoring can be evaded by a determined person (a second device, a virtual machine), so treat it as strong evidence, not proof.
- **Sign-in limits are per account**, not per IP, because the gateway does not forward client IPs. Enable `xfwd` on the gateway proxy before adding IP-based limits.
- Tokens live in `sessionStorage` so a refresh mid-exam does not sign the student out; they clear when the tab closes.
- Chrome or Edge on a laptop or desktop. Phones and tablets cannot share a screen and are blocked.

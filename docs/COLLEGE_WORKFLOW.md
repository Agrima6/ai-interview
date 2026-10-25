# College workflow

A college runs **exam drives** for its **students**. It is the same interview engine organizations use, with the
hiring parts removed: one round, results only, no shortlisting, no rejection or congratulation mails, no next round.

## Flow

1. The college registers, completes onboarding and is approved (same flow as organizations). Approval creates the
   college `Client` (`type: COLLEGE`) and its admin login.
2. **Create exam** (Exam Drives): name, topic, branch, interview type, proctoring level, window (max 50 days), pass mark
   and a question set. The server marks the drive `driveKind: "EXAM"` from the tenant type and forces one round - the
   request body can never choose the kind.
3. **Add students** - type them in one by one, upload a CSV, or paste rows from a spreadsheet. For a file, the dialog maps
   your column names to the fields (Name and Email are required; Phone, Roll number, Branch, Batch are optional) and a
   sample CSV can be downloaded. Everything lands in one review list: invalid rows and duplicates (same email, phone or
   roll number, in the list or already on the exam) are flagged and skipped without blocking the good rows. Each added
   student gets an account and an invite email with their login details and the exam link.
4. Students book a slot and take the proctored AI interview exactly like candidates do.
5. **Results**: per exam (score, PASS/FAIL against the pass mark, integrity flags, invite status), a branch-wise
   breakdown, a per-exam results CSV, and an all-students CSV.

## Rules enforced by the server (`interviewDrive.service.js`)

| Action | On an exam drive |
|---|---|
| Shortlist / reject a student | 409 `NOT_AVAILABLE_FOR_EXAMS` |
| Congratulation / rejection mails | 409 `NOT_AVAILABLE_FOR_EXAMS` |
| Add a second round | 409 `NOT_AVAILABLE_FOR_EXAMS` |
| Results export | `GET /api/v1/drives/:id/results/export` (CSV) |

A student has a **result** only when the attempt is completed *and* scored. A student still being evaluated, or who has
not attempted, is **pending** - never counted as a fail. The same rule is in `client/src/utils/collegeStats.js` (screens)
and `exportDriveResultsCsv` (CSV), so the numbers agree everywhere.

## Screens (`/college/*`)

Dashboard, Exam Drives (+ Create exam), Exam detail (students, results, branch table, add students, close, archive,
CSV), Students (all exams, server-paginated), Results (overview), plus the shared Question Sets, Faculty & Team,
Templates and Settings.

## Demo account

`node services/auth-service/scripts/seed-demo-college.js [email] [password]` creates a demo college, its login, a
campus question set and one sample exam with sample students (`@example.test` - nothing is ever emailed to them).
Safe to repeat. Development helper: refuses `NODE_ENV=production`.

## Invite emails

Adding students (or candidates) now reports what happened to the invite emails: the API returns
`inviteSummary: { attempted, failed: [{ email, reason }], skipped, pending }` and the screens show a warning when
invites failed or were skipped (a drive with no public link sends none). Failures are logged with the HTTP status and
error code: `grep "candidate-invite" ~/.pm2/logs/client-service-error.log`.

## Invite wording and re-sending

The invite email is one template (`CANDIDATE_INVITE`); the words come from variables chosen by the drive kind
(`inviteWording` in `interviewDrive.service.js`): a college exam says "exam", "Exam", "College", "Complete by" and
"Student Portal"; a hiring drive keeps "interview", "Role", "Company", "Apply by" and "Candidate Portal". Dates in
emails are written like `8 Nov 2026` (India time), never `11/8/2026`.

**Deploy order matters:** deploy the code first, then re-run `communication-service/scripts/seed.js`. The new template
uses the new variables; the old code does not send them.

A student who has not finished can be invited again from the exam page (Resend, or "Resend invite to N pending"):
`POST /api/v1/drives/:id/rounds/:n/candidates/invite`. Completed students are skipped, an invite sent less than a minute
ago is skipped, and someone who has never signed in gets a fresh temporary password in the new email.

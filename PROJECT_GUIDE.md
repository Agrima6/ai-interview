# Project Guide — InterviewIQ

Quick-reference for what this app is and how the pieces fit together. Not a git repo (no `.git` found), so there's no commit history to summarize — this is a structural walkthrough of the current code.

## What this is

An AI-powered mock-interview practice app. A user uploads a resume, picks a role/experience level/interview mode, gets 5 AI-generated interview questions, answers them against a timer, gets AI-scored feedback per answer, and receives a final report. Payments (Razorpay) top up a credits balance that gates question generation.

## Stack

- **server/**: Node + Express 5, MongoDB via Mongoose, JWT auth (cookie-based), Razorpay payments, OpenRouter (OpenAI-compatible API) for AI question generation/scoring, `pdfjs-dist` for resume parsing, Multer for file upload.
- **client/**: React 19 + Vite, Redux Toolkit, React Router, Tailwind 4, Firebase (client-side Google auth), recharts (report charts), jsPDF (report export).

## Server structure

| Path | Responsibility |
|---|---|
| [server/index.js](server/index.js) | Express app entry — CORS (any `localhost:*` origin, credentials on), mounts `/api/auth`, `/api/user`, `/api/interview`, `/api/payment`. |
| [config/connectDb.js](server/config/connectDb.js), [config/token.js](server/config/token.js) | Mongo connection, JWT signing (`genToken`). |
| [routes/](server/routes) + [controllers/](server/controllers) | `auth` (google/guest login, logout), `user` (current user), `interview` (resume→questions→answers→report), `payment` (Razorpay order + verify). |
| [middlewares/isAuth.js](server/middlewares/isAuth.js) | Reads `token` cookie, verifies JWT, sets `req.userId`. All interview/user/payment routes require it. |
| [middlewares/multer.js](server/middlewares/multer.js) | Resume file upload handling. |
| [models/](server/models) | `User` (name, email, credits — default 100), `Interview` (questions subdocs with per-question score/confidence/communication/correctness), `Payment`. |
| [services/openRouter.service.js](server/services/openRouter.service.js) | Wraps OpenRouter chat completions (`askAi`) and a JSON-mode variant with one retry that strips markdown code fences (`askAiJson`). |
| [services/razorpay.service.js](server/services/razorpay.service.js) | Razorpay SDK client. |

## Auth model

- **Google auth** (`POST /api/auth/google`): client sends `{name, email}` (presumably already verified by Firebase client-side) — server just finds-or-creates a `User` by email, no server-side Google token verification. `POST /api/auth/guest` does the same for a fixed `guest@ats-pro.local` account.
- Both issue a JWT in an httpOnly-ish cookie (`http:true` is a typo for `httpOnly:true` — currently **not actually httpOnly**, see below), `sameSite:"strict"`, 7-day expiry.
- `isAuth` middleware verifies the cookie JWT on every protected route.

## Interview lifecycle (data flow)

1. **Upload resume** (`POST /api/interview/resume`) — PDF parsed via `pdfjs-dist`, sent to OpenRouter to extract `{role, experience, projects, skills}` as JSON.
2. **Generate questions** (`POST /api/interview/generate-questions`) — requires ≥50 credits; builds a prompt (role/experience/mode/projects/skills/resume) and asks the AI for exactly 5 questions with a fixed easy→easy→medium→medium→hard difficulty/time-limit ladder (60/60/90/90/120s); deducts 50 credits; creates an `Interview` doc.
3. **Answer each question** (`POST /api/interview/submit-answer`) — server re-checks `timeTaken` against the question's time limit server-side (0 score if exceeded or unanswered), otherwise sends Q+A to the AI for `{confidence, communication, correctness, finalScore, feedback}` scoring.
4. **Finish** (`POST /api/interview/finish`) — averages all per-question scores into the interview's `finalScore`, marks `status: "completed"`.
5. **History / report** — `GET /api/interview/get-interview` (list, summary fields only), `GET /api/interview/report/:id` (full per-question breakdown).

Note: `mode` is typed as `enum: ["HR", "Technical"]` at the schema level but the AI prompt just interpolates whatever `mode` string the client sends — validation only bites at save time.

## Payments

- `POST /api/payment/order` creates a Razorpay order and a `Payment` record (`status: "created"`).
- `POST /api/payment/verify` recomputes the HMAC-SHA256 signature from `razorpay_order_id|razorpay_payment_id` using `RAZORPAY_KEY_SECRET` and compares it to the client-supplied `razorpay_signature`; on match, marks the payment `paid` and increments the user's `credits`.

## Client structure

- [pages/Home.jsx](client/src/pages/Home.jsx) — landing page (hero, features, testimonials, pricing sections via components in `components/`).
- [pages/InterviewPage.jsx](client/src/pages/InterviewPage.jsx) — the 3-step flow: `Step1SetUp` (resume/role/mode) → `Step2Interview` (question + `Timer` + answer submission) → `Step3Report`.
- [pages/InterviewHistory.jsx](client/src/pages/InterviewHistory.jsx), [pages/InterviewReport.jsx](client/src/pages/InterviewReport.jsx) — past interviews list and detailed report (charts via `recharts`, PDF export via `jsPDF`).
- [pages/Pricing.jsx](client/src/pages/Pricing.jsx) — credit-pack purchase, ties into Razorpay checkout + `/api/payment/*`.
- [redux/store.js](client/src/redux/store.js), [redux/userSlice.js](client/src/redux/userSlice.js) — holds the current user/session state.
- Firebase is a dependency (likely for Google sign-in popup on the client, whose result is then posted to `/api/auth/google`).

## Things worth knowing before making changes

- **Cookie flag typo**: `res.cookie("token", token, { http:true, secure:false, ... })` in [auth.controller.js](server/controllers/auth.controller.js) — the correct Express option is `httpOnly`, not `http`. As written, the cookie is **not** marked httpOnly, so it's readable from client-side JS (XSS risk). Also `secure:false` means it'll be sent over plain HTTP — fine for local dev, needs to flip to `true` behind HTTPS in production.
- **No server-side Google identity verification**: `googleAuth` trusts whatever `{name, email}` the client posts. If the client-side Firebase flow can be bypassed, anyone could log in as any email. Worth verifying a Firebase ID token server-side instead of trusting raw body fields, if this is meant to be production-hardened.
- **AI cost gating**: only `generateQuestion` checks/deducts credits; `submitAnswer` (which also calls the AI) does not consume credits itself — the cost model assumes one generate-questions call funds all 5 answer-scoring calls for that interview.
- Both `server/.env` and `client/.env` exist and are gitignored — no `.env.example` in either folder, so required env vars (`JWT_SECRET`, `OPENROUTER_API_KEY`, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`, Mongo URI, Firebase client config, etc.) aren't self-documented anywhere in the repo.

## Running locally

```bash
# server
cd server && npm install && npm run dev   # nodemon, needs server/.env

# client
cd client && npm install && npm run dev   # vite, needs client/.env
```

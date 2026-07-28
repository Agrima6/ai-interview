# Auth fix plan — backend (server/)

## Problem

`POST /api/auth/google` trusted whatever `{name, email}` the client posted and logged that person in with no proof of identity. Separately, `res.cookie(..., { http:true, secure:false, ... })` in `auth.controller.js` used a non-existent `http` option instead of `httpOnly`, so the JWT cookie was readable by client-side JS.

## Fix

1. **`config/firebaseAdmin.js`** (new) — lazy singleton exposing `getFirebaseAuth()`, backed by `admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })`. `verifyIdToken()` only needs the project ID to check the `aud` claim; the signature check itself is against Google's public certs, so no service-account secret is required.

2. **`controllers/auth.controller.js`**:
   - `googleAuth` now requires `{ idToken }` in the body (not `{name, email}`), verifies it via `getFirebaseAuth().verifyIdToken(idToken)`, and derives `email`/`name` from the **decoded token** — the client can no longer claim to be anyone by just POSTing a name/email.
   - 400 if `idToken` missing or the token has no email; 401 if verification fails.
   - Shared `authCookieOptions` used by both `googleAuth` and `guestAuth`: `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "strict"`.

3. **`package.json`** — added `firebase-admin`.

4. **`.env.example`** (new) — documents every env var the app reads, including the new `FIREBASE_PROJECT_ID`. No real values committed.

## Env var needed

Add to your local `server/.env` (see `.env.example`):
```
FIREBASE_PROJECT_ID=<your-firebase-project-id>
```
Get it from the Firebase console → Project settings → General → Project ID. Not a secret.

## Verification

- `node --check config/firebaseAdmin.js controllers/auth.controller.js` — syntax OK.
- `npm run dev` — server boots without import errors.
- `curl -i -X POST http://localhost:<port>/api/auth/guest` — still 200, cookie now has `HttpOnly` flag.
- `curl -i -X POST http://localhost:<port>/api/auth/google` (no body) — now 400 instead of silently creating an account.

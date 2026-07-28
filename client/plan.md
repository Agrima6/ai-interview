# Auth fix plan — frontend (client/)

## Problem

`firebase` was an installed dependency and `client/.env` had a `VITE_FIREBASE_APIKEY`, but there was no Firebase config file and no sign-in UI anywhere. `App.jsx` only ever auto-logged users in as a shared `guest@ats-pro.local` account. The backend's `/api/auth/google` endpoint existed but was unreachable from the app.

## Fix

1. **`src/firebase.js`** (new) — `initializeApp` using `import.meta.env.VITE_FIREBASE_*`, exports `auth` (`getAuth`) and a `googleProvider` (`GoogleAuthProvider`).

2. **`src/components/Navbar.jsx`** — added `handleGoogleLogin`:
   - `signInWithPopup(auth, googleProvider)` → `result.user.getIdToken()` → `POST /api/auth/google` with `{ idToken }`, `withCredentials: true` → `dispatch(setUserData(...))`.
   - A "Sign in with Google" row is shown in the user popup **only when the current session is the guest account** (`userData?.email === "guest@ats-pro.local"`), so it doesn't clutter the menu once someone's actually signed in.
   - Wrapped in try/catch — a cancelled popup or bad Firebase config just logs to console instead of crashing the app.

3. **`.env.example`** (new) — documents `VITE_FIREBASE_APIKEY` (already set) plus the three additional vars the client SDK needs: `VITE_FIREBASE_AUTHDOMAIN`, `VITE_FIREBASE_PROJECTID`, `VITE_FIREBASE_APPID`.

No change to `App.jsx`'s bootstrap logic — guest auto-login on load is unchanged; Google sign-in is purely an explicit user action that swaps the session afterward.

## Env vars needed

Add to your local `client/.env` (see `.env.example`), all from Firebase console → Project settings → your web app config:
```
VITE_FIREBASE_APIKEY=...
VITE_FIREBASE_AUTHDOMAIN=...
VITE_FIREBASE_PROJECTID=...
VITE_FIREBASE_APPID=...
```
These are public client identifiers, not secrets — safe to embed in a frontend bundle. The corresponding `FIREBASE_PROJECT_ID` also needs to be set in `server/.env` (see `server/plan.md`) so the backend can verify tokens issued for the same project.

## Verification

- `npm run dev`, load the app, open the Navbar user avatar popup while on the guest session — "Sign in with Google" should render.
- Click it — triggers the Firebase popup flow. Until real env values are filled in, this will fail with a Firebase config error in the console (expected) rather than crashing the page.
